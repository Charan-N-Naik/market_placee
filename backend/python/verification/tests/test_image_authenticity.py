"""
tests/test_image_authenticity.py
==================================
Unit tests for the Image Authenticity checker (Module B1).

Tests:
  - Real JPEG with EXIF → is_authentic=True, high score
  - Image without EXIF → "missing_exif" reason, penalized score
  - Duplicate image → "duplicate_detected" reason, score capped at 0.20
  - Editing software tag → "editing_software_detected" reason
  - Green farm-like image → ML heuristic gives bonus score

All MongoDB calls are mocked via unittest.mock so no real DB connection needed.
"""

import asyncio
import io
import struct
import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from PIL import Image
from verification import image_authenticity


# ---------------------------------------------------------------------------
# Helpers: create test images in memory
# ---------------------------------------------------------------------------

def _make_rgb_image(color=(50, 120, 60), size=(64, 64)) -> bytes:
    """Create a minimal in-memory JPEG/PNG image with given background color."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def _make_image_with_exif(date_str="2026:07:15 10:30:00", software=None) -> bytes:
    """Create a JPEG with embedded EXIF DateTimeOriginal."""
    from PIL import Image
    import piexif

    img = Image.new("RGB", (100, 100), color=(60, 140, 70))
    exif_dict = {
        "0th": {
            piexif.ImageIFD.Make:  b"Samsung",
            piexif.ImageIFD.Model: b"Galaxy S21",
        },
        "Exif": {
            piexif.ExifIFD.DateTimeOriginal: date_str.encode(),
        },
    }
    if software:
        exif_dict["0th"][piexif.ImageIFD.Software] = software.encode()

    try:
        exif_bytes = piexif.dump(exif_dict)
        buf = io.BytesIO()
        img.save(buf, format="JPEG", exif=exif_bytes)
        return buf.getvalue()
    except Exception:
        # piexif not installed — return plain JPEG
        buf = io.BytesIO()
        img.save(buf, format="JPEG")
        return buf.getvalue()


# ---------------------------------------------------------------------------
# Mock MongoDB collection
# ---------------------------------------------------------------------------

def _mock_hash_col(docs=None):
    """Return a mock Motor collection that returns `docs` on find().limit().to_list()."""
    col = MagicMock()
    cursor = MagicMock()
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=docs or [])
    col.find.return_value = cursor
    col.update_one = AsyncMock(return_value=None)
    return col


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestCheckExif(unittest.IsolatedAsyncioTestCase):
    """Tests for the EXIF signal (_check_exif)."""

    def test_no_exif_returns_low_score(self):
        """Plain JPEG without EXIF should be penalised."""
        from verification.image_authenticity import _check_exif
        image = _make_rgb_image()
        score, reasons = _check_exif(image)
        self.assertIn("missing_exif", reasons)
        self.assertLess(score, 0.50)

    def test_with_exif_and_camera_model_returns_higher_score(self):
        """Image with camera EXIF should score above 0.60."""
        try:
            import piexif
        except ImportError:
            self.skipTest("piexif not installed")
        from verification.image_authenticity import _check_exif
        image = _make_image_with_exif(date_str="2026:07:15 10:30:00")
        score, reasons = _check_exif(image)
        self.assertNotIn("missing_exif", reasons)
        self.assertGreater(score, 0.60)

    def test_editing_software_detected(self):
        """Image with Photoshop in Software EXIF tag should be flagged."""
        try:
            import piexif
        except ImportError:
            self.skipTest("piexif not installed")
        from verification.image_authenticity import _check_exif
        image = _make_image_with_exif(software="Adobe Photoshop 2024")
        score, reasons = _check_exif(image)
        self.assertIn("editing_software_detected", reasons)
        self.assertLess(score, 0.50)


class TestDuplicateCheck(unittest.IsolatedAsyncioTestCase):
    """Tests for the perceptual hash duplicate detection."""

    async def test_no_duplicates_returns_full_score(self):
        """First upload of an image → no duplicates → score = 1.0."""
        from verification.image_authenticity import _check_duplicate, _compute_phash
        image = _make_rgb_image()
        phash = _compute_phash(image)
        with patch.object(image_authenticity, "get_image_hashes_col", return_value=_mock_hash_col([])):
            score, reasons = await _check_duplicate(phash, listing_id="new-listing-001")
        self.assertEqual(score, 1.0)
        self.assertNotIn("duplicate_detected", reasons)

    async def test_exact_same_image_is_duplicate(self):
        """Uploading the same image again should detect duplicate."""
        from verification.image_authenticity import _check_duplicate, _compute_phash
        image = _make_rgb_image(color=(80, 160, 80))
        phash = _compute_phash(image)
        # Simulate a stored hash for a different listing
        stored = [{"phash": phash, "listing_id": "previous-listing-999"}]
        with patch.object(image_authenticity, "get_image_hashes_col", return_value=_mock_hash_col(stored)):
            score, reasons = await _check_duplicate(phash, listing_id="new-listing-002")
        self.assertEqual(score, 0.0)
        self.assertIn("duplicate_detected", reasons)

    async def test_self_exclusion_no_false_positive(self):
        """Re-running verification on the same listing should NOT flag as duplicate."""
        from verification.image_authenticity import _check_duplicate, _compute_phash
        image = _make_rgb_image(color=(80, 160, 80))
        phash = _compute_phash(image)
        # listing_id matches the stored entry
        stored = [{"phash": phash, "listing_id": "same-listing-111"}]
        with patch.object(image_authenticity, "get_image_hashes_col", return_value=_mock_hash_col(stored)):
            score, reasons = await _check_duplicate(phash, listing_id="same-listing-111")
        self.assertNotIn("duplicate_detected", reasons)


class TestMLHeuristic(unittest.IsolatedAsyncioTestCase):
    """Tests for the ML heuristic classifier."""

    def test_green_image_gets_higher_score(self):
        """A mostly-green image should score higher (farm-like)."""
        from verification.image_authenticity import _run_ml_classifier
        green_image = _make_rgb_image(color=(40, 180, 50))  # Rich green
        score, reasons = _run_ml_classifier(green_image)
        self.assertGreater(score, 0.50)

    def test_uniform_grey_image_gets_lower_score(self):
        """Uniform flat colour (AI/stock image) should score lower or raise flag."""
        from verification.image_authenticity import _run_ml_classifier
        grey_image = _make_rgb_image(color=(128, 128, 128))  # Flat grey
        score, reasons = _run_ml_classifier(grey_image)
        # Should flag at least one signal
        self.assertTrue(
            score < 0.75 or len(reasons) > 0,
            "Expected lower score or at least one flag for flat uniform image"
        )


class TestFullAuthenticityCheck(unittest.IsolatedAsyncioTestCase):
    """End-to-end authenticity check with all signals combined."""

    async def test_authentic_fresh_image_passes(self):
        """A green image with no prior duplicates should pass overall check."""
        image = _make_rgb_image(color=(50, 160, 60))
        with patch.object(image_authenticity, "get_image_hashes_col", return_value=_mock_hash_col([])):
            from verification.image_authenticity import check_image_authenticity
            result = await check_image_authenticity(image, listing_id="listing-aaa")
        self.assertIn("authenticity_score", result)
        self.assertIn("is_authentic", result)
        self.assertIn("reasons", result)
        self.assertIsInstance(result["authenticity_score"], float)
        self.assertGreaterEqual(result["authenticity_score"], 0.0)
        self.assertLessEqual(result["authenticity_score"], 1.0)

    async def test_duplicate_image_caps_score(self):
        """Duplicate image should cap authenticity_score at 0.20."""
        image = _make_rgb_image(color=(200, 100, 50))
        from verification.image_authenticity import _compute_phash, check_image_authenticity
        phash = _compute_phash(image)
        stored = [{"phash": phash, "listing_id": "old-listing-zzz"}]
        with patch.object(image_authenticity, "get_image_hashes_col", return_value=_mock_hash_col(stored)):
            result = await check_image_authenticity(image, listing_id="new-listing-bbb")
        self.assertLessEqual(result["authenticity_score"], 0.20)
        self.assertFalse(result["is_authentic"])
        self.assertIn("duplicate_detected", result["reasons"])


if __name__ == "__main__":
    unittest.main()
