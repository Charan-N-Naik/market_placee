import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu, Bell, CloudSun, TrendingUp, Globe, ChevronDown,
  Mail, CheckCheck, ExternalLink, X, Package, Check, ArrowRight,
  MessageSquare, Star, ShoppingBag, Truck, AlertCircle, Trash2,
  User, Settings, LogOut, Landmark, LayoutDashboard, ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageToggle from '../LanguageToggle';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../utils/socket';
import DirectBuyerChatModal from '../DirectBuyerChatModal';

// Format a raw DB name into a clean, capitalized display name (e.g. former1 -> Former 1)
function formatDisplayName(rawName) {
  if (!rawName) return '';
  let n = String(rawName)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim();
  return n.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Extract clean buyer name, crop name, and order ID from notification
function extractNotificationDetails(notif) {
  if (!notif) return { buyerName: 'Buyer', cropName: 'Crop Order', orderNumber: '' };

  const buyerName =
    notif.buyerName ||
    notif.sender?.name ||
    notif.relatedOrder?.buyer?.name ||
    (notif.title?.match(/from\s+([^•\n]+)/i)?.[1]?.trim()) ||
    'Buyer';

  let cropName = notif.cropName;
  if (!cropName && notif.relatedOrder?.items?.length) {
    cropName = notif.relatedOrder.items
      .map(i => i.listing?.cropName || i.cropName)
      .filter(Boolean)
      .join(', ');
  }
  if (!cropName && notif.title) {
    const match = notif.title.match(/•\s+(.+)$/);
    if (match) cropName = match[1].trim();
  }
  if (!cropName && notif.message) {
    const match = notif.message.match(/for\s+([^.(]+)/i);
    if (match) cropName = match[1].trim();
  }
  if (!cropName) cropName = 'Agricultural Produce';

  const orderNumber =
    notif.orderNumber ||
    notif.relatedOrder?.orderNumber ||
    (notif.relatedOrder?._id ? String(notif.relatedOrder._id).slice(-6).toUpperCase() : '');

  return { buyerName, cropName, orderNumber };
}

// Relative time formatting
function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function Navbar({
  activeTab,
  navItems,
  sidebarOpen,
  setSidebarOpen,
  collapsed,
  setCollapsed,
  toggleSidebar,
  setActiveTab,
  role,
  topBarExtra,
  user,
  onLogout
}) {
  const { user: authUser, logout } = useAuth();
  const currentUser = user || authUser;
  const isFarmer = role === 'farmer';
  const isBuyer = role === 'buyer';
  const isAgent = role === 'delivery_agent' || role === 'delivery';
  const { t } = useTranslation();
  const navigate = useNavigate();

  const menuRef = useRef(null);

  const handleHamburgerClick = () => {
    setActiveDropdown(prev => prev === 'menu' ? null : 'menu');
  };

  // Separate unread counts:
  // 1. Notifications count (only product purchases, reviews, delivery status)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  // 2. Messages count (only live order chats)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Weather & APMC Prices (Farmer only)
  const [navWeather, setNavWeather] = useState(null);
  const [navPrice, setNavPrice] = useState(null);

  // Active dropdown: 'notifications' | 'messages' | null
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Data lists
  const [notificationsList, setNotificationsList] = useState([]);
  const [messagesList, setMessagesList] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Direct modal chat state
  const [chatModalOrder, setChatModalOrder] = useState(null);

  // Real-time toast alerts
  const [liveToast, setLiveToast] = useState(null);

  const containerRef = useRef(null);

  // Fetch unread notification count (purchases, ratings, delivery status)
  const fetchUnreadNotificationsCount = () => {
    api.get('/notifications/unread/count')
      .then(res => {
        const raw = res.data?.unreadCount ?? res.data?.count ?? (typeof res.data === 'number' ? res.data : 0);
        setUnreadNotificationsCount(Number(raw) || 0);
      })
      .catch(() => setUnreadNotificationsCount(0));
  };

  // Fetch unread messages count (live chat messages from other participants)
  const fetchUnreadMessagesCount = () => {
    api.get('/chat/unread/count')
      .then(res => {
        const raw = res.data?.unreadCount ?? res.data?.count ?? (typeof res.data === 'number' ? res.data : 0);
        setUnreadMessagesCount(Number(raw) || 0);
      })
      .catch(() => setUnreadMessagesCount(0));
  };

  // Fetch recent notifications
  const fetchRecentNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.get('/notifications');
      const apiNotifs = res.data || [];
      // Filter out pure messages just in case
      setNotificationsList(apiNotifs.filter(n => n.type !== 'message'));
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Fetch recent order chats
  const fetchRecentMessages = async () => {
    setLoadingMessages(true);
    try {
      const res = await api.get('/chat/recent');
      setMessagesList(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch recent messages:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Mark all notifications as read
  const handleMarkAllNotificationsRead = async () => {
    try {
      setUnreadNotificationsCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
      window.dispatchEvent(new CustomEvent('kb:notifications_all_read'));
      await api.put('/notifications/all/read');
    } catch (err) {
      console.warn('Failed to mark all notifications as read:', err.message);
    }
  };

  // Delete a single notification from list/bell
  const handleDeleteNotification = async (notif, e) => {
    if (e) e.stopPropagation();
    const notifId = notif._id || notif.id;
    if (!notifId) return;

    const wasUnread = !notif.read;
    if (wasUnread) {
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
    }
    setNotificationsList(prev => prev.filter(n => (n._id || n.id) !== notifId));
    window.dispatchEvent(new CustomEvent('kb:notification_deleted', { detail: { id: notifId, wasUnread } }));

    try {
      await api.delete(`/notifications/${notifId}`);
    } catch (err) {
      console.warn('Failed to delete notification:', err.message);
    }
  };

  // Mark all messages as read
  const handleMarkAllMessagesRead = async () => {
    try {
      await api.put('/chat/all/read');
      setUnreadMessagesCount(0);
      setMessagesList(prev => prev.map(m => ({ ...m, unreadCount: 0 })));
    } catch (err) {
      console.warn('Failed to mark all messages as read:', err.message);
    }
  };

  // Click on a notification item
  const handleNotificationClick = async (notif) => {
    const notifId = notif._id || notif.id;
    if (!notif.read) {
      setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
      setNotificationsList(prev => prev.map(n => ((n._id || n.id) === notifId ? { ...n, read: true, isRead: true } : n)));
      window.dispatchEvent(new CustomEvent('kb:notification_read', { detail: { id: notifId } }));
      try {
        await api.put(`/notifications/${notifId}/read`);
      } catch (_) {}
    }
    setActiveDropdown(null);

    if (notif.relatedOrder) {
      if (setActiveTab) setActiveTab('orders');
      else navigate(isFarmer ? '/farmer/dashboard' : isAgent ? '/agent/dashboard' : '/buyer/dashboard');
    } else {
      if (setActiveTab) setActiveTab('notifications');
    }
  };

  // Click on a message item (opens the live chat modal)
  const handleMessageItemClick = async (conversation) => {
    if (conversation.unreadCount > 0) {
      try {
        await api.put(`/chat/order/${conversation.orderId}/read`);
        setUnreadMessagesCount(prev => Math.max(0, prev - (conversation.unreadCount || 1)));
        setMessagesList(prev => prev.map(m => m.orderId === conversation.orderId ? { ...m, unreadCount: 0 } : m));
      } catch (_) {}
    }
    setActiveDropdown(null);

    // Open live chat modal directly
    setChatModalOrder({
      _id: conversation.orderId,
      orderId: conversation.orderId,
      orderNumber: conversation.orderNumber,
      buyer: conversation.buyer,
      farmer: conversation.farmer,
      deliveryAgent: conversation.deliveryAgent,
      cropName: conversation.cropName,
      otherParticipant: conversation.otherParticipant,
    });
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      const outsideContainer = !containerRef.current || !containerRef.current.contains(e.target);
      const outsideMenu = !menuRef.current || !menuRef.current.contains(e.target);
      if (outsideContainer && outsideMenu) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch initial counts on mount and activeTab change
  useEffect(() => {
    fetchUnreadNotificationsCount();
    fetchUnreadMessagesCount();
  }, [activeTab]);

  // Real-time socket events for notifications and order messages
  useEffect(() => {
    let socketInstance = null;
    try {
      socketInstance = getSocket();
      if (socketInstance) {
        // 1. Notification events (orders placed, reviews, status)
        const handleNewNotification = (notif) => {
          if (notif?.type === 'message') return; // Exclude messages from notifications
          setUnreadNotificationsCount(prev => prev + 1);
          setNotificationsList(prev => [notif, ...prev]);

          const details = extractNotificationDetails(notif);
          setLiveToast({
            id: Date.now(),
            kind: 'notification',
            title: notif.type === 'rating' ? '⭐ New Customer Review' : '🌾 Order Update',
            buyerName: details.buyerName,
            cropName: details.cropName,
            orderNumber: details.orderNumber,
            message: notif.message,
            relatedOrder: notif.relatedOrder,
          });

          setTimeout(() => {
            setLiveToast(prev => (prev?.id === notif._id ? null : prev));
          }, 7000);
        };

        const handleNotifCountUpdate = (payload) => {
          const raw = payload?.unreadCount ?? payload?.count ?? 0;
          setUnreadNotificationsCount(Number(raw) || 0);
        };

        // 2. Chat message events (live messages on orders)
        const handleNewOrderMessage = (msg) => {
          // If not sent by self
          if ((msg?.sender?._id || msg?.sender?.id || msg?.sender)?.toString() !== currentUser?._id?.toString()) {
            setUnreadMessagesCount(prev => prev + 1);
            fetchRecentMessages();

            setLiveToast({
              id: Date.now(),
              kind: 'message',
              title: `💬 New Message from ${msg.sender?.name || 'Partner'}`,
              buyerName: msg.sender?.name || 'Partner',
              cropName: '',
              orderNumber: msg.orderId ? String(msg.orderId).slice(-6).toUpperCase() : '',
              message: msg.text || msg.content || 'Sent a new message on order chat',
              relatedOrder: { _id: msg.orderId },
            });

            setTimeout(() => {
              setLiveToast(prev => (prev?.id === msg._id ? null : prev));
            }, 7000);
          }
        };

        const handleMsgCountUpdate = (payload) => {
          const raw = payload?.unreadCount ?? payload?.count ?? 0;
          setUnreadMessagesCount(Number(raw) || 0);
        };

        const handleNotifDeleted = (payload) => {
          const delId = payload?.notificationId;
          if (delId) {
            setNotificationsList(prev => prev.filter(n => (n._id || n.id) !== delId));
          }
        };

        socketInstance.on('new_notification', handleNewNotification);
        socketInstance.on('unread_count_update', handleNotifCountUpdate);
        socketInstance.on('notification_deleted', handleNotifDeleted);
        socketInstance.on('new_order_message', handleNewOrderMessage);
        socketInstance.on('unread_message_count_update', handleMsgCountUpdate);

        return () => {
          socketInstance.off('new_notification', handleNewNotification);
          socketInstance.off('unread_count_update', handleNotifCountUpdate);
          socketInstance.off('notification_deleted', handleNotifDeleted);
          socketInstance.off('new_order_message', handleNewOrderMessage);
          socketInstance.off('unread_message_count_update', handleMsgCountUpdate);
        };
      }
    } catch (err) {
      console.warn('[Navbar] Socket listener error:', err.message);
    }
  }, [currentUser]);

  // Synchronize across components via global CustomEvents
  useEffect(() => {
    const handleGlobalAllRead = () => {
      setUnreadNotificationsCount(0);
      setNotificationsList(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    };
    const handleGlobalDeleted = (e) => {
      const deletedId = e.detail?.id;
      if (deletedId) {
        setNotificationsList(prev => prev.filter(n => (n._id || n.id) !== deletedId));
        if (e.detail?.wasUnread !== false) {
          setUnreadNotificationsCount(prev => Math.max(0, prev - 1));
        }
      }
    };
    const handleGlobalRead = (e) => {
      const readId = e.detail?.id;
      if (readId) {
        setNotificationsList(prev => prev.map(n => ((n._id || n.id) === readId ? { ...n, read: true, isRead: true } : n)));
      }
    };

    window.addEventListener('kb:notifications_all_read', handleGlobalAllRead);
    window.addEventListener('kb:notification_deleted', handleGlobalDeleted);
    window.addEventListener('kb:notification_read', handleGlobalRead);

    return () => {
      window.removeEventListener('kb:notifications_all_read', handleGlobalAllRead);
      window.removeEventListener('kb:notification_deleted', handleGlobalDeleted);
      window.removeEventListener('kb:notification_read', handleGlobalRead);
    };
  }, []);

  // Fetch dynamic weather & APMC prices for farmers
  useEffect(() => {
    if (isFarmer) {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=13.34&longitude=77.10&current_weather=true')
        .then(res => res.json())
        .then(data => {
          if (data?.current_weather) {
            setNavWeather(`${Math.round(data.current_weather.temperature)}°C`);
          }
        })
        .catch(() => {});

      api.get('/market-prices')
        .then(res => {
          const prices = res.data || [];
          if (prices.length > 0) {
            const first = prices[0];
            const rawName = first.commodity || first.name || 'Crops';
            const rawVal = first.modalPrice ?? first.modal_price ?? first.price ?? '—';
            const cleanDigits = String(rawVal).replace(/[₹\s]|Rs\.?|\/kg/gi, '').trim();
            const priceFormatted = cleanDigits ? `₹${cleanDigits}/kg` : (String(rawVal).startsWith('₹') ? rawVal : `₹${rawVal}`);
            setNavPrice(`${rawName} ${priceFormatted}`);
          }
        })
        .catch(() => {});
    }
  }, [isFarmer]);

  // =========================================================================
  // DROPDOWN 1: MESSAGES (✉️ ENVELOPE) — LIVE CHATS ONLY
  // =========================================================================
  const renderMessagesDropdown = () => (
    <div
      className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        boxShadow: '0 20px 45px -10px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.08)'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#15803d] text-white flex items-center justify-center shadow-xs">
            <Mail size={15} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900 leading-tight">
              Order Messages & Live Chat
            </h4>
            <p className="text-[10px] font-bold text-emerald-700">
              {unreadMessagesCount > 0 ? `${unreadMessagesCount} unread message${unreadMessagesCount > 1 ? 's' : ''}` : 'No unread messages'}
            </p>
          </div>
        </div>
        {unreadMessagesCount > 0 && (
          <button
            onClick={handleMarkAllMessagesRead}
            className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 hover:text-emerald-950 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs transition-colors cursor-pointer"
          >
            <CheckCheck size={12} className="text-emerald-600" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Conversations Feed */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {loadingMessages ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-400">Loading order conversations...</p>
          </div>
        ) : messagesList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto">
              <Mail size={24} />
            </div>
            <p className="text-xs font-bold text-gray-600">No live messages yet</p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
              When buyers or delivery agents chat about an order, their live messages appear right here.
            </p>
          </div>
        ) : (
          messagesList.map((item) => {
            const isUnread = (item.unreadCount || 0) > 0;
            const senderName = item.otherParticipant?.name || 'Partner';

            return (
              <div
                key={item.orderId || item.chatId}
                onClick={() => handleMessageItemClick(item)}
                className={`p-3.5 hover:bg-emerald-50/50 cursor-pointer transition-colors relative flex gap-3 items-start ${
                  isUnread ? 'bg-[#F0FDF4]/70 border-l-4 border-emerald-600' : 'bg-white'
                }`}
              >
                {/* Participant initial */}
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs mt-0.5">
                  {senderName.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-gray-900 truncate flex items-center gap-1.5">
                      <span>{senderName}</span>
                      {item.otherParticipant?.role && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-gray-100 text-gray-500">
                          {item.otherParticipant.role}
                        </span>
                      )}
                    </p>
                    <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">
                      {formatTimeAgo(item.lastMessage?.timestamp || item.updatedAt)}
                    </span>
                  </div>

                  {/* Order & Crop Pill */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100/80 text-emerald-900 text-[10px] font-black border border-emerald-200">
                      🌾 {item.cropName}
                    </span>
                    {item.orderNumber && (
                      <span className="text-[10px] font-mono font-bold text-gray-500">
                        #{item.orderNumber}
                      </span>
                    )}
                  </div>

                  {/* Message snippet */}
                  <p className={`text-[11px] line-clamp-1 leading-relaxed ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500 font-medium'}`}>
                    {item.lastMessage ? `${item.lastMessage.senderName}: "${item.lastMessage.text}"` : 'Order chat initialized'}
                  </p>
                </div>

                {/* Unread badge count or indicator */}
                {isUnread && (
                  <span className="px-1.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black shadow-xs flex-shrink-0 mt-1">
                    {item.unreadCount} new
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 text-center flex items-center justify-between px-4">
        <button
          onClick={() => {
            setActiveDropdown(null);
            if (setActiveTab) setActiveTab('orders');
            else navigate(isFarmer ? '/farmer/dashboard' : isAgent ? '/agent/dashboard' : '/buyer/dashboard');
          }}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 mx-auto py-1 cursor-pointer transition-colors"
        >
          <span>View All Orders & Chats</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // DROPDOWN 2: NOTIFICATIONS (🔔 BELL) — PRODUCT PURCHASES & REVIEWS ONLY
  // =========================================================================
  const renderNotificationsDropdown = () => (
    <div
      className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      style={{
        boxShadow: '0 20px 45px -10px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.08)'
      }}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-red-50 via-orange-50 to-white border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-500 text-white flex items-center justify-center shadow-xs">
            <Bell size={15} />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900 leading-tight">
              Order & Review Notifications
            </h4>
            <p className="text-[10px] font-bold text-red-600">
              {unreadNotificationsCount > 0 ? `${unreadNotificationsCount} unread update${unreadNotificationsCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadNotificationsCount > 0 && (
          <button
            onClick={handleMarkAllNotificationsRead}
            className="flex items-center gap-1 text-[10px] font-bold text-red-700 hover:text-red-900 bg-white/90 hover:bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs transition-colors cursor-pointer"
          >
            <CheckCheck size={12} className="text-red-500" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
        {loadingNotifs ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-400">Loading notifications...</p>
          </div>
        ) : notificationsList.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mx-auto">
              <Bell size={24} />
            </div>
            <p className="text-xs font-bold text-gray-600">No new notifications</p>
            <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
              When a buyer purchases your produce, leaves a review, or an order is updated, alerts will appear here.
            </p>
          </div>
        ) : (
          notificationsList.slice(0, 8).map((item) => {
            const { buyerName, cropName, orderNumber } = extractNotificationDetails(item);
            const isUnread = !item.read;
            const isRating = item.type === 'rating';
            const isOrder = item.type === 'order_placed';

            return (
              <div
                key={item._id || item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-3.5 hover:bg-orange-50/40 cursor-pointer transition-colors relative flex gap-3 items-start group ${
                  isUnread ? 'bg-[#FFF7ED]/70 border-l-4 border-red-500' : 'bg-white'
                }`}
              >
                {/* Icon badge */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 shadow-2xs mt-0.5 ${
                  isRating ? 'bg-amber-100 text-amber-700' : isOrder ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                }`}>
                  {isRating ? <Star size={15} className="fill-amber-500 text-amber-500" /> : isOrder ? <ShoppingBag size={15} /> : <Bell size={15} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-black text-gray-900 truncate">
                      {isRating ? `⭐ Review from ${buyerName}` : isOrder ? `🛒 New Order: ${buyerName}` : buyerName}
                    </p>
                    <span className="text-[10px] font-semibold text-gray-400 flex-shrink-0">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  {/* Crop badge */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-orange-100/80 text-orange-900 text-[10px] font-black border border-orange-200">
                      🌾 {cropName}
                    </span>
                    {orderNumber && (
                      <span className="text-[10px] font-mono font-bold text-gray-500">
                        #{orderNumber}
                      </span>
                    )}
                  </div>

                  {/* Notification text */}
                  <p className="text-[11px] text-gray-600 font-medium line-clamp-2 leading-relaxed">
                    {item.message || item.title}
                  </p>
                </div>

                {/* Actions & Unread Indicator */}
                <div className="flex items-center gap-1.5 shrink-0 self-center">
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                  <button
                    onClick={(e) => handleDeleteNotification(item, e)}
                    title="Delete notification"
                    className="p-1 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-gray-50/80 border-t border-gray-100 text-center flex items-center justify-between px-4">
        <button
          onClick={() => {
            setActiveDropdown(null);
            if (setActiveTab) setActiveTab('notifications');
            else navigate(isFarmer ? '/farmer/dashboard' : isAgent ? '/agent/dashboard' : '/buyer/dashboard');
          }}
          className="text-xs font-bold text-red-600 hover:text-red-800 flex items-center gap-1 mx-auto py-1 cursor-pointer transition-colors"
        >
          <span>View All Notifications</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );

  // =========================================================================
  // DROPDOWN 3: QUICK PROFILE & SETTINGS MENU (HAMBURGER / MENU BUTTON)
  // =========================================================================
  const renderQuickMenu = (accent = 'emerald') => {
    const isEmerald = accent === 'emerald';
    const primaryColor = isEmerald ? '#15803d' : '#ea580c';
    const primaryBg = isEmerald ? '#f0fdf4' : '#fff7ed';
    const primaryBorder = isEmerald ? '#bbf7d0' : '#fed7aa';

    const handleAction = (cb) => {
      setActiveDropdown(null);
      if (typeof cb === 'function') cb();
    };

    const handleLogoutAction = () => {
      setActiveDropdown(null);
      if (onLogout) {
        onLogout();
      } else if (logout) {
        logout();
      } else {
        localStorage.clear();
        window.location.href = '/';
      }
    };

    return (
      <div
        className="absolute left-0 top-full mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          boxShadow: '0 20px 45px -10px rgba(0,0,0,0.18), 0 8px 16px -6px rgba(0,0,0,0.08)'
        }}
      >
        {/* User Card Header */}
        <div className="p-4 bg-gradient-to-br from-gray-50 via-white to-gray-50 border-b border-gray-100 flex items-center gap-3">
          <div
            onClick={() => handleAction(() => setActiveTab?.('profile'))}
            title={t('navbar.viewProfile', 'View Profile')}
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white shadow-md flex-shrink-0 cursor-pointer transition-transform hover:scale-105 overflow-hidden"
            style={{
              background: isEmerald
                ? 'linear-gradient(135deg, #22C55E, #15803d)'
                : 'linear-gradient(135deg, #f97316, #ea580c)'
            }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              (formatDisplayName(currentUser?.name)?.charAt(0) || 'U').toUpperCase()
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-gray-900 truncate leading-tight">
              {formatDisplayName(currentUser?.name) || 'User'}
            </h4>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: primaryBg, color: primaryColor, border: `1px solid ${primaryBorder}` }}
              >
                {isFarmer ? '🌾 Farmer' : isAgent ? '🚚 Agent' : '🛒 Buyer'}
              </span>
              {(currentUser?.location?.district || currentUser?.location?.state || (typeof currentUser?.location === 'string' && currentUser?.location)) && (
                <span className="text-[10px] font-medium text-gray-500 truncate max-w-[120px]">
                  📍 {typeof currentUser?.location === 'object'
                    ? (currentUser?.location?.district || currentUser?.location?.state)
                    : String(currentUser?.location)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Items List */}
        <div className="p-2 space-y-0.5">
          {/* 1. Profile */}
          <button
            onClick={() => handleAction(() => setActiveTab?.('profile'))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
              style={{ background: primaryBg, color: primaryColor }}
            >
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                {t('sidebar.profile', 'My Profile')}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Personal details & address</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 2. Settings */}
          <button
            onClick={() => handleAction(() => setActiveTab?.('settings'))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
              <Settings size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                {t('sidebar.settings', 'Settings')}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Preferences & security</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 3. Dashboard */}
          <button
            onClick={() => handleAction(() => setActiveTab?.('dashboard'))}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
              <LayoutDashboard size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                {t('sidebar.dashboard', 'Dashboard Overview')}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Real-time statistics & activity</p>
            </div>
            <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
          </button>

          {/* 4. Orders / My Listings */}
          {isFarmer ? (
            <button
              onClick={() => handleAction(() => setActiveTab?.('listings'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
                <Package size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                  {t('sidebar.myListings', 'My Listings')}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">Manage crops & prices</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => setActiveTab?.('orders'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
                <Package size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                  {t('sidebar.orders', 'My Orders')}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">Track purchases & shipments</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          {/* 5. Govt Schemes for Farmer */}
          {isFarmer && (
            <button
              onClick={() => handleAction(() => navigate('/schemes'))}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
                <Landmark size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 group-hover:text-gray-900 leading-tight">
                  {t('navbar.govtSchemes', 'Government Schemes')}
                </p>
                <p className="text-[10px] text-gray-400 font-medium">Subsidies, loans & grants</p>
              </div>
              <ExternalLink size={13} className="text-gray-300 group-hover:text-gray-500 transition-all" />
            </button>
          )}

          {/* 6. Collapse/Expand Sidebar option */}
          <button
            onClick={() => handleAction(() => {
              if (toggleSidebar) toggleSidebar();
              else setCollapsed?.(prev => !prev);
            })}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left group cursor-pointer border border-transparent hover:border-gray-100"
          >
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0">
              <Menu size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 group-hover:text-gray-900 leading-tight">
                {collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Toggle sidebar width</p>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-100 my-1" />

        {/* Footer: Language + Logout */}
        <div className="p-3 bg-gray-50/80 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1.5">
              <Globe size={13} /> Language
            </span>
            <LanguageToggle />
          </div>

          <button
            onClick={handleLogoutAction}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>{t('common.logout', 'Sign Out')}</span>
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // DUAL BUTTONS COMPONENT (✉️ MESSAGES & 🔔 NOTIFICATIONS)
  // =========================================================================
  const renderDualTopButtons = (accent = 'emerald') => (
    <div style={{ position: 'relative' }} ref={containerRef}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        {/* 1. TOP ENVELOPE: ORDER LIVE CHATS ONLY */}
        <button
          onClick={() => {
            if (activeDropdown === 'messages') {
              setActiveDropdown(null);
            } else {
              setActiveDropdown('messages');
              fetchRecentMessages();
            }
          }}
          title="Order Chats & Direct Messages"
          className={`relative p-2 rounded-xl border border-gray-200 bg-white transition-all cursor-pointer flex items-center justify-center text-gray-600 shadow-2xs ${
            activeDropdown === 'messages' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700'
          }`}
        >
          <Mail size={18} />
          {unreadMessagesCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs animate-pulse">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
        </button>

        {/* 2. TOP BELL: ORDER PURCHASES, REVIEWS & ALERTS ONLY */}
        <button
          onClick={() => {
            if (activeDropdown === 'notifications') {
              setActiveDropdown(null);
            } else {
              setActiveDropdown('notifications');
              fetchRecentNotifications();
            }
          }}
          title="Order Purchases, Reviews & Alerts"
          className={`relative p-2 rounded-xl border border-gray-200 bg-white transition-all cursor-pointer flex items-center justify-center text-gray-600 shadow-2xs ${
            activeDropdown === 'notifications' ? 'bg-red-50 border-red-400 text-red-600' : 'hover:bg-red-50 hover:border-red-300 hover:text-red-600'
          }`}
        >
          <Bell size={18} />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs">
              {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
            </span>
          )}
        </button>
      </div>

      {/* Render selected popover */}
      {activeDropdown === 'messages' && renderMessagesDropdown()}
      {activeDropdown === 'notifications' && renderNotificationsDropdown()}
    </div>
  );

  // ====== NON-FARMER NAVBAR (BUYER / DELIVERY AGENT) ======
  if (!isFarmer) {
    const currentItem = navItems?.find(item => item.id === activeTab);
    const Icon = currentItem?.icon;
    const headerTitle = isAgent ? 'Delivery Agent Hub' : t('navbar.buyerHubBreadcrumb', 'Buyer Hub');

    return (
      <>
      <header style={{
        background: 'var(--bg-card, #fff)',
        borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
        padding: '0 1.5rem', height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 30,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }} ref={isFarmer ? null : menuRef}>
          <button
            onClick={handleHamburgerClick}
            title="Profile & Quick Menu"
            aria-label="Toggle profile and quick settings menu"
            className="transition-all hover:scale-105 active:scale-95"
            style={{
              background: activeDropdown === 'menu' ? '#fed7aa' : 'var(--color-primary-light, #fef3c7)',
              border: activeDropdown === 'menu' ? '1.5px solid #ea580c' : '1px solid #fed7aa',
              borderRadius: 10,
              padding: '0.5rem',
              cursor: 'pointer',
              color: 'var(--color-primary, #ea580c)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: activeDropdown === 'menu' ? '0 0 0 3px rgba(234,88,12,0.2)' : 'none'
            }}
            onMouseEnter={e => { if (activeDropdown !== 'menu') e.currentTarget.style.background = '#fde68a'; }}
            onMouseLeave={e => { if (activeDropdown !== 'menu') e.currentTarget.style.background = 'var(--color-primary-light, #fef3c7)'; }}
          >
            <Menu size={20} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {Icon && (
              <div style={{ width: 38, height: 38, borderRadius: 12, background: isAgent ? '#f0fdf4' : '#fff7ed', border: `1px solid ${isAgent ? '#bbf7d0' : '#ffedd5'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={19} style={{ color: isAgent ? '#16a34a' : '#ea580c' }} />
              </div>
            )}
            <div>
              <h2 style={{
                fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '1.05rem', fontWeight: 800, color: '#1c1917', margin: 0, lineHeight: 1.25,
                letterSpacing: '-0.01em'
              }}>
                {t('navbar.welcomeBack', 'Welcome,')} <span style={{ color: isAgent ? '#16a34a' : '#ea580c', fontWeight: 800 }}>{formatDisplayName(currentUser?.name) || (isAgent ? 'Driver' : 'Buyer')}</span> 👋
              </h2>
              <p style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: '0.68rem', fontWeight: 700, color: '#78716c', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.08em'
              }}>
                {headerTitle} / {currentItem?.label || activeTab}
              </p>
            </div>
          </div>

          {/* Profile & Settings Quick Menu Dropdown */}
          {activeDropdown === 'menu' && renderQuickMenu(isAgent ? 'emerald' : 'orange')}
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Dual Top Buttons: ✉️ Messages & 🔔 Notifications */}
          {renderDualTopButtons(isAgent ? 'emerald' : 'orange')}

          {/* Profile Avatar */}
          <button
            onClick={() => setActiveTab?.('profile')}
            title="View Profile"
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: isAgent ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #ea580c, #c2410c)',
              color: 'white', fontWeight: 900, fontSize: '1.05rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: 0,
              cursor: 'pointer', border: '2px solid transparent',
              transition: 'all 0.2s ease',
              boxShadow: isAgent ? '0 2px 10px rgba(22,163,74,0.25)' : '0 2px 10px rgba(234,88,12,0.25)',
            }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (formatDisplayName(currentUser?.name)?.charAt(0) || (isAgent ? 'D' : 'B')).toUpperCase()
            )}
          </button>
          {topBarExtra && topBarExtra}
        </div>
      </header>

      {/* Real-time Floating Notification / Message Alert Banner */}
      {liveToast && (
        <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 transition-all duration-300 animate-in slide-in-from-top-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
            {liveToast.kind === 'message' ? <Mail size={20} /> : <Bell size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">{liveToast.title}</p>
              <button onClick={() => setLiveToast(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={14} />
              </button>
            </div>
            {liveToast.cropName && (
              <p className="text-xs font-semibold text-emerald-700 truncate mt-0.5">
                🌾 Order: {liveToast.cropName} {liveToast.orderNumber ? `(#${liveToast.orderNumber})` : ''}
              </p>
            )}
            <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
              {liveToast.message}
            </p>
            <button
              onClick={() => {
                setLiveToast(null);
                if (liveToast.kind === 'message') {
                  setChatModalOrder({
                    _id: liveToast.relatedOrder?._id,
                    orderId: liveToast.relatedOrder?._id,
                    buyerName: liveToast.buyerName,
                  });
                } else {
                  if (setActiveTab) setActiveTab('orders');
                }
              }}
              className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer underline"
            >
              {liveToast.kind === 'message' ? 'Open Chat Modal' : 'View Order Details'} <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Direct Order Chat Modal triggered from Message dropdown */}
      {chatModalOrder && (
        <DirectBuyerChatModal
          order={chatModalOrder}
          buyerName={chatModalOrder.otherParticipant?.name || chatModalOrder.buyerName || 'Partner'}
          onClose={() => {
            setChatModalOrder(null);
            fetchUnreadMessagesCount();
          }}
        />
      )}
      </>
    );
  }

  // ====== FARMER NAVBAR ======
  return (
    <>
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #e4e4e7',
      padding: '0 1.5rem', height: 68,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Left: Hamburger + Welcome */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }} ref={menuRef}>
        <button
          onClick={handleHamburgerClick}
          title="Profile & Quick Menu"
          aria-label="Toggle profile and quick settings menu"
          className="transition-all hover:scale-105 active:scale-95"
          style={{
            background: activeDropdown === 'menu' ? '#dcfce7' : '#f4f4f5',
            border: activeDropdown === 'menu' ? '1.5px solid #22c55e' : '1px solid #d4d4d8',
            borderRadius: 10,
            padding: '0.5rem',
            cursor: 'pointer',
            color: activeDropdown === 'menu' ? '#15803d' : '#18181b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: activeDropdown === 'menu' ? '0 0 0 3px rgba(34,197,94,0.2)' : 'none'
          }}
          onMouseEnter={e => { if (activeDropdown !== 'menu') e.currentTarget.style.background = '#e4e4e7'; }}
          onMouseLeave={e => { if (activeDropdown !== 'menu') e.currentTarget.style.background = '#f4f4f5'; }}
        >
          <Menu size={20} />
        </button>
        <div>
          <h2 style={{
            fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: '1.05rem', fontWeight: 700, color: '#18181b', margin: 0, lineHeight: 1.25,
            letterSpacing: '-0.01em',
          }}>
            {t('navbar.welcomeBack')} <span style={{ color: '#15803d', fontWeight: 800 }}>{formatDisplayName(currentUser?.name) || 'Farmer'}</span> 👋
          </h2>
          <p style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: '0.68rem', fontWeight: 600, color: '#71717a', margin: '3px 0 0',
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Profile & Settings Quick Menu Dropdown */}
        {activeDropdown === 'menu' && renderQuickMenu('emerald')}
      </div>

      {/* Right: Widgets */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

        {/* Govt Schemes Quick Access Widget */}
        <button 
          onClick={() => navigate('/schemes')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-[#E8F7EE] hover:bg-[#1F7A4D] hover:text-white text-xs font-black text-[#1F7A4D] transition-all cursor-pointer shadow-xs"
        >
          <span className="text-sm">🏛️</span>
          <span>{t('navbar.govtSchemes')}</span>
        </button>

        {/* Minimal Weather Widget */}
        <button 
          onClick={() => navigate('/weather')}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <CloudSun size={15} className="text-[#22C55E]" />
          <span>{navWeather || t('common.loading')}</span>
          <span className="text-[10px] text-gray-400 font-normal">| {t('navbar.viewWeather')}</span>
        </button>

        {/* Minimal Market Price Widget */}
        <button 
          onClick={() => navigate('/market-prices')}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors cursor-pointer"
        >
          <TrendingUp size={14} className="text-[#22C55E]" />
          <span>{navPrice || t('common.loading')}</span>
          <span className="text-[10px] text-gray-400 font-normal">| {t('navbar.viewPrices')}</span>
        </button>

        {/* Dual Top Buttons: ✉️ Messages & 🔔 Notifications */}
        {renderDualTopButtons('emerald')}

        {/* Language Toggle (compact) */}
        <div className="hidden sm:block">
          <LanguageToggle />
        </div>

        {/* Profile Avatar — click to go to Profile tab */}
        <button
          onClick={() => setActiveTab?.('profile')}
          title={t('navbar.viewProfile')}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, #22C55E, #166534)',
            color: 'white', fontWeight: 900, fontSize: '1.05rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', padding: 0,
            cursor: 'pointer', border: '2px solid transparent',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 10px rgba(22,101,52,0.22)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#166534'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34,197,94,0.3)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(22,101,52,0.22)'; }}
        >
          {currentUser?.avatar ? (
            <img src={currentUser.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (formatDisplayName(currentUser?.name)?.charAt(0) || 'F').toUpperCase()
          )}
        </button>

        {topBarExtra && topBarExtra}
      </div>
    </header>

    {/* Real-time Floating Notification / Message Alert Banner */}
    {liveToast && (
      <div className="fixed top-20 right-6 z-50 max-w-sm w-full bg-white rounded-2xl shadow-2xl border-2 border-emerald-500 p-4 transition-all duration-300 animate-in slide-in-from-top-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 font-bold">
          {liveToast.kind === 'message' ? <Mail size={20} /> : <Bell size={20} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700">{liveToast.title}</p>
            <button onClick={() => setLiveToast(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              <X size={14} />
            </button>
          </div>
          {liveToast.cropName && (
            <p className="text-xs font-semibold text-emerald-700 truncate mt-0.5">
              🌾 Order: {liveToast.cropName} {liveToast.orderNumber ? `(#${liveToast.orderNumber})` : ''}
            </p>
          )}
          <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">
            {liveToast.message}
          </p>
          <button
            onClick={() => {
              setLiveToast(null);
              if (liveToast.kind === 'message') {
                setChatModalOrder({
                  _id: liveToast.relatedOrder?._id,
                  orderId: liveToast.relatedOrder?._id,
                  buyerName: liveToast.buyerName,
                });
              } else {
                if (setActiveTab) setActiveTab('orders');
              }
            }}
            className="mt-2 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer underline"
          >
            {liveToast.kind === 'message' ? 'Open Chat Modal' : 'View Order Details'} <ExternalLink size={11} />
          </button>
        </div>
      </div>
    )}

    {/* Direct Order Chat Modal triggered from Message dropdown */}
    {chatModalOrder && (
      <DirectBuyerChatModal
        order={chatModalOrder}
        buyerName={chatModalOrder.otherParticipant?.name || chatModalOrder.buyerName || 'Partner'}
        onClose={() => {
          setChatModalOrder(null);
          fetchUnreadMessagesCount();
        }}
      />
    )}
    </>
  );
}
