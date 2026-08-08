import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { 
  createOrder, 
  getBuyerOrders, 
  getSellerOrders, 
  updateOrderStatus, 
  refundOrder,
  markOrderAsReceived,
  rateOrder,
  getPendingOrders
} from '../controllers/orderController.js';

const router = express.Router();

// Create a new order (buyer must be authenticated)
router.post('/', protect, createOrder);

// Get orders for the logged‑in buyer
router.get('/my', protect, getBuyerOrders);
router.get('/buyer', protect, getBuyerOrders);

// Get pending orders for buyer
router.get('/pending/list', protect, getPendingOrders);

// Get orders for the farmer who owns the listings in the orders
router.get('/seller', protect, requireRole('farmer'), getSellerOrders);

// Mark order as received (buyer)
router.put('/:orderId/receive', protect, markOrderAsReceived);

// Rate an order (buyer)
router.post('/:orderId/rate', protect, rateOrder);

// Update order status (e.g., admin or farmer can change)
router.put('/:orderId/status', protect, updateOrderStatus);

// Refund an order (admin only)
router.post('/:orderId/refund', protect, requireRole('admin'), refundOrder);

export default router;
