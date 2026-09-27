import cron from 'node-cron';
import Order from '../models/Order.js';
import { sendNotification } from './notificationService.js';
import { PICKUP_WINDOW_HOURS, escalateToNextDeliveryAgent } from '../controllers/orderController.js';

/**
 * Scheduled watchdog to check for packed orders whose pickup deadline has passed
 * without driver acceptance.
 * 
 * For each expired order:
 * - Marks current offer(s) with status 'offered' as 'expired'
 * - Clears pending driver assignment
 * - Tries the next agent in the auto-assign ranking via shared escalateToNextDeliveryAgent
 * - Sends an alert notification to the farmer that pickup is delayed
 */
export async function checkExpiredDeliveryDeadlines() {
  try {
    const now = new Date();
    const expiredOrders = await Order.find({
      status: 'packed',
      deliveryRequestStatus: { $in: ['pending_driver_approval', 'none'] },
      pickupDeadline: { $lt: now }
    });

    if (!expiredOrders || expiredOrders.length === 0) {
      return;
    }

    console.log(`[DeliveryScheduler] Found ${expiredOrders.length} packed order(s) with expired pickup deadline.`);

    const windowHours = PICKUP_WINDOW_HOURS || 6;

    for (const order of expiredOrders) {
      order.deliveryOffers = order.deliveryOffers || [];

      // 1. Mark current pending offer(s) as 'expired'
      const expiredAgentIds = [];
      for (const offer of order.deliveryOffers) {
        if (offer.status === 'offered') {
          offer.status = 'expired';
          if (offer.agent) expiredAgentIds.push(offer.agent.toString());
        }
      }

      // Notify expired agents
      for (const agentId of expiredAgentIds) {
        try {
          await sendNotification({
            recipientId: agentId,
            senderId: order.buyer?._id || order.buyer,
            type: 'custom',
            title: 'Offer Expired',
            message: `Delivery offer for order #${order._id.toString().slice(-6).toUpperCase()} has expired because the pickup window passed.`,
            relatedOrder: order._id,
          });
        } catch (e) {}
      }

      // Clear pending deliveryAgent assignment
      order.deliveryAgent = undefined;
      order.deliveryRequestStatus = 'none';

      // 2. Refresh/extend pickup deadline for the next candidate
      order.pickupDeadline = new Date(Date.now() + windowHours * 60 * 60 * 1000);
      await order.save();

      // 3. Try the next agent using the shared escalateToNextDeliveryAgent helper
      const nextAgent = await escalateToNextDeliveryAgent(order, { notifyFarmerOnFail: true });

      // 4. Send alert notification to the farmer that pickup is delayed
      if (order.farmer) {
        try {
          const orderShort = order._id.toString().slice(-6).toUpperCase();
          const nextNotice = nextAgent
            ? 'a new delivery request has been dispatched to the next nearest partner.'
            : 'all contacted delivery partners are currently unavailable and dispatch will retry.';

          await sendNotification({
            recipientId: order.farmer,
            senderId: order.buyer?._id || order.buyer,
            type: 'custom',
            title: '⚠️ Delivery Pickup Delayed',
            message: `Pickup for packed Order #${orderShort} is delayed past the ${windowHours}-hour window. Previous driver offers expired; ${nextNotice}`,
            relatedOrder: order._id,
          });
        } catch (err) {
          console.error('[DeliveryScheduler] Error notifying farmer about delay:', err.message);
        }
      }
    }
  } catch (error) {
    console.error('[DeliveryScheduler] Error checking expired delivery deadlines:', error);
  }
}

/**
 * Initialize cron job checking every 15 minutes
 */
export function initDeliveryScheduler() {
  cron.schedule('*/15 * * * *', () => {
    checkExpiredDeliveryDeadlines();
  });
  console.log('[DeliveryScheduler] Delivery deadline watchdog active (running every 15 min).');
}
