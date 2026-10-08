/**
 * notificationsApi.js
 * Shared helper for all notification state mutations.
 * Used by FarmerDashboard, BuyerDashboard, DeliveryAgentDashboard,
 * Navbar and GmailNotificationInbox so they all have identical
 * optimistic-update + rollback behaviour.
 */
import api from './axios.js';

/**
 * Mark every unread notification as read.
 *
 * @param {object} opts
 * @param {Array}  [opts.notifications]     - Optional current notifications array for immediate rollback snapshot
 * @param {Function} opts.setNotifications  - React state setter for the notifications array
 * @param {Function} [opts.setUnreadCount]  - React state setter for the unread integer (optional)
 * @returns {Promise<number>} the unreadCount returned by the server (always 0 on success)
 * @throws re-throws the axios error after rolling back optimistic state
 */
export async function apiMarkAllNotificationsRead({ notifications, setNotifications, setUnreadCount }) {
  // 1. Save current state so we can roll back on failure
  let previousNotifications = notifications;
  if (setNotifications) {
    setNotifications(prev => {
      if (!previousNotifications) previousNotifications = prev;
      return (prev || []).map(n => ({ ...n, read: true, isRead: true }));
    });
  }
  if (setUnreadCount) setUnreadCount(0);

  try {
    // 2. Persist to DB — route is now correctly ordered in Express
    const res = await api.put('/notifications/all/read');
    const serverCount = res.data?.unreadCount ?? res.data?.count ?? 0;
    if (setUnreadCount) setUnreadCount(serverCount);

    // 3. Dispatch cross-component event on success so other components stay in sync
    window.dispatchEvent(new CustomEvent('kb:notifications_all_read'));
    return serverCount;
  } catch (err) {
    // 4. Roll back on any network / server error
    if (setNotifications && previousNotifications !== undefined) {
      setNotifications(previousNotifications);
    }
    if (setUnreadCount) {
      // Re-fetch real count rather than guess
      api.get('/notifications/unread/count')
        .then(r => setUnreadCount(r.data?.unreadCount ?? r.data?.count ?? 0))
        .catch(() => {});
    }
    throw err; // let the caller surface the error toast to the user
  }
}

/**
 * Mark a single notification as read.
 *
 * @param {object} opts
 * @param {string}   opts.notifId
 * @param {Array}    [opts.notifications]
 * @param {Function} opts.setNotifications
 * @param {Function} [opts.setUnreadCount]
 * @returns {Promise<object>} server response data
 * @throws re-throws on failure after rolling back
 */
export async function apiMarkNotificationRead({ notifId, notifications, setNotifications, setUnreadCount }) {
  let previousNotifications = notifications;
  if (setNotifications) {
    setNotifications(prev => {
      if (!previousNotifications) previousNotifications = prev;
      return (prev || []).map(n => ((n._id || n.id) === notifId ? { ...n, read: true, isRead: true } : n));
    });
  }
  if (setUnreadCount) {
    setUnreadCount(prev => Math.max(0, (prev || 1) - 1));
  }

  try {
    const res = await api.put(`/notifications/${notifId}/read`);
    const serverCount = res.data?.unreadCount ?? res.data?.count;
    if (setUnreadCount && serverCount !== undefined) setUnreadCount(serverCount);
    window.dispatchEvent(new CustomEvent('kb:notification_read', { detail: { id: notifId } }));
    return res.data;
  } catch (err) {
    if (setNotifications && previousNotifications !== undefined) {
      setNotifications(previousNotifications);
    }
    if (setUnreadCount) {
      api.get('/notifications/unread/count')
        .then(r => setUnreadCount(r.data?.unreadCount ?? r.data?.count ?? 0))
        .catch(() => {});
    }
    throw err;
  }
}

/**
 * Delete a single notification.
 *
 * @param {object} opts
 * @param {string}   opts.notifId
 * @param {boolean}  opts.wasUnread
 * @param {Array}    [opts.notifications]
 * @param {Function} opts.setNotifications
 * @param {Function} [opts.setUnreadCount]
 * @returns {Promise<object>} server response data
 * @throws re-throws on failure after rolling back
 */
export async function apiDeleteNotification({ notifId, wasUnread, notifications, setNotifications, setUnreadCount }) {
  let previousNotifications = notifications;
  if (setNotifications) {
    setNotifications(prev => {
      if (!previousNotifications) previousNotifications = prev;
      return (prev || []).filter(n => (n._id || n.id) !== notifId);
    });
  }
  if (wasUnread && setUnreadCount) {
    setUnreadCount(prev => Math.max(0, (prev || 1) - 1));
  }

  try {
    const res = await api.delete(`/notifications/${notifId}`);
    const serverCount = res.data?.unreadCount ?? res.data?.count;
    if (setUnreadCount && serverCount !== undefined) setUnreadCount(serverCount);
    window.dispatchEvent(new CustomEvent('kb:notification_deleted', { detail: { id: notifId, wasUnread } }));
    return res.data;
  } catch (err) {
    if (setNotifications && previousNotifications !== undefined) {
      setNotifications(previousNotifications);
    }
    if (setUnreadCount) {
      api.get('/notifications/unread/count')
        .then(r => setUnreadCount(r.data?.unreadCount ?? r.data?.count ?? 0))
        .catch(() => {});
    }
    throw err;
  }
}
