// server/controllers/orderController.js
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Listing from '../models/Listing.js';
import Payment from '../models/Payment.js';
import Chat from '../models/Chat.js';
import { sendNotification } from '../services/notificationService.js';
import User from '../models/User.js';
import { calculateDistance, rankAgentsByProximityAndRating } from '../services/deliveryDistanceService.js';

export const PICKUP_WINDOW_HOURS = 6;

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private (buyer)
export const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod, deliveryMode, chosenAgentId, selectedAgentId } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ message: 'No items provided' });
  }

  if (!deliveryMode || !['buyer_choice', 'auto_assign'].includes(deliveryMode)) {
    return res.status(400).json({
      message: 'deliveryMode is required and must be either "buyer_choice" or "auto_assign"'
    });
  }

  // Group cart items by listing.farmer and verify inventory
  const farmerGroups = new Map(); // farmerId -> { farmerId, items: [], totalAmount: 0 }

  for (const item of items) {
    const listingId = item.listing?._id || item.listing?.id || item.listing;
    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: `Listing not found: ${listingId}` });
    }
    // Use quantity field (the actual stock field in the Listing model)
    const availableQty = listing.quantity || 0;
    if (availableQty < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${listing.cropName}. Available: ${availableQty}` });
    }

    const farmerIdStr = listing.farmer.toString();
    if (!farmerGroups.has(farmerIdStr)) {
      farmerGroups.set(farmerIdStr, {
        farmerId: listing.farmer,
        items: [],
        totalAmount: 0,
      });
    }

    const priceAtPurchase = listing.pricePerUnit || 0;
    const group = farmerGroups.get(farmerIdStr);
    group.totalAmount += priceAtPurchase * item.quantity;
    group.items.push({
      listing: listing._id,
      quantity: item.quantity,
      priceAtPurchase,
      cropName: listing.cropName,
    });
  }

  const createdOrders = [];
  const orderIds = [];
  const chats = [];
  const payments = [];
  const resolvedChosenAgentId = chosenAgentId || selectedAgentId || undefined;

  // Create ONE Order document per farmer
  for (const [farmerKey, group] of farmerGroups.entries()) {
    const order = await Order.create({
      buyer: req.user._id,
      farmer: group.farmerId, // Store farmer directly for fast lookup
      items: group.items.map(i => ({
        listing: i.listing,
        quantity: i.quantity,
        priceAtPurchase: i.priceAtPurchase,
      })),
      totalAmount: group.totalAmount,
      paymentMethod: paymentMethod || 'pending_farmer_approval',
      deliveryAddress,
      deliveryMode,
      chosenAgentId: resolvedChosenAgentId,
      status: 'pending',
    });

    // Reduce quantity immediately (optimistic)
    for (const item of group.items) {
      await Listing.findByIdAndUpdate(item.listing, { $inc: { quantity: -item.quantity } });
    }

    // Create or get existing chat with farmer
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, group.farmerId] },
      isGroup: false,
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user._id, group.farmerId],
        messages: [],
        isGroup: false,
      });
    }

    // Link chat to order
    order.relatedChat = chat._id;
    chats.push(chat._id);

    // Send notification to farmer
    try {
      await sendNotification({
        recipientId: group.farmerId,
        senderId: req.user._id,
        type: 'order_placed',
        title: 'New Order Received',
        message: `A new order has been placed for ₹${group.totalAmount}. Total quantity: ${group.items.reduce((sum, i) => sum + i.quantity, 0)} units.`,
        relatedOrder: order._id,
        relatedChat: chat._id,
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }

    // If online payment (not cod or pending_farmer_approval), create a payment record
    if (paymentMethod && !['cod', 'pending_farmer_approval'].includes(paymentMethod)) {
      const payment = await Payment.create({
        order: order._id,
        amount: group.totalAmount,
        currency: 'INR',
        status: 'initiated',
      });
      order.paymentId = payment._id;
      payments.push(payment._id);
    }

    await order.save();
    createdOrders.push(order);
    orderIds.push(order._id);
  }

  res.status(201).json({
    message: 'Orders placed successfully',
    orderIds,
    orderId: orderIds[0], // for backward compatibility with singular consumers
    orders: createdOrders,
    chatIds: chats,
    paymentIds: payments.length > 0 ? payments : undefined,
  });
});

// @desc    Get buyer's orders
// @route   GET /api/orders/my
// @access  Private (buyer)
export const getBuyerOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .populate('items.listing')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get seller's (farmer's) orders
// @route   GET /api/orders/seller
// @access  Private (farmer)
export const getSellerOrders = asyncHandler(async (req, res) => {
  const farmerListings = await Listing.find({ farmer: req.user._id }).select('_id');
  const listingIds = farmerListings.map(l => l._id);

  // Build query: always match by farmer field, only add listing filter if farmer has listings
  // (MongoDB { $in: [] } with empty array matches nothing but adds unnecessary overhead)
  const query = listingIds.length > 0
    ? { $or: [{ farmer: req.user._id }, { 'items.listing': { $in: listingIds } }] }
    : { farmer: req.user._id };

  const orders = await Order.find(query)
    .populate('items.listing')
    .populate('buyer', 'name email phone')
    .sort({ createdAt: -1 });

  // NEVER fall back to Order.find({}) — return empty array for farmers with no orders
  res.json(orders);
});

// @desc    Update order status (seller side)
// @route   PUT /api/orders/:orderId/status
// @access  Private (farmer)
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  const isFarmer = order.farmer && order.farmer.toString() === req.user._id.toString();
  const isBuyer = order.buyer && order.buyer.toString() === req.user._id.toString();

  let ownsListing = isFarmer;
  if (!ownsListing) {
    const listings = await Listing.find({ _id: { $in: order.items.map(i => i.listing) }, farmer: req.user._id });
    if (listings.length > 0) ownsListing = true;
  }

  if (!ownsListing && !isBuyer) {
    return res.status(403).json({ message: 'Not authorized to update this order' });
  }

  if (isBuyer && !ownsListing) {
    if (status === 'cancelled' && !['pending', 'accepted'].includes(order.status)) {
      return res.status(400).json({ message: 'Cannot cancel order after it has been shipped or completed' });
    }
  }

  const previousStatus = order.status;
  order.status = status;
  if (status === 'received') {
    order.receivedDate = new Date();
  }
  if (status === 'packed' && previousStatus !== 'packed') {
    const now = new Date();
    order.packedAt = now;
    order.pickupDeadline = new Date(now.getTime() + PICKUP_WINDOW_HOURS * 60 * 60 * 1000);
    // Trigger delivery offer dispatch upon farmer packing (with auto_assign fallback)
    try {
      await dispatchDeliveryOffers(order, order.chosenAgentId);
    } catch (dispatchErr) {
      console.error('[UpdateOrderStatus] Error dispatching delivery offers on packed:', dispatchErr.message);
    }
  }
  await order.save();

  // Restore inventory if order is cancelled
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    for (const item of order.items) {
      if (item.listing) {
        await Listing.findByIdAndUpdate(item.listing, { $inc: { quantity: item.quantity } });
      }
    }
  }

  // Send status update notification
  try {
    const recipientId = isBuyer ? order.farmer : order.buyer;
    if (recipientId) {
      let title = `Order ${status.toUpperCase()}`;
      let message = `Order #${order._id.toString().slice(-6).toUpperCase()} status changed to ${status}.`;
      if (status === 'accepted') {
        title = '🌾 Order Accepted!';
        message = 'Farmer has accepted your crop order and is preparing for fulfillment.';
      } else if (status === 'paid') {
        title = '💳 Payment Received!';
        message = `Buyer has completed payment of ₹${order.totalAmount}. Please start packing the order.`;
      } else if (status === 'packed') {
        title = '📦 Order Packed!';
        message = `Order #${order._id.toString().slice(-6).toUpperCase()} is packed and awaiting delivery agent pickup.`;
      } else if (status === 'collected') {
        title = '🚛 Order Collected by Agent!';
        message = 'Your crop order has been picked up by the delivery agent and is now en route to you.';
      } else if (status === 'shipped') {
        title = '🚚 Order Shipped!';
        message = 'Your crop shipment is out for delivery.';
      } else if (status === 'delivered') {
        title = '🎉 Order Delivered!';
        message = 'Your crop order has been delivered successfully.';
      } else if (status === 'cancelled') {
        title = '❌ Order Cancelled';
        message = isBuyer ? 'Buyer cancelled the order.' : 'Farmer cancelled the order.';
      }

      await sendNotification({
        recipientId,
        senderId: req.user._id,
        type: status === 'cancelled' ? 'custom' : 'order_placed',
        title,
        message,
        relatedOrder: order._id,
        relatedChat: order.relatedChat,
      });
    }
  } catch (error) {
    console.error('Error sending status update notification:', error);
  }

  if (req.io) req.io.emit('orderUpdate', { orderId: order._id, status });
  res.json(order);
});

// @desc    Refund an order
// @route   POST /api/orders/:orderId/refund
// @access  Private (admin)
export const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.status === 'refunded') {
    return res.status(400).json({ message: 'Order already refunded' });
  }

  // Restore quantity
  for (const item of order.items) {
    await Listing.findByIdAndUpdate(item.listing, { $inc: { quantity: item.quantity } });
  }

  order.status = 'refunded';
  await order.save();
  res.json({ message: 'Order refunded successfully', order });
});

// @desc    Mark order as received (buyer side)
// @route   PUT /api/orders/:orderId/receive
// @access  Private (buyer)
export const markOrderAsReceived = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Verify the buyer owns this order
  if (order.buyer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to update this order' });
  }

  if (order.status === 'received') {
    return res.status(400).json({ message: 'Order already marked as received' });
  }

  order.status = 'received';
  order.receivedDate = new Date();
  await order.save();

  // Send notification to farmer
  try {
    const listing = await Listing.findById(order.items[0].listing);
    const farmerId = listing.farmer;

    await sendNotification({
      recipientId: farmerId,
      senderId: req.user._id,
      type: 'order_delivered',
      title: 'Order Received by Buyer',
      message: 'The buyer has marked your order as received.',
      relatedOrder: order._id,
      relatedChat: order.relatedChat,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }

  res.json({ message: 'Order marked as received', order });
});

// @desc    Rate an order and crop
// @route   POST /api/orders/:orderId/rate
// @access  Private (buyer)
export const rateOrder = asyncHandler(async (req, res) => {
  const { rating, ratingComment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Verify the buyer owns this order
  if (order.buyer.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to rate this order' });
  }

  // Only allow rating if order is received
  if (order.status !== 'received') {
    return res.status(400).json({ message: 'Can only rate received orders' });
  }

  order.rating = rating;
  order.ratingComment = ratingComment || '';
  await order.save();

  // Update crop rating in Listing model (average rating)
  const listing = await Listing.findById(order.items[0].listing);
  if (listing) {
    // Use aggregation to calculate average rating efficiently without loading all documents
    const ratingStats = await Order.aggregate([
      { $match: { 'items.listing': listing._id, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    const stats = ratingStats[0] || { avgRating: 0, count: 0 };
    await Listing.findByIdAndUpdate(
      listing._id,
      {
        rating: stats.avgRating,
        numReviews: stats.count
      },
      { new: true }
    );
  }

  // Send notification to farmer
  try {
    const listing = await Listing.findById(order.items[0].listing);
    const farmerId = listing.farmer;

    await sendNotification({
      recipientId: farmerId,
      senderId: req.user._id,
      type: 'rating',
      title: `New ${rating}-star Rating Received`,
      message: `Your crop received a ${rating}-star rating. Comment: "${ratingComment}"`,
      relatedOrder: order._id,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }

  res.json({ message: 'Rating submitted successfully', order });
});

// @desc    Get pending orders for buyer
// @route   GET /api/orders/pending
// @access  Private (buyer)
export const getPendingOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    buyer: req.user._id,
    status: 'pending'
  })
    .populate('items.listing')
    .populate('relatedChat')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// ═══════════════════════════════════════════════════════════
// DELIVERY AGENT ENDPOINTS
// ═══════════════════════════════════════════════════════════

/**
 * Dispatch delivery offers for an order according to its deliveryMode.
 * If buyer_choice with a chosen agent: creates a single deliveryOffers entry for that agent and notifies them.
 * If auto_assign or fallback (deliveryAgent not set): finds available agents, ranks by distance to farmer then rating,
 * creates deliveryOffers entries for the top 3, and notifies all 3 with pickup deadline and farmer address.
 */
export async function dispatchDeliveryOffers(order, chosenAgentId = null) {
  if (!order) return null;

  // Retrieve farmer address and location for notifications
  let farmerAddress = 'the farm location';
  let farmerLocation = 'Karnataka';
  if (order.farmer) {
    const farmerUser = await User.findById(order.farmer._id || order.farmer).lean();
    if (farmerUser?.location?.address || farmerUser?.location?.district) {
      farmerAddress = farmerUser.location.address || farmerUser.location.district;
      farmerLocation = farmerUser.location.district || farmerUser.location.address;
    }
  }

  const windowHours = PICKUP_WINDOW_HOURS || 6;
  const deadlineStr = order.pickupDeadline
    ? new Date(order.pickupDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : `${windowHours} hours`;
  const orderShort = order._id.toString().slice(-6).toUpperCase();

  // 1. If order already has an assigned & accepted delivery agent, specifically notify them of the pickup deadline
  if (order.deliveryAgent && order.deliveryRequestStatus === 'driver_accepted') {
    try {
      await sendNotification({
        recipientId: order.deliveryAgent,
        senderId: order.buyer?._id || order.buyer,
        type: 'custom',
        title: '📦 Order Packed — Ready for Pickup',
        message: `Order #${orderShort} is packed and ready for pickup at ${farmerAddress}. Please collect within ${windowHours} hours (by ${deadlineStr}).`,
        relatedOrder: order._id,
      });
    } catch (err) {
      console.error('[DeliveryDispatch] Notification error for assigned driver:', err.message);
    }
    return order;
  }

  // 2. Target agent for buyer_choice
  const targetAgentId = chosenAgentId || order.chosenAgentId || (order.deliveryMode === 'buyer_choice' ? order.deliveryAgent : null);

  if (order.deliveryMode === 'buyer_choice' && targetAgentId) {
    order.deliveryOffers = order.deliveryOffers || [];
    const existingOffer = order.deliveryOffers.find(
      o => o.agent?.toString() === targetAgentId.toString() && o.status === 'offered'
    );

    if (!existingOffer) {
      order.deliveryOffers.push({
        agent: targetAgentId,
        offeredAt: new Date(),
        status: 'offered'
      });
    }

    order.deliveryAgent = targetAgentId;
    order.deliveryRequestStatus = 'pending_driver_approval';
    await order.save();

    try {
      await sendNotification({
        recipientId: targetAgentId,
        senderId: order.buyer?._id || order.buyer,
        type: 'custom',
        title: '📦 Order Packed — Delivery Job Offered',
        message: `Order #${orderShort} is packed and ready for pickup at ${farmerAddress}. Please collect within ${windowHours} hours (by ${deadlineStr}).`,
        relatedOrder: order._id,
      });
    } catch (err) {
      console.error('[DeliveryDispatch] Notification error for buyer_choice:', err.message);
    }

    return order;
  }

  // 3. Fallback to auto_assign: If deliveryAgent is not yet set or buyer didn't pick an agent
  order.deliveryMode = order.deliveryMode || 'auto_assign';

  let availableAgents = await User.find({
    role: { $in: ['delivery_agent', 'driver'] },
    $or: [
      { 'deliveryAgentProfile.availabilityStatus': 'available' },
      { availabilityStatus: 'available' }
    ]
  }).lean();

  if (!availableAgents || availableAgents.length === 0) {
    availableAgents = await User.find({
      role: { $in: ['delivery_agent', 'driver'] },
      'deliveryAgentProfile.availabilityStatus': { $ne: 'offline' }
    }).lean();
  }

  if (!availableAgents || availableAgents.length === 0) {
    availableAgents = await User.find({
      role: { $in: ['delivery_agent', 'driver'] }
    }).lean();
  }

  // Filter out agents who already have an offer or declined
  const existingOfferAgentIds = (order.deliveryOffers || []).map(o => o.agent?.toString());
  const eligibleAgents = availableAgents.filter(a => !existingOfferAgentIds.includes(a._id.toString()));

  // Rank available agents by distance to farmer, then rating
  const rankedAgents = rankAgentsByProximityAndRating(eligibleAgents, farmerLocation);

  // Create deliveryOffers entries for the top 3
  const top3 = rankedAgents.slice(0, 3);
  if (top3.length === 0) {
    console.warn(`[DeliveryDispatch] No available delivery agents found to auto-assign for order ${order._id}`);
    return order;
  }

  order.deliveryOffers = order.deliveryOffers || [];
  for (const agent of top3) {
    order.deliveryOffers.push({
      agent: agent._id,
      offeredAt: new Date(),
      status: 'offered'
    });
  }

  order.deliveryRequestStatus = 'pending_driver_approval';
  await order.save();

  // Send notification to the offered agents specifically with pickup deadline and farmer address
  for (const agent of top3) {
    try {
      await sendNotification({
        recipientId: agent._id,
        senderId: order.buyer?._id || order.buyer,
        type: 'custom',
        title: '📦 Order Packed — Pickup Available',
        message: `Order #${orderShort} is packed and ready for pickup at ${farmerAddress}. Please collect within ${windowHours} hours (by ${deadlineStr}).`,
        relatedOrder: order._id,
      });
    } catch (err) {
      console.error('[DeliveryDispatch] Notification error for auto_assign candidate:', err.message);
    }
  }

  return order;
}

/**
 * Escalate to next-nearest available delivery agent when all previous offers were declined
 * or when the pickup deadline expired. Shared by offer decline and scheduler watchdog.
 */
export async function escalateToNextDeliveryAgent(order, { notifyFarmerOnFail = false } = {}) {
  if (!order) return null;

  let availableAgents = await User.find({
    role: { $in: ['delivery_agent', 'driver'] },
    $or: [
      { 'deliveryAgentProfile.availabilityStatus': 'available' },
      { availabilityStatus: 'available' }
    ]
  }).lean();

  if (!availableAgents || availableAgents.length === 0) {
    availableAgents = await User.find({
      role: { $in: ['delivery_agent', 'driver'] },
      'deliveryAgentProfile.availabilityStatus': { $ne: 'offline' }
    }).lean();
  }

  if (!availableAgents || availableAgents.length === 0) {
    availableAgents = await User.find({
      role: { $in: ['delivery_agent', 'driver'] }
    }).lean();
  }

  const attemptedAgentIds = (order.deliveryOffers || []).map(o => o.agent?.toString()).filter(Boolean);
  const eligibleAgents = availableAgents.filter(a => !attemptedAgentIds.includes(a._id.toString()));

  const orderShort = order._id.toString().slice(-6).toUpperCase();

  if (eligibleAgents.length === 0) {
    console.warn(`[DeliveryEscalation] No further uncontacted delivery agents available for order ${order._id}`);
    if (notifyFarmerOnFail && order.farmer) {
      try {
        await sendNotification({
          recipientId: order.farmer,
          senderId: order.buyer?._id || order.buyer,
          type: 'custom',
          title: '⚠️ Delivery Allocation Alert',
          message: `All contacted delivery partners are currently unavailable for packed Order #${orderShort}. Our dispatch system will retry automatically.`,
          relatedOrder: order._id,
        });
      } catch (err) {
        console.error('[DeliveryEscalation] Error notifying farmer on failure:', err.message);
      }
    }
    return null;
  }

  let farmerLocation = 'Karnataka';
  let farmerAddress = 'the farm location';
  if (order.farmer) {
    const farmerUser = await User.findById(order.farmer._id || order.farmer).lean();
    if (farmerUser?.location?.district || farmerUser?.location?.address) {
      farmerLocation = farmerUser.location.district || farmerUser.location.address;
      farmerAddress = farmerUser.location.address || farmerLocation;
    }
  }

  const ranked = rankAgentsByProximityAndRating(eligibleAgents, farmerLocation);
  const nextAgent = ranked[0];

  order.deliveryOffers = order.deliveryOffers || [];
  order.deliveryOffers.push({
    agent: nextAgent._id,
    offeredAt: new Date(),
    status: 'offered'
  });
  order.deliveryRequestStatus = 'pending_driver_approval';
  await order.save();

  const windowHours = PICKUP_WINDOW_HOURS || 6;
  const deadlineStr = order.pickupDeadline
    ? new Date(order.pickupDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : `${windowHours} hours`;

  try {
    await sendNotification({
      recipientId: nextAgent._id,
      senderId: order.buyer?._id || order.buyer,
      type: 'custom',
      title: '🚚 Escalated Delivery Offer',
      message: `Order #${orderShort} is packed and ready for pickup at ${farmerAddress}. Please collect within ${windowHours} hours (by ${deadlineStr}).`,
      relatedOrder: order._id,
    });
  } catch (err) {
    console.error('[DeliveryEscalation] Error notifying escalated agent:', err.message);
  }

  return nextAgent;
}

// @desc    Get all jobs for the delivery agent (pending requests + active + completed)
// @route   GET /api/orders/driver/jobs
// @access  Private (delivery_agent)
export const getDriverJobs = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [
      { deliveryAgent: req.user._id },
      { deliveryRequestStatus: 'pending_driver_approval', deliveryAgent: req.user._id },
      { deliveryOffers: { $elemMatch: { agent: req.user._id, status: 'offered' } } }
    ]
  })
    .populate('items.listing')
    .populate('buyer', 'name email phone location')
    .populate('farmer', 'name email phone location')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Get pending delivery requests for the agent
// @route   GET /api/orders/driver/requests
// @access  Private (delivery_agent)
export const getDriverRequests = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    $or: [
      { deliveryAgent: req.user._id, deliveryRequestStatus: 'pending_driver_approval' },
      { deliveryOffers: { $elemMatch: { agent: req.user._id, status: 'offered' } } }
    ]
  })
    .populate('items.listing')
    .populate('buyer', 'name email phone location')
    .populate('farmer', 'name email phone location')
    .sort({ createdAt: -1 });
  res.json(orders);
});

// @desc    Initiate or dispatch a delivery request for an order
// @route   POST /api/orders/:orderId/delivery/request
// @access  Private
export const requestDeliveryForOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { chosenAgentId, agentId, deliveryMode } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (deliveryMode && ['buyer_choice', 'auto_assign'].includes(deliveryMode)) {
    order.deliveryMode = deliveryMode;
  }

  const targetAgentId = chosenAgentId || agentId || order.deliveryAgent;
  await dispatchDeliveryOffers(order, targetAgentId);

  res.json({
    success: true,
    message: 'Delivery offers dispatched successfully',
    order
  });
});

// @desc    Respond to a delivery offer (accept or decline)
// @route   PUT /api/orders/:orderId/delivery/offers/:agentId/respond
// @access  Private (delivery_agent or driver)
export const respondToDeliveryOffer = asyncHandler(async (req, res) => {
  const { orderId, agentId } = req.params;
  const action = req.body.action?.toLowerCase(); // 'accept' | 'decline' | 'reject'

  if (!['accept', 'decline', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Action must be "accept" or "decline"' });
  }

  // Authorization check: Must be the agent or admin
  const isAgent = req.user._id.toString() === agentId.toString();
  const isAdmin = req.user.role === 'admin';
  if (!isAgent && !isAdmin) {
    return res.status(403).json({ message: 'Not authorized to respond for this agent' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  order.deliveryOffers = order.deliveryOffers || [];

  // Check or register offer entry
  let currentOffer = order.deliveryOffers.find(o => o.agent?.toString() === agentId.toString());
  if (!currentOffer) {
    currentOffer = {
      agent: agentId,
      offeredAt: new Date(),
      status: 'offered'
    };
    order.deliveryOffers.push(currentOffer);
  }

  if (action === 'accept') {
    // Check if another agent already accepted (first-accept-wins)
    if (
      order.deliveryRequestStatus === 'driver_accepted' &&
      order.deliveryAgent &&
      order.deliveryAgent.toString() !== agentId.toString()
    ) {
      return res.status(409).json({
        message: 'This delivery job has already been accepted by another agent.',
        order
      });
    }

    currentOffer.status = 'accepted';

    // Mark all sibling pending offers as expired
    const siblingOffers = order.deliveryOffers.filter(
      o => o.agent?.toString() !== agentId.toString() && o.status === 'offered'
    );
    for (const sibling of siblingOffers) {
      sibling.status = 'expired';
    }

    order.deliveryAgent = agentId;
    order.deliveryRequestStatus = 'driver_accepted';
    await order.save();

    const agentUser = await User.findById(agentId).select('name phone');
    const agentName = agentUser?.name || 'Assigned Delivery Agent';

    // Notify Buyer
    try {
      await sendNotification({
        recipientId: order.buyer,
        senderId: agentId,
        type: 'custom',
        title: '🚚 Delivery Agent Confirmed!',
        message: `${agentName} has accepted delivery for your order #${order._id.toString().slice(-6)}.`,
        relatedOrder: order._id,
      });
    } catch (e) {}

    // Notify Farmer
    if (order.farmer) {
      try {
        await sendNotification({
          recipientId: order.farmer,
          senderId: agentId,
          type: 'custom',
          title: '🚚 Delivery Agent Assigned',
          message: `${agentName} will pick up order #${order._id.toString().slice(-6)}. Please have items packed.`,
          relatedOrder: order._id,
        });
      } catch (e) {}
    }

    // Automatically reject and notify sibling agents that the job was taken
    for (const sibling of siblingOffers) {
      try {
        await sendNotification({
          recipientId: sibling.agent,
          senderId: agentId,
          type: 'custom',
          title: 'Job Taken',
          message: `Delivery job for order #${order._id.toString().slice(-6)} has been taken by another agent.`,
          relatedOrder: order._id,
        });
      } catch (e) {}
    }

    if (req.io) {
      req.io.emit('orderUpdate', { orderId: order._id, deliveryRequestStatus: 'driver_accepted', deliveryAgent: agentId });
    }

    return res.json({
      success: true,
      message: 'Delivery offer accepted successfully',
      order
    });
  }

  // Action is decline / reject
  currentOffer.status = 'declined';
  if (order.deliveryAgent?.toString() === agentId.toString()) {
    order.deliveryAgent = undefined;
    order.deliveryRequestStatus = 'none';
  }

  await order.save();

  // If auto_assign and no other pending offers remain, escalate to next-nearest agent automatically
  const remainingPendingOffers = order.deliveryOffers.filter(o => o.status === 'offered');
  if (order.deliveryMode === 'auto_assign' && remainingPendingOffers.length === 0) {
    await escalateToNextDeliveryAgent(order);
  }

  return res.json({
    success: true,
    message: 'Delivery offer declined',
    order
  });
});

// @desc    Accept or reject a delivery request (legacy forwarder)
// @route   PUT /api/orders/:orderId/driver/respond
// @access  Private (delivery_agent)
export const acceptRejectDriverJob = asyncHandler(async (req, res) => {
  const { action } = req.body;
  req.params.agentId = req.user._id.toString();
  req.body.action = action === 'reject' ? 'decline' : action;
  return respondToDeliveryOffer(req, res);
});

// @desc    Mark order as collected or delivered by the driver
// @route   PUT /api/orders/:orderId/driver/status
// @access  Private (delivery_agent)
export const updateDriverJobStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'collected' or 'delivered'
  const order = await Order.findById(req.params.orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }
  if (order.deliveryAgent?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  order.deliveryRequestStatus = status;
  if (status === 'collected') {
    order.status = 'collected';
  } else if (status === 'delivered') {
    order.status = 'delivered';
  }
  await order.save();

  // Notify buyer
  try {
    const title = status === 'collected' ? '📦 Order Collected!' : '🎉 Order Delivered!';
    const message = status === 'collected'
      ? `${req.user.name} has collected your order from the farmer. It's on the way!`
      : `${req.user.name} has delivered your order. Please confirm receipt.`;

    await sendNotification({
      recipientId: order.buyer,
      senderId: req.user._id,
      type: 'custom',
      title,
      message,
      relatedOrder: order._id,
    });
  } catch (e) {}

  if (req.io) req.io.emit('orderUpdate', { orderId: order._id, status });
  res.json(order);
});

// @desc    Get driver dashboard stats (earnings, trips, etc.)
// @route   GET /api/orders/driver/stats
// @access  Private (delivery_agent)
export const getDriverStats = asyncHandler(async (req, res) => {
  const completedOrders = await Order.find({
    deliveryAgent: req.user._id,
    deliveryRequestStatus: 'delivered'
  });

  const totalEarnings = completedOrders.reduce((sum, o) => sum + (o.deliveryFare || 0), 0);
  const tripsCompleted = completedOrders.length;

  const activeOrders = await Order.countDocuments({
    deliveryAgent: req.user._id,
    deliveryRequestStatus: { $in: ['driver_accepted', 'collected'] }
  });

  const pendingRequests = await Order.countDocuments({
    deliveryAgent: req.user._id,
    deliveryRequestStatus: 'pending_driver_approval'
  });

  // Average rating from rated delivered orders
  const ratedOrders = completedOrders.filter(o => o.rating);
  const avgRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((s, o) => s + o.rating, 0) / ratedOrders.length).toFixed(1)
    : 0;

  res.json({
    totalEarnings,
    tripsCompleted,
    activeOrders,
    pendingRequests,
    avgRating: Number(avgRating),
  });
});
