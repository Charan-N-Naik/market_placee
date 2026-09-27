import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  LayoutDashboard, Truck, PackageCheck, Bell, User, Phone, CheckCircle2,
  Navigation, RefreshCw, Star, DollarSign, MapPin, Check, X, ShieldCheck,
  TrendingUp, Calendar, AlertCircle, ArrowUpRight, ChevronRight, LogOut,
  Pencil, Camera, Eye, MessageSquare, Clock, Save, Edit, Bookmark
} from 'lucide-react';
import api from '../api/axios';
import { getAgentDeliveryRequests, getAllDeliveryBookings, updateDeliveryBookingStatus } from '../utils/deliveryService';

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
  const [loading, setLoading] = useState(true);

  const profile = user?.deliveryAgentProfile || {};

  // Navigation items for the KisanBazaar Sidebar
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'requests', icon: Bell, label: 'Book Requests', badge: requests.length > 0 ? `${requests.length}` : null },
    { id: 'active', icon: Truck, label: 'Active Jobs', badge: stats.activeOrders > 0 ? `${stats.activeOrders}` : null },
    { id: 'completed', icon: PackageCheck, label: 'Completed Deliveries' },
    { id: 'profile', icon: User, label: 'Vehicle & Profile' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    let apiJobs = [];
    let apiRequests = [];
    let apiStats = stats;

    try {
      const [jobsRes, requestsRes, statsRes] = await Promise.allSettled([
        api.get('/orders/driver/jobs'),
        api.get('/orders/driver/requests'),
        api.get('/orders/driver/stats'),
      ]);
      if (jobsRes.status === 'fulfilled') apiJobs = jobsRes.value.data || [];
      if (requestsRes.status === 'fulfilled') apiRequests = requestsRes.value.data || [];
      if (statsRes.status === 'fulfilled') apiStats = statsRes.value.data || stats;
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
    const totalEarn = finalJobs.filter(j => (j.deliveryRequestStatus || j.status) === 'delivered').reduce((s, j) => s + (j.deliveryFare || 0), 0);

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
      try {
        await api.put(`/orders/${orderId}/driver/status`, { status });
      } catch (_) { }

      updateDeliveryBookingStatus(orderId, status);
      fetchData();
    } catch (e) {
      console.error('Error updating job status:', e);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const activeJobs = jobs.filter(j => ['driver_accepted', 'collected'].includes(j.deliveryRequestStatus || j.status));
  const completedJobs = jobs.filter(j => (j.deliveryRequestStatus || j.status) === 'delivered');

  const getStatusBadge = (s) => {
    switch (s) {
      case 'pending_driver_approval':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-1 rounded-full">Awaiting Response</span>;
      case 'driver_accepted':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-1 rounded-full">Accepted — Pickup Ready</span>;
      case 'collected':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"><Truck size={10} /> In Transit</span>;
      case 'delivered':
        return <span className="bg-green-50 text-green-700 border border-green-200 text-[10px] font-bold px-2.5 py-1 rounded-full">Delivered ✓</span>;
      default:
        return <span className="bg-gray-50 text-gray-600 border border-gray-200 text-[10px] font-bold px-2.5 py-1 rounded-full">{s || 'Assigned'}</span>;
    }
  };

  const getCropTitle = (order) => order.items?.[0]?.listing?.cropName || 'Farm Crop Stock';
  const getQtyText = (order) => {
    const item = order.items?.[0];
    if (item?.listing?.unit && item?.quantity) {
      return `${item.quantity} ${item.listing.unit}`;
    }
    return item?.quantity ? `${item.quantity} units` : '';
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
                Delivery Dashboard
              </h1>
              <span className="bg-[#E8F7EE] text-[#1F7A4D] font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md border border-emerald-200">
                Agent Portal
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {profile.vehicleType || 'Vehicle Registered'} • License: {profile.vehicleNumber || profile.drivingLicense || 'KA-XX-XXXX'} • ₹{profile.perKmCharge || 18}/km
            </p>
          </div>

          <button
            onClick={fetchData}
            className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-3.5 py-2 rounded-xl border border-gray-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-[#1F7A4D]' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* SaaS METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          {/* Total Earnings */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Total Earnings</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#1F7A4D] flex items-center justify-center font-bold">₹</div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-gray-900">₹{stats.totalEarnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Active Jobs */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Active Jobs</span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Truck size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-orange-600">{stats.activeOrders}</span>
            </div>
          </div>

          {/* Pending Requests */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Book Requests</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Bell size={16} />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-extrabold text-amber-600">{requests.length}</span>
            </div>
          </div>

          {/* Trips Completed */}
          <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Completed</span>
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
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Agent Rating</span>
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
                    <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">New Booking Requests ({requests.length})</h2>
                  </div>
                  {requests.length > 0 && (
                    <button
                      onClick={() => setActiveTab('requests')}
                      className="text-xs font-bold text-[#1F7A4D] hover:underline cursor-pointer"
                    >
                      View All
                    </button>
                  )}
                </div>

                {requests.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">
                    <p className="text-xs font-medium">No pending delivery requests right now.</p>
                    <p className="text-[11px] text-gray-400 mt-1">When buyers choose you for transport, job requests will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 3).map(order => (
                      <div key={order._id || order.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{getCropTitle(order)} {getQtyText(order) && `(${getQtyText(order)})`}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            From: <span className="font-semibold text-gray-700">{order.farmerDetails?.farmerName || order.farmer?.name || 'Farmer'}</span> → To: <span className="font-semibold text-gray-700">{order.buyerDropDetails?.buyerName || order.buyer?.name || 'Buyer'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-sm text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-200">₹{order.deliveryFare || 0}</span>
                          <button
                            onClick={() => setSelectedFullDetailOrder(order)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Eye size={14} /> Full View
                          </button>
                          <button
                            onClick={() => handleRespond(order._id || order.id, 'accept')}
                            className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-3.5 py-1.5 rounded-lg shadow-xs cursor-pointer"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Vehicle Profile Summary Box */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-[#1F7A4D] flex items-center justify-center font-bold text-xl border border-emerald-100">
                      🚚
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{formatDisplayName(user?.name) || 'Delivery Agent'}</h3>
                      <p className="text-xs text-emerald-700 font-semibold">{profile.vehicleType || 'Commercial Pickup'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">Number Plate:</span>
                      <span className="font-bold text-gray-900">{profile.vehicleNumber || 'KA-06-EA-4821'}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">Rate / KM:</span>
                      <span className="font-bold text-emerald-700">₹{profile.perKmCharge || 18}/km</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">License No:</span>
                      <span className="font-bold text-gray-900">{profile.drivingLicense || 'DL-KA-04-2018'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('profile')}
                  className="mt-6 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition-colors cursor-pointer"
                >
                  Manage Profile
                </button>
              </div>

            </div>

            {/* Active Jobs Section */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-emerald-700" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Active Deliveries ({activeJobs.length})</h2>
                </div>
              </div>

              {activeJobs.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <p className="text-xs font-medium">No active delivery assignments right now.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeJobs.map(order => (
                    <div key={order._id || order.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">📦 {getCropTitle(order)} {getQtyText(order) && `(${getQtyText(order)})`}</h4>
                          <p className="text-xs text-gray-500 font-medium">Order #{(order._id || order.id).slice(-6).toUpperCase()} • Fare: ₹{order.deliveryFare}</p>
                        </div>
                        {getStatusBadge(order.deliveryRequestStatus || order.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-gray-100">
                        <div>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Farm Pickup</span>
                          <p className="font-bold text-gray-800">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                          <p className="text-gray-500">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farmer Address'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Buyer Dropoff</span>
                          <p className="font-bold text-gray-800">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                          <p className="text-gray-500">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Buyer Address'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedFullDetailOrder(order)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={14} /> Full View Details
                        </button>

                        {(order.deliveryRequestStatus === 'driver_accepted' || order.status === 'driver_accepted') && (
                          <button
                            onClick={() => handleStatusUpdate(order._id || order.id, 'collected')}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                          >
                            Mark Collected from Farmer
                          </button>
                        )}
                        {(order.deliveryRequestStatus === 'collected' || order.status === 'collected') && (
                          <button
                            onClick={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                          >
                            Confirm Delivered to Buyer
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
              Incoming Delivery Requests ({requests.length})
            </h2>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No pending delivery requests.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(order => (
                  <div key={order._id || order.id} className="p-5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">Order #{(order._id || order.id).slice(-6).toUpperCase()} • Fare: ₹{order.deliveryFare}</p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">Action Required</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-amber-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pickup from Farmer</span>
                        <p className="font-bold text-gray-900">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farm'}</p>
                      </div>
                      <div className="md:border-l md:border-amber-100 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Deliver to Buyer</span>
                        <p className="font-bold text-gray-900">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Buyer Address'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'accept')}
                        className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Check size={14} /> Accept Request
                      </button>
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'reject')}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <X size={14} /> Decline
                      </button>
                      <button
                        onClick={() => setSelectedFullDetailOrder(order)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                      >
                        View Full Details
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
              Ongoing Active Deliveries ({activeJobs.length})
            </h2>

            {activeJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No active deliveries currently in progress.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(order => (
                  <div key={order._id || order.id} className="p-5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">Order #{(order._id || order.id).slice(-6).toUpperCase()} • Fare: ₹{order.deliveryFare}</p>
                      </div>
                      {getStatusBadge(order.deliveryRequestStatus || order.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pickup</span>
                        <p className="font-bold text-gray-900">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farm'}</p>
                        {(order.farmerDetails?.farmerPhone || order.farmer?.phone) && (
                          <a href={`tel:${order.farmerDetails?.farmerPhone || order.farmer?.phone}`} className="text-blue-600 font-bold mt-1 inline-block">📞 Call Farmer</a>
                        )}
                      </div>
                      <div className="md:border-l md:border-gray-200 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Dropoff</span>
                        <p className="font-bold text-gray-900">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Buyer Address'}</p>
                        {(order.buyerDropDetails?.buyerPhone || order.buyer?.phone) && (
                          <a href={`tel:${order.buyerDropDetails?.buyerPhone || order.buyer?.phone}`} className="text-blue-600 font-bold mt-1 inline-block">📞 Call Buyer</a>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {(order.deliveryRequestStatus === 'driver_accepted' || order.status === 'driver_accepted') && (
                        <button
                          onClick={() => handleStatusUpdate(order._id || order.id, 'collected')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          Mark Collected from Farmer
                        </button>
                      )}
                      {(order.deliveryRequestStatus === 'collected' || order.status === 'collected') && (
                        <button
                          onClick={() => handleStatusUpdate(order._id || order.id, 'delivered')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          Confirm Delivered to Buyer
                        </button>
                      )}
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
              Completed Deliveries History ({completedJobs.length})
            </h2>

            {completedJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <PackageCheck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No completed deliveries yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.map(order => (
                  <div key={order._id || order.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/30 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{getCropTitle(order)}</p>
                      <p className="text-gray-500 font-medium">Order #{(order._id || order.id).slice(-6).toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-700 text-sm">₹{order.deliveryFare || 0}</span>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Delivered ✓</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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

      </div>
    </DashboardLayout>
  );
}

function ProfileSection({ user, profile, fetchData }) {
  const { updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        <div className="h-60 sm:h-72 w-full relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669]">
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
              <Camera size={14} className="text-[#047857]" />
              <span>{coverPreview || user?.coverImage ? 'Change Cover' : 'Upload Cover'}</span>
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
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-[#059669] to-[#064e3b] flex items-center justify-center text-3xl sm:text-4xl font-black text-white relative">
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
                      <span className="text-[8px] font-black uppercase tracking-wider text-emerald-300">Saving...</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={20} className="text-emerald-400 mb-0.5" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Change Pic</span>
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
                  {formatDisplayName(user?.name) || 'Delivery Agent'}
                </h2>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                  <CheckCircle2 size={12} className="text-emerald-600 stroke-[3]" /> Verified Driver
                </span>
              </div>

              {/* Subtitle / Bio */}
              <p className="text-sm font-medium text-gray-500 max-w-xl">
                Agri-logistics & fast farm-to-table transportation specialist • Direct verified farmer pickups
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
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">Badges</span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                🛡 Police Verified
              </span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                ⚡ Fast Delivery
              </span>
              <span className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 flex items-center gap-1 shadow-2xs">
                ❄ Cold Chain
              </span>
            </div>
          </div>

          {/* Bottom Row: Metrics Columns + Dark Pill Action Button */}
          <div className="mt-7 pt-5 border-t border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5 sm:gap-7">
              <div>
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="text-base sm:text-lg font-black text-gray-900">4.9</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Driver Rating</span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div>
                <span className="text-base sm:text-lg font-black text-gray-900 block leading-tight">
                  14
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Trips</span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div>
                <span className="text-base sm:text-lg font-black text-[#1F7A4D] block leading-tight">
                  ₹{formData.perKmCharge}/km
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base Rate</span>
              </div>

              <div className="h-7 w-px bg-gray-200 hidden sm:block" />

              <div className="hidden sm:block">
                <span className="text-base sm:text-lg font-black text-emerald-700 block leading-tight">
                  ₹18,450
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Earnings</span>
              </div>
            </div>

            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 sm:px-7 sm:py-3 bg-[#111827] hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-full transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95 flex items-center justify-center gap-2 self-start sm:self-auto"
              >
                <Edit size={14} /> Edit Driver Info
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
        <div className="p-3.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200">
          ✓ {success}
        </div>
      )}

      {/* Edit Details or Details View */}
      {isEditing ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">Edit Driver Profile</h3>
            <button type="button" onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
            <div className="space-y-1">
              <label>Driver Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>Vehicle Model / Type</label>
              <input
                type="text"
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>Vehicle Number Plate</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>Driving License</label>
              <input
                type="text"
                name="drivingLicense"
                value={formData.drivingLicense}
                onChange={handleChange}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label>Rate Per Km (₹)</label>
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
              className="px-6 py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
          <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-3">Driver Documentation & Vehicle Specs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">Driving License</span>
              <p className="font-bold text-stone-800">{formData.drivingLicense || 'KA-04-2018-0091823'}</p>
              <span className="text-[10px] text-emerald-600 font-bold">✓ Valid until 2038</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">Commercial Permit</span>
              <p className="font-bold text-stone-800">All India Agri-Freight</p>
              <span className="text-[10px] text-emerald-600 font-bold">✓ Active & Insured</span>
            </div>
            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
              <span className="text-[10px] font-black text-stone-400 uppercase">Cargo Capacity</span>
              <p className="font-bold text-stone-800">1,500 kg (1.5 Tonne)</p>
              <span className="text-[10px] text-stone-500 font-bold">Open Bed & Tarpaulin</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullBookingDetailsModal({ order, onClose, handleRespond, handleStatusUpdate, getCropTitle, getQtyText }) {
  if (!order) return null;

  const orderId = (order._id || order.id || '').slice(-6).toUpperCase();
  const cropTitle = getCropTitle(order);
  const qtyText = getQtyText(order);
  const fare = order.deliveryFare || 0;
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
              <h3 className="font-black text-base leading-tight">Delivery Job #{orderId}</h3>
              <p className="text-xs text-emerald-100 font-medium">Full Farm Pickup & Buyer Dropoff Route</p>
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
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Produce Cargo</span>
              <p className="font-black text-stone-900 text-sm">🌾 {cropTitle} {qtyText && `(${qtyText})`}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Total Fare</span>
              <p className="font-black text-emerald-700 text-base">₹{fare}</p>
            </div>
          </div>

          {/* FARMER PICKUP DETAILS */}
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-orange-200/80 pb-2">
              <div className="flex items-center gap-2 text-orange-900 font-black text-xs uppercase tracking-wider">
                <MapPin size={16} className="text-orange-600" /> Farm Pickup Location
              </div>
              {farmerPhone !== 'N/A' && (
                <a
                  href={`tel:${farmerPhone}`}
                  className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs"
                >
                  <Phone size={12} /> Call Farmer
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Farmer Name</span>
                <p className="font-black text-stone-900 text-sm">{farmerName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Farmer Phone</span>
                <p className="font-extrabold text-stone-800">{farmerPhone}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Pickup District</span>
                <p className="font-extrabold text-stone-800">{pickupDistrict}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Pickup Time Window</span>
                <p className="font-extrabold text-stone-800">{pickupTimeSlot}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Full Farm Pickup Address & Pincode</span>
                <p className="font-bold text-stone-900">{pickupAddress} {pickupPincode && `(PIN: ${pickupPincode})`}</p>
              </div>
            </div>
          </div>

          {/* BUYER DROPOFF DESTINATION DETAILS */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
              <div className="flex items-center gap-2 text-emerald-800 font-black text-xs uppercase tracking-wider">
                <User size={16} className="text-emerald-600" /> Buyer Dropoff Destination
              </div>
              {buyerPhone !== 'N/A' && (
                <a
                  href={`tel:${buyerPhone}`}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow-xs"
                >
                  <Phone size={12} /> Call Buyer
                </a>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Buyer Name</span>
                <p className="font-black text-stone-900 text-sm">{buyerName}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Buyer Phone</span>
                <p className="font-extrabold text-stone-800">{buyerPhone}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Drop District</span>
                <p className="font-extrabold text-stone-800">{dropDistrict}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Transport Fare</span>
                <p className="font-black text-emerald-700 text-sm">₹{fare}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Full Buyer Address</span>
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
            Close Window
          </button>

          <div className="flex items-center gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => { handleRespond(order._id || order.id, 'accept'); onClose(); }}
                  className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Check size={14} /> Accept Request
                </button>
                <button
                  onClick={() => { handleRespond(order._id || order.id, 'reject'); onClose(); }}
                  className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <X size={14} /> Decline
                </button>
              </>
            )}

            {isAccepted && (
              <button
                onClick={() => { handleStatusUpdate(order._id || order.id, 'collected'); onClose(); }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
              >
                Mark Collected from Farmer
              </button>
            )}

            {isCollected && (
              <button
                onClick={() => { handleStatusUpdate(order._id || order.id, 'delivered'); onClose(); }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm cursor-pointer"
              >
                Confirm Delivered to Buyer
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
