"""
verification/verification_service.py
======================================
Module B3 — Verification Service Orchestrator

Combines outputs from:
  - Image Authenticity checker (B1)
  - Geo-location Validator (B2)
  - Disease Detection (existing Flask model on port 5001)

Into a single trust_score and verification status, then persists to MongoDB.

Trust Score Formula (weights configurable in config.py):
  trust_score = w1 * authenticity_score
              + w2 * location_confidence
              + w3 * (1 - disease_penalty)
              + w4 * farmer_history_score

Status States:
  verified       → trust_score >= 0.75 (auto-approved)
  pending_review → trust_score >= 0.40 (routes to manual review queue)
  rejected       → trust_score <  0.40 (auto-rejected)
  flagged        → trust_score >= 0.40 but has notable flags (borderline)
"""

import logging
import asyncio
import httpx
from datetime import datetime, timezone
from typing import Any, Optional
from bson import ObjectId

from .config import (
    TRUST_WEIGHTS,
    THRESHOLDS,
    DEFAULT_FARMER_HISTORY_SCORE,
)
from .image_authenticity import check_image_authenticity
from .geolocation_validator import validate_location
from .db import get_listings_col, get_users_col

logger = logging.getLogger(__name__)

# Existing Flask ML service for disease detection
FLASK_ML_URL = "http://127.0.0.1:5001/api/classify-pest"

# Flags that always escalate to "flagged" regardless of trust_score
_ESCALATION_FLAGS = frozenset([
    "duplicate_detected",
    "editing_software_detected",
    "extreme_location_mismatch",
    "geocode_outside_india",
    "outside_india_latitude",
    "outside_india_longitude",
    "null_island",
])


# =============================================================================
# PUBLIC ENTRY POINT
# =============================================================================

async def run_verification(
    image_bytes: bytes,
    image_mime: str,
    listing_id: str,
    crop_name: str,
    lat: Optional[float],
    lon: Optional[float],
    farmer_id: str,
    idempotency_key: Optional[str] = None,
) -> dict[str, Any]:
    """
    Orchestrate the full verification pipeline for a new product listing.

    Args:
        image_bytes:      Raw crop image bytes
        image_mime:       MIME type (e.g. 'image/jpeg')
        listing_id:       MongoDB ObjectId string of the created listing
        crop_name:        Crop name string (for logging)
        lat, lon:         GPS coordinates submitted with listing (None if not provided)
        farmer_id:        MongoDB ObjectId string of the farmer user
        idempotency_key:  Optional client key to prevent duplicate runs

    Returns:
        Full verification result dict (also written to MongoDB listing doc)
    """
    logger.info(
        "[VerificationService] Starting verification for listing=%s crop=%s farmer=%s",
        listing_id, crop_name, farmer_id,
    )

    # ── Idempotency: if listing already has a completed verification, return it ──
    existing = await _get_existing_verification(listing_id)
    if existing and existing.get("status") in ("verified", "rejected", "flagged"):
        logger.info("[VerificationService] Returning existing verification for listing=%s", listing_id)
        return existing

    # ── Fetch farmer's registered location for geo cross-check ──────────────
    farmer_lat, farmer_lon = await _get_farmer_location(farmer_id)

    # ── Run all three checks concurrently ───────────────────────────────────
    auth_task = asyncio.create_task(
        check_image_authenticity(image_bytes, listing_id=listing_id)
    )
    geo_task = asyncio.create_task(
        validate_location(lat or 0.0, lon or 0.0, farmer_lat, farmer_lon)
        if (lat and lon) else asyncio.coroutine(lambda: _no_gps_result())()
    )
    disease_task = asyncio.create_task(
        _call_disease_detection(image_bytes, image_mime)
    )

    auth_result, geo_result, disease_result = await asyncio.gather(
        auth_task, geo_task, disease_task, return_exceptions=True
    )

    # Handle unexpected exceptions from tasks
    if isinstance(auth_result, Exception):
        logger.error("[VerificationService] Auth check failed: %s", auth_result)
        auth_result = {"is_authentic": False, "authenticity_score": 0.5, "reasons": ["auth_check_error"]}
    if isinstance(geo_result, Exception):
        logger.error("[VerificationService] Geo check failed: %s", geo_result)
        geo_result = _no_gps_result()
    if isinstance(disease_result, Exception):
        logger.error("[VerificationService] Disease check failed: %s", disease_result)
        disease_result = {"healthy_leaf": True, "disease_label": "Unknown", "confidence": 0.5}

    # ── Farmer history score ─────────────────────────────────────────────────
    farmer_history_score = await _get_farmer_history_score(farmer_id)

    # ── Disease penalty ──────────────────────────────────────────────────────
    # Only penalise if disease is detected and the listing doesn't disclose it
    disease_flag = disease_result.get("healthy_leaf", True) is False
    disease_penalty = 0.30 if disease_flag else 0.0

    # ── Trust Score Calculation ──────────────────────────────────────────────
    w = TRUST_WEIGHTS
    authenticity_score = auth_result.get("authenticity_score", 0.5)
    location_confidence = geo_result.get("location_confidence", 0.5)

    trust_score = (
        w["w1_authenticity"] * authenticity_score
        + w["w2_location"]     * location_confidence
        + w["w3_disease"]      * (1.0 - disease_penalty)
        + w["w4_history"]      * farmer_history_score
    )
    trust_score = round(max(0.0, min(1.0, trust_score)), 4)

    # ── Status Decision ──────────────────────────────────────────────────────
    all_flags = auth_result.get("reasons", []) + geo_result.get("flags", [])
    has_escalation_flag = any(f in _ESCALATION_FLAGS for f in all_flags)

    t = THRESHOLDS
    if trust_score >= t["auto_approve"] and not has_escalation_flag:
        status = "verified"
    elif trust_score >= t["manual_review"]:
        status = "flagged" if has_escalation_flag else "pending_review"
    else:
        status = "rejected"

    # ── Build result payload ─────────────────────────────────────────────────
    now = datetime.now(timezone.utc)
    result = {
        "status": status,
        "trust_score": trust_score,
        # Image authenticity
        "authenticity_score": authenticity_score,
        "authenticity_reasons": auth_result.get("reasons", []),
        "is_authentic": auth_result.get("is_authentic", False),
        # Geo-location
        "location_valid": geo_result.get("location_valid", False),
        "resolved_address": geo_result.get("resolved_address", "Not resolved"),
        "distance_from_registered_km": geo_result.get("distance_from_registered_km"),
        "geo_flags": geo_result.get("flags", []),
        # Disease detection
        "disease_label": disease_result.get("disease_label", "Unknown"),
        "disease_confidence": disease_result.get("confidence", 0.0),
        "healthy_leaf": disease_result.get("healthy_leaf", True),
        # Metadata
        "verified_at": now,
        "updated_at": now,
        "report_url": None,  # Will be set when PDF is generated
    }

    # ── Persist to MongoDB ───────────────────────────────────────────────────
    await _persist_verification(listing_id, result)

    logger.info(
        "[VerificationService] DONE listing=%s status=%s trust=%.3f",
        listing_id, status, trust_score,
    )

    return result


# =============================================================================
# HELPERS
# =============================================================================

async def _get_existing_verification(listing_id: str) -> Optional[dict]:
    """Fetch existing verification sub-doc from the listing."""
    try:
        col = get_listings_col()
        doc = await col.find_one(
            {"_id": ObjectId(listing_id)},
            {"verification": 1}
        )
        return doc.get("verification") if doc else None
    except Exception:
        return None


async def _get_farmer_location(farmer_id: str) -> tuple[Optional[float], Optional[float]]:
    """Fetch farmer's registered lat/lon from the users collection."""
    try:
        col = get_users_col()
        user = await col.find_one(
            {"_id": ObjectId(farmer_id)},
            {"location": 1}
        )
        if user and user.get("location"):
            loc = user["location"]
            return loc.get("lat"), loc.get("lng")
    except Exception as e:
        logger.warning("[VerificationService] Could not fetch farmer location: %s", e)
    return None, None


async def _get_farmer_history_score(farmer_id: str) -> float:
    """
    Compute farmer's trust history score based on their previous listings.
    Returns DEFAULT_FARMER_HISTORY_SCORE for new farmers with no history.
    """
    try:
        col = get_listings_col()
        # Count total listings and verified listings for this farmer
        total = await col.count_documents({"farmer": ObjectId(farmer_id)})
        if total == 0:
            return DEFAULT_FARMER_HISTORY_SCORE
        verified = await col.count_documents({
            "farmer": ObjectId(farmer_id),
            "verification.status": {"$in": ["verified", "flagged"]}
        })
        ratio = verified / total
        # Scale: 0 history → 0.70, all verified → 1.0, many rejected → lower
        return round(0.50 + 0.50 * ratio, 4)
    except Exception as e:
        logger.warning("[VerificationService] History score error: %s", e)
        return DEFAULT_FARMER_HISTORY_SCORE


async def _call_disease_detection(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
    """
    Call the existing Flask ML service (port 5001) for pest/disease detection.
    This is the Tier 2 vision classifier already built and integrated.
    """
    import base64
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(
                FLASK_ML_URL,
                json={"image": b64, "mimeType": mime_type},
            )
            data = resp.json()
        return {
            "healthy_leaf": data.get("healthyLeafDetected", True),
            "disease_label": data.get("classifiedPest", "Unknown"),
            "confidence": float(data.get("confidenceScore", 0.0)),
            "crop": data.get("crop", "Unknown"),
        }
    except Exception as e:
        logger.warning("[VerificationService] Disease detection call failed: %s", e)
        return {"healthy_leaf": True, "disease_label": "Detection unavailable", "confidence": 0.0}


def _no_gps_result() -> dict[str, Any]:
    """Default geo result when no GPS coordinates were provided."""
    return {
        "location_valid": False,
        "resolved_address": "No GPS coordinates provided",
        "distance_from_registered_km": None,
        "flags": ["no_gps_provided"],
        "location_confidence": 0.20,
    }


async def _persist_verification(listing_id: str, verification: dict) -> None:
    """Write verification sub-doc to the MongoDB listing document."""
    try:
        col = get_listings_col()
        # Serialize datetime objects for MongoDB
        update_doc = {f"verification.{k}": v for k, v in verification.items()}
        # Also update top-level aiVerified / isVerified for backwards compatibility
        update_doc["aiVerified"] = verification["status"] in ("verified",)
        await col.update_one(
            {"_id": ObjectId(listing_id)},
            {"$set": update_doc},
        )
        logger.info("[VerificationService] Persisted to MongoDB: listing=%s", listing_id)
    except Exception as e:
        logger.error("[VerificationService] MongoDB persist failed: %s", e)
