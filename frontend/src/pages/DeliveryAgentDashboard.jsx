import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  LayoutDashboard, Truck, PackageCheck, Bell, User, Phone, CheckCircle2,
  Navigation, RefreshCw, Star, DollarSign, MapPin, Check, X, ShieldCheck,
  TrendingUp, Calendar, AlertCircle, ArrowUpRight, ChevronRight, LogOut,
  Pencil, Camera, Eye, MessageSquare, Clock, Save, Edit, Bookmark, Trash2, CheckCheck
} from 'lucide-react';
import api from '../api/axios';
import { getAgentDeliveryRequests, getAllDeliveryBookings, updateDeliveryBookingStatus } from '../utils/deliveryService';
import { getSocket } from '../utils/socket';
import DirectBuyerChatModal from '../components/DirectBuyerChatModal';
import EmptyState from '../components/ui/EmptyState';

const OrderTrackingMap = lazy(() => import('../components/OrderTrackingMap'));

// Format raw DB username into clean display name (e.g. driver1 -> Driver 1)
function formatDisplayName(rawName) {
  if (!rawName) return '';
  let n = String(rawName)
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/[_.-]+/g, ' ')
    .trim();
  return n.split(' ').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export default function DeliveryAgentDashboard() {
  const { t } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    tripsCompleted: 0,
    activeOrders: 0,
    pendingRequests: 0,
    avgRating: 4.9
  });
  const [selectedFullDetailOrder, setSelectedFullDetailOrder] = useState(null);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState(null);
  const [activeChatOrder, setActiveChatOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [activeAgentNotificationId, setActiveAgentNotificationId] = useState(null);

  // Top Flash / Toast Notification state
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3500);
  };

  const profile = user?.deliveryAgentProfile || {};

  // Navigation items for the KisanBazaar Sidebar
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: t('sidebar.dashboard', 'Dashboard') },
    { id: 'requests', icon: Bell, label: t('sidebar.bookRequests', 'Book Requests'), badge: requests.length > 0 ? `${requests.length}` : null },
    { id: 'active', icon: Truck, label: t('sidebar.activeJobs', 'Active Jobs'), badge: stats.activeOrders > 0 ? `${stats.activeOrders}` : null },
    { id: 'completed', icon: PackageCheck, label: t('sidebar.completedDeliveries', 'Completed Deliveries') },
    { id: 'notifications', icon: Bell, label: t('sidebar.notifications', 'Notifications') },
    { id: 'profile', icon: User, label: t('sidebar.vehicleProfile', 'Vehicle & Profile') },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    let apiJobs = [];
    let apiRequests = [];
    let apiStats = stats;

    try {
      const [jobsRes, requestsRes, statsRes, notifsRes] = await Promise.allSettled([
        api.get('/orders/driver/jobs'),
        api.get('/orders/driver/requests'),
        api.get('/orders/driver/stats'),
        api.get('/notifications'),
      ]);
      if (jobsRes.status === 'fulfilled') apiJobs = jobsRes.value.data || [];
      if (requestsRes.status === 'fulfilled') apiRequests = requestsRes.value.data || [];
      if (statsRes.status === 'fulfilled') apiStats = statsRes.value.data || stats;
      if (notifsRes.status === 'fulfilled') {
        setNotifications((notifsRes.value.data || []).map(n => ({
          ...n,
          read: !!(n.read ?? n.isRead),
          isRead: !!(n.read ?? n.isRead),
        })));
      }
    } catch (e) {
      console.error('Failed to fetch driver data:', e);
    }

    // Merge with local delivery bookings sent by buyers
    const localBookings = getAllDeliveryBookings();
    const localPending = localBookings.filter(b => b.deliveryRequestStatus === 'pending_driver_approval' || b.status === 'pending_driver_approval');
    const localJobs = localBookings.filter(b => ['driver_accepted', 'collected', 'delivered'].includes(b.deliveryRequestStatus || b.status));

    // Combine & remove duplicate IDs
    const combinedRequestsMap = new Map();
    [...apiRequests, ...localPending].forEach(item => {
      const key = item._id || item.id;
      if (key) combinedRequestsMap.set(key, item);
    });

    const combinedJobsMap = new Map();
    [...apiJobs, ...localJobs].forEach(item => {
      const key = item._id || item.id;
      if (key) combinedJobsMap.set(key, item);
    });

    const finalRequests = Array.from(combinedRequestsMap.values());
    const finalJobs = Array.from(combinedJobsMap.values());

    setJobs(finalJobs);
    setRequests(finalRequests);

    const activeCount = finalJobs.filter(j => ['driver_accepted', 'collected'].includes(j.deliveryRequestStatus || j.status)).length;
    const completedCount = finalJobs.filter(j => (j.deliveryRequestStatus || j.status) === 'delivered').length;
    const totalEarn = finalJobs.filter(j => (j.deliveryRequestStatus || j.status) === 'delivered').reduce((s, j) => s + (j.deliveryFare ?? 150), 0);

    setStats({
      ...apiStats,
      activeOrders: activeCount,
      tripsCompleted: completedCount,
      totalEarnings: totalEarn || apiStats.totalEarnings || 0,
      pendingRequests: finalRequests.length
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // Poll every 15s (not 4s) — reduces server load by 75%
    const interval = setInterval(() => {
      // Only poll if the tab is visible to the user
      if (!document.hidden) {
        fetchData();
      }
    }, 15000);
    // Also re-fetch when user returns to the tab
    const onVisible = () => { if (!document.hidden) fetchData(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchData]);

  // Real-time synchronization of notifications across tabs & popovers
  useEffect(() => {
    const handleGlobalAllRead = () => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    };
    const handleGlobalDeleted = (e) => {
      const id = e.detail?.id;
      if (id) {
        setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
      }
    };
    const handleGlobalRead = (e) => {
      const id = e.detail?.id;
      if (id) {
        setNotifications(prev => prev.map(n => ((n._id || n.id) === id ? { ...n, read: true, isRead: true } : n)));
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

  const handleMarkAllAgentNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true, isRead: true })));
    window.dispatchEvent(new CustomEvent('kb:notifications_all_read'));
    try {
      await api.put('/notifications/all/read');
    } catch (err) {
      console.warn('Failed to mark all as read:', err);
    }
  };

  const handleDeleteAgentNotification = async (notifId, e) => {
    if (e) e.stopPropagation();
    const target = notifications.find(n => (n._id || n.id) === notifId);
    const wasUnread = target ? !target.read : true;

    setNotifications(prev => prev.filter(n => (n._id || n.id) !== notifId));
    if (activeAgentNotificationId === notifId) {
      setActiveAgentNotificationId(null);
    }
    window.dispatchEvent(new CustomEvent('kb:notification_deleted', { detail: { id: notifId, wasUnread } }));

    try {
      await api.delete(`/notifications/${notifId}`);
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  };

  const handleAgentNotificationClick = async (n) => {
    const notifId = n._id || n.id;
    setActiveAgentNotificationId(notifId);
    if (!n.read) {
      setNotifications(prev => prev.map(item => ((item._id || item.id) === notifId ? { ...item, read: true, isRead: true } : item)));
      window.dispatchEvent(new CustomEvent('kb:notification_read', { detail: { id: notifId } }));
      try {
        await api.put(`/notifications/${notifId}/read`);
      } catch (_) {}
    }
  };

  const handleRespond = async (orderId, action) => {
    try {
      const agentId = user?._id || user?.id;
      const mappedAction = action === 'reject' ? 'decline' : action;
      try {
        if (agentId) {
          await api.put(`/orders/${orderId}/delivery/offers/${agentId}/respond`, { action: mappedAction });
        } else {
          await api.put(`/orders/${orderId}/driver/respond`, { action });
        }
      } catch (_) {
        try {
          await api.put(`/orders/${orderId}/driver/respond`, { action });
        } catch (__) { }
      }

      const newStatus = action === 'accept' ? 'driver_accepted' : 'driver_rejected';
      updateDeliveryBookingStatus(orderId, newStatus);
      fetchData();
    } catch (e) {
      console.error('Error responding to job:', e);
    }
  };

  const handleStatusUpdate = async (orderId, status) => {
    try {
      await api.put(`/orders/${orderId}/driver/status`, { status });
      updateDeliveryBookingStatus(orderId, status);
      fetchData();
    } catch (e) {
      console.error('Error updating job status:', e);
      const errMsg = e.response?.data?.message || 'Could not update delivery status.';
      showToast(errMsg, 'error');
    }
  };

  // Live GPS tracking heartbeat for collected orders (every ~10s)
  useEffect(() => {
    const collectedOrders = jobs.filter(
      j => (j.deliveryRequestStatus === 'collected' || j.status === 'collected')
    );
    if (collectedOrders.length === 0) return;

    const socket = getSocket();

    let simStep = 0;
    const sendUpdates = () => {
      simStep = (simStep + 1) % 10;
      collectedOrders.forEach((order) => {
        const orderId = order._id || order.id;
        if (!orderId) return;

        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              socket.emit('agent_location_update', {
                orderId,
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
              });
            },
            () => {
              // Simulated corridor coordinates between farm and buyer
              const baseLat = order.farmer?.location?.lat || 15.3647;
              const baseLng = order.farmer?.location?.lng || 75.1240;
              const destLat = order.buyer?.location?.lat || 12.9141;
              const destLng = order.buyer?.location?.lng || 74.8560;
              const lat = +(baseLat - simStep * (baseLat - destLat) / 10).toFixed(6);
              const lng = +(baseLng - simStep * (baseLng - destLng) / 10).toFixed(6);
              socket.emit('agent_location_update', { orderId, lat, lng });
            },
            { timeout: 4000, maximumAge: 10000 }
          );
        } else {
          const baseLat = order.farmer?.location?.lat || 15.3647;
          const baseLng = order.farmer?.location?.lng || 75.1240;
          const destLat = order.buyer?.location?.lat || 12.9141;
          const destLng = order.buyer?.location?.lng || 74.8560;
          const lat = +(baseLat - simStep * (baseLat - destLat) / 10).toFixed(6);
          const lng = +(baseLng - simStep * (baseLng - destLng) / 10).toFixed(6);
          socket.emit('agent_location_update', { orderId, lat, lng });
        }
      });
    };

    sendUpdates();
    const heartbeatTimer = setInterval(sendUpdates, 10000);

    return () => clearInterval(heartbeatTimer);
  }, [jobs]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const activeJobs = jobs.filter(j => ['driver_accepted', 'collected'].includes(j.deliveryRequestStatus || j.status));
  const completedJobs = jobs.filter(j => (j.deliveryRequestStatus || j.status) === 'delivered');

  const getStatusBadge = (s) => {
    switch (s) {
      case 'pending_driver_approval':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full">{t('agentDashboard.statusAwaitingResponse', 'Awaiting Response')}</span>;
      case 'driver_accepted':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">{t('agentDashboard.statusAcceptedPickupReady', 'Accepted — Pickup Ready')}</span>;
      case 'collected':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Truck size={10} /> {t('agentDashboard.statusInTransit', 'In Transit')}</span>;
      case 'delivered':
        return <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2.5 py-1 rounded-full">{t('agentDashboard.statusDelivered', 'Delivered ✓')}</span>;
      default:
        return <span className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-bold px-2.5 py-1 rounded-full">{s || t('agentDashboard.statusAssigned', 'Assigned')}</span>;
    }
  };

  const getCropTitle = (order) => order.items?.[0]?.listing?.cropName || t('agentDashboard.farmCropStock', 'Farm Crop Stock');
  const getQtyText = (order) => {
    const item = order.items?.[0];
    if (item?.listing?.unit && item?.quantity) {
      return `${item.quantity} ${item.listing.unit}`;
    }
    return item?.quantity ? `${item.quantity} ${t('agentDashboard.units', 'units')}` : '';
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      navItems={navItems}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      role="delivery_agent"
    >

      <div className="w-full max-w-7xl mx-auto pb-16 space-y-8 px-4 sm:px-6 lg:px-8">

        {/* PAGE HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200/80">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" }}>
                {t('agentDashboard.title', 'Delivery Dashboard')}
              </h1>
              <span className="bg-teal-50 text-teal-700 font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md border border-teal-200">
                {t('agentDashboard.agentPortal', 'Agent Portal')}
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {profile.vehicleType || t('agentDashboard.vehicleRegistered', 'Vehicle Registered')} • {t('agentDashboard.license', 'License')}: {profile.vehicleNumber || profile.drivingLicense || 'KA-XX-XXXX'} • ₹{profile.perKmCharge || 18}/km
            </p>
          </div>

          <button
            onClick={fetchData}
            className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : ''} />
            <span>{t('agentDashboard.refresh', 'Refresh')}</span>
          </button>
        </div>

        {/* SaaS METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Total Earnings */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('agentDashboard.totalEarnings', 'Total Earnings')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">₹</div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-gray-900">₹{stats.totalEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('agentDashboard.activeJobs', 'Active Jobs')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-teal-700">{stats.activeOrders}</span>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('agentDashboard.bookRequests', 'Book Requests')}</span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <Bell size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-teal-700">{requests.length}</span>
            </div>
          </div>

          {/* Trips Completed */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('agentDashboard.completed', 'Completed')}</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <PackageCheck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-gray-900">{stats.tripsCompleted}</span>
            </div>
          </div>

          {/* Agent Rating */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{t('agentDashboard.agentRating', 'Agent Rating')}</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center font-bold">★</div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-gray-900">
                {stats.avgRating > 0 ? `${stats.avgRating} / 5.0` : '4.9 / 5.0'}
              </span>
            </div>
          </div>

        </div>

        {/* OVERVIEW / DASHBOARD COMBINED TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* Quick Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Pending Requests Banner */}
              <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Bell size={18} className="text-amber-500" />
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('agentDashboard.newBookingRequests', 'New Booking Requests')} ({requests.length})</h2>
                  </div>
                  {requests.length > 0 && (
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs font-bold text-teal-700 hover:text-teal-800 hover:underline cursor-pointer"
                    >
                      {t('agentDashboard.viewAll', 'View All')}
                    </button>
                  )}
                </div>

                {requests.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <p className="text-xs font-medium">{t('agentDashboard.noPendingRequests', 'No pending delivery requests right now.')}</p>
                    <p className="text-[11px] text-gray-400 mt-1">{t('agentDashboard.noPendingRequestsSub', 'When buyers choose you for transport, job requests will appear here.')}</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 3).map(order => (
                      <div key={order._id || order.id} className="p-4 bg-teal-50/40 rounded-xl border border-teal-200/60 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{getCropTitle(order)} {getQtyText(order) && `(${getQtyText(order)})`}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            {t('agentDashboard.from', 'From')}: <span className="font-semibold text-gray-700">{order.farmerDetails?.farmerName || order.farmer?.name || 'Farmer'}</span> → {t('agentDashboard.to', 'To')}: <span className="font-semibold text-gray-700">{order.buyerDropDetails?.buyerName || order.buyer?.name || 'Buyer'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-sm text-teal-700 bg-white px-3 py-1 rounded-lg border border-teal-200">₹{order.deliveryFare ?? 150}</span>
                          <button
                            onClick={() => setSelectedFullDetailOrder(order)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={14} /> {t('agentDashboard.fullView', 'Full View')}
                          </button>
                          <button
                            onClick={() => handleRespond(order._id || order.id, 'accept')}
                            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            {t('agentDashboard.accept', 'Accept')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Profile Summary Box (Right Side) */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xl border border-teal-200">
                      🚚
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{formatDisplayName(user?.name) || t('agentDashboard.deliveryAgent', 'Delivery Agent')}</h3>
                      <p className="text-xs text-teal-700 font-semibold">{profile.vehicleType || t('agentDashboard.commercialPickup', 'Commercial Pickup')}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">{t('agentDashboard.numberPlate', 'Number Plate')}:</span>
                      <span className="font-bold text-gray-900">{profile.vehicleNumber || 'KA-06-EA-4821'}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">{t('agentDashboard.ratePerKm', 'Rate / KM')}:</span>
                      <span className="font-bold text-teal-700">₹{profile.perKmCharge || 18}/km</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">{t('agentDashboard.licenseNo', 'License No')}:</span>
                      <span className="font-bold text-gray-900">{profile.drivingLicense || 'DL-KA-04-2018'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="mt-6 w-full py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold border border-teal-200 transition-colors cursor-pointer"
                >
                  {t('agentDashboard.manageProfile', 'Manage Profile')}
                </button>
              </div>

            </div>

            {/* Active Jobs Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-teal-700" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('agentDashboard.activeDeliveries', 'Active Deliveries')} ({activeJobs.length})</h2>
                </div>
              </div>

              {activeJobs.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-xs font-medium">{t('agentDashboard.noActiveDeliveries', 'No active delivery assignments right now.')}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(order => (
                    <div key={order._id || order.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">📦 {getCropTitle(order)} {getQtyText(order) && `(${getQtyText(order)})`}</h4>
                          <p className="text-xs text-gray-500 font-medium">{t('agentDashboard.orderNum', 'Order')} #{(order._id || order.id).slice(-6).toUpperCase()} • {t('agentDashboard.fare', 'Fare')}: ₹{order.deliveryFare ?? 150}</p>
                        </div>
                        {getStatusBadge(order.deliveryRequestStatus || order.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">{t('agentDashboard.farmPickup', 'Farm Pickup')}</span>
                          <p className="font-bold text-gray-800">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                          <p className="text-gray-500">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || t('agentDashboard.farmerAddress', 'Farmer Address')}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">{t('agentDashboard.buyerDropoff', 'Buyer Dropoff')}</span>
                          <p className="font-bold text-gray-800">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                          <p className="text-gray-500">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || t('agentDashboard.buyerAddress', 'Buyer Address')}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFullDetailOrder(order)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={14} /> {t('agentDashboard.fullViewDetails', 'Full View Details')}
                        </button>

                        <button
                          onClick={() => setActiveChatOrder(order)}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare size={14} /> {t('agentDashboard.liveChat', 'Live Chat 💬')}
                        </button>

                        {(order.deliveryRequestStatus === 'driver_accepted' || order.status === 'driver_accepted') && (
                          <button
                            onClick={() => handleStatusUpdate(order._id || order.id, 'collected')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                          >
                            {t('agentDashboard.markCollected', 'Mark Collected from Farmer')}
                          </button>
                        )}
                        {(order.deliveryRequestStatus === 'collected' || order.status === 'collected') && (
                          <button
                            onClick={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                          >
                            {t('agentDashboard.confirmDelivered', 'Confirm Delivered to Buyer')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* BOOK REQUESTS TAB */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
              {t('agentDashboard.incomingDeliveryRequests', 'Incoming Delivery Requests')} ({requests.length})
            </h2>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">{t('agentDashboard.noPendingRequestsSimple', 'No pending delivery requests.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(order => (
                  <div key={order._id || order.id} className="p-5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t('agentDashboard.orderNum', 'Order')} #{(order._id || order.id).slice(-6).toUpperCase()} • {t('agentDashboard.fare', 'Fare')}: ₹{order.deliveryFare ?? 150}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">{t('agentDashboard.actionRequired', 'Action Required')}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-amber-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">{t('agentDashboard.pickupFromFarmer', 'Pickup from Farmer')}</span>
                        <p className="font-bold text-gray-900">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || t('agentDashboard.farmerAddress', 'Farm')}</p>
                      </div>
                      <div className="md:border-l md:border-amber-100 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">{t('agentDashboard.deliverToBuyer', 'Deliver to Buyer')}</span>
                        <p className="font-bold text-gray-900">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || t('agentDashboard.buyerAddress', 'Buyer Address')}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'accept')}
                        className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} /> {t('agentDashboard.acceptRequest', 'Accept Request')}
                      </button>
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'reject')}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <X size={14} /> {t('agentDashboard.decline', 'Decline')}
                      </button>
                      <button
                        onClick={() => setSelectedFullDetailOrder(order)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        {t('agentDashboard.viewFullDetails', 'View Full Details')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVE JOBS TAB */}
        {activeTab === 'active' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
              {t('agentDashboard.ongoingActiveDeliveries', 'Ongoing Active Deliveries')} ({activeJobs.length})
            </h2>

            {activeJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">{t('agentDashboard.noActiveDeliveriesInProgress', 'No active deliveries currently in progress.')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(order => (
                  <div key={order._id || order.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">{t('agentDashboard.orderNum', 'Order')} #{(order._id || order.id).slice(-6).toUpperCase()} • {t('agentDashboard.fare', 'Fare')}: ₹{order.deliveryFare ?? 150}</p>
                      </div>
                      {getStatusBadge(order.deliveryRequestStatus || order.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">{t('agentDashboard.farmPickup', 'Pickup')}</span>
                        <p className="font-bold text-gray-900">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || t('agentDashboard.farmerAddress', 'Farm')}</p>
                        {(order.farmerDetails?.farmerPhone || order.farmer?.phone) && (
                          <a href={`tel:${order.farmerDetails?.farmerPhone || order.farmer?.phone}`} className="text-blue-600 font-bold mt-1 inline-block">{t('agentDashboard.callFarmer', '📞 Call Farmer')}</a>
                        )}
                      </div>
                      <div className="md:border-l md:border-gray-200 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">{t('agentDashboard.buyerDropoff', 'Dropoff')}</span>
                        <p className="font-bold text-gray-900">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || t('agentDashboard.buyerAddress', 'Buyer Address')}</p>
                        {(order.buyerDropDetails?.buyerPhone || order.buyer?.phone) && (
                          <a href={`tel:${order.buyerDropDetails?.buyerPhone || order.buyer?.phone}`} className="text-blue-600 font-bold mt-1 inline-block">{t('agentDashboard.callBuyer', '📞 Call Buyer')}</a>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {(order.deliveryRequestStatus === 'driver_accepted' || order.status === 'driver_accepted') && (
                        <button
                          onClick={() => handleStatusUpdate(order._id || order.id, 'collected')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          {t('agentDashboard.markCollected', 'Mark Collected from Farmer')}
                        </button>
                      )}
                      {(order.deliveryRequestStatus === 'collected' || order.status === 'collected') && (
                        <button
                          onClick={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                          className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          {t('agentDashboard.confirmDelivered', 'Confirm Delivered to Buyer')}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTrackingOrder(order)}
                        className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Navigation size={14} className="text-blue-600" />
                        <span>{t('agentDashboard.viewLiveMap', 'View Live Map')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMPLETED TAB */}
        {activeTab === 'completed' && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3">
              {t('agentDashboard.completedDeliveriesHistory', 'Completed Deliveries History')} ({completedJobs.length})
            </h2>

            {completedJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <PackageCheck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">{t('agentDashboard.noCompletedDeliveriesYet', 'No completed deliveries yet.')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.map(order => (
                  <div key={order._id || order.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/30 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{getCropTitle(order)}</p>
                      <p className="text-gray-500 font-medium">{t('agentDashboard.orderNum', 'Order')} #{(order._id || order.id).slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 text-sm">₹{order.deliveryFare ?? 150}</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">{t('agentDashboard.deliveredBadge', 'Delivered ✓')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (() => {
          const activeNotif = notifications.find(n => (n._id || n.id) === activeAgentNotificationId);
          const unreadCount = notifications.filter(n => !n.read).length;

          return (
            <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider">{t('agentDashboard.deliveryAgentAlerts', 'Delivery Agent Alerts')}</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{t('agentDashboard.alertsSub', 'Pickup alerts, dispatch calls & order delivery notifications')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAgentNotificationsRead}
                      className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
                    >
                      <CheckCheck size={14} />
                      <span>{t('agentDashboard.markAllRead', 'Mark all read')}</span>
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                      {unreadCount} {t('agentDashboard.newBadge', 'New')}
                    </span>
                  )}
                </div>
              </div>

              {activeNotif ? (
                /* INTERIOR MESSAGE READER VIEW */
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🔔</span>
                      <div>
                        <h3 className="text-sm font-bold text-gray-900">{activeNotif.title || t('agentDashboard.deliveryNotification', 'Delivery Notification')}</h3>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {new Date(activeNotif.createdAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full uppercase">
                      {t('agentDashboard.deliveryAlert', 'Delivery Alert')}
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-2">
                    <p className="text-xs text-gray-800 leading-relaxed font-semibold">{activeNotif.message}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Truck size={15} /> {t('agentDashboard.viewDeliveryRequests', 'View Delivery Requests')}
                    </button>

                    <button
                      onClick={() => handleDeleteAgentNotification(activeNotif._id || activeNotif.id)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 size={15} /> {t('agentDashboard.deleteNotification', 'Delete Notification')}
                    </button>

                    <button
                      onClick={() => setActiveAgentNotificationId(null)}
                      className="ml-auto text-xs font-bold text-gray-500 hover:text-gray-800 px-3 py-2 cursor-pointer"
                    >
                      {t('agentDashboard.doneBackToNotifications', 'Done (Back to Notifications)')}
                    </button>
                  </div>
                </div>
              ) : (
                /* NOTIFICATION LIST FEED */
                <div className="space-y-3">
                  {notifications.map((n) => {
                    const isUnread = !n.read;
                    const notifId = n._id || n.id;
                    return (
                      <div
                        key={notifId}
                        onClick={() => handleAgentNotificationClick(n)}
                        className={`p-4 rounded-2xl border transition-all shadow-xs flex items-center justify-between gap-4 group cursor-pointer ${
                          isUnread
                            ? 'bg-orange-50/70 border-orange-300 font-bold'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                            isUnread ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            🔔
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <p className={`text-xs truncate ${isUnread ? 'font-black text-gray-900' : 'font-medium text-gray-700'}`}>
                              {n.title || n.message}
                            </p>
                            {n.title && n.message && (
                              <p className="text-[11px] text-gray-500 font-normal line-clamp-1">
                                {n.message}
                              </p>
                            )}
                            <span className="text-[10px] text-gray-400 block font-medium">
                              {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread && (
                            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                          )}
                          <button
                            onClick={(e) => handleDeleteAgentNotification(notifId, e)}
                            title="Delete notification"
                            className="p-1.5 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {notifications.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                      <span className="text-3xl block">🔔</span>
                      <p className="text-xs text-gray-500 font-bold">{t('agentDashboard.noActiveNotifications', 'No active notifications')}</p>
                      <p className="text-[11px] text-gray-400">{t('agentDashboard.notificationsCaughtUp', 'All delivery alerts and dispatch notifications are caught up.')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {/* PROFILE TAB (Matching Reference Image 1 Design) */}
        {activeTab === 'profile' && (
          <ProfileSection
            user={user}
            profile={profile}
            fetchData={fetchData}
          />
        )}

        {/* FULL BOOKING DETAILS MODAL */}
        {selectedFullDetailOrder && (
          <FullBookingDetailsModal
            order={selectedFullDetailOrder}
            onClose={() => setSelectedFullDetailOrder(null)}
            handleRespond={handleRespond}
            handleStatusUpdate={handleStatusUpdate}
            getCropTitle={getCropTitle}
            getQtyText={getQtyText}
          />
        )}

        {/* LIVE TRACKING MAP MODAL FOR AGENT */}
        {selectedTrackingOrder && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <Suspense fallback={<div className="h-96 flex items-center justify-center text-sm text-neutral-400">Loading tracking map...</div>}>
                <OrderTrackingMap
                  order={selectedTrackingOrder}
                  onClose={() => setSelectedTrackingOrder(null)}
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* Tri-Party Order Chat Modal */}
        {activeChatOrder && (
          <DirectBuyerChatModal
            buyerName={activeChatOrder.buyer?.name || 'Buyer'}
            order={activeChatOrder}
            onClose={() => setActiveChatOrder(null)}
          />
        )}

        {/* Top Flash / Toast Notification Banner */}
        {toast.show && (
          <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl transition-all duration-300 transform animate-in fade-in slide-in-from-top-4 border ${
            toast.type === 'error'
              ? 'bg-rose-900/95 text-white border-rose-700'
              : toast.type === 'warning'
              ? 'bg-amber-900/95 text-white border-amber-700'
              : 'bg-teal-900/95 text-white border-teal-700'
          }`}>
            <div className={`p-1.5 rounded-xl ${
              toast.type === 'error' ? 'bg-rose-800' : toast.type === 'warning' ? 'bg-amber-800' : 'bg-teal-800'
            }`}>
              {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            </div>
            <span className="text-xs font-black tracking-wide">{toast.message}</span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ProfileSection({ user, profile, fetchData }) {
  const { t } = useTranslation();
  const { updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [agentData, setAgentData] = useState(null);
  const [loadingAgentData, setLoadingAgentData] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchAgentInfo = async () => {
      try {
        setLoadingAgentData(true);
        const res = await api.get('/auth/delivery-agents');
        if (res.data?.success && Array.isArray(res.data.agents)) {
          const found = res.data.agents.find(a =>
            (user?._id && (String(a._id) === String(user._id) || String(a.id) === String(user._id))) ||
            (user?.id && (String(a._id) === String(user.id) || String(a.id) === String(user.id))) ||
            (user?.email && a.email?.toLowerCase() === user.email?.toLowerCase())
          );
          if (isMounted && found) {
            setAgentData(found);
          }
        }
      } catch (err) {
        console.error('Failed to load agent profile data:', err);
      } finally {
        if (isMounted) setLoadingAgentData(false);
      }
    };

    fetchAgentInfo();
    return () => { isMounted = false; };
  }, [user?._id, user?.id, user?.email]);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    vehicleType: profile?.vehicleType || 'Pickup Truck (Bolero / Commercial)',
    vehicleNumber: profile?.vehicleNumber || 'KA-06-EA-4821',
    drivingLicense: profile?.drivingLicense || 'KA-04-2018-0091823',
    perKmCharge: profile?.perKmCharge || 18,
    address: user?.location?.address || 'APMC Market Road',
    district: user?.location?.district || 'Bengaluru',
    state: user?.location?.state || 'Karnataka',
  });

  const [coverPreview, setCoverPreview] = useState(user?.coverImage || null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setUploadingAvatar(true);
        const previewUrl = URL.createObjectURL(file);
        setAvatarPreview(previewUrl);
        if (updateProfile) await updateProfile({ avatarFile: file });
        if (fetchData) fetchData();
      } catch (err) {
        console.error('Avatar update failed:', err);
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const handleCoverFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);
      try {
        if (updateProfile) await updateProfile({ coverImageFile: file });
        if (fetchData) fetchData();
      } catch (_) { }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        location: {
          address: formData.address,
          district: formData.district,
          state: formData.state,
        },
        deliveryAgentProfile: {
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          drivingLicense: formData.drivingLicense,
          perKmCharge: Number(formData.perKmCharge),
        },
      };

      await updateProfile(payload);
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
      if (fetchData) fetchData();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Cover Banner & Profile Head */}
      <div className="bg-white rounded-[32px] border border-gray-150 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative">
        {/* Cover Banner with Mist Fog Gradient */}
        <div className="h-60 sm:h-72 w-full relative overflow-hidden bg-gradient-to-br from-[#134e4a] via-[#0d9488] to-[#14b8a6]">
          {(coverPreview || user?.coverImage) ? (
            <img
              src={coverPreview || user?.coverImage}
              alt="Cover Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </>
          )}

          {/* Soft misty gradient dissolving bottom of cover into pure white */}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/85 via-25% to-transparent pointer-events-none" />

          {/* Top Right Floating Action Controls */}
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2.5 z-10">
            <label className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white/90 hover:bg-white text-gray-800 text-xs font-bold rounded-full border border-white/60 shadow-md backdrop-blur-md cursor-pointer transition-all hover:scale-105 active:scale-95">
              <Camera size={14} className="text-teal-700" />
              <span>{coverPreview || user?.coverImage ? t('agentDashboard.changeCover', 'Change Cover') : t('agentDashboard.uploadCover', 'Upload Cover')}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
              />
            </label>
          </div>
        </div>

        {/* Profile Body */}
        <div className="px-6 sm:px-10 pb-8 relative -mt-16 sm:-mt-20 z-10">
          {/* Avatar */}
          <div className="flex items-start">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white p-1 shadow-xl border-2 border-white relative group shrink-0 overflow-hidden">
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#0d9488] to-[#134e4a] flex items-center justify-center text-3xl sm:text-4xl font-black text-white relative">
                {(avatarPreview || user?.avatar) ? (
                  <img
                    src={avatarPreview || user?.avatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {(formatDisplayName(user?.name)?.charAt(0) || 'D').toUpperCase()}
                  </span>
                )}

                {/* Instant Upload Camera Overlay */}
                <label className="absolute inset-0 bg-black/60 backdrop-blur-xs text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1 z-20">
                  {uploadingAvatar ? (
                    <div className="flex flex-col items-center justify-center">
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                      <span className="text-[8px] font-black uppercase tracking-wider text-teal-300">{t('agentDashboard.saving', 'Saving...')}</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={20} className="text-teal-400 mb-0.5" />
                      <span className="text-[9px] font-black uppercase tracking-wider">{t('agentDashboard.changePic', 'Change Pic')}</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploadingAvatar}
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Name, Subtitle, and Meta Row */}
          <div className="mt-4 flex flex-col md:flex-row md:items-end justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <h2
                  className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight"
                  style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" }}
                >
                  {formatDisplayName(user?.name) || t('agentDashboard.deliveryAgent', 'Delivery Agent')}
                </h2>
                <span className="inline-flex items-center gap-1 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                  <CheckCircle2 size={12} className="text-teal-600 stroke-[3]" /> {t('agentDashboard.verifiedDriver', 'Verified Driver')}
                </span>
              </div>

              {/* Subtitle / Bio */}
              <p className="text-sm font-medium text-gray-500 max-w-xl">
                {t('agentDashboard.profileBio', 'Agri-logistics & fast farm-to-table transportation specialist • Direct verified farmer pickups')}
              </p>

              {/* Meta Tags */}
              <div className="flex items-center gap-3 pt-1 flex-wrap text-xs font-semibold text-gray-500">
                <span className="flex items-center gap-1 text-gray-600">
                  🚚 {formData.vehicleType}
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-gray-600 font-mono text-[11px]">
                  {formData.vehicleNumber}
                </span>
                <span className="text-gray-300">•</span>
                <span className="flex items-center gap-1 text-gray-600">
                  📍 {formData.district}, {formData.state}
                </span>
              </div>
            </div>

            {/* Accreditations / Badges */}
            <div className="flex items-center gap-2 self-start md:self-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">{t('agentDashboard.badges', 'Badges')}</span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                {t('agentDashboard.badgePoliceVerified', '🛡 Police Verified')}
              </span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                {t('agentDashboard.badgeFastDelivery', '⚡ Fast Delivery')}
              </span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                {t('agentDashboard.badgeColdChain', '❄ Cold Chain')}
              </span>
            </div>
          </div>

          {/* Bottom Row: Metrics Columns + Dark Pill Action Button */}
          <div className="mt-7 pt-5 border-t border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5 sm:gap-7">
              <div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-base sm:text-lg font-black text-gray-900">
                    {agentData?.rating != null ? agentData.rating : 4.8}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {t('agentDashboard.driverRating', 'Driver Rating')} {agentData?.totalReviews > 0 ? `(${agentData.totalReviews})` : ''}
                </span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 block leading-tight">
                  {agentData?.tripsCompleted != null ? agentData.tripsCompleted : (profile?.tripsCompleted || 0)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('agentDashboard.completedTrips', 'Completed Trips')}</span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div>
                <span className="text-base sm:text-lg font-black text-teal-700 block leading-tight">
                  ₹{formData.perKmCharge}/km
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('agentDashboard.baseRate', 'Base Rate')}</span>
              </div>

              <div className="h-7 w-px bg-gray-200 hidden sm:block" />

              <div className="hidden sm:block">
                <span className="text-base sm:text-lg font-black text-teal-700 block leading-tight">
                  ₹18,450
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t('agentDashboard.earnings', 'Earnings')}</span>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 sm:px-7 sm:py-3 bg-[#111827] hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <Edit size={14} /> {t('agentDashboard.editDriverInfo', 'Edit Driver Info')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-teal-50 text-teal-800 text-xs font-bold rounded-2xl border border-teal-200">
          ✓ {success}
        </div>
      )}

      {/* Edit Details or Details View */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">{t('agentDashboard.editDriverProfile', 'Edit Driver Profile')}</h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
            <div className="space-y-1">
              <label>{t('agentDashboard.driverFullName', 'Driver Full Name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>{t('agentDashboard.phoneNumber', 'Phone Number')}</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>{t('agentDashboard.vehicleModelType', 'Vehicle Model / Type')}</label>
              <input
                type="text"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>{t('agentDashboard.vehicleNumberPlate', 'Vehicle Number Plate')}</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>{t('agentDashboard.drivingLicense', 'Driving License')}</label>
              <input
                type="text"
                name="drivingLicense"
                value={formData.drivingLicense}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>{t('agentDashboard.ratePerKmInput', 'Rate Per Km (₹)')}</label>
              <input
                type="number"
                name="perKmCharge"
                value={formData.perKmCharge}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-3">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save size={14} /> {saving ? t('agentDashboard.saving', 'Saving...') : t('agentDashboard.saveChanges', 'Save Changes')}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              {t('agentDashboard.cancel', 'Cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-3">{t('agentDashboard.driverDocsSpecs', 'Driver Documentation & Vehicle Specs')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">{t('agentDashboard.drivingLicense', 'Driving License')}</span>
              <p className="font-bold text-stone-800">{formData.drivingLicense || 'KA-04-2018-0091823'}</p>
              <span className="text-[10px] text-emerald-600 font-bold">{t('agentDashboard.validUntil', '✓ Valid until 2038')}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">{t('agentDashboard.commercialPermit', 'Commercial Permit')}</span>
              <p className="font-bold text-stone-800">{t('agentDashboard.permitDetails', 'All India Agri-Freight')}</p>
              <span className="text-[10px] text-emerald-600 font-bold">{t('agentDashboard.permitStatus', '✓ Active & Insured')}</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">{t('agentDashboard.cargoCapacity', 'Cargo Capacity')}</span>
              <p className="font-bold text-stone-800">{t('agentDashboard.capacityDetails', '1,500 kg (1.5 Tonne)')}</p>
              <span className="text-[10px] text-stone-500 font-bold">{t('agentDashboard.bedType', 'Open Bed & Tarpaulin')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Customer & Farmer Reviews Section */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">
              {t('agentDashboard.reviewsTitle', 'Customer & Farmer Reviews')}
            </h3>
            <p className="text-[11px] text-stone-500 font-medium mt-0.5">
              {t('agentDashboard.reviewsSub', 'Verified ratings and comments from recent delivery shipments')}
            </p>
          </div>
          {agentData && (
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-xs font-bold">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              <span>{agentData.rating}</span>
              <span className="text-amber-600 font-normal">({agentData.totalReviews || 0} {t('agentDashboard.reviewsCount', 'reviews')})</span>
            </div>
          )}
        </div>

        {loadingAgentData ? (
          <div className="py-8 text-center text-stone-400 text-xs animate-pulse">
            {t('agentDashboard.loadingReviews', 'Loading reviews and driver ratings...')}
          </div>
        ) : agentData?.reviews && agentData.reviews.length > 0 ? (
          <div className="space-y-3">
            {agentData.reviews.slice(0, 3).map((rev, idx) => (
              <div
                key={rev.id || idx}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 text-xs sm:text-sm">
                      {rev.reviewerName || t('agentDashboard.verifiedUser', 'Verified User')}
                    </span>
                    {rev.createdAt && (
                      <span className="text-[10px] text-stone-400">
                        • {new Date(rev.createdAt).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed italic">
                    "{rev.reviewText || 'Completed delivery successfully.'}"
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-2xs self-start sm:self-center">
                  <Star size={12} className="fill-amber-400 text-amber-400" />
                  <span className="text-xs font-black text-stone-800">{rev.rating}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Star size={24} className="text-amber-400" />}
            title={t('agentDashboard.noReviewsYet', 'No reviews yet')}
            description={t('agentDashboard.noReviewsDesc', 'Complete delivery trips to receive ratings and reviews from verified farmers and buyers.')}
            border="subtle"
            className="py-8"
          />
        )}
      </div>
    </div>
  );
}

function FullBookingDetailsModal({ order, onClose, handleRespond, handleStatusUpdate, getCropTitle, getQtyText }) {
  const { t } = useTranslation();
  if (!order) return null;

  const orderId = (order._id || order.id || '').slice(-6).toUpperCase();
  const cropTitle = getCropTitle(order);
  const qtyText = getQtyText(order);
  const fare = order.deliveryFare ?? 150;
  const status = order.deliveryRequestStatus || order.status || 'assigned';

  const isPending = status === 'pending_driver_approval';
  const isAccepted = status === 'driver_accepted';
  const isCollected = status === 'collected';
  const isDelivered = status === 'delivered';

  const farmerName = order.farmerDetails?.farmerName || order.farmer?.name || 'Farmer';
  const farmerPhone = order.farmerDetails?.farmerPhone || order.farmer?.phone || 'N/A';
  const pickupAddress = order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farm Location';
  const pickupDistrict = order.farmerDetails?.pickupDistrict || order.farmer?.location?.district || 'District';
  const pickupPincode = order.farmerDetails?.pickupPincode || '';
  const pickupTimeSlot = order.farmerDetails?.pickupTimeSlot || 'Morning (8 AM - 12 PM)';

  const buyerName = order.buyerDropDetails?.buyerName || order.buyer?.name || 'Buyer';
  const buyerPhone = order.buyerDropDetails?.buyerPhone || order.buyer?.phone || 'N/A';
  const dropAddress = order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Buyer Destination';
  const dropDistrict = order.buyerDropDetails?.dropDistrict || order.buyer?.location?.district || 'District';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-stone-200 animate-fadeIn my-8">

        {/* Modal Header */}
        <div className="bg-[#1F7A4D] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight">{t('agentDashboard.deliveryJob', 'Delivery Job')} #{orderId}</h3>
              <p className="text-xs text-emerald-100 font-medium">{t('agentDashboard.fullRouteSub', 'Full Farm Pickup & Buyer Dropoff Route')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* PRODUCE ITEM SUMMARY */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">{t('agentDashboard.produceCargo', 'Produce Cargo')}</span>
              <p className="font-black text-stone-900 text-sm">🌾 {cropTitle} {qtyText && `(${qtyText})`}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">{t('agentDashboard.totalFare', 'Total Fare')}</span>
              <p className="font-black text-emerald-700 text-base">₹{fare}</p>
            </div>
          </div>

          {/* FARMER PICKUP DETAILS */}
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-orange-200/80 pb-2">
              <div className="flex items-center gap-2 text-orange-900 font-black text-xs uppercase tracking-wider">
                <MapPin size={16} className="text-orange-600" /> {t('agentDashboard.farmPickupLocation', 'Farm Pickup Location')}
              </div>
              {farmerPhone !== 'N/A' && (
                <a
                  href={`tel:${farmerPhone}`}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs"
                >
                  <Phone size={12} /> {t('agentDashboard.callFarmer', '📞 Call Farmer')}
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">{t('agentDashboard.farmerName', 'Farmer Name')}</span>
                <p className="font-black text-stone-900 text-sm">{farmerName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">{t('agentDashboard.farmerPhone', 'Farmer Phone')}</span>
                <p className="font-extrabold text-stone-800">{farmerPhone}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">{t('agentDashboard.pickupDistrict', 'Pickup District')}</span>
                <p className="font-extrabold text-stone-800">{pickupDistrict}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">{t('agentDashboard.pickupTimeWindow', 'Pickup Time Window')}</span>
                <p className="font-extrabold text-stone-800">{pickupTimeSlot}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">{t('agentDashboard.fullFarmAddress', 'Full Farm Pickup Address & Pincode')}</span>
                <p className="font-bold text-stone-900">{pickupAddress} {pickupPincode && `(PIN: ${pickupPincode})`}</p>
              </div>
            </div>
          </div>

          {/* BUYER DROPOFF DESTINATION DETAILS */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                <User size={16} className="text-emerald-600" /> {t('agentDashboard.buyerDropoffDestination', 'Buyer Dropoff Destination')}
              </div>
              {buyerPhone !== 'N/A' && (
                <a
                  href={`tel:${buyerPhone}`}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs"
                >
                  <Phone size={12} /> {t('agentDashboard.callBuyer', '📞 Call Buyer')}
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">{t('agentDashboard.buyerName', 'Buyer Name')}</span>
                <p className="font-black text-stone-900 text-sm">{buyerName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">{t('agentDashboard.buyerPhone', 'Buyer Phone')}</span>
                <p className="font-extrabold text-stone-800">{buyerPhone}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">{t('agentDashboard.dropDistrict', 'Drop District')}</span>
                <p className="font-extrabold text-stone-800">{dropDistrict}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">{t('agentDashboard.transportFare', 'Transport Fare')}</span>
                <p className="font-black text-emerald-700 text-sm">₹{fare}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">{t('agentDashboard.fullBuyerAddress', 'Full Buyer Address')}</span>
                <p className="font-bold text-stone-900">{dropAddress}</p>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="bg-stone-100 p-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            {t('agentDashboard.closeWindow', 'Close Window')}
          </button>

          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => { handleRespond(order._id || order.id, 'accept'); onClose(); }}
                  className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} /> {t('agentDashboard.acceptRequest', 'Accept Request')}
                </button>
                <button
                  onClick={() => { handleRespond(order._id || order.id, 'reject'); onClose(); }}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={14} /> {t('agentDashboard.decline', 'Decline')}
                </button>
              </>
            )}

            {isAccepted && (
              <button
                onClick={() => { handleStatusUpdate(order._id || order.id, 'collected'); onClose(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
              >
                {t('agentDashboard.markCollected', 'Mark Collected from Farmer')}
              </button>
            )}

            {isCollected && (
              <button
                onClick={() => { handleStatusUpdate(order._id || order.id, 'delivered'); onClose(); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
              >
                {t('agentDashboard.confirmDelivered', 'Confirm Delivered to Buyer')}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
