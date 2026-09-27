import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import {
  LayoutDashboard, Truck, PackageCheck, Bell, User, Phone, CheckCircle2,
  Navigation, RefreshCw, Star, DollarSign, MapPin, Check, X, ShieldCheck,
  TrendingUp, Calendar, AlertCircle, ArrowUpRight, ChevronRight, LogOut,
  Pencil, Camera, Eye
} from 'lucide-react';

import api from '../api/axios';

import { getAgentDeliveryRequests, getAllDeliveryBookings, updateDeliveryBookingStatus } from '../utils/deliveryService';

export default function DeliveryAgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [jobs, setJobs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    tripsCompleted: 0,
    activeOrders: 0,
    pendingRequests: 0,
    avgRating: 0
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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRespond = async (orderId, action) => {
    try {
      try {
        await api.put(`/orders/${orderId}/driver/respond`, { action });
      } catch (_) {}
      
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
      } catch (_) {}

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

  const activeJobs = jobs.filter(j => ['driver_accepted', 'collected'].includes(j.deliveryRequestStatus));
  const completedJobs = jobs.filter(j => j.deliveryRequestStatus === 'delivered');

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
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Delivery Dashboard</h1>
              <span className="bg-[#E8F7EE] text-[#1F7A4D] font-bold text-[10px] uppercase px-2.5 py-0.5 rounded-md border border-emerald-200">
                Agent Portal
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {profile.vehicleType || 'Vehicle Registered'} • License: {profile.vehicleNumber || 'KA-XX-XXXX'} • ₹{profile.perKmCharge || 15}/km
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

          {/* Today's / Total Earnings */}
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
                {stats.avgRating > 0 ? `${stats.avgRating} / 5` : 'New'}
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
                      className="text-xs font-bold text-[#1F7A4D] hover:underline"
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
                      <div key={order._id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/60 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <p className="font-bold text-sm text-gray-900">{getCropTitle(order)} {getQtyText(order) && `(${getQtyText(order)})`}</p>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            From: <span className="font-semibold text-gray-700">{order.farmer?.name || 'Farmer'}</span> → To: <span className="font-semibold text-gray-700">{order.buyer?.name || 'Buyer'}</span>
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
                      <h3 className="font-bold text-sm text-gray-900">{user?.name}</h3>
                      <p className="text-xs text-emerald-700 font-semibold">{profile.vehicleType || 'Transport Vehicle'}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 text-xs">
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">Number Plate:</span>
                      <span className="font-bold text-gray-900">{profile.vehicleNumber || 'KA-01-E-0000'}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">Rate / KM:</span>
                      <span className="font-bold text-emerald-700">₹{profile.perKmCharge || 15}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span className="font-medium">License No:</span>
                      <span className="font-bold text-gray-900">{profile.drivingLicense || 'DL-XXXXXX'}</span>
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
              Pending Booking Requests ({requests.length})
            </h2>

            {requests.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No pending booking requests from buyers.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(order => (
                  <div key={order._id || order.id} className="p-5 rounded-xl border border-amber-200 bg-amber-50/30 space-y-4">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">
                          Order #{(order._id || order.id).slice(-6).toUpperCase()} • Distance: {order.deliveryDistance ? `${order.deliveryDistance} km` : 'Calculated'}
                        </p>
                      </div>
                      <span className="text-lg font-extrabold text-[#1F7A4D] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        Fare: ₹{order.deliveryFare || 0}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pickup Producer</span>
                        <p className="font-bold text-gray-900">{order.farmerDetails?.farmerName || order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farmer Hub'}</p>
                        {(order.farmerDetails?.farmerPhone || order.farmer?.phone) && (
                          <p className="text-gray-500 font-semibold mt-1">Phone: {order.farmerDetails?.farmerPhone || order.farmer?.phone}</p>
                        )}
                      </div>
                      <div className="md:border-l md:border-gray-200 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Dropoff Destination</span>
                        <p className="font-bold text-gray-900">{order.buyerDropDetails?.buyerName || order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Buyer Location'}</p>
                        {(order.buyerDropDetails?.buyerPhone || order.buyer?.phone) && (
                          <p className="text-gray-500 font-semibold mt-1">Phone: {order.buyerDropDetails?.buyerPhone || order.buyer?.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedFullDetailOrder(order)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Eye size={16} /> Full View Details
                      </button>
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'accept')}
                        className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Check size={16} /> Accept Request
                      </button>
                      <button
                        onClick={() => handleRespond(order._id || order.id, 'reject')}
                        className="bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <X size={16} /> Decline
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
              Active Delivery Assignments ({activeJobs.length})
            </h2>

            {activeJobs.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No active delivery assignments.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(order => (
                  <div key={order._id} className="p-5 rounded-xl border border-gray-200 bg-white shadow-xs space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-base text-gray-900">📦 {getCropTitle(order)}</h3>
                        <p className="text-xs text-gray-500 font-medium">Order #{order._id.slice(-6).toUpperCase()} • Fare: ₹{order.deliveryFare}</p>
                      </div>
                      {getStatusBadge(order.deliveryRequestStatus)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Pickup</span>
                        <p className="font-bold text-gray-900">{order.farmer?.name}</p>
                        <p className="text-gray-600">{order.farmer?.location?.address || 'Farm'}</p>
                        {order.farmer?.phone && <a href={`tel:${order.farmer.phone}`} className="text-blue-600 font-bold mt-1 inline-block">📞 Call Farmer</a>}
                      </div>
                      <div className="md:border-l md:border-gray-200 md:pl-4">
                        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">Dropoff</span>
                        <p className="font-bold text-gray-900">{order.buyer?.name}</p>
                        <p className="text-gray-600">{order.buyer?.location?.address || 'Buyer Address'}</p>
                        {order.buyer?.phone && <a href={`tel:${order.buyer.phone}`} className="text-blue-600 font-bold mt-1 inline-block">📞 Call Buyer</a>}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {order.deliveryRequestStatus === 'driver_accepted' && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'collected')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
                        >
                          Mark Collected from Farmer
                        </button>
                      )}
                      {order.deliveryRequestStatus === 'collected' && (
                        <button
                          onClick={() => handleStatusUpdate(order._id, 'delivered')}
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
                  <div key={order._id} className="p-4 rounded-xl border border-gray-200 bg-gray-50/30 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-gray-900">{getCropTitle(order)}</p>
                      <p className="text-gray-500 font-medium">Order #{order._id.slice(-6).toUpperCase()}</p>
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

        {/* PROFILE TAB */}
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    vehicleType: profile?.vehicleType || 'Mini-Truck',
    vehicleNumber: profile?.vehicleNumber || '',
    drivingLicense: profile?.drivingLicense || '',
    perKmCharge: profile?.perKmCharge || 15,
    address: user?.location?.address || '',
    district: user?.location?.district || '',
    state: user?.location?.state || 'Karnataka',
  });

  const [vehiclePhotoFile, setVehiclePhotoFile] = useState(null);
  const [vehiclePhotoPreview, setVehiclePhotoPreview] = useState(profile?.vehiclePhoto || '');

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVehiclePhotoFile(file);
      setVehiclePhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
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

      if (vehiclePhotoFile) {
        payload.vehiclePhotoFile = vehiclePhotoFile;
      }
      if (avatarFile) {
        payload.avatarFile = avatarFile;
      }

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
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-[#1F7A4D] font-bold text-2xl flex items-center justify-center border border-emerald-200 overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              user?.name?.charAt(0) || 'D'
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
            <p className="text-xs text-gray-500 font-medium">{user?.email} • {user?.phone}</p>
            <span className="mt-1 inline-block bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded border border-emerald-200">
              Delivery Agent Account
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            setIsEditing(!isEditing);
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border shadow-xs ${
            isEditing
              ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              : 'bg-[#1F7A4D] text-white border-emerald-700 hover:bg-[#165b38] hover:shadow-md'
          }`}
        >
          {isEditing ? (
            <>
              <X size={14} />
              <span>Cancel Editing</span>
            </>
          ) : (
            <>
              <Pencil size={14} />
              <span>Edit Profile</span>
            </>
          )}
        </button>

      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
          ✓ {success}
        </div>
      )}

      {/* VIEW MODE */}
      {!isEditing && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vehicle Type</span>
              <p className="font-bold text-sm text-gray-900 mt-1">{profile?.vehicleType || 'Mini-Truck'}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Vehicle Registration</span>
              <p className="font-bold text-sm text-gray-900 mt-1">{profile?.vehicleNumber || 'Not specified'}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Per KM Fare Rate</span>
              <p className="font-bold text-sm text-emerald-700 mt-1">₹{profile?.perKmCharge || 15} / km</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Driving License</span>
              <p className="font-bold text-sm text-gray-900 mt-1">{profile?.drivingLicense || 'Not specified'}</p>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200/80 sm:col-span-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Operating Region</span>
              <p className="font-bold text-sm text-gray-900 mt-1">
                {[user?.location?.address, user?.location?.district, user?.location?.state].filter(Boolean).join(', ') || 'Karnataka'}
              </p>
            </div>
          </div>

          {(profile?.vehiclePhoto || vehiclePhotoPreview) && (
            <div className="pt-4 border-t border-gray-100">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Registered Vehicle Photo</span>
              <img
                src={vehiclePhotoPreview || profile?.vehiclePhoto}
                alt="Vehicle"
                className="max-h-60 rounded-xl border border-gray-200 object-cover"
              />
            </div>
          )}
        </div>
      )}

      {/* EDIT FORM MODE */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Type</label>
              <select
                name="vehicleType"
                value={formData.vehicleType}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
              >
                <option value="Mini-Truck">Mini-Truck (Chota Hathi)</option>
                <option value="Pickup Truck">Pickup Truck (Bolero / Commercial)</option>
                <option value="Auto Rickshaw">Goods Auto Rickshaw (3-Wheeler)</option>
                <option value="Tractor-Trailer">Tractor-Trailer</option>
                <option value="Van">Delivery Van</option>
                <option value="Bike">Cargo Bike / Scooter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Registration Number</label>
              <input
                type="text"
                name="vehicleNumber"
                value={formData.vehicleNumber}
                onChange={handleChange}
                placeholder="e.g. KA-34-M-5799"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Driving License Number</label>
              <input
                type="text"
                name="drivingLicense"
                value={formData.drivingLicense}
                onChange={handleChange}
                placeholder="e.g. DL-1420110012345"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Per KM Fare Charge (₹ / km)</label>
              <input
                type="number"
                name="perKmCharge"
                value={formData.perKmCharge}
                onChange={handleChange}
                min="5"
                max="200"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">District</label>
              <input
                type="text"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="e.g. Dakshina Kannada"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="e.g. Karnataka"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Operating Address / Hub Location</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. APMC Yard, Vamanjoor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Profile Picture (Avatar) Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              {avatarPreview && (
                <div className="mt-2 flex items-center gap-3">
                  <img src={avatarPreview} alt="Avatar Preview" className="w-14 h-14 rounded-full border-2 border-emerald-500 object-cover shadow-xs" />
                  <span className="text-[11px] font-semibold text-emerald-700">Photo selected</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 mb-1">Vehicle Photo Upload</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
              />
              {vehiclePhotoPreview && (
                <div className="mt-2">
                  <img src={vehiclePhotoPreview} alt="Preview" className="h-28 rounded-lg border border-gray-200 object-cover" />
                </div>
              )}
            </div>

          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-5 py-2.5 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function FullBookingDetailsModal({ order, onClose, handleRespond, handleStatusUpdate, getCropTitle, getQtyText }) {
  if (!order) return null;

  const farmerName = order.farmerDetails?.farmerName || order.farmer?.name || 'Sourcing Farmer';
  const farmerPhone = order.farmerDetails?.farmerPhone || order.farmer?.phone || 'N/A';
  const farmerAltPhone = order.farmerDetails?.farmerAltPhone || '';
  const pickupAddress = order.farmerDetails?.pickupAddress || order.farmer?.location?.address || 'Farm Hub';
  const pickupDistrict = order.farmerDetails?.pickupDistrict || order.farmer?.location?.district || 'Karnataka';
  const pickupPincode = order.farmerDetails?.pickupPincode || '';
  const pickupTimeSlot = order.farmerDetails?.pickupTimeSlot || 'Morning';
  const cropTypeQuantity = order.farmerDetails?.cropTypeQuantity || getCropTitle(order);

  const buyerName = order.buyerDropDetails?.buyerName || order.buyer?.name || 'Verified Buyer';
  const buyerPhone = order.buyerDropDetails?.buyerPhone || order.buyer?.phone || 'N/A';
  const dropAddress = order.buyerDropDetails?.dropAddress || order.buyer?.location?.address || 'Destination';
  const dropDistrict = order.buyerDropDetails?.dropDistrict || order.buyer?.location?.district || 'Karnataka';

  const fare = order.deliveryFare || order.expenditureDetails?.totalExpenditure || 0;
  const distance = order.deliveryDistance || order.expenditureDetails?.distanceKm || 15;
  const status = order.deliveryRequestStatus || order.status || 'pending_driver_approval';

  const isPending = status === 'pending_driver_approval';
  const isAccepted = status === 'driver_accepted';
  const isCollected = status === 'collected' || status === 'shipped';

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-stone-200 shadow-2xl overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-700/60 px-2.5 py-0.5 rounded-full border border-emerald-500/40 text-emerald-200">
                FULL TRANSPORT BOOKING DETAILS
              </span>
              <span className="font-mono text-xs text-emerald-300 font-bold">#{(order._id || order.id || 'REQ').toString().slice(-8).toUpperCase()}</span>
            </div>
            <h3 className="text-xl font-black">{cropTypeQuantity}</h3>
            <p className="text-xs text-emerald-200 font-medium">Distance: {distance} km • Transport Fare: <span className="font-black text-emerald-300">₹{fare}</span></p>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* SOURCING FARMER PICKUP DETAILS */}
          <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-orange-200/80 pb-2">
              <div className="flex items-center gap-2 text-orange-800 font-black text-xs uppercase tracking-wider">
                <MapPin size={16} className="text-orange-600" /> Farm Origin & Sourcing Producer
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
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Primary Phone</span>
                <p className="font-extrabold text-stone-800">{farmerPhone}</p>
                {farmerAltPhone && <p className="text-[10px] text-stone-500">Alt: {farmerAltPhone}</p>}
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Pickup District</span>
                <p className="font-extrabold text-stone-800">{pickupDistrict}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-orange-700 uppercase tracking-wider block">Pickup Time Slot</span>
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


