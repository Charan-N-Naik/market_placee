/**
 * Server-Side Delivery Distance and Matrix Calculator Service
 */

// Regional District Matrix (approximate distances in KM between Karnataka/regional agricultural hubs)
const DISTANCE_MATRIX = {
  'tumakuru-bengaluru': 72,
  'tumakuru-mysuru': 155,
  'tumakuru-hubballi': 340,
  'kolar-bengaluru': 65,
  'kolar-tumakuru': 130,
  'mandya-bengaluru': 100,
  'mandya-mysuru': 45,
  'shimoga-bengaluru': 300,
  'shimoga-tumakuru': 230,
  'belagavi-bengaluru': 500,
  'hassan-bengaluru': 180,
  'davanagere-bengaluru': 260,
};

/**
 * Calculate distance in km between origin and destination location strings
 */
export function calculateDistance(originStr = '', destinationStr = '') {
  const orig = (originStr || '').toLowerCase().replace(/[^a-z]/g, '');
  const dest = (destinationStr || '').toLowerCase().replace(/[^a-z]/g, '');

  if (!orig || !dest || orig === dest) return 15; // default local delivery

  for (const [key, dist] of Object.entries(DISTANCE_MATRIX)) {
    if (key.includes(orig) && key.includes(dest)) {
      return dist;
    }
  }

  // Fallback deterministic distance calculation
  const hash = Math.abs((orig.length * 37) + (dest.length * 19)) % 180;
  return Math.max(25, hash + 30);
}

/**
 * Rank available delivery agents by distance to the farmer, then by rating
 */
export function rankAgentsByProximityAndRating(agents = [], farmerLocationStr = '') {
  return [...agents].sort((a, b) => {
    const locA = a.location?.district || a.location?.address || 'Karnataka';
    const locB = b.location?.district || b.location?.address || 'Karnataka';

    const distA = calculateDistance(farmerLocationStr, locA);
    const distB = calculateDistance(farmerLocationStr, locB);

    if (distA !== distB) {
      return distA - distB; // Closest first
    }

    // Secondary sort: higher rating first
    const ratingA = a.rating || a.deliveryAgentProfile?.rating || 4.5;
    const ratingB = b.rating || b.deliveryAgentProfile?.rating || 4.5;
    return ratingB - ratingA;
  });
}
