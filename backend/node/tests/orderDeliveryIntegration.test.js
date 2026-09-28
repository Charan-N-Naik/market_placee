import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';

// Prefer IPv4 for DNS resolution to avoid MongoDB connection timeouts on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

dotenv.config();

import connectDB from '../config/db.js';
import User from '../models/User.js';
import Listing from '../models/Listing.js';
import Order from '../models/Order.js';
import Chat from '../models/Chat.js';
import Payment from '../models/Payment.js';
import { createOrder, updateOrderStatus, respondToDeliveryOffer } from '../controllers/orderController.js';
import { checkExpiredDeliveryDeadlines } from '../services/deliverySchedulerService.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
  return res;
}

async function callController(controllerFn, req) {
  const res = createMockRes();
  let error = null;
  const next = (err) => {
    error = err;
  };
  await controllerFn(req, res, next);
  if (error) {
    throw error;
  }
  return res;
}

async function runIntegrationTests() {
  console.log('====================================================');
  console.log('  Order & Delivery Flow Integration Test Suite      ');
  console.log('====================================================\n');

  // Safety guard: Require database name to contain "test" (e.g. kisanbazaar_test).
  // Prefer MONGODB_URI_TEST if set; otherwise fall back to MONGODB_URI.
  // NODE_ENV alone does NOT satisfy this guard.
  if (process.env.MONGODB_URI_TEST) {
    process.env.MONGODB_URI = process.env.MONGODB_URI_TEST;
  }

  const mongoUri = process.env.MONGODB_URI || '';
  let dbName = '';
  try {
    const parsed = new URL(mongoUri.replace(/^mongodb(\+srv)?:\/\//, 'http://'));
    dbName = (parsed.pathname || '').replace(/^\//, '').split('?')[0];
  } catch (e) {
    dbName = '';
  }

  const isTestDb = dbName.toLowerCase().includes('test');

  if (!isTestDb) {
    console.error('❌ Refusing to run tests: Target database name in MONGODB_URI (or MONGODB_URI_TEST) must contain "test" (e.g. kisanbazaar_test).');
    console.error('   NODE_ENV alone does not satisfy this safety check to protect non-test data.');
    console.error(`   Current database: "${dbName || '(none)'}"`);
    console.error('   Please define MONGODB_URI_TEST in .env pointing to your test database.');
    process.exit(1);
  }

  await connectDB();

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

  const createdUserIds = [];
  const createdListingIds = [];
  const createdOrderIds = [];
  const createdPaymentIds = [];

  const uniqueSuffix = Date.now().toString().slice(-6);

  try {
    // ----------------------------------------------------
    // Fixtures Setup
    // ----------------------------------------------------
    const buyer = await User.create({
      name: `Test Buyer ${uniqueSuffix}`,
      email: `buyer_${uniqueSuffix}@example.com`,
      phone: `91000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'buyer',
      isVerified: true,
      location: { address: 'Bengaluru', district: 'Bengaluru', state: 'Karnataka' },
    });
    createdUserIds.push(buyer._id);

    const farmer1 = await User.create({
      name: `Test Farmer 1 ${uniqueSuffix}`,
      email: `farmer1_${uniqueSuffix}@example.com`,
      phone: `92000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'farmer',
      isVerified: true,
      location: { address: 'Kolar', district: 'Kolar', state: 'Karnataka' },
    });
    createdUserIds.push(farmer1._id);

    const farmer2 = await User.create({
      name: `Test Farmer 2 ${uniqueSuffix}`,
      email: `farmer2_${uniqueSuffix}@example.com`,
      phone: `93000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'farmer',
      isVerified: true,
      location: { address: 'Tumakuru', district: 'Tumakuru', state: 'Karnataka' },
    });
    createdUserIds.push(farmer2._id);

    const driverA = await User.create({
      name: `Test Driver A ${uniqueSuffix}`,
      email: `driverA_${uniqueSuffix}@example.com`,
      phone: `94000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'delivery_agent',
      isVerified: true,
      location: { address: 'Kolar', district: 'Kolar', state: 'Karnataka' },
      deliveryAgentProfile: { availabilityStatus: 'available', perKmCharge: 15 },
    });
    createdUserIds.push(driverA._id);

    const driverB = await User.create({
      name: `Test Driver B ${uniqueSuffix}`,
      email: `driverB_${uniqueSuffix}@example.com`,
      phone: `95000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'delivery_agent',
      isVerified: true,
      location: { address: 'Bengaluru', district: 'Bengaluru', state: 'Karnataka' },
      deliveryAgentProfile: { availabilityStatus: 'available', perKmCharge: 15 },
    });
    createdUserIds.push(driverB._id);

    const driverC = await User.create({
      name: `Test Driver C ${uniqueSuffix}`,
      email: `driverC_${uniqueSuffix}@example.com`,
      phone: `96000${uniqueSuffix}`,
      passwordHash: 'dummyhashedpw123',
      role: 'delivery_agent',
      isVerified: true,
      location: { address: 'Mandya', district: 'Mandya', state: 'Karnataka' },
      deliveryAgentProfile: { availabilityStatus: 'available', perKmCharge: 15 },
    });
    createdUserIds.push(driverC._id);

    // ----------------------------------------------------
    // Scenario 1: Mixed-farmer-cart order split & stock re-validation
    // ----------------------------------------------------
    console.log('\n--- Scenario 1: Mixed-Farmer Cart Split & Stock Floor ---');
    const listing1 = await Listing.create({
      farmer: farmer1._id,
      cropName: `Tomatoes ${uniqueSuffix}`,
      quantity: 10,
      unit: 'kg',
      pricePerUnit: 40,
    });
    createdListingIds.push(listing1._id);

    const listing2 = await Listing.create({
      farmer: farmer2._id,
      cropName: `Potatoes ${uniqueSuffix}`,
      quantity: 5,
      unit: 'kg',
      pricePerUnit: 30,
    });
    createdListingIds.push(listing2._id);

    const splitReq = {
      user: { _id: buyer._id, role: 'buyer' },
      body: {
        items: [
          { listing: listing1._id, quantity: 4, priceAtPurchase: 40 },
          { listing: listing2._id, quantity: 3, priceAtPurchase: 30 },
        ],
        deliveryAddress: { addressLine1: 'MG Road', city: 'Bengaluru', state: 'Karnataka' },
        deliveryMode: 'auto_assign',
        paymentMethod: 'cod',
      }
    };

    const splitRes = await callController(createOrder, splitReq);
    assert(splitRes.statusCode === 201, 'Mixed Cart: Order creation returns 201 Created');
    assert(Array.isArray(splitRes.data.orderIds) && splitRes.data.orderIds.length === 2, 'Mixed Cart: Splits cart into exactly 2 orders (1 per farmer)');

    if (splitRes.data.orderIds) {
      createdOrderIds.push(...splitRes.data.orderIds);
    }

    const orderF1 = await Order.findOne({ farmer: farmer1._id, buyer: buyer._id });
    const orderF2 = await Order.findOne({ farmer: farmer2._id, buyer: buyer._id });

    assert(orderF1 && orderF1.totalAmount === 160, 'Mixed Cart: Order 1 has correct farmer 1 total (4 * 40 = 160)');
    assert(orderF2 && orderF2.totalAmount === 90, 'Mixed Cart: Order 2 has correct farmer 2 total (3 * 30 = 90)');

    const updatedL1 = await Listing.findById(listing1._id);
    const updatedL2 = await Listing.findById(listing2._id);
    assert(updatedL1.quantity === 6, 'Stock Re-validation: Listing 1 stock decremented accurately (10 - 4 = 6)');
    assert(updatedL2.quantity === 2, 'Stock Re-validation: Listing 2 stock decremented accurately (5 - 3 = 2)');

    // Attempt to over-order Listing 2 (attempt 5 when only 2 available) -> consistent 409
    const overOrderReq = {
      user: { _id: buyer._id, role: 'buyer' },
      body: {
        items: [{ listing: listing2._id, quantity: 5, priceAtPurchase: 30 }],
        deliveryAddress: { addressLine1: 'MG Road', city: 'Bengaluru', state: 'Karnataka' },
        deliveryMode: 'auto_assign',
      }
    };
    const overOrderRes = await callController(createOrder, overOrderReq);
    assert(overOrderRes.statusCode === 409, 'Stock Floor: Over-order returns 409 Conflict consistently');
    const l2AfterFailedOrder = await Listing.findById(listing2._id);
    assert(l2AfterFailedOrder.quantity === 2, 'Stock Floor: Stock remained untouched at 2 after failed order');

    // ----------------------------------------------------
    // Scenario 2: Buyer-choice assignment happy path
    // ----------------------------------------------------
    console.log('\n--- Scenario 2: Buyer-Choice Assignment Happy Path ---');
    const listingChoice = await Listing.create({
      farmer: farmer1._id,
      cropName: `Carrots ${uniqueSuffix}`,
      quantity: 20,
      unit: 'kg',
      pricePerUnit: 50,
    });
    createdListingIds.push(listingChoice._id);

    const buyerChoiceOrderReq = {
      user: { _id: buyer._id, role: 'buyer' },
      body: {
        items: [{ listing: listingChoice._id, quantity: 2, priceAtPurchase: 50 }],
        deliveryAddress: { addressLine1: 'Indiranagar', city: 'Bengaluru', state: 'Karnataka' },
        deliveryMode: 'buyer_choice',
        chosenAgentId: driverA._id,
      }
    };
    const choiceOrderRes = await callController(createOrder, buyerChoiceOrderReq);
    assert(choiceOrderRes.statusCode === 201, 'Buyer Choice: Order created with status 201');
    const choiceOrderId = choiceOrderRes.data.orderIds[0];
    createdOrderIds.push(choiceOrderId);

    let choiceOrder = await Order.findById(choiceOrderId);
    assert(choiceOrder.deliveryMode === 'buyer_choice', 'Buyer Choice: deliveryMode persisted as buyer_choice');
    assert(choiceOrder.chosenAgentId.toString() === driverA._id.toString(), 'Buyer Choice: chosenAgentId persisted correctly');
    assert(choiceOrder.status === 'pending', 'Buyer Choice: Initial order status is pending');

    // Farmer marks order as 'packed'
    const packReq = {
      user: { _id: farmer1._id, role: 'farmer' },
      params: { orderId: choiceOrderId },
      body: { status: 'packed' }
    };
    const packRes = await callController(updateOrderStatus, packReq);
    assert(packRes.statusCode === 200, 'Buyer Choice: Farmer marks order as packed (200 OK)');

    choiceOrder = await Order.findById(choiceOrderId);
    assert(choiceOrder.status === 'packed', 'Buyer Choice: Order status updated to packed');
    assert(choiceOrder.packedAt != null, 'Buyer Choice: packedAt timestamp is recorded');
    assert(choiceOrder.pickupDeadline != null, 'Buyer Choice: pickupDeadline is calculated and set');
    assert(choiceOrder.deliveryRequestStatus === 'pending_driver_approval', 'Buyer Choice: deliveryRequestStatus set to pending_driver_approval');
    assert(choiceOrder.deliveryOffers.some(o => o.agent.toString() === driverA._id.toString() && o.status === 'offered'), 'Buyer Choice: Driver A received offer with status "offered"');

    // Driver A accepts the offer
    const acceptReq = {
      user: { _id: driverA._id, role: 'delivery_agent' },
      params: { orderId: choiceOrderId, agentId: driverA._id },
      body: { action: 'accept' }
    };
    const acceptRes = await callController(respondToDeliveryOffer, acceptReq);
    assert(acceptRes.statusCode === 200, 'Buyer Choice: Driver A accept response returns 200 OK');

    choiceOrder = await Order.findById(choiceOrderId);
    assert(choiceOrder.deliveryRequestStatus === 'driver_accepted', 'Buyer Choice: deliveryRequestStatus is now driver_accepted');
    assert(choiceOrder.deliveryAgent.toString() === driverA._id.toString(), 'Buyer Choice: deliveryAgent set to Driver A');
    const driverAOffer = choiceOrder.deliveryOffers.find(o => o.agent.toString() === driverA._id.toString());
    assert(driverAOffer && driverAOffer.status === 'accepted', 'Buyer Choice: Driver A offer status marked as accepted');

    // ----------------------------------------------------
    // Scenario 3: Auto-assign with first-accept-wins under concurrent requests
    // ----------------------------------------------------
    console.log('\n--- Scenario 3: Auto-Assign Concurrent First-Accept-Wins ---');
    const concurrentOrder = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'packed',
      packedAt: new Date(),
      pickupDeadline: new Date(Date.now() + 6 * 3600 * 1000),
      deliveryRequestStatus: 'pending_driver_approval',
      deliveryOffers: [
        { agent: driverB._id, offeredAt: new Date(), status: 'offered' },
        { agent: driverC._id, offeredAt: new Date(), status: 'offered' },
      ]
    });
    createdOrderIds.push(concurrentOrder._id);

    // Simulate both driverB and driverC calling accept simultaneously
    const acceptBReq = {
      user: { _id: driverB._id, role: 'delivery_agent' },
      params: { orderId: concurrentOrder._id, agentId: driverB._id },
      body: { action: 'accept' }
    };
    const acceptCReq = {
      user: { _id: driverC._id, role: 'delivery_agent' },
      params: { orderId: concurrentOrder._id, agentId: driverC._id },
      body: { action: 'accept' }
    };

    const [resB, resC] = await Promise.all([
      callController(respondToDeliveryOffer, acceptBReq),
      callController(respondToDeliveryOffer, acceptCReq)
    ]);

    const statusCodes = [resB.statusCode, resC.statusCode].sort();
    assert(statusCodes[0] === 200 && statusCodes[1] === 409, 'Concurrent Accept: Exactly one agent receives 200 and the other receives 409 Conflict');

    const winnerRes = resB.statusCode === 200 ? resB : resC;
    const loserRes = resB.statusCode === 409 ? resB : resC;
    const winningAgentId = resB.statusCode === 200 ? driverB._id.toString() : driverC._id.toString();
    const losingAgentId = resB.statusCode === 409 ? driverB._id.toString() : driverC._id.toString();

    assert(loserRes.data.message.includes('already been accepted'), 'Concurrent Accept: 409 response explains job was already taken');

    const verifiedConcurrentOrder = await Order.findById(concurrentOrder._id);
    assert(verifiedConcurrentOrder.deliveryRequestStatus === 'driver_accepted', 'Concurrent Accept: Final status is driver_accepted');
    assert(verifiedConcurrentOrder.deliveryAgent.toString() === winningAgentId, 'Concurrent Accept: Assigned agent matches the winning response');

    const winningOffer = verifiedConcurrentOrder.deliveryOffers.find(o => o.agent.toString() === winningAgentId);
    const losingOffer = verifiedConcurrentOrder.deliveryOffers.find(o => o.agent.toString() === losingAgentId);
    assert(winningOffer && winningOffer.status === 'accepted', 'Concurrent Accept: Winner offer status is "accepted"');
    assert(losingOffer && losingOffer.status === 'expired', 'Concurrent Accept: Sibling loser offer status is atomically marked "expired"');

    // Idempotency: Winner accepts again, should succeed without conflict
    const winnerRetryReq = {
      user: { _id: winningAgentId === driverB._id.toString() ? driverB._id : driverC._id, role: 'delivery_agent' },
      params: { orderId: concurrentOrder._id, agentId: winningAgentId },
      body: { action: 'accept' }
    };
    const winnerRetryRes = await callController(respondToDeliveryOffer, winnerRetryReq);
    assert(winnerRetryRes.statusCode === 200, 'Concurrent Accept: Winner retrying accept is idempotent (200 OK)');

    // ----------------------------------------------------
    // Scenario 4: Pickup deadline expiry reassignment
    // ----------------------------------------------------
    console.log('\n--- Scenario 4: Pickup Deadline Expiry Reassignment ---');
    const expiredOrder = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'packed',
      packedAt: new Date(Date.now() - 7 * 3600 * 1000),
      pickupDeadline: new Date(Date.now() - 3600 * 1000), // 1 hour expired
      deliveryRequestStatus: 'pending_driver_approval',
      deliveryOffers: [
        { agent: driverA._id, offeredAt: new Date(Date.now() - 7 * 3600 * 1000), status: 'offered' },
      ]
    });
    createdOrderIds.push(expiredOrder._id);

    // Run the scheduler watchdog
    await checkExpiredDeliveryDeadlines();

    const reassignedOrder = await Order.findById(expiredOrder._id);
    const oldOffer = reassignedOrder.deliveryOffers.find(o => o.agent.toString() === driverA._id.toString());
    assert(oldOffer && oldOffer.status === 'expired', 'Deadline Expiry: Previous driver A offer marked as "expired"');
    assert(reassignedOrder.pickupDeadline > new Date(), 'Deadline Expiry: pickupDeadline is refreshed/extended');

    const newOffer = reassignedOrder.deliveryOffers.find(o => o.agent.toString() !== driverA._id.toString() && o.status === 'offered');
    assert(newOffer != null, 'Deadline Expiry: Reassigned and new offer dispatched to next candidate');
    assert(reassignedOrder.deliveryRequestStatus === 'pending_driver_approval', 'Deadline Expiry: deliveryRequestStatus reset to pending_driver_approval');

    // ----------------------------------------------------
    // Scenario 5: Farmer cancellation guard
    // ----------------------------------------------------
    console.log('\n--- Scenario 5: Farmer Cancellation Guard ---');
    const collectedOrder = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'collected',
      deliveryAgent: driverA._id,
      deliveryRequestStatus: 'collected',
    });
    createdOrderIds.push(collectedOrder._id);

    const cancelCollectedReq = {
      user: { _id: farmer1._id, role: 'farmer' },
      params: { orderId: collectedOrder._id },
      body: { status: 'cancelled' }
    };
    const cancelCollectedRes = await callController(updateOrderStatus, cancelCollectedReq);
    assert(cancelCollectedRes.statusCode === 400, 'Cancellation Guard: Cancellation blocked when status is "collected" (400 Bad Request)');
    assert(cancelCollectedRes.data.message.includes('/refund'), 'Cancellation Guard: Error message directs user to /refund endpoint');

    const orderStillCollected = await Order.findById(collectedOrder._id);
    assert(orderStillCollected.status === 'collected', 'Cancellation Guard: Order status remains "collected" in database');

    // Cancellation permitted before collected (e.g., when 'packed')
    const packedOrder = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'packed',
      deliveryAgent: driverA._id,
      deliveryRequestStatus: 'driver_accepted',
      deliveryOffers: [{ agent: driverA._id, status: 'accepted' }]
    });
    createdOrderIds.push(packedOrder._id);

    const cancelPackedReq = {
      user: { _id: farmer1._id, role: 'farmer' },
      params: { orderId: packedOrder._id },
      body: { status: 'cancelled' }
    };
    const cancelPackedRes = await callController(updateOrderStatus, cancelPackedReq);
    assert(cancelPackedRes.statusCode === 200, 'Cancellation Guard: Farmer can cancel when status is "packed" (200 OK)');

    const cancelledOrderInDb = await Order.findById(packedOrder._id);
    assert(cancelledOrderInDb.status === 'cancelled', 'Cancellation Guard: Order status is set to cancelled');
    assert(cancelledOrderInDb.deliveryAgent === undefined || cancelledOrderInDb.deliveryAgent === null, 'Cancellation Guard: deliveryAgent cleared on cancellation');
    assert(cancelledOrderInDb.deliveryRequestStatus === 'none', 'Cancellation Guard: deliveryRequestStatus reset to "none"');

    // ----------------------------------------------------
    // Scenario 6: Unauthorized or Invalid Offer Rejection Guard
    // ----------------------------------------------------
    console.log('\n--- Scenario 6: Invalid Offer & Non-Packed State Guards ---');

    // Case 6a: Agent with no active offer on a packed order gets 403
    const packedNoOfferOrder = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'packed',
      packedAt: new Date(),
      pickupDeadline: new Date(Date.now() + 6 * 3600 * 1000),
      deliveryRequestStatus: 'pending_driver_approval',
      deliveryOffers: [
        { agent: driverA._id, offeredAt: new Date(), status: 'offered' }
      ]
    });
    createdOrderIds.push(packedNoOfferOrder._id);

    const noOfferReq = {
      user: { _id: driverC._id, role: 'delivery_agent' },
      params: { orderId: packedNoOfferOrder._id, agentId: driverC._id },
      body: { action: 'accept' }
    };
    const noOfferRes = await callController(respondToDeliveryOffer, noOfferReq);
    assert(noOfferRes.statusCode === 403, 'Offer Guard: Agent with no offer is rejected with 403 Forbidden');
    assert(noOfferRes.data?.message === 'No active delivery offer for this agent', 'Offer Guard: Message confirms no active offer for agent');

    const verifiedNoOfferOrder = await Order.findById(packedNoOfferOrder._id);
    assert(verifiedNoOfferOrder.deliveryAgent == null, 'Offer Guard: order.deliveryAgent stays unset when agent has no offer');

    // Case 6b: Agent attempting to accept on a 'cancelled' order gets 409
    const cancelledOrderWithOffer = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'cancelled',
      deliveryRequestStatus: 'none',
      deliveryOffers: [
        { agent: driverA._id, offeredAt: new Date(), status: 'offered' }
      ]
    });
    createdOrderIds.push(cancelledOrderWithOffer._id);

    const cancelAcceptReq = {
      user: { _id: driverA._id, role: 'delivery_agent' },
      params: { orderId: cancelledOrderWithOffer._id, agentId: driverA._id },
      body: { action: 'accept' }
    };
    const cancelAcceptRes = await callController(respondToDeliveryOffer, cancelAcceptReq);
    assert(cancelAcceptRes.statusCode === 409, 'Status Guard: Accept on cancelled order rejected with 409');
    const verifiedCancelOrder = await Order.findById(cancelledOrderWithOffer._id);
    assert(verifiedCancelOrder.deliveryAgent == null, 'Status Guard: order.deliveryAgent stays unset on cancelled order');
    assert(verifiedCancelOrder.status === 'cancelled', 'Status Guard: Order remains cancelled');

    // Case 6c: Agent attempting to accept on a 'pending' order gets 409
    const pendingOrderWithOffer = await Order.create({
      buyer: buyer._id,
      farmer: farmer1._id,
      items: [{ listing: listing1._id, quantity: 1, priceAtPurchase: 40 }],
      totalAmount: 40,
      deliveryMode: 'auto_assign',
      status: 'pending',
      deliveryRequestStatus: 'pending_driver_approval',
      deliveryOffers: [
        { agent: driverA._id, offeredAt: new Date(), status: 'offered' }
      ]
    });
    createdOrderIds.push(pendingOrderWithOffer._id);

    const pendingAcceptReq = {
      user: { _id: driverA._id, role: 'delivery_agent' },
      params: { orderId: pendingOrderWithOffer._id, agentId: driverA._id },
      body: { action: 'accept' }
    };
    const pendingAcceptRes = await callController(respondToDeliveryOffer, pendingAcceptReq);
    assert(pendingAcceptRes.statusCode === 409, 'Status Guard: Accept on pending order rejected with 409');
    const verifiedPendingOrder = await Order.findById(pendingOrderWithOffer._id);
    assert(verifiedPendingOrder.deliveryAgent == null, 'Status Guard: order.deliveryAgent stays unset on pending order');
    assert(verifiedPendingOrder.status === 'pending', 'Status Guard: Order remains pending');

  } catch (err) {
    console.error('Fatal error during integration tests:', err);
    failed++;
  } finally {
    // ----------------------------------------------------
    // Cleanup Fixtures
    // ----------------------------------------------------
    console.log('\n--- Cleaning up test fixtures ---');
    try {
      if (createdOrderIds.length > 0) {
        await Order.deleteMany({ _id: { $in: createdOrderIds } });
        await Chat.deleteMany({ 'participants': { $in: createdUserIds } });
      }
      if (createdPaymentIds.length > 0) {
        await Payment.deleteMany({ _id: { $in: createdPaymentIds } });
      }
      if (createdListingIds.length > 0) {
        await Listing.deleteMany({ _id: { $in: createdListingIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
      }
      console.log('Cleanup completed successfully.');
    } catch (cleanupErr) {
      console.warn('Error during fixture cleanup:', cleanupErr.message);
    }

    await mongoose.disconnect();
  }

  console.log('\n====================================================');
  console.log(`  Integration Tests: ${passed} PASSED, ${failed} FAILED     `);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runIntegrationTests().catch(err => {
  console.error('Unhandled failure in integration test runner:', err);
  process.exit(1);
});
