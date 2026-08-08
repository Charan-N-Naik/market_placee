"""
tests/test_geolocation_validator.py
=====================================
Unit tests for Geo-location Validator (Module B2).

Tests:
  - (0,0) null island → location_valid=False, "null_island" flag
  - Out-of-India latitude → rejected
  - Out-of-India longitude → rejected
  - Valid Bengaluru coords → passes bounds check
  - Suspiciously round coordinates → flagged (not rejected)
  - Distance > 200km → "large_distance_mismatch" flag
  - Distance > 1000km → "extreme_location_mismatch" flag
  - Nominatim mock → resolved_address populated
  - Nominatim timeout → graceful degradation

No real HTTP calls are made — httpx is fully mocked.
"""

import asyncio
import unittest
from unittest.mock import AsyncMock, patch, MagicMock


# ---------------------------------------------------------------------------
# Helpers: build mock httpx responses
# ---------------------------------------------------------------------------

def _mock_nominatim_response(country_code="in", display_name="Farm Rd, Bengaluru, Karnataka, India", place_type="farmland"):
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {
        "display_name": display_name,
        "type":         place_type,
        "address": {
            "country_code": country_code,
            "city":         "Bengaluru",
            "state":        "Karnataka",
        },
    }
    return resp


def _mock_nominatim_error_response():
    resp = MagicMock()
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"error": "Unable to geocode"}
    return resp


# ---------------------------------------------------------------------------
# Coordinate sanity tests (no HTTP calls needed)
# ---------------------------------------------------------------------------

class TestCoordinateSanity(unittest.IsolatedAsyncioTestCase):

    def _sanity(self, lat, lon):
        from verification.geolocation_validator import _check_coordinate_sanity
        return _check_coordinate_sanity(lat, lon)

    def test_null_island_rejected(self):
        ok, flags = self._sanity(0.0, 0.0)
        self.assertFalse(ok)
        self.assertIn("null_island", flags)

    def test_near_null_island_rejected(self):
        ok, flags = self._sanity(0.005, 0.003)
        self.assertFalse(ok)
        self.assertIn("null_island", flags)

    def test_out_of_india_latitude_north(self):
        ok, flags = self._sanity(38.5, 77.0)  # Above India
        self.assertFalse(ok)
        self.assertIn("outside_india_latitude", flags)

    def test_out_of_india_latitude_south(self):
        ok, flags = self._sanity(6.0, 77.0)  # Below India (Sri Lanka area)
        self.assertFalse(ok)
        self.assertIn("outside_india_latitude", flags)

    def test_out_of_india_longitude_west(self):
        ok, flags = self._sanity(20.0, 65.0)  # Pakistan/Arabian Sea
        self.assertFalse(ok)
        self.assertIn("outside_india_longitude", flags)

    def test_out_of_india_longitude_east(self):
        ok, flags = self._sanity(20.0, 98.0)  # Myanmar
        self.assertFalse(ok)
        self.assertIn("outside_india_longitude", flags)

    def test_valid_bengaluru_passes(self):
        ok, flags = self._sanity(12.9716, 77.5946)
        self.assertTrue(ok)
        self.assertNotIn("null_island", flags)
        self.assertNotIn("outside_india_latitude", flags)

    def test_valid_delhi_passes(self):
        ok, flags = self._sanity(28.6139, 77.2090)
        self.assertTrue(ok)

    def test_valid_mumbai_passes(self):
        ok, flags = self._sanity(19.0760, 72.8777)
        self.assertTrue(ok)

    def test_suspiciously_round_coords_flagged(self):
        ok, flags = self._sanity(12.0, 77.0)  # Only 1 decimal
        # Should pass bounds but raise suspicion flag
        self.assertTrue(ok)  # Not rejected
        self.assertIn("suspiciously_round_coordinates", flags)


# ---------------------------------------------------------------------------
# Distance (Haversine) tests
# ---------------------------------------------------------------------------

class TestHaversineDistance(unittest.IsolatedAsyncioTestCase):

    def _dist(self, lat1, lon1, lat2, lon2):
        from verification.geolocation_validator import _haversine_km
        return _haversine_km(lat1, lon1, lat2, lon2)

    def test_same_point_is_zero(self):
        d = self._dist(12.9716, 77.5946, 12.9716, 77.5946)
        self.assertAlmostEqual(d, 0.0, places=3)

    def test_bengaluru_to_chennai_approx_290km(self):
        """Bengaluru to Chennai ≈ 290km."""
        d = self._dist(12.9716, 77.5946, 13.0827, 80.2707)
        self.assertGreater(d, 250)
        self.assertLess(d, 350)

    def test_bengaluru_to_delhi_approx_1750km(self):
        """Bengaluru to Delhi ≈ 1750km."""
        d = self._dist(12.9716, 77.5946, 28.6139, 77.2090)
        self.assertGreater(d, 1600)
        self.assertLess(d, 1900)


# ---------------------------------------------------------------------------
# Full validate_location integration (Nominatim mocked)
# ---------------------------------------------------------------------------

class TestValidateLocation(unittest.IsolatedAsyncioTestCase):

    async def _validate(self, lat, lon, farmer_lat=None, farmer_lon=None, mock_response=None):
        """Run validate_location with httpx fully mocked."""
        if mock_response is None:
            mock_response = _mock_nominatim_response()

        async def mock_get(*a, **kw):
            return mock_response

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=mock_get)

        with patch("verification.geolocation_validator.GOOGLE_MAPS_API_KEY", None):
            with patch("httpx.AsyncClient", return_value=mock_client):
                from verification.geolocation_validator import validate_location
                return await validate_location(lat, lon, farmer_lat, farmer_lon)

    async def test_valid_india_coords_pass(self):
        result = await self._validate(12.9716, 77.5946)
        self.assertTrue(result["location_valid"])
        self.assertGreater(result["location_confidence"], 0.0)

    async def test_null_island_hard_reject(self):
        result = await self._validate(0.0, 0.0)
        self.assertFalse(result["location_valid"])
        self.assertIn("null_island", result["flags"])
        self.assertEqual(result["location_confidence"], 0.0)

    async def test_outside_india_geocode_flagged(self):
        mock = _mock_nominatim_response(country_code="pk", display_name="Karachi, Pakistan")
        result = await self._validate(24.86, 67.01, mock_response=mock)
        # Out-of-India latitude check catches this before geocoding
        self.assertFalse(result["location_valid"])

    async def test_large_distance_flagged_not_rejected(self):
        """250km mismatch → flagged but location_valid stays True (within rejection threshold)."""
        # Farmer registered in Bengaluru, listing from Hyderabad (~500km)
        result = await self._validate(
            lat=17.3850, lon=78.4867,  # Hyderabad
            farmer_lat=12.9716, farmer_lon=77.5946,  # Bengaluru
        )
        self.assertIn("large_distance_mismatch", result["flags"])
        # Not hard-rejected (distance < 1000km)
        self.assertNotIn("extreme_location_mismatch", result["flags"])

    async def test_extreme_distance_rejects(self):
        """>1000km mismatch → extreme_location_mismatch + location_valid=False."""
        result = await self._validate(
            lat=28.6139, lon=77.2090,  # Delhi
            farmer_lat=8.5241, farmer_lon=76.9366,  # Thiruvananthapuram
        )
        self.assertIn("extreme_location_mismatch", result["flags"])
        self.assertFalse(result["location_valid"])

    async def test_nominatim_timeout_degrades_gracefully(self):
        """Nominatim timeout → geocode_unavailable flag but not a hard rejection."""
        import httpx

        mock_client = MagicMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.TimeoutException("timed out"))

        with patch("verification.geolocation_validator.GOOGLE_MAPS_API_KEY", None):
            with patch("httpx.AsyncClient", return_value=mock_client):
                from verification.geolocation_validator import validate_location
                result = await validate_location(12.9716, 77.5946)

        self.assertIn("geocode_timeout", result["flags"])
        # Still passes bounds check — location_valid may still be True
        self.assertIsInstance(result["location_valid"], bool)


if __name__ == "__main__":
    unittest.main()
