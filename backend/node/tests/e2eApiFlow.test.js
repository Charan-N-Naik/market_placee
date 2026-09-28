import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import { io as ClientIO } from 'socket.io-client';
import Listing from '../models/Listing.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

// Prefer IPv4 for DNS resolution
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? `(${details})` : ''}`);
    failed++;
  }
}

async function api(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_URL}${endpoint}`, options);
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch (_) {
    data = text;
  }
  return { status: res.status, data, ok: res.ok };
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function waitForSocketEvent(socket, eventName, timeoutMs = 5000, predicate = null) {
  return new Promise((resolve, reject) => {
    let timer = null;
    const handler = (data) => {
      if (!predicate || predicate(data)) {
        cleanup();
        resolve(data);
      }
    };

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, handler);
    };

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeoutMs}ms waiting for socket event "${eventName}"`));
    }, timeoutMs);

    socket.on(eventName, handler);
  });
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('  KisanBazaar API End-to-End Test Suite (Flow a–e)  ');
  console.log('====================================================\n');

  // Safety guard: Require database name to contain "test"
  if (process.env.MONGODB_URI_TEST) {
    process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
  }
  const mongoUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || '';
  let dbName = '';
  try {
    const parsed = new URL(mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    dbName = (parsed.pathname || '').replace(/^\//, '').split('?')[0];
  } catch (e) {
    dbName = '';
  }

  if (!dbName.toLowerCase().includes('test')) {
    console.error(`❌ Refusing to run tests: Target database "${dbName}" does not contain "test".`);
    console.error('   Please run against the test database (MONGODB_URI_TEST).');
    process.exit(1);
  }

  // Connect to DB directly for state inspections (stock verification)
  await mongoose.connect(mongoUri);
  console.log(`Connected to test database: ${mongoose.connection.name}\n`);

  // Check server health
  let health;
  try {
    health = await api('GET', '/health');
    assert(health.status === 200 && health.data?.ok === true, 'Server Health Check: dev:test is running on port 5000');
  } catch (err) {
    console.error('❌ Could not connect to dev:test server at http://localhost:5000.');
    console.error('   Please make sure the server is running with: npm run dev:test');
    process.exit(1);
  }

  // Refuse to run unless server's dbName contains "test"
  const serverDbName = health.data?.dbName || '';
  if (!serverDbName.toLowerCase().includes('test')) {
    console.error(`❌ Refusing to run tests: Server database "${serverDbName || '(unknown)'}" does not contain "test".`);
    console.error('   The server must be running with USE_TEST_DB=true (dev:test mode).');
    process.exit(1);
  }
  assert(true, `Server Health Check: dev:test confirmed connected to test database "${serverDbName}"`);

  // ──────────────────────────────────────────────────
  // Step a: Buyer logs in, adds crops, places auto_assign order -> 2 orders, stock decreases
  // ──────────────────────────────────────────────────
  console.log('\n--- Step a: Buyer Order Placement & Cart Flow ---');
  const buyerLogin = await api('POST', '/auth/login', {
    loginId: 'buyer@kisan.test',
    password: 'Test@1234',
    role: 'buyer',
  });
  assert(buyerLogin.status === 200 && buyerLogin.data?.token, 'Step a: Buyer login successful');
  const buyerToken = buyerLogin.data.token;
  const buyerUser = buyerLogin.data.user;

  // Retrieve listings for Farmer A (Tomato) and Farmer B (Onion)
  const listingsRes = await api('GET', '/listings', null, buyerToken);
  const listingsList = Array.isArray(listingsRes.data)
    ? listingsRes.data
    : (listingsRes.data?.listings || listingsRes.data?.data || []);
  const listingTomato = listingsList.find((l) =>
    l.cropName?.toLowerCase() === 'tomato' &&
    (l.farmer?.name === 'Farmer A' || l.farmer?.email === 'farmer.a@kisan.test' || l.farmer === 'Farmer A')
  );
  const listingOnion = listingsList.find((l) =>
    l.cropName?.toLowerCase() === 'onion' &&
    (l.farmer?.name === 'Farmer B' || l.farmer?.email === 'farmer.b@kisan.test' || l.farmer === 'Farmer B')
  );

  assert(Boolean(listingTomato && listingOnion), 'Step a: Found Farmer A (Tomato) and Farmer B (Onion) seeded listings');

  const initialStockTomato = listingTomato.quantity;
  const initialStockOnion = listingOnion.quantity;

  // Add to cart
  const addTomato = await api('POST', '/cart/add', { listingId: listingTomato._id, quantity: 2 }, buyerToken);
  assert(addTomato.status === 200, 'Step a: Added 2 kg Tomato to cart');

  const addOnion = await api('POST', '/cart/add', { listingId: listingOnion._id, quantity: 1 }, buyerToken);
  assert(addOnion.status === 200, 'Step a: Added 1 kg Onion to cart');

  // Place order with auto_assign
  const orderRes = await api('POST', '/orders', {
    items: [
      { listing: listingTomato._id, quantity: 2 },
      { listing: listingOnion._id, quantity: 1 },
    ],
    deliveryAddress: {
      addressLine1: '123 Agri Lane',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
    paymentMethod: 'cod',
    deliveryMode: 'auto_assign',
  }, buyerToken);

  assert(orderRes.status === 201, 'Step a: Order creation returned 201 Created');
  const createdOrders = orderRes.data?.orders || [];
  assert(createdOrders.length === 2, 'Step a: Mixed cart split into exactly 2 orders (1 per farmer)');

  const tomatoFarmerId = String(listingTomato.farmer?._id || listingTomato.farmer);
  const onionFarmerId = String(listingOnion.farmer?._id || listingOnion.farmer);
  const orderTomato = createdOrders.find((o) => String(o.farmer?._id || o.farmer) === tomatoFarmerId);
  const orderOnion = createdOrders.find((o) => String(o.farmer?._id || o.farmer) === onionFarmerId);

  assert(Boolean(orderTomato && orderOnion), 'Step a: Identified Order A (Tomato) and Order B (Onion)');

  // Verify stock decreases
  const updatedListingTomato = await Listing.findById(listingTomato._id);
  const updatedListingOnion = await Listing.findById(listingOnion._id);
  assert(updatedListingTomato.quantity === initialStockTomato - 2, 'Step a: Tomato stock decremented accurately');
  assert(updatedListingOnion.quantity === initialStockOnion - 1, 'Step a: Onion stock decremented accurately');

  // ──────────────────────────────────────────────────
  // Step b: Farmers accept, pack -> 3 agent offers. Agents 1 & 2 accept simultaneously -> 200 & 409
  // ──────────────────────────────────────────────────
  console.log('\n--- Step b: Farmer Pack & Concurrent Delivery Accept ---');
  const farmerALogin = await api('POST', '/auth/login', { loginId: 'farmer.a@kisan.test', password: 'Test@1234', role: 'farmer' });
  const farmerBLogin = await api('POST', '/auth/login', { loginId: 'farmer.b@kisan.test', password: 'Test@1234', role: 'farmer' });
  assert(farmerALogin.status === 200 && farmerBLogin.status === 200, 'Step b: Farmers A and B logged in successfully');
  const farmerAToken = farmerALogin.data.token;
  const farmerBToken = farmerBLogin.data.token;

  // Farmer A accepts and packs Order Tomato
  const acceptA = await api('PUT', `/orders/${orderTomato._id}/status`, { status: 'accepted' }, farmerAToken);
  const packA = await api('PUT', `/orders/${orderTomato._id}/status`, { status: 'packed' }, farmerAToken);
  assert(acceptA.status === 200 && packA.status === 200, 'Step b: Farmer A accepted and packed Order A');

  // Farmer B accepts and packs Order Onion
  const acceptB = await api('PUT', `/orders/${orderOnion._id}/status`, { status: 'accepted' }, farmerBLogin.data.token);
  const packB = await api('PUT', `/orders/${orderOnion._id}/status`, { status: 'packed' }, farmerBLogin.data.token);
  assert(acceptB.status === 200 && packB.status === 200, 'Step b: Farmer B accepted and packed Order B');

  // Log in agents 1, 2, 3
  const agent1Login = await api('POST', '/auth/login', { loginId: 'agent1@kisan.test', password: 'Test@1234', role: 'delivery_agent' });
  const agent2Login = await api('POST', '/auth/login', { loginId: 'agent2@kisan.test', password: 'Test@1234', role: 'delivery_agent' });
  const agent3Login = await api('POST', '/auth/login', { loginId: 'agent3@kisan.test', password: 'Test@1234', role: 'delivery_agent' });
  assert(agent1Login.status === 200 && agent2Login.status === 200 && agent3Login.status === 200, 'Step b: Agents 1, 2, 3 logged in successfully');

  const agent1Token = agent1Login.data.token;
  const agent2Token = agent2Login.data.token;
  const agent3Token = agent3Login.data.token;

  // Agents 1 and 2 accept Order Tomato concurrently
  const [resAgent1, resAgent2] = await Promise.all([
    api('PUT', `/orders/${orderTomato._id}/driver/respond`, { action: 'accept' }, agent1Token),
    api('PUT', `/orders/${orderTomato._id}/driver/respond`, { action: 'accept' }, agent2Token),
  ]);

  const has200 = resAgent1.status === 200 || resAgent2.status === 200;
  const has409 = resAgent1.status === 409 || resAgent2.status === 409;
  assert(has200 && has409, 'Step b: Concurrent accept on Order A: exactly one gets 200 and the other gets 409');

  const winnerToken = resAgent1.status === 200 ? agent1Token : agent2Token;
  const loserToken = resAgent1.status === 200 ? agent2Token : agent1Token;
  const winnerAgentId = resAgent1.status === 200 ? agent1Login.data.user._id : agent2Login.data.user._id;

  // ──────────────────────────────────────────────────
  // Step c: Socket joins, outsider rejection, location relay, non-assigned ignored
  // ──────────────────────────────────────────────────
  console.log('\n--- Step c: Real-Time Sockets & GPS Location Relay ---');
  const outsiderLogin = await api('POST', '/auth/login', { loginId: 'outsider@kisan.test', password: 'Test@1234', role: 'buyer' });
  assert(outsiderLogin.status === 200, 'Step c: Outsider logged in successfully');
  const outsiderToken = outsiderLogin.data.token;

  const roomName = `order:${orderTomato._id}`;

  const socketWinner = ClientIO(BASE_URL, { auth: { token: winnerToken }, reconnection: false, timeout: 5000 });
  const socketBuyer = ClientIO(BASE_URL, { auth: { token: buyerToken }, reconnection: false, timeout: 5000 });
  const socketFarmer = ClientIO(BASE_URL, { auth: { token: farmerAToken }, reconnection: false, timeout: 5000 });
  const socketOutsider = ClientIO(BASE_URL, { auth: { token: outsiderToken }, reconnection: false, timeout: 5000 });
  const socketLoser = ClientIO(BASE_URL, { auth: { token: loserToken }, reconnection: false, timeout: 5000 });

  await Promise.all([
    waitForSocketEvent(socketWinner, 'connect', 5000),
    waitForSocketEvent(socketBuyer, 'connect', 5000),
    waitForSocketEvent(socketFarmer, 'connect', 5000),
    waitForSocketEvent(socketOutsider, 'connect', 5000),
    waitForSocketEvent(socketLoser, 'connect', 5000),
  ]);
  assert(true, 'Step c: Sockets connected with authentication');

  // Outsider join rejection check: listen for error before emitting join
  const outsiderRejectedPromise = waitForSocketEvent(
    socketOutsider,
    'error',
    5000,
    (err) => err?.message?.includes('Not authorized')
  );

  socketWinner.emit('join_room', roomName);
  socketBuyer.emit('join_room', roomName);
  socketFarmer.emit('join_room', roomName);
  socketOutsider.emit('join_room', roomName);

  let outsiderRejected = false;
  try {
    const errorData = await outsiderRejectedPromise;
    outsiderRejected = Boolean(errorData?.message?.includes('Not authorized'));
  } catch (err) {
    console.error('Outsider join wait error:', err.message);
  }
  assert(outsiderRejected, 'Step c: Outsider join on order room is rejected with authorization error');

  // Location relay check: start polling for agent_location events
  const testCoords = { orderId: orderTomato._id, lat: 13.1358, lng: 78.1294 };

  const buyerLocationPromise = waitForSocketEvent(
    socketBuyer,
    'agent_location',
    5000,
    (loc) => loc?.lat === testCoords.lat && loc?.lng === testCoords.lng
  );
  const farmerLocationPromise = waitForSocketEvent(
    socketFarmer,
    'agent_location',
    5000,
    (loc) => loc?.lat === testCoords.lat && loc?.lng === testCoords.lng
  );

  let outsiderReceivedLocation = false;
  socketOutsider.on('agent_location', () => { outsiderReceivedLocation = true; });

  socketWinner.emit('agent_location_update', testCoords);

  let buyerReceivedLocation = null;
  let farmerReceivedLocation = null;
  try {
    [buyerReceivedLocation, farmerReceivedLocation] = await Promise.all([
      buyerLocationPromise,
      farmerLocationPromise,
    ]);
  } catch (err) {
    console.error('Location relay wait error:', err.message);
  }

  assert(
    buyerReceivedLocation?.lat === testCoords.lat && buyerReceivedLocation?.lng === testCoords.lng,
    'Step c: Buyer received agent_location update'
  );
  assert(
    farmerReceivedLocation?.lat === testCoords.lat && farmerReceivedLocation?.lng === testCoords.lng,
    'Step c: Farmer received agent_location update'
  );
  assert(!outsiderReceivedLocation, 'Step c: Outsider received nothing from the order room');

  // Location update from non-assigned agent ignored
  let nonAssignedRelayed = false;
  socketBuyer.on('agent_location', (loc) => {
    if (loc?.lat === 99.9999) nonAssignedRelayed = true;
  });

  const sentinelCoords = { orderId: orderTomato._id, lat: 13.2222, lng: 78.3333 };
  const sentinelPromise = waitForSocketEvent(
    socketBuyer,
    'agent_location',
    5000,
    (loc) => loc?.lat === sentinelCoords.lat && loc?.lng === sentinelCoords.lng
  );

  // Unauthorized loser emits update
  socketLoser.emit('agent_location_update', { orderId: orderTomato._id, lat: 99.9999, lng: 99.9999 });
  // Authorized winner emits sentinel immediately afterwards
  socketWinner.emit('agent_location_update', sentinelCoords);

  // Poll for sentinel to ensure all previous queue updates were processed
  try {
    await sentinelPromise;
  } catch (err) {
    console.error('Sentinel location wait error:', err.message);
  }

  assert(!nonAssignedRelayed, 'Step c: Location update from non-assigned account is ignored');

  // ──────────────────────────────────────────────────
  // Step d: Order progression (collected -> delivered -> received -> reviewed)
  // ──────────────────────────────────────────────────
  console.log('\n--- Step d: Delivery Lifecycle & Buyer Review ---');

  // Verify "collected before packed -> 400"
  // Create an unpacked order to test this guard directly
  const tempUnpackedOrder = await Order.create({
    buyer: buyerUser._id,
    farmer: listingTomato.farmer._id || listingTomato.farmer,
    items: [{ listing: listingTomato._id, quantity: 1, priceAtPurchase: 30 }],
    totalAmount: 30,
    status: 'pending',
    deliveryMode: 'auto_assign',
    deliveryAgent: winnerAgentId,
    deliveryRequestStatus: 'driver_accepted',
    shippingAddress: { name: 'Test', phone: '9000000001', addressLine1: 'Street', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001' },
    paymentMethod: 'cod',
  });

  const prematureCollect = await api('PUT', `/orders/${tempUnpackedOrder._id}/driver/status`, { status: 'collected' }, winnerToken);
  assert(prematureCollect.status === 400, 'Step d: Agent marked collected before packed -> 400 Bad Request');
  await Order.findByIdAndDelete(tempUnpackedOrder._id);

  // Now progress Order Tomato (which is in 'packed' state)
  const collectRes = await api('PUT', `/orders/${orderTomato._id}/driver/status`, { status: 'collected' }, winnerToken);
  assert(collectRes.status === 200, 'Step d: Agent marked Order A as collected (200 OK)');

  const deliverRes = await api('PUT', `/orders/${orderTomato._id}/driver/status`, { status: 'delivered' }, winnerToken);
  assert(deliverRes.status === 200, 'Step d: Agent marked Order A as delivered (200 OK)');

  // Buyer marks received
  const receiveRes = await api('PUT', `/orders/${orderTomato._id}/receive`, {}, buyerToken);
  assert(receiveRes.status === 200, 'Step d: Buyer marked Order A as received (200 OK)');

  // Buyer reviews the agent & order
  const rateRes = await api('POST', `/orders/${orderTomato._id}/rate`, {
    rating: 5,
    ratingComment: 'Exceptional farm produce and courteous delivery!',
  }, buyerToken);
  assert(rateRes.status === 200, 'Step d: Buyer reviewed the order/agent (200 OK)');

  // ──────────────────────────────────────────────────
  // Step e: Cancellation Guards
  // ──────────────────────────────────────────────────
  console.log('\n--- Step e: Cancellation Guard Policies ---');

  // Farmer cancel after collected -> 400
  // Order Tomato is collected/delivered/received
  const cancelCollectedRes = await api('PUT', `/orders/${orderTomato._id}/status`, { status: 'cancelled' }, farmerAToken);
  assert(cancelCollectedRes.status === 400, 'Step e: Farmer cancel after collected/delivered -> 400 Bad Request');

  // Farmer cancel while packed -> 200 and agent notified
  // On Order Onion (Order B), assign Agent 3
  const agent3AcceptB = await api('PUT', `/orders/${orderOnion._id}/driver/respond`, { action: 'accept' }, agent3Token);
  assert(agent3AcceptB.status === 200, 'Step e: Agent 3 accepted Order B (status is packed)');

  // Farmer B cancels while packed
  const cancelPackedRes = await api('PUT', `/orders/${orderOnion._id}/status`, { status: 'cancelled' }, farmerBToken);
  assert(cancelPackedRes.status === 200, 'Step e: Farmer cancel while packed -> 200 OK');

  // Verify Order B status and deliveryAgent cleared
  const orderBInDb = await Order.findById(orderOnion._id);
  assert(orderBInDb.status === 'cancelled', 'Step e: Order B status updated to cancelled');
  assert(orderBInDb.deliveryAgent === undefined || orderBInDb.deliveryAgent === null, 'Step e: Order B deliveryAgent cleared on cancellation');

  // Check agent 3 was notified
  const agent3Notifs = await api('GET', '/notifications', null, agent3Token);
  const cancelNotif = (agent3Notifs.data || []).find((n) => n.title?.includes('Cancelled') || n.message?.includes('cancelled'));
  assert(Boolean(cancelNotif), 'Step e: Assigned delivery agent notified of order cancellation');

  // Close sockets & mongoose connection
  socketWinner.disconnect();
  socketBuyer.disconnect();
  socketFarmer.disconnect();
  socketOutsider.disconnect();
  socketLoser.disconnect();
  await mongoose.disconnect();

  console.log('\n====================================================');
  console.log(`  End-to-End Test Suite Summary: ${passed} PASSED, ${failed} FAILED  `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ETests().catch((err) => {
  console.error('Unhandled failure in runE2ETests:', err);
  process.exit(1);
});
