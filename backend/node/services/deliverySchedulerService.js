import cron from 'node-cron';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendNotification } from './notificationService.js';
import { rankAgentsByProximityAndRating } from './deliveryDistanceService.js';
import { PICKUP_WINDOW_HOURS } from '../controllers/orderController.js';

/**
 * Scheduled watchdog to check for packed orders whose pickup deadline has passed
 * without driver acceptance.
 * 
 * For each expired order:
 * - Marks current offer(s) with status 'offered' as 'expired'
 * - Tries the next agent in the auto-assign ranking
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

      // 2. Extend/refresh pickup deadline for the next candidate
      order.pickupDeadline = new Date(Date.now() + windowHours * 60 * 60 * 1000);

      // 3. Find next available agent in ranking who hasn't been offered yet
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

      const attemptedAgentIds = order.deliveryOffers.map(o => o.agent?.toString()).filter(Boolean);
      const eligibleAgents = availableAgents.filter(a => !attemptedAgentIds.includes(a._id.toString()));

      let farmerLocation = 'Karnataka';
      let farmerAddress = 'the farm location';
      if (order.farmer) {
        const farmerUser = await User.findById(order.farmer._id || order.farmer).lean();
        if (farmerUser?.location?.district || farmerUser?.location?.address) {
          farmerLocation = farmerUser.location.district || farmerUser.location.address;
          farmerAddress = farmerUser.location.address || farmerLocation;
        }
      }

      const deadlineStr = order.pickupDeadline.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      const orderShort = order._id.toString().slice(-6).toUpperCase();

      if (eligibleAgents.length > 0) {
        const ranked = rankAgentsByProximityAndRating(eligibleAgents, farmerLocation);
        const nextAgent = ranked[0];

        order.deliveryOffers.push({
          agent: nextAgent._id,
          offeredAt: new Date(),
          status: 'offered'
        });
        order.deliveryRequestStatus = 'pending_driver_approval';

        // Notify the new escalated agent with deadline and address
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
          console.error('[DeliveryScheduler] Error notifying escalated agent:', err.message);
        }
      } else {
        console.warn(`[DeliveryScheduler] No remaining uncontacted agents available for order ${order._id}`);
      }

      await order.save();

      // 4. Send alert notification to the farmer that pickup is delayed
      if (order.farmer) {
        try {
          await sendNotification({
            recipientId: order.farmer,
            senderId: order.buyer?._id || order.buyer,
            type: 'custom',
            title: '⚠️ Delivery Pickup Delayed',
            message: `Pickup for packed Order #${orderShort} is delayed past the ${windowHours}-hour window. Previous driver offers expired; a new delivery request has been dispatched to the next nearest partner.`,
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
