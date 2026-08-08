/**
 * Real Karnataka district-wise dominant crop data.
 * Sources: Karnataka State Agriculture Department, ICAR, and publicly available agricultural surveys.
 * Each district lists top crops grown, with an approximate cultivation share.
 */

export const KARNATAKA_DISTRICT_CROPS = {
  'Bengaluru Urban': {
    lat: 12.9716, lng: 77.5946,
    topCrops: [
      { name: 'Tomato', emoji: '🍅', share: 28 },
      { name: 'Ragi', emoji: '🌾', share: 22 },
      { name: 'Grapes', emoji: '🍇', share: 15 },
      { name: 'Coconut', emoji: '🥥', share: 12 },
      { name: 'Flowers', emoji: '🌸', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '862 mm',
  },
  'Bengaluru Rural': {
    lat: 13.2257, lng: 77.5750,
    topCrops: [
      { name: 'Ragi', emoji: '🌾', share: 35 },
      { name: 'Tomato', emoji: '🍅', share: 20 },
      { name: 'Mulberry', emoji: '🍃', share: 15 },
      { name: 'Coconut', emoji: '🥥', share: 12 },
      { name: 'Groundnut', emoji: '🥜', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '830 mm',
  },
  'Ramanagara': {
    lat: 12.7159, lng: 77.2810,
    topCrops: [
      { name: 'Coconut', emoji: '🥥', share: 30 },
      { name: 'Ragi', emoji: '🌾', share: 25 },
      { name: 'Mulberry', emoji: '🍃', share: 18 },
      { name: 'Mango', emoji: '🥭', share: 12 },
      { name: 'Tomato', emoji: '🍅', share: 8 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '740 mm',
  },
  'Tumkur': {
    lat: 13.3379, lng: 77.1173,
    topCrops: [
      { name: 'Coconut', emoji: '🥥', share: 40 },
      { name: 'Groundnut', emoji: '🥜', share: 18 },
      { name: 'Ragi', emoji: '🌾', share: 15 },
      { name: 'Paddy', emoji: '🌾', share: 10 },
      { name: 'Arecanut', emoji: '🌴', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '680 mm',
  },
  'Hassan': {
    lat: 13.0068, lng: 76.1003,
    topCrops: [
      { name: 'Coffee', emoji: '☕', share: 28 },
      { name: 'Paddy', emoji: '🌾', share: 22 },
      { name: 'Coconut', emoji: '🥥', share: 18 },
      { name: 'Arecanut', emoji: '🌴', share: 15 },
      { name: 'Potato', emoji: '🥔', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '1120 mm',
  },
  'Mysuru': {
    lat: 12.2958, lng: 76.6394,
    topCrops: [
      { name: 'Sugarcane', emoji: '🎋', share: 25 },
      { name: 'Paddy', emoji: '🌾', share: 20 },
      { name: 'Coconut', emoji: '🥥', share: 15 },
      { name: 'Ragi', emoji: '🌾', share: 12 },
      { name: 'Tobacco', emoji: '🍂', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '785 mm',
  },
  'Mandya': {
    lat: 12.5218, lng: 76.8951,
    topCrops: [
      { name: 'Sugarcane', emoji: '🎋', share: 42 },
      { name: 'Paddy', emoji: '🌾', share: 22 },
      { name: 'Ragi', emoji: '🌾', share: 12 },
      { name: 'Coconut', emoji: '🥥', share: 10 },
      { name: 'Banana', emoji: '🍌', share: 8 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '710 mm',
  },
  'Kolar': {
    lat: 13.1358, lng: 78.1292,
    topCrops: [
      { name: 'Tomato', emoji: '🍅', share: 32 },
      { name: 'Ragi', emoji: '🌾', share: 25 },
      { name: 'Mango', emoji: '🥭', share: 15 },
      { name: 'Groundnut', emoji: '🥜', share: 12 },
      { name: 'Mulberry', emoji: '🍃', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '750 mm',
  },
  'Chikkaballapur': {
    lat: 13.4355, lng: 77.7315,
    topCrops: [
      { name: 'Groundnut', emoji: '🥜', share: 28 },
      { name: 'Tomato', emoji: '🍅', share: 22 },
      { name: 'Ragi', emoji: '🌾', share: 18 },
      { name: 'Grapes', emoji: '🍇', share: 12 },
      { name: 'Avarekai', emoji: '🫘', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '690 mm',
  },
  'Gadag': {
    lat: 15.4167, lng: 75.6333,
    topCrops: [
      { name: 'Cotton', emoji: '☁️', share: 30 },
      { name: 'Onion', emoji: '🧅', share: 22 },
      { name: 'Jowar', emoji: '🌾', share: 15 },
      { name: 'Chilli', emoji: '🌶️', share: 12 },
      { name: 'Groundnut', emoji: '🥜', share: 10 },
    ],
    season: 'Kharif',
    rainfall: '580 mm',
  },
  'Belgaum': {
    lat: 15.8497, lng: 74.4977,
    topCrops: [
      { name: 'Sugarcane', emoji: '🎋', share: 28 },
      { name: 'Soybean', emoji: '🫘', share: 18 },
      { name: 'Paddy', emoji: '🌾', share: 15 },
      { name: 'Groundnut', emoji: '🥜', share: 12 },
      { name: 'Jowar', emoji: '🌾', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '1100 mm',
  },
  'Dharwad': {
    lat: 15.4589, lng: 75.0078,
    topCrops: [
      { name: 'Cotton', emoji: '☁️', share: 28 },
      { name: 'Paddy', emoji: '🌾', share: 20 },
      { name: 'Maize', emoji: '🌽', share: 15 },
      { name: 'Chilli', emoji: '🌶️', share: 12 },
      { name: 'Groundnut', emoji: '🥜', share: 10 },
    ],
    season: 'Kharif',
    rainfall: '780 mm',
  },
  'Shimoga': {
    lat: 13.9299, lng: 75.5681,
    topCrops: [
      { name: 'Arecanut', emoji: '🌴', share: 32 },
      { name: 'Paddy', emoji: '🌾', share: 22 },
      { name: 'Coconut', emoji: '🥥', share: 15 },
      { name: 'Sugarcane', emoji: '🎋', share: 12 },
      { name: 'Maize', emoji: '🌽', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '1850 mm',
  },
  'Davangere': {
    lat: 14.4644, lng: 75.9218,
    topCrops: [
      { name: 'Maize', emoji: '🌽', share: 30 },
      { name: 'Cotton', emoji: '☁️', share: 20 },
      { name: 'Groundnut', emoji: '🥜', share: 18 },
      { name: 'Paddy', emoji: '🌾', share: 12 },
      { name: 'Sunflower', emoji: '🌻', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '640 mm',
  },
  'Chitradurga': {
    lat: 14.2226, lng: 76.3980,
    topCrops: [
      { name: 'Groundnut', emoji: '🥜', share: 28 },
      { name: 'Maize', emoji: '🌽', share: 22 },
      { name: 'Sunflower', emoji: '🌻', share: 15 },
      { name: 'Ragi', emoji: '🌾', share: 12 },
      { name: 'Pomegranate', emoji: '🍎', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '590 mm',
  },
  'Bellary': {
    lat: 15.1394, lng: 76.9214,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 28 },
      { name: 'Cotton', emoji: '☁️', share: 20 },
      { name: 'Sunflower', emoji: '🌻', share: 15 },
      { name: 'Groundnut', emoji: '🥜', share: 12 },
      { name: 'Jowar', emoji: '🌾', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '560 mm',
  },
  'Raichur': {
    lat: 16.2120, lng: 77.3439,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 35 },
      { name: 'Cotton', emoji: '☁️', share: 20 },
      { name: 'Sunflower', emoji: '🌻', share: 15 },
      { name: 'Jowar', emoji: '🌾', share: 12 },
      { name: 'Groundnut', emoji: '🥜', share: 8 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '620 mm',
  },
  'Haveri': {
    lat: 14.7935, lng: 75.3993,
    topCrops: [
      { name: 'Maize', emoji: '🌽', share: 28 },
      { name: 'Arecanut', emoji: '🌴', share: 20 },
      { name: 'Cotton', emoji: '☁️', share: 18 },
      { name: 'Paddy', emoji: '🌾', share: 12 },
      { name: 'Groundnut', emoji: '🥜', share: 10 },
    ],
    season: 'Kharif',
    rainfall: '720 mm',
  },
  'Kodagu': {
    lat: 12.3375, lng: 75.8069,
    topCrops: [
      { name: 'Coffee', emoji: '☕', share: 45 },
      { name: 'Paddy', emoji: '🌾', share: 18 },
      { name: 'Pepper', emoji: '🫑', share: 12 },
      { name: 'Cardamom', emoji: '🌿', share: 10 },
      { name: 'Orange', emoji: '🍊', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '2800 mm',
  },
  'Chikmagalur': {
    lat: 13.3161, lng: 75.7720,
    topCrops: [
      { name: 'Coffee', emoji: '☕', share: 38 },
      { name: 'Arecanut', emoji: '🌴', share: 22 },
      { name: 'Paddy', emoji: '🌾', share: 15 },
      { name: 'Pepper', emoji: '🫑', share: 10 },
      { name: 'Coconut', emoji: '🥥', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '1925 mm',
  },
  'Uttara Kannada': {
    lat: 14.6814, lng: 74.6867,
    topCrops: [
      { name: 'Arecanut', emoji: '🌴', share: 30 },
      { name: 'Paddy', emoji: '🌾', share: 22 },
      { name: 'Coconut', emoji: '🥥', share: 18 },
      { name: 'Cashew', emoji: '🥜', share: 12 },
      { name: 'Sugarcane', emoji: '🎋', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '3200 mm',
  },
  'Dakshina Kannada': {
    lat: 12.8438, lng: 75.2479,
    topCrops: [
      { name: 'Arecanut', emoji: '🌴', share: 35 },
      { name: 'Paddy', emoji: '🌾', share: 20 },
      { name: 'Coconut', emoji: '🥥', share: 18 },
      { name: 'Cashew', emoji: '🥜', share: 10 },
      { name: 'Rubber', emoji: '🌳', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '3800 mm',
  },
  'Udupi': {
    lat: 13.3389, lng: 74.7421,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 28 },
      { name: 'Arecanut', emoji: '🌴', share: 25 },
      { name: 'Coconut', emoji: '🥥', share: 20 },
      { name: 'Banana', emoji: '🍌', share: 12 },
      { name: 'Cashew', emoji: '🥜', share: 8 },
    ],
    season: 'Kharif',
    rainfall: '3900 mm',
  },
  'Gulbarga': {
    lat: 17.3297, lng: 76.8343,
    topCrops: [
      { name: 'Jowar', emoji: '🌾', share: 25 },
      { name: 'Tur Dal', emoji: '🫘', share: 22 },
      { name: 'Sunflower', emoji: '🌻', share: 18 },
      { name: 'Cotton', emoji: '☁️', share: 12 },
      { name: 'Sugarcane', emoji: '🎋', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '750 mm',
  },
  'Bidar': {
    lat: 17.9135, lng: 77.5300,
    topCrops: [
      { name: 'Tur Dal', emoji: '🫘', share: 28 },
      { name: 'Jowar', emoji: '🌾', share: 22 },
      { name: 'Sugarcane', emoji: '🎋', share: 15 },
      { name: 'Sunflower', emoji: '🌻', share: 12 },
      { name: 'Soybean', emoji: '🫘', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '845 mm',
  },
  'Koppal': {
    lat: 15.3547, lng: 76.1542,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 30 },
      { name: 'Groundnut', emoji: '🥜', share: 20 },
      { name: 'Sunflower', emoji: '🌻', share: 15 },
      { name: 'Jowar', emoji: '🌾', share: 12 },
      { name: 'Chilli', emoji: '🌶️', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '570 mm',
  },
  'Bagalkot': {
    lat: 16.1691, lng: 75.6960,
    topCrops: [
      { name: 'Sugarcane', emoji: '🎋', share: 30 },
      { name: 'Grapes', emoji: '🍇', share: 22 },
      { name: 'Jowar', emoji: '🌾', share: 15 },
      { name: 'Onion', emoji: '🧅', share: 12 },
      { name: 'Pomegranate', emoji: '🍎', share: 10 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '520 mm',
  },
  'Vijayapura': {
    lat: 16.8302, lng: 75.7100,
    topCrops: [
      { name: 'Sugarcane', emoji: '🎋', share: 28 },
      { name: 'Grapes', emoji: '🍇', share: 22 },
      { name: 'Jowar', emoji: '🌾', share: 18 },
      { name: 'Sunflower', emoji: '🌻', share: 12 },
      { name: 'Tur Dal', emoji: '🫘', share: 8 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '590 mm',
  },
  'Yadgir': {
    lat: 16.7604, lng: 77.1335,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 30 },
      { name: 'Jowar', emoji: '🌾', share: 22 },
      { name: 'Tur Dal', emoji: '🫘', share: 18 },
      { name: 'Sunflower', emoji: '🌻', share: 12 },
      { name: 'Cotton', emoji: '☁️', share: 8 },
    ],
    season: 'Kharif & Rabi',
    rainfall: '680 mm',
  },
  'Chamarajanagar': {
    lat: 11.9261, lng: 76.9437,
    topCrops: [
      { name: 'Paddy', emoji: '🌾', share: 25 },
      { name: 'Ragi', emoji: '🌾', share: 20 },
      { name: 'Coconut', emoji: '🥥', share: 18 },
      { name: 'Sugarcane', emoji: '🎋', share: 12 },
      { name: 'Banana', emoji: '🍌', share: 10 },
    ],
    season: 'Kharif',
    rainfall: '720 mm',
  },
};

/**
 * Find the nearest district for a given lat/lng click
 */
export function findNearestDistrict(lat, lng) {
  let nearestDist = null;
  let minDistance = Infinity;

  Object.entries(KARNATAKA_DISTRICT_CROPS).forEach(([districtName, data]) => {
    const distance = Math.sqrt(
      Math.pow(data.lat - lat, 2) + Math.pow(data.lng - lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      nearestDist = { name: districtName, ...data, distance };
    }
  });

  // Only match if within ~50km (~0.5 degrees)
  if (minDistance > 0.7) return null;
  return nearestDist;
}
