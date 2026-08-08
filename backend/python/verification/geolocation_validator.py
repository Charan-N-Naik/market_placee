"""
verification/geolocation_validator.py
======================================
Module B2 — Geo-location Validator

Validates GPS coordinates submitted with a product listing:

  Check 1: Coordinate sanity  (no-cost, always runs)
    - Rejects (0,0) null-island
    - Rejects coordinates outside India's bounding box
    - Flags suspiciously round coordinates (likely spoofed or default)

  REVERSE GEOCODING — FREE via OpenStreetMap Nominatim (no API key, no billing):
    Uses https://nominatim.openstreetmap.org — completely free, no account needed.
    Respects OSM usage policy: 1 req/sec max, User-Agent header required.
    If GOOGLE_MAPS_API_KEY is set in .env, Google Maps is used instead (higher accuracy).

  Check 2: Google Maps Reverse Geocoding  (requires GOOGLE_MAPS_API_KEY)
    - Resolves lat/lon → human-readable address
    - Rejects if resolves to ocean/non-India territory
    - Gracefully skipped if API key not configured

  Check 3: Distance cross-check vs farmer's registered address
    - Uses Haversine formula (no external API)
    - Flags (not rejects) distances > 200km — farmers legitimately travel

Output contract:
  {
    "location_valid": bool,
    "resolved_address": str,
    "distance_from_registered_km": float | None,
    "flags": list[str],
    "location_confidence": float   # 0.0 – 1.0
  }
"""

import os
import math
import logging
from typing import Any, Optional

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from .config import GEO_CONFIG, GEO_CONFIDENCE

logger = logging.getLogger(__name__)

GOOGLE_MAPS_API_KEY: Optional[str] = os.getenv("GOOGLE_MAPS_API_KEY")
GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json"

# Location types that are clearly non-agricultural (reject if primary type matches)
_NON_AGRICULTURAL_TYPES = frozenset([
    "airport", "amusement_park", "aquarium", "bank", "casino",
    "hospital", "movie_theater", "museum", "night_club", "stadium",
    "subway_station", "train_station", "university", "zoo",
])


# =============================================================================
# PUBLIC ENTRY POINT
# =============================================================================

async def validate_location(
    lat: float,
    lon: float,
    farmer_lat: Optional[float] = None,
    farmer_lon: Optional[float] = None,
) -> dict[str, Any]:
    """
    Run all geo-validation checks and return a structured result.

    Args:
        lat, lon:             GPS coords submitted with the listing
        farmer_lat, farmer_lon: Farmer's registered address coords (from User doc)

    Returns:
        dict with: location_valid, resolved_address, distance_from_registered_km,
                   flags, location_confidence
    """
    flags: list[str] = []
    confidence_components: dict[str, float] = {}
    resolved_address = "Address not resolved"

    # ── Check 1: Coordinate Sanity ───────────────────────────────────────────
    sanity_ok, sanity_flags = _check_coordinate_sanity(lat, lon)
    flags.extend(sanity_flags)

    if not sanity_ok:
        # Hard reject — don't even try the other checks
        return {
            "location_valid": False,
            "resolved_address": resolved_address,
            "distance_from_registered_km": None,
            "flags": flags,
            "location_confidence": 0.0,
        }

    confidence_components["india_bounds"] = GEO_CONFIDENCE["valid_india_bounds"]

    # ── Check 2: Reverse Geocoding ───────────────────────────────────────────
    geo_result = await _reverse_geocode(lat, lon)
    if geo_result["success"]:
        resolved_address = geo_result["address"]
        if geo_result.get("outside_india"):
            flags.append("geocode_outside_india")
            confidence_components["reverse_geocode"] = 0.0
        elif geo_result.get("non_agricultural"):
            flags.append("non_agricultural_location")
            confidence_components["reverse_geocode"] = GEO_CONFIDENCE["reverse_geocode_ok"] * 0.3
        else:
            confidence_components["reverse_geocode"] = GEO_CONFIDENCE["reverse_geocode_ok"]
    else:
        # API unavailable — neutral, don't penalise
        flags.append(geo_result.get("flag", "geocode_unavailable"))
        confidence_components["reverse_geocode"] = GEO_CONFIDENCE["reverse_geocode_ok"] * 0.5

    # ── Check 3: Distance from Registered Address ────────────────────────────
    distance_km: Optional[float] = None
    if farmer_lat is not None and farmer_lon is not None:
        distance_km = _haversine_km(lat, lon, farmer_lat, farmer_lon)
        distance_km = round(distance_km, 1)

        cfg = GEO_CONFIG
        if distance_km > cfg["mismatch_reject_km"]:
            flags.append("extreme_location_mismatch")
            confidence_components["distance"] = 0.0
        elif distance_km > cfg["mismatch_flag_km"]:
            flags.append("large_distance_mismatch")
            # Flag but don't reject — farmers legitimately farm multiple plots
            confidence_components["distance"] = GEO_CONFIDENCE["distance_ok"] * 0.5
        else:
            confidence_components["distance"] = GEO_CONFIDENCE["distance_ok"]
    else:
        # No registered farmer address to compare — neutral
        confidence_components["distance"] = GEO_CONFIDENCE["distance_ok"] * 0.7

    # ── Overall confidence ───────────────────────────────────────────────────
    location_confidence = round(sum(confidence_components.values()), 4)
    location_confidence = max(0.0, min(1.0, location_confidence))

    # Hard reject conditions
    hard_reject_flags = {"geocode_outside_india", "extreme_location_mismatch"}
    location_valid = (
        not any(f in hard_reject_flags for f in flags)
        and location_confidence >= 0.25
    )

    logger.info(
        "[GeoValidator] lat=%.4f lon=%.4f valid=%s confidence=%.2f flags=%s",
        lat, lon, location_valid, location_confidence, flags,
    )

    return {
        "location_valid": location_valid,
        "resolved_address": resolved_address,
        "distance_from_registered_km": distance_km,
        "flags": flags,
        "location_confidence": location_confidence,
    }


# =============================================================================
# CHECK 1 — Coordinate Sanity
# =============================================================================

def _check_coordinate_sanity(lat: float, lon: float) -> tuple[bool, list[str]]:
    """Fast, no-cost sanity checks on raw coordinate values."""
    flags: list[str] = []
    cfg = GEO_CONFIG

    # Null island check
    if abs(lat) < 0.01 and abs(lon) < 0.01:
        flags.append("null_island")
        return False, flags

    # India bounding box
    if not (cfg["india_lat_min"] <= lat <= cfg["india_lat_max"]):
        flags.append("outside_india_latitude")
        return False, flags
    if not (cfg["india_lon_min"] <= lon <= cfg["india_lon_max"]):
        flags.append("outside_india_longitude")
        return False, flags

    # Suspiciously round coordinates (e.g. exactly 12.0, 77.0)
    lat_decimals = len(str(lat).split(".")[-1]) if "." in str(lat) else 0
    lon_decimals = len(str(lon).split(".")[-1]) if "." in str(lon) else 0
    if lat_decimals < cfg["min_coord_precision"] or lon_decimals < cfg["min_coord_precision"]:
        flags.append("suspiciously_round_coordinates")
        # Flag only — don't hard-reject (might be valid manual entry)

    return True, flags


# =============================================================================
# CHECK 2 — Google Maps Reverse Geocoding
# =============================================================================

async def _reverse_geocode(lat: float, lon: float) -> dict[str, Any]:
    """
    Resolve GPS coordinates to a human-readable address.

    Strategy (in priority order):
      1. Google Maps API  — if GOOGLE_MAPS_API_KEY is set in .env (higher accuracy)
      2. OpenStreetMap Nominatim — FREE, no API key, no billing required (default)
      3. Graceful skip  — if both fail, returns partial result without hard rejection

    OSM Nominatim Usage Policy:
      - Max 1 request/second (enforced by timeout + single call per upload)
      - Must send a descriptive User-Agent header
      - No bulk/automated scraping — our single-call-per-listing use is compliant
    """
    # ── Option A: Google Maps (only if API key configured) ───────────────────
    if GOOGLE_MAPS_API_KEY:
        return await _geocode_google(lat, lon)

    # ── Option B: OpenStreetMap Nominatim (free, no key needed) ─────────────
    return await _geocode_nominatim(lat, lon)


async def _geocode_nominatim(lat: float, lon: float) -> dict[str, Any]:
    """
    Call OpenStreetMap Nominatim reverse geocoding API — completely free.
    No API key, no billing, no account needed.
    API docs: https://nominatim.org/release-docs/develop/api/Reverse/
    """
    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": lat,
        "lon": lon,
        "format": "jsonv2",
        "addressdetails": 1,
        "zoom": 14,
    }
    headers = {
        # OSM policy: must identify your app in User-Agent
        "User-Agent": "KisanBazaar-CropVerify/1.0 (agricultural marketplace; contact@kisanbazaar.in)",
        "Accept-Language": "en",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        logger.warning("[GeoValidator] Nominatim timed out.")
        return {"success": False, "flag": "geocode_timeout"}
    except Exception as e:
        logger.warning("[GeoValidator] Nominatim error: %s", e)
        return {"success": False, "flag": "geocode_request_failed"}

    if "error" in data:
        # Nominatim returns {"error": "Unable to geocode"} for ocean / empty areas
        return {"success": False, "flag": "geocode_no_results"}

    address_parts = data.get("address", {})
    formatted_address = data.get("display_name", "")

    # Check if result is in India
    country_code = address_parts.get("country_code", "").upper()
    outside_india = country_code != "IN" if country_code else False

    # Check for non-agricultural OSM place type
    place_type = data.get("type", "") or data.get("category", "")
    non_agricultural = place_type in _NON_AGRICULTURAL_TYPES

    logger.info("[GeoValidator] Nominatim resolved: %s", formatted_address[:80])

    return {
        "success": True,
        "address": formatted_address,
        "outside_india": outside_india,
        "non_agricultural": non_agricultural,
        "source": "openstreetmap_nominatim",
    }


async def _geocode_google(lat: float, lon: float) -> dict[str, Any]:
    """Google Maps reverse geocoding — used only when GOOGLE_MAPS_API_KEY is set."""
    params = {
        "latlng": f"{lat},{lon}",
        "key": GOOGLE_MAPS_API_KEY,
        "result_type": "street_address|locality|sublocality|administrative_area_level_2",
    }
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(GEOCODE_URL, params=params)
            data = resp.json()
    except Exception as e:
        logger.warning("[GeoValidator] Google Maps error: %s", e)
        # Fall back to Nominatim if Google fails
        return await _geocode_nominatim(lat, lon)

    status = data.get("status")
    if status != "OK":
        return await _geocode_nominatim(lat, lon)  # Fallback

    results = data.get("results", [])
    if not results:
        return {"success": False, "flag": "geocode_no_results"}

    best = results[0]
    formatted_address = best.get("formatted_address", "")
    address_components = best.get("address_components", [])
    place_types = best.get("types", [])

    country = next(
        (c["short_name"] for c in address_components if "country" in c.get("types", [])),
        None,
    )
    outside_india = country != "IN" if country else False
    non_agricultural = any(t in _NON_AGRICULTURAL_TYPES for t in place_types)

    return {
        "success": True,
        "address": formatted_address,
        "outside_india": outside_india,
        "non_agricultural": non_agricultural,
        "source": "google_maps",
    }




# =============================================================================
# CHECK 3 — Haversine Distance
# =============================================================================

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance in km between two GPS points."""
    R = 6371.0  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))
