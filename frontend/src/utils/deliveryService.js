import api from '../api/axios';

/**
 * Delivery Agent & Distance Expenditure Calculator Utility
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

// Initial Registered Delivery Agents
const DEFAULT_AGENTS = [
  {
    id: 'agent_driver_1',
    name: 'Ramesh Gowda',
    phone: '9845012345',
    vehicleType: 'Mahindra Bolero Pickup 🚚',
    vehicleNumber: 'KA-06-EA-4821',
    capacity: '1.5 Tons',
    ratePerKm: 18,
    rating: 4.9,
    tripsCompleted: 142,
    location: 'Tumakuru',
    isAvailable: true,
  },
  {
    id: 'agent_driver_2',
    name: 'Suresh Kumar',
    phone: '9880198765',
    vehicleType: 'Tata Ace Chota Hathi 🚐',
    vehicleNumber: 'KA-04-MB-9102',
    capacity: '750 kg',
    ratePerKm: 14,
    rating: 4.8,
    tripsCompleted: 98,
    location: 'Bengaluru / Kolar',
    isAvailable: true,
  },
  {
    id: 'agent_driver_3',
    name: 'Basavaraj Patil',
    phone: '9900234567',
    vehicleType: 'Eicher 14ft Commercial Truck 🚚',
    vehicleNumber: 'KA-13-F-3301',
    capacity: '4.0 Tons',
    ratePerKm: 28,
    rating: 4.95,
    tripsCompleted: 215,
    location: 'Mandya / Mysuru',
    isAvailable: true,
  },
  {
    id: 'agent_driver_4',
    name: 'Manjunath B.',
    phone: '9740567890',
    vehicleType: 'Swaraj Agricultural Trailer 🚜',
    vehicleNumber: 'KA-16-TR-8812',
    capacity: '3.0 Tons',
    ratePerKm: 22,
    rating: 4.7,
    tripsCompleted: 64,
    location: 'Shimoga / Davanagere',
    isAvailable: true,
  }
];

/**
 * Calculate distance in km between origin and destination
 */
export function calculateDistance(originStr = '', destinationStr = '') {
  const orig = originStr.toLowerCase().replace(/[^a-z]/g, '');
  const dest = destinationStr.toLowerCase().replace(/[^a-z]/g, '');

  if (!orig || !dest || orig === dest) return 15; // default local delivery

  for (const [key, dist] of Object.entries(DISTANCE_MATRIX)) {
    if (key.includes(orig) && key.includes(dest)) {
      return dist;
    }
  }

  // Fallback deterministic distance based on string length hashing
  const hash = Math.abs((orig.length * 37) + (dest.length * 19)) % 180;
  return Math.max(25, hash + 30);
}

/**
 * Calculate total transport expenditure cost
 */
export function calculateTransportExpenditure(distanceKm, ratePerKm = 18, baseFee = 100) {
  const distanceCost = distanceKm * ratePerKm;
  const total = baseFee + distanceCost;
  return {
    baseFee,
    distanceKm,
    ratePerKm,
    distanceCost,
    totalExpenditure: Math.round(total),
  };
}

let cachedAgents = [];

/**
 * Get real rating statistics and reviews for a delivery agent
 */
export function getAgentRatingStats(agentId) {
  const agent = cachedAgents.find(a => (a.id === agentId || a._id === agentId));
  if (agent) {
    return {
      averageRating: agent.rating || 4.8,
      totalReviews: agent.totalReviews || agent.reviews?.length || 0,
      reviews: agent.reviews || []
    };
  }
  return { averageRating: 4.8, totalReviews: 0, reviews: [] };
}

/**
 * Submit a new review & star rating for a delivery agent to MongoDB
 */
export async function addAgentReview(agentId, { rating, reviewText, reviewerName, orderId }) {
  try {
    const res = await api.post(`/auth/delivery-agents/${agentId}/reviews`, {
      rating,
      reviewText,
      reviewerName,
      orderId
    });
    return res.data?.review || { rating, reviewText, reviewerName, orderId };
  } catch (err) {
    console.error('Failed to save review to MongoDB:', err);
    return null;
  }
}

/**
 * Fetch real delivery agents from backend MongoDB database
 */
export async function fetchRealDeliveryAgents() {
  try {
    const response = await api.get('/auth/delivery-agents');
    if (response.data && response.data.success && Array.isArray(response.data.agents)) {
      cachedAgents = response.data.agents;
      return cachedAgents;
    }
  } catch (error) {
    console.warn('Backend delivery-agents fetch failed, using fallback:', error?.message);
  }

  return cachedAgents.length > 0 ? cachedAgents : DEFAULT_AGENTS;
}

/**
 * Get all available delivery agents (from memory cache or defaults)
 */
export function getAvailableDeliveryAgents() {
  return cachedAgents.length > 0 ? cachedAgents : DEFAULT_AGENTS;
}

/**
 * Register a new delivery agent profile in local session
 */
export function registerDeliveryAgent(agentData) {
  const newAgent = {
    id: agentData._id || agentData.id || `agent_${Date.now()}`,
    rating: 5.0,
    tripsCompleted: 0,
    isAvailable: true,
    ...agentData,
  };
  cachedAgents = [newAgent, ...cachedAgents];
  return newAgent;
}

/**
 * Save a new driver booking
 */
export function createDeliveryBooking(orderId, driver, expenditureDetails, origin, destination, farmerDetails = {}, buyerDropDetails = {}) {
  const bookingId = orderId || `DEL-REQ-${Date.now().toString().slice(-6)}`;
  const booking = {
    _id: bookingId,
    id: bookingId,
    orderId: bookingId,
    driver,
    deliveryAgent: driver?.id || driver?._id || driver?.name,
    driverId: driver?.id || driver?._id,
    driverName: driver?.name,
    expenditureDetails,
    deliveryFare: expenditureDetails?.totalExpenditure || 0,
    deliveryDistance: expenditureDetails?.distanceKm || 15,
    origin,
    destination,
    farmerDetails: {
      farmerName: farmerDetails.farmerName || 'Sourcing Farmer',
      farmerPhone: farmerDetails.farmerPhone || '9845012345',
      farmerAltPhone: farmerDetails.farmerAltPhone || '',
      cropTypeQuantity: farmerDetails.cropTypeQuantity || 'Farm Produce',
      pickupDistrict: farmerDetails.pickupDistrict || 'Tumakuru',
      pickupAddress: farmerDetails.pickupAddress || 'Farm Location',
      pickupPincode: farmerDetails.pickupPincode || '',
      pickupTimeSlot: farmerDetails.pickupTimeSlot || 'Morning'
    },
    buyerDropDetails: {
      buyerName: buyerDropDetails.buyerName || 'Verified Buyer',
      buyerPhone: buyerDropDetails.buyerPhone || '',
      dropDistrict: buyerDropDetails.dropDistrict || 'Bengaluru',
      dropAddress: buyerDropDetails.dropAddress || 'Destination Address'
    },
    farmer: {
      name: farmerDetails.farmerName || 'Sourcing Farmer',
      phone: farmerDetails.farmerPhone || '9845012345',
      location: { address: farmerDetails.pickupAddress || 'Farm Location', district: farmerDetails.pickupDistrict || 'Tumakuru' }
    },
    buyer: {
      name: buyerDropDetails.buyerName || 'Verified Buyer',
      phone: buyerDropDetails.buyerPhone || '',
      location: { address: buyerDropDetails.dropAddress || 'Destination Address', district: buyerDropDetails.dropDistrict || 'Bengaluru' }
    },
    items: [
      {
        listing: {
          cropName: farmerDetails.cropTypeQuantity || 'Farm Produce',
          quantity: farmerDetails.cropTypeQuantity || '1 Batch'
        },
        quantity: 1
      }
    ],
    status: 'pending_driver_approval', // 'pending_driver_approval' | 'driver_accepted' | 'collected' | 'delivered' | 'driver_rejected'
    deliveryRequestStatus: 'pending_driver_approval',
    createdAt: new Date().toISOString(),
  };

  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    bookings[bookingId] = booking;
    localStorage.setItem('kb_delivery_bookings', JSON.stringify(bookings));
  } catch (_) {}

  return booking;
}

/**
 * Get delivery booking for an order / booking ID
 */
export function getDeliveryBooking(orderId) {
  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    return bookings[orderId] || null;
  } catch (_) {}
  return null;
}

/**
 * Get all delivery bookings stored locally
 */
export function getAllDeliveryBookings() {
  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    return Object.values(bookings);
  } catch (_) {
    return [];
  }
}

/**
 * Get pending and active delivery requests for a specific delivery agent
 */
export function getAgentDeliveryRequests(agentId, agentName) {
  try {
    const bookings = getAllDeliveryBookings();
    return bookings.filter(b => {
      const matchId = agentId && (b.driverId === agentId || b.deliveryAgent === agentId || b.driver?.id === agentId || b.driver?._id === agentId);
      const matchName = agentName && (b.driverName === agentName || b.driver?.name === agentName);
      return matchId || matchName || (!agentId && !agentName);
    });
  } catch (_) {
    return [];
  }
}

/**
 * Update status of delivery booking
 */
export function updateDeliveryBookingStatus(orderId, newStatus) {
  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    if (bookings[orderId]) {
      bookings[orderId].status = newStatus;
      bookings[orderId].deliveryRequestStatus = newStatus;
      bookings[orderId].updatedAt = new Date().toISOString();
      localStorage.setItem('kb_delivery_bookings', JSON.stringify(bookings));
      return bookings[orderId];
    }
  } catch (_) {}
  return null;
}

