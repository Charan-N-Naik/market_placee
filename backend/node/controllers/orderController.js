// server/controllers/orderController.js
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';
import Listing from '../models/Listing.js';
import Payment from '../models/Payment.js';
import Chat from '../models/Chat.js';
import { sendNotification } from '../services/notificationService.js';

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private (buyer)
export const createOrder = asyncHandler(async (req, res) => {
  const { items, deliveryAddress, paymentMethod } = req.body;
  if (!items || !items.length) {
    return res.status(400).json({ message: 'No items provided' });
  }

  // Calculate total amount and verify inventory
  let totalAmount = 0;
  let farmerId = null;

  for (const item of items) {
    const listing = await Listing.findById(item.listing);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }
    // Use quantity field (the actual stock field in the Listing model)
    const availableQty = listing.quantity || 0;
    if (availableQty < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${listing.cropName}. Available: ${availableQty}` });
    }
    totalAmount += listing.pricePerUnit * item.quantity;

    // Get farmer ID from the first listing (assuming single farmer per order for now)
    if (!farmerId) {
      farmerId = listing.farmer;
    }
  }

  const order = await Order.create({
    buyer: req.user._id,
    farmer: farmerId,  // Store farmer directly for fast lookup
    items: items.map(i => ({
      listing: i.listing,
      quantity: i.quantity,
      priceAtPurchase: items.find(x => x.listing === i.listing)?.pricePerUnit || 0
    })),
    totalAmount,
    paymentMethod,
    deliveryAddress,
    status: 'pending',
  });

  // Reduce quantity immediately (optimistic)
  for (const item of items) {
    await Listing.findByIdAndUpdate(item.listing, { $inc: { quantity: -item.quantity } });
  }

  // Create or get existing chat with farmer
  let chat = await Chat.findOne({
    participants: { $all: [req.user._id, farmerId] },
    isGroup: false,
  });

  if (!chat) {
    chat = await Chat.create({
      participants: [req.user._id, farmerId],
      messages: [],
      isGroup: false,
    });
  }

  // Link chat to order
  order.relatedChat = chat._id;
  await order.save();

  // Send notification to farmer
  try {
    await sendNotification({
      recipientId: farmerId,
      senderId: req.user._id,
      type: 'order_placed',
      title: 'New Order Received',
      message: `A new order has been placed for ₹${totalAmount}. Total quantity: ${items.reduce((sum, i) => sum + i.quantity, 0)} units.`,
      relatedOrder: order._id,
      relatedChat: chat._id,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }

  // If online payment, create a payment record
  if (paymentMethod !== 'cod') {
    const payment = await Payment.create({
      order: order._id,
      amount: totalAmount,
      currency: 'INR',
      status: 'initiated',
    });
    order.paymentId = payment._id;
    await order.save();
    return res.status(201).json({
      orderId: order._id,
      paymentId: payment._id,
      chatId: chat._id
    });
  }

  res.status(201).json({
    orderId: order._id,
    chatId: chat._id
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
      } else if (status === 'shipped') {
        title = '🚚 Order Shipped!';
        message = 'Your crop shipment is out for delivery.';
      } else if (status === 'delivered') {
        title = '🎉 Order Delivered!';
        message = 'Your crop order has been delivered.';
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
