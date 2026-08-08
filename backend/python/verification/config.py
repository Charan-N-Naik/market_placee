"""
verification/config.py
======================
Central configuration for trust score weights, thresholds, and system constants.
Modify here to tune verification behavior without touching business logic.
"""

from typing import Dict

# ---------------------------------------------------------------------------
# Trust Score Weights  (must sum to 1.0)
# ---------------------------------------------------------------------------
TRUST_WEIGHTS: Dict[str, float] = {
    "w1_authenticity": 0.40,   # Image authenticity (EXIF + pHash + ML)
    "w2_location":     0.25,   # Geo-location validity confidence
    "w3_disease":      0.20,   # No undisclosed disease penalty
    "w4_history":      0.15,   # Farmer's past listing accuracy history
}

# Validate weights sum to 1.0 on import
_weight_sum = sum(TRUST_WEIGHTS.values())
assert abs(_weight_sum - 1.0) < 1e-6, f"Trust weights must sum to 1.0, got {_weight_sum}"

# ---------------------------------------------------------------------------
# Status Decision Thresholds
# ---------------------------------------------------------------------------
THRESHOLDS: Dict[str, float] = {
    "auto_approve":    0.75,   # trust_score >= this → "verified"
    "manual_review":   0.40,   # trust_score >= this → "pending_review" (else "rejected")
    "auto_reject":     0.35,   # trust_score <  manual_review → "rejected"
}

# ---------------------------------------------------------------------------
# Image Authenticity Sub-weights  (combined to produce authenticity_score)
# ---------------------------------------------------------------------------
AUTHENTICITY_WEIGHTS: Dict[str, float] = {
    "exif":      0.45,   # EXIF/metadata presence & freshness
    "duplicate": 0.35,   # pHash duplicate check (gating signal)
    "ml_model":  0.20,   # Heuristic ML texture/color classifier
}

# Minimum EXIF age in days (photos older than this are suspicious for fresh listings)
EXIF_MAX_AGE_DAYS: int = 60

# Perceptual hash Hamming distance threshold (0 = identical, 64 = completely different)
# Images within this distance are considered duplicates
PHASH_DUPLICATE_THRESHOLD: int = 10

# ---------------------------------------------------------------------------
# Geo-location Validator Config
# ---------------------------------------------------------------------------
GEO_CONFIG: Dict = {
    # India's approximate bounding box
    "india_lat_min": 6.5,
    "india_lat_max": 37.5,
    "india_lon_min": 68.0,
    "india_lon_max": 97.5,
    # Flag (not reject) if distance from registered address exceeds this
    "mismatch_flag_km": 200.0,
    # Hard-reject if distance is astronomical (clear GPS spoof)
    "mismatch_reject_km": 1000.0,
    # Minimum decimal precision (< 2 decimal places = suspiciously round)
    "min_coord_precision": 2,
}

# Location confidence scores for each signal
GEO_CONFIDENCE: Dict[str, float] = {
    "valid_india_bounds":  0.40,
    "reverse_geocode_ok":  0.35,
    "distance_ok":         0.25,
}

# ---------------------------------------------------------------------------
# Report Generation
# ---------------------------------------------------------------------------
REPORT_CONFIG: Dict = {
    "reports_dir":       "verification/reports",
    "cache_ttl_hours":   24,    # Re-generate if older than this
    "product_base_url":  "http://localhost:5176/listing",  # Frontend listing URL for QR
    "disclaimer": (
        "This is an AI-generated verification report produced by CropVerify AI. "
        "It is not a certified government or laboratory inspection. "
        "Scores reflect algorithmic analysis of the submitted photo and GPS data only. "
        "Always exercise due diligence when making purchasing decisions."
    ),
    "brand_name":        "KisanBazaar CropVerify AI",
    "brand_color_hex":   "#16a34a",  # Green — matches existing app palette
}

# ---------------------------------------------------------------------------
# Farmer History Score — default for new farmers with no history
# ---------------------------------------------------------------------------
DEFAULT_FARMER_HISTORY_SCORE: float = 0.70

# ---------------------------------------------------------------------------
# Internal FastAPI service base URL (used by Node.js to call us)
# ---------------------------------------------------------------------------
SERVICE_PORT: int = 5002
SERVICE_HOST: str = "127.0.0.1"
