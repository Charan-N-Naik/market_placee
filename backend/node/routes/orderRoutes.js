import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { 
  createOrder, 
  getOrderById,
  getBuyerOrders, 
  getSellerOrders, 
  updateOrderStatus, 
  refundOrder,
  markOrderAsReceived,
  rateOrder,
  getPendingOrders,
  getDriverJobs,
  getDriverRequests,
  acceptRejectDriverJob,
  updateDriverJobStatus,
  getDriverStats,
  requestDeliveryForOrder,
  respondToDeliveryOffer
} from '../controllers/orderController.js';

const router = express.Router();

// Get single order by ID
router.get('/:orderId', protect, getOrderById);

// Create a new order (buyer must be authenticated)
router.post('/', protect, createOrder);

// Get orders for the logged-in buyer
router.get('/my', protect, getBuyerOrders);
router.get('/buyer', protect, getBuyerOrders);

// Get pending orders for buyer
router.get('/pending/list', protect, getPendingOrders);

// Get orders for the farmer who owns the listings in the orders
router.get('/seller', protect, requireRole('farmer'), getSellerOrders);

// ═══ Delivery Agent Routes & Offer Orchestration ═══
router.get('/driver/jobs', protect, getDriverJobs);
router.get('/driver/requests', protect, getDriverRequests);
router.get('/driver/stats', protect, getDriverStats);
router.post('/:orderId/delivery/request', protect, requestDeliveryForOrder);
router.put('/:orderId/delivery/offers/:agentId/respond', protect, respondToDeliveryOffer);
router.put('/:orderId/driver/respond', protect, acceptRejectDriverJob);
router.put('/:orderId/driver/status', protect, updateDriverJobStatus);

// Mark order as received (buyer)
router.put('/:orderId/receive', protect, markOrderAsReceived);

// Rate an order (buyer)
router.post('/:orderId/rate', protect, rateOrder);

// Update order status (e.g., admin or farmer can change)
router.put('/:orderId/status', protect, updateOrderStatus);

// Refund an order (admin only)
router.post('/:orderId/refund', protect, requireRole('admin'), refundOrder);

export default router;
