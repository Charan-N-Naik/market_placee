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

/**
 * Get all available delivery agents (registered + storage)
 */
export function getAvailableDeliveryAgents() {
  try {
    const saved = localStorage.getItem('kb_registered_delivery_agents');
    if (saved) {
      const custom = JSON.parse(saved);
      return [...custom, ...DEFAULT_AGENTS];
    }
  } catch (_) {}
  return DEFAULT_AGENTS;
}

/**
 * Register a new delivery agent profile
 */
export function registerDeliveryAgent(agentData) {
  const agents = getAvailableDeliveryAgents();
  const newAgent = {
    id: `agent_${Date.now()}`,
    rating: 5.0,
    tripsCompleted: 0,
    isAvailable: true,
    ...agentData,
  };
  
  try {
    const custom = JSON.parse(localStorage.getItem('kb_registered_delivery_agents') || '[]');
    custom.unshift(newAgent);
    localStorage.setItem('kb_registered_delivery_agents', JSON.stringify(custom));
  } catch (_) {}

  return newAgent;
}

/**
 * Save a new driver booking
 */
export function createDeliveryBooking(orderId, driver, expenditureDetails, origin, destination) {
  const booking = {
    id: `del_book_${Date.now()}`,
    orderId,
    driver,
    expenditureDetails,
    origin,
    destination,
    status: 'assigned', // 'assigned' | 'packed' | 'collected' | 'shipped' | 'delivered'
    createdAt: new Date().toISOString(),
  };

  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    bookings[orderId] = booking;
    localStorage.setItem('kb_delivery_bookings', JSON.stringify(bookings));
  } catch (_) {}

  return booking;
}

/**
 * Get delivery booking for an order
 */
export function getDeliveryBooking(orderId) {
  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    return bookings[orderId] || null;
  } catch (_) {}
  return null;
}

/**
 * Update status of delivery booking
 */
export function updateDeliveryBookingStatus(orderId, newStatus) {
  try {
    const bookings = JSON.parse(localStorage.getItem('kb_delivery_bookings') || '{}');
    if (bookings[orderId]) {
      bookings[orderId].status = newStatus;
      bookings[orderId].updatedAt = new Date().toISOString();
      localStorage.setItem('kb_delivery_bookings', JSON.stringify(bookings));
      return bookings[orderId];
    }
  } catch (_) {}
  return null;
}
