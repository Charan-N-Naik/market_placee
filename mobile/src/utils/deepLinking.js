/**
 * React Navigation Deep Linking Configuration for KisanBazaar Mobile
 *
 * Supported URI Schemes:
 * - kisanbazaar://order/:orderId  -> Opens Live Delivery Tracking Map
 * - kisanbazaar://listing/:id     -> Opens Produce Detail Page
 * - https://kisanbazaar.com/orders/:orderId -> Universal Link
 */

export const linkingConfig = {
  prefixes: ['kisanbazaar://', 'https://kisanbazaar.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          BuyerDashboard: 'buyer',
          FarmerDashboard: 'farmer',
          DeliveryDashboard: 'delivery',
        },
      },
      OrderTrackingMap: {
        path: 'order/:orderId',
        parse: {
          orderId: (orderId) => `${orderId}`,
        },
      },
      ListingDetails: {
        path: 'listing/:id',
      },
    },
  },
};
