"""
verification/image_authenticity.py
====================================
Module B1 — Image Authenticity Checker

Combines three independent signals into a single authenticity_score (0–1):

  Signal 1: EXIF / Metadata check  (weight: 0.45)
    - Checks for camera EXIF data with DateTimeOriginal
    - Penalises if edit-software metadata (Photoshop/GIMP) found
    - Penalises if photo timestamp is too old for a "fresh" listing

  Signal 2: Perceptual hash duplicate check  (weight: 0.35)
    - Generates pHash of the image
    - Checks MongoDB `listing_image_hashes` collection for near-duplicates
    - Exact/near-match = strong fraud signal

  Signal 3: Heuristic ML classifier  (weight: 0.20)
    - Color/texture statistical heuristics to distinguish real farm photos
      from AI-generated/stock images (no GPU/heavy model required)
    - A full ResNet fine-tuned model can drop in later by implementing
      `_run_ml_classifier()` with Torchvision

Output contract:
  {
    "is_authentic": bool,
    "authenticity_score": float,   # 0.0 – 1.0
    "reasons": list[str]           # e.g. ["missing_exif", "duplicate_detected"]
  }
"""

import io
import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Soft imports (graceful degradation if not installed) ─────────────────────
try:
    from PIL import Image, ExifTags
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("[ImageAuthenticity] Pillow not installed — EXIF checks disabled.")

try:
    import imagehash
    _IMAGEHASH_AVAILABLE = True
except ImportError:
    _IMAGEHASH_AVAILABLE = False
    logger.warning("[ImageAuthenticity] imagehash not installed — duplicate detection disabled.")

import numpy as np

from .config import (
    AUTHENTICITY_WEIGHTS,
    EXIF_MAX_AGE_DAYS,
    PHASH_DUPLICATE_THRESHOLD,
)
from .db import get_image_hashes_col


# ── EDIT-SOFTWARE TAGS that indicate image was opened/saved in editing tools ──
_EDIT_SOFTWARE_KEYWORDS = frozenset([
    "adobe", "photoshop", "lightroom", "gimp", "affinity",
    "snapseed", "pixlr", "canva", "dall-e", "stable diffusion",
    "midjourney", "firefly",
])


# =============================================================================
# PUBLIC ENTRY POINT
# =============================================================================

async def check_image_authenticity(
    image_bytes: bytes,
    listing_id: Optional[str] = None,
    existing_hash: Optional[str] = None,
) -> dict[str, Any]:
    """
    Run all three authenticity signals and return the combined result.

    Args:
        image_bytes:   Raw image bytes from the upload.
        listing_id:    ID of the listing (used to exclude self from duplicate check).
        existing_hash: Pre-computed pHash string (skip re-computation if provided).

    Returns:
        dict with keys: is_authentic, authenticity_score, reasons, phash
    """
    reasons: list[str] = []
    scores: dict[str, float] = {}

    # ── Signal 1: EXIF ───────────────────────────────────────────────────────
    exif_score, exif_reasons = _check_exif(image_bytes)
    scores["exif"] = exif_score
    reasons.extend(exif_reasons)
    logger.debug("[EXIF] score=%.2f reasons=%s", exif_score, exif_reasons)

    # ── Signal 2: Duplicate pHash ────────────────────────────────────────────
    phash_str = existing_hash
    if not phash_str:
        phash_str = _compute_phash(image_bytes)

    dup_score, dup_reasons = await _check_duplicate(phash_str, listing_id)
    scores["duplicate"] = dup_score
    reasons.extend(dup_reasons)
    logger.debug("[DupCheck] score=%.2f reasons=%s", dup_score, dup_reasons)

    # ── Signal 3: Heuristic ML ───────────────────────────────────────────────
    ml_score, ml_reasons = _run_ml_classifier(image_bytes)
    scores["ml_model"] = ml_score
    reasons.extend(ml_reasons)
    logger.debug("[MLHeuristic] score=%.2f reasons=%s", ml_score, ml_reasons)

    # ── Weighted combination ─────────────────────────────────────────────────
    w = AUTHENTICITY_WEIGHTS
    authenticity_score = (
        w["exif"]      * scores["exif"] +
        w["duplicate"] * scores["duplicate"] +
        w["ml_model"]  * scores["ml_model"]
    )

    # Hard gate: if duplicate is detected, cap the score regardless of other signals
    if "duplicate_detected" in reasons:
        authenticity_score = min(authenticity_score, 0.20)

    authenticity_score = round(max(0.0, min(1.0, authenticity_score)), 4)
    is_authentic = authenticity_score >= 0.50 and "duplicate_detected" not in reasons

    # ── Store hash for future duplicate detection ────────────────────────────
    if phash_str and listing_id:
        await _store_image_hash(phash_str, listing_id)

    return {
        "is_authentic": is_authentic,
        "authenticity_score": authenticity_score,
        "reasons": reasons,
        "phash": phash_str,
        "signal_scores": scores,
    }


# =============================================================================
# SIGNAL 1 — EXIF / Metadata Check
# =============================================================================

def _check_exif(image_bytes: bytes) -> tuple[float, list[str]]:
    """Return (score 0–1, list of reason strings)."""
    reasons: list[str] = []

    if not _PIL_AVAILABLE:
        return 0.65, ["exif_check_unavailable"]  # Neutral if Pillow missing

    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_data = img._getexif() if hasattr(img, "_getexif") else None
    except Exception as e:
        logger.warning("[EXIF] Failed to open image: %s", e)
        return 0.40, ["exif_parse_error"]

    if not exif_data:
        reasons.append("missing_exif")
        return 0.30, reasons  # No EXIF = screenshot or web image

    # Decode EXIF tag names
    decoded: dict[str, Any] = {}
    try:
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id, str(tag_id))
            decoded[tag] = value
    except Exception:
        reasons.append("exif_decode_error")
        return 0.35, reasons

    score = 0.60  # Baseline — EXIF exists

    # Check for camera DateTimeOriginal
    date_str = decoded.get("DateTimeOriginal") or decoded.get("DateTime")
    if date_str:
        try:
            photo_dt = datetime.strptime(str(date_str), "%Y:%m:%d %H:%M:%S")
            photo_dt = photo_dt.replace(tzinfo=timezone.utc)
            age_days = (datetime.now(timezone.utc) - photo_dt).days
            if age_days > EXIF_MAX_AGE_DAYS:
                reasons.append("photo_too_old")
                score -= 0.15
            elif age_days < 0:
                reasons.append("future_timestamp")
                score -= 0.20
            else:
                score += 0.20  # Fresh, recent photo
        except ValueError:
            reasons.append("invalid_exif_timestamp")
            score -= 0.05
    else:
        reasons.append("missing_capture_timestamp")
        score -= 0.10

    # Check Make/Model (real cameras have these)
    if decoded.get("Make") or decoded.get("Model"):
        score += 0.15  # Camera device metadata present
    else:
        reasons.append("missing_camera_model")

    # Check for editing software
    software = str(decoded.get("Software", "")).lower()
    if any(kw in software for kw in _EDIT_SOFTWARE_KEYWORDS):
        reasons.append("editing_software_detected")
        score -= 0.25

    return round(max(0.0, min(1.0, score)), 4), reasons


# =============================================================================
# SIGNAL 2 — Perceptual Hash Duplicate Check
# =============================================================================

def _compute_phash(image_bytes: bytes) -> Optional[str]:
    """Compute perceptual hash of image. Returns None if imagehash unavailable."""
    if not _PIL_AVAILABLE or not _IMAGEHASH_AVAILABLE:
        # Fallback to MD5 of raw bytes (exact duplicate only, not perceptual)
        return hashlib.md5(image_bytes).hexdigest()
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return str(imagehash.phash(img))
    except Exception as e:
        logger.warning("[pHash] Failed to compute hash: %s", e)
        return hashlib.md5(image_bytes).hexdigest()


async def _check_duplicate(
    phash_str: Optional[str],
    listing_id: Optional[str] = None,
) -> tuple[float, list[str]]:
    """Check if this pHash matches a previously uploaded image in MongoDB."""
    if not phash_str:
        return 0.70, []

    reasons: list[str] = []
    col = get_image_hashes_col()

    try:
        # Fetch recent hashes (limit to 5000 for performance)
        cursor = col.find({}, {"phash": 1, "listing_id": 1}).limit(5000)
        docs = await cursor.to_list(length=5000)
    except Exception as e:
        logger.error("[DupCheck] MongoDB query failed: %s", e)
        return 0.70, ["duplicate_check_unavailable"]

    # If imagehash is available, use Hamming distance comparison
    if _IMAGEHASH_AVAILABLE:
        try:
            query_hash = imagehash.hex_to_hash(phash_str)
            for doc in docs:
                if doc.get("listing_id") == listing_id:
                    continue  # Skip self
                try:
                    stored_hash = imagehash.hex_to_hash(doc["phash"])
                    distance = query_hash - stored_hash
                    if distance <= PHASH_DUPLICATE_THRESHOLD:
                        reasons.append("duplicate_detected")
                        logger.warning(
                            "[DupCheck] Near-duplicate found (distance=%d) listing_id=%s",
                            distance, doc.get("listing_id"),
                        )
                        return 0.0, reasons
                except Exception:
                    continue
        except Exception as e:
            logger.warning("[DupCheck] Hash comparison error: %s", e)
    else:
        # Exact MD5 match only
        for doc in docs:
            if doc.get("listing_id") == listing_id:
                continue
            if doc.get("phash") == phash_str:
                reasons.append("duplicate_detected")
                return 0.0, reasons

    return 1.0, []  # No duplicate found


async def _store_image_hash(phash_str: str, listing_id: str) -> None:
    """Upsert the image hash into MongoDB for future duplicate detection."""
    col = get_image_hashes_col()
    try:
        await col.update_one(
            {"listing_id": listing_id},
            {"$set": {"phash": phash_str, "listing_id": listing_id, "created_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception as e:
        logger.error("[DupCheck] Failed to store hash: %s", e)


# =============================================================================
# SIGNAL 3 — Heuristic ML Classifier
# =============================================================================

def _run_ml_classifier(image_bytes: bytes) -> tuple[float, list[str]]:
    """
    Lightweight heuristic classifier that distinguishes real crop field photos
    from AI-generated/stock/screenshot images using color + texture statistics.

    Heuristics used:
      - Green channel dominance: farm photos have high green content
      - Color variance: stock images often have low variance (artificially clean)
      - Edge density: real field photos have high-frequency natural textures
      - Saturation spread: AI-generated images often have unnatural saturation uniformity

    A trained ResNet/EfficientNet binary classifier can replace this by
    loading a .pkl or .pt model file — the interface stays the same.
    """
    reasons: list[str] = []

    if not _PIL_AVAILABLE:
        return 0.65, ["ml_check_unavailable"]

    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((128, 128))
        arr = np.array(img, dtype=np.float32) / 255.0  # Shape: (128, 128, 3)
    except Exception as e:
        logger.warning("[MLHeuristic] Image load failed: %s", e)
        return 0.55, ["ml_image_load_error"]

    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    score = 0.5  # Neutral baseline

    # Heuristic 1: Green channel dominance (farm photos are green-heavy)
    green_dominance = float(np.mean(g) - 0.5 * (np.mean(r) + np.mean(b)))
    if green_dominance > 0.05:
        score += 0.15  # Clear agricultural scene
    elif green_dominance < -0.05:
        reasons.append("low_green_content")
        score -= 0.10

    # Heuristic 2: Color variance (real photos have natural variation)
    color_variance = float(np.var(arr))
    if color_variance > 0.02:
        score += 0.10
    else:
        reasons.append("unnaturally_uniform_colors")
        score -= 0.10

    # Heuristic 3: Edge density via gradient magnitude
    gx = np.gradient(arr.mean(axis=2), axis=1)
    gy = np.gradient(arr.mean(axis=2), axis=0)
    edge_density = float(np.mean(np.sqrt(gx**2 + gy**2)))
    if edge_density > 0.03:
        score += 0.10  # Rich texture = natural photo
    elif edge_density < 0.008:
        reasons.append("low_texture_density")
        score -= 0.10

    # Heuristic 4: Saturation uniformity (AI images often hyper-uniform)
    max_rgb = arr.max(axis=2)
    min_rgb = arr.min(axis=2)
    saturation = np.where(max_rgb > 0, (max_rgb - min_rgb) / (max_rgb + 1e-6), 0.0)
    sat_std = float(np.std(saturation))
    if sat_std > 0.12:
        score += 0.10
    elif sat_std < 0.04:
        reasons.append("suspiciously_uniform_saturation")
        score -= 0.08

    return round(max(0.0, min(1.0, score)), 4), reasons
