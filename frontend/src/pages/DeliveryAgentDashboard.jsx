import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck, MapPin, Phone, MessageSquare, ShieldCheck, CheckCircle2,
  Clock, DollarSign, Navigation, ArrowRight, User, AlertCircle, RefreshCw, LogOut, Check,
  Camera, Bookmark, Edit, Star, SlidersHorizontal, Save, X
} from 'lucide-react';
import { getAvailableDeliveryAgents, getDeliveryBooking, updateDeliveryBookingStatus } from '../utils/deliveryService';
import api from '../api/axios';

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

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'profile'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChatData, setActiveChatData] = useState(null);

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [coverPreview, setCoverPreview] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // Driver details
  const [driverProfile, setDriverProfile] = useState({
    name: user?.name || 'Ramesh Gowda',
    phone: user?.phone || '9845012345',
    vehicleType: 'Mahindra Bolero Pickup 🚚',
    vehicleNumber: 'KA-06-EA-4821',
    ratePerKm: 18,
    rating: 4.9,
    tripsCompleted: 14,
    totalEarnings: 18450,
    district: user?.location?.district || 'Bengaluru',
    state: user?.location?.state || 'Karnataka',
    experience: '6 Years',
  });

  useEffect(() => {
    fetchDeliveryJobs();
  }, []);

  const fetchDeliveryJobs = async () => {
    setLoading(true);
    try {
      // Load all backend orders to display assigned / available farm pickups
      let allOrders = [];
      try {
        const res = await api.get('/orders/my').catch(() => null);
        if (res?.data) allOrders = res.data;
      } catch (_) {}

      // Combine with local order bookings
      const bookingsKey = 'kb_delivery_bookings';
      const allBookings = JSON.parse(localStorage.getItem(bookingsKey) || '{}');

      const compiledJobs = [];

      // Loop through orders and bookings
      Object.keys(allBookings).forEach(orderId => {
        const booking = allBookings[orderId];
        compiledJobs.push({
          id: orderId,
          orderId,
          cropName: booking.cropName || 'Fresh Farm Produce',
          quantity: booking.quantity || '100 kg',
          farmerName: booking.farmerName || 'Farmer John',
          farmerPhone: booking.farmerPhone || '9876543210',
          farmerAddress: booking.origin || 'Tumakuru Organic Farm, Plot #12',
          buyerName: booking.buyerName || 'Chandrakant',
          buyerPhone: booking.buyerPhone || '9123456789',
          buyerAddress: booking.destination || 'Indiranagar, Bengaluru',
          distanceKm: booking.expenditureDetails?.distanceKm || 72,
          totalFare: booking.expenditureDetails?.totalExpenditure || 1396,
          status: booking.status || 'assigned', // assigned | packed | collected | shipped | delivered
          vehicleType: booking.driver?.vehicleType || driverProfile.vehicleType,
        });
      });

      // Fallback default job if no bookings exist yet
      if (compiledJobs.length === 0) {
        compiledJobs.push({
          id: 'demo_order_6c96e5',
          orderId: '6c96e5',
          cropName: 'Organic Tomato Lot',
          quantity: '150 kg',
          farmerName: 'Farmer John',
          farmerPhone: '9845012345',
          farmerAddress: 'Tumakuru Farm Hub, Sector 4',
          buyerName: 'Chandrakant',
          buyerPhone: '9880198765',
          buyerAddress: 'Koramangala, Bengaluru',
          distanceKm: 72,
          totalFare: 1396,
          status: 'packed',
          vehicleType: driverProfile.vehicleType,
        });
      }

      setJobs(compiledJobs);
    } catch (err) {
      console.error('Error loading delivery jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJobStatus = (orderId, nextStatus) => {
    // Sync local delivery service
    updateDeliveryBookingStatus(orderId, nextStatus);

    // Sync state
    setJobs(prev => prev.map(job => {
      if (job.orderId === orderId || job.id === orderId) {
        return { ...job, status: nextStatus };
      }
      return job;
    }));

    // Update backend order status if endpoint exists
    api.put(`/orders/${orderId}/status`, { status: nextStatus }).catch(() => {});
  };

  const activeJobs = jobs.filter(j => j.status !== 'delivered');
  const completedJobs = jobs.filter(j => j.status === 'delivered');

  return (
    <div className="min-h-screen bg-stone-100 font-sans pb-20">
      
      {/* DRIVER HEADER */}
      <header className="bg-[#1F7A4D] text-white shadow-lg sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-xl border border-white/30 overflow-hidden">
              {avatarPreview || user?.avatar ? (
                <img src={avatarPreview || user.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>🚚</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white leading-tight" style={{ fontFamily: "'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif" }}>
                  {formatDisplayName(user?.name) || driverProfile.name}
                </h1>
                <span className="text-[10px] bg-white/20 text-emerald-100 font-bold px-2 py-0.5 rounded-md uppercase">Delivery Agent</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">{driverProfile.vehicleType} • {driverProfile.vehicleNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online Toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                isOnline 
                  ? 'bg-emerald-400 text-emerald-950 font-black shadow-sm' 
                  : 'bg-stone-700 text-stone-300'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-950 animate-pulse' : 'bg-stone-400'}`} />
              {isOnline ? 'Online & Ready' : 'Offline'}
            </button>

            <button
              onClick={() => {
                logout();
                navigate('/auth');
              }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* STATS OVERVIEW CARDS */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">TODAY'S EARNINGS</span>
            <p className="text-xl font-black text-emerald-700">₹{driverProfile.totalEarnings.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">ACTIVE JOBS</span>
            <p className="text-xl font-black text-orange-600">{activeJobs.length} Orders</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">TRIPS COMPLETED</span>
            <p className="text-xl font-black text-stone-800">{driverProfile.tripsCompleted}</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">DRIVER RATING</span>
            <p className="text-xl font-black text-amber-500">★ {driverProfile.rating}/5.0</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        
        {/* TAB CONTROLS */}
        <div className="flex border-b border-stone-200 gap-2">
          {[
            { id: 'active', label: `Active Delivery Jobs (${activeJobs.length})` },
            { id: 'completed', label: `Completed Deliveries (${completedJobs.length})` },
            { id: 'profile', label: `Driver Profile` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 font-bold text-xs cursor-pointer border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-[#1F7A4D] text-[#1F7A4D] bg-white rounded-t-xl shadow-xs' 
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* JOBS FEED */}
        <div className="space-y-4">
          {loading && (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs font-bold flex items-center justify-center gap-2">
              <RefreshCw size={16} className="animate-spin text-[#1F7A4D]" />
              Fetching assigned farm delivery jobs...
            </div>
          )}

          {(activeTab === 'active' ? activeJobs : completedJobs).map((job) => {
            const isPacked = job.status === 'packed' || job.status === 'accepted';
            const isCollected = job.status === 'collected';
            const isShipped = job.status === 'shipped';
            const isDelivered = job.status === 'delivered';

            return (
              <div 
                key={job.id}
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-5 hover:border-emerald-300 transition-all"
              >
                {/* CARD HEADER */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-100 text-[#1F7A4D] flex items-center justify-center font-black text-base">
                      📦
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-stone-900">{job.cropName} ({job.quantity})</h3>
                      <p className="text-[11px] text-stone-500 font-semibold">Order #{String(job.orderId).slice(-6).toUpperCase()} • Distance: {job.distanceKm} km</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base font-black text-[#1F7A4D] bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      Fare: ₹{job.totalFare}
                    </span>
                  </div>
                </div>

                {/* PICKUP & DROPOFF ROUTE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs">
                  {/* FARM PICKUP */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-wider block">🌾 FARM PICKUP (PRODUCER)</span>
                    <p className="font-bold text-stone-800">{job.farmerName}</p>
                    <p className="text-stone-600 font-medium">{job.farmerAddress}</p>
                    <p className="text-[11px] text-stone-500 font-bold">Phone: {job.farmerPhone}</p>
                  </div>

                  {/* BUYER DROPOFF */}
                  <div className="space-y-1 md:border-l md:border-stone-200 md:pl-4">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-wider block">🏠 BUYER DROPOFF (DESTINATION)</span>
                    <p className="font-bold text-stone-800">{job.buyerName}</p>
                    <p className="text-stone-600 font-medium">{job.buyerAddress}</p>
                    <p className="text-[11px] text-stone-500 font-bold">Phone: {job.buyerPhone}</p>
                  </div>
                </div>

                {/* CURRENT TRANSIT STEP INDICATOR */}
                <div className="flex items-center gap-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs">
                  <Truck size={16} className="text-[#1F7A4D] animate-bounce shrink-0" />
                  <span className="font-bold text-emerald-950">
                    Status: {job.status === 'assigned' && 'Order Assigned • Awaiting Farm Pickup'}
                    {job.status === 'packed' && 'Farmer Marked Packed • Ready for Driver Collection'}
                    {job.status === 'collected' && 'Collected from Farm • Ready to Ship'}
                    {job.status === 'shipped' && 'In Transit 🚛 • Driving to Buyer'}
                    {job.status === 'delivered' && 'Delivered to Buyer Doorstep 🎉'}
                  </span>
                </div>

                {/* DRIVER ACTION BUTTONS */}
                {activeTab === 'active' && (
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {/* STEP 1: COLLECT FROM FARM */}
                    {(job.status === 'assigned' || job.status === 'packed') && (
                      <button
                        onClick={() => handleUpdateJobStatus(job.orderId, 'collected')}
                        className="bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <CheckCircle2 size={16} /> Mark Collected from Farmer
                      </button>
                    )}

                    {/* STEP 2: START SHIPPED / IN TRANSIT */}
                    {job.status === 'collected' && (
                      <button
                        onClick={() => handleUpdateJobStatus(job.orderId, 'shipped')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Navigation size={16} /> Mark Shipped (In Transit 🚚)
                      </button>
                    )}

                    {/* STEP 3: CONFIRM DELIVERED TO BUYER */}
                    {job.status === 'shipped' && (
                      <button
                        onClick={() => handleUpdateJobStatus(job.orderId, 'delivered')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                      >
                        <Check size={16} /> Confirm Crop Delivered to Buyer
                      </button>
                    )}

                    {/* CONTACT ACTIONS */}
                    <a
                      href={`tel:${job.farmerPhone}`}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Phone size={14} /> Call Farmer
                    </a>

                    <a
                      href={`tel:${job.buyerPhone}`}
                      className="bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <Phone size={14} /> Call Buyer
                    </a>
                  </div>
                )}
              </div>
            );
          })}

          {(activeTab === 'active' ? activeJobs : completedJobs).length === 0 && activeTab !== 'profile' && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 space-y-3">
              <span className="text-4xl block">🚚</span>
              <h3 className="font-bold text-stone-800 text-sm">No {activeTab} delivery jobs</h3>
              <p className="text-xs text-stone-400 font-medium">New farm pickup requests will appear here automatically when booked by buyers.</p>
            </div>
          )}

          {/* DRIVER PROFILE TAB (Matching Reference Image 1 Design) */}
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-fadeIn">
              {/* Cover Banner & Profile Head */}
              <div className="bg-white rounded-[32px] border border-gray-150 shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden relative">
                {/* Cover Banner with Mist Fog Gradient */}
                <div className="h-60 sm:h-72 w-full relative overflow-hidden bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#059669]">
                  {(coverPreview || user?.coverImage) ? (
                    <img
                      src={coverPreview || user.coverImage}
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
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (file) {
                            const previewUrl = URL.createObjectURL(file);
                            setCoverPreview(previewUrl);
                            try {
                              if (updateProfile) await updateProfile({ coverImageFile: file });
                            } catch (_) {}
                          }
                        }}
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
                            src={avatarPreview || user.avatar}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span style={{ fontFamily: "'Outfit', sans-serif" }}>
                            {(formatDisplayName(user?.name)?.charAt(0) || driverProfile.name.charAt(0) || 'D').toUpperCase()}
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
                            onChange={async (e) => {
                              const file = e.target.files[0];
                              if (file) {
                                try {
                                  setUploadingAvatar(true);
                                  const previewUrl = URL.createObjectURL(file);
                                  setAvatarPreview(previewUrl);
                                  if (updateProfile) await updateProfile({ avatarFile: file });
                                } catch (_) {
                                } finally {
                                  setUploadingAvatar(false);
                                }
                              }
                            }}
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
                          {formatDisplayName(user?.name) || driverProfile.name}
                        </h2>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-2xs">
                          <CheckCircle2 size={12} className="text-emerald-600 stroke-[3]" /> Verified Driver
                        </span>
                      </div>

                      {/* Subtitle / Bio like in reference */}
                      <p className="text-sm font-medium text-gray-500 max-w-xl">
                        Agri-logistics & fast farm-to-table transportation specialist • Direct verified farmer pickups
                      </p>

                      {/* Meta Tags */}
                      <div className="flex items-center gap-3 pt-1 flex-wrap text-xs font-semibold text-gray-500">
                        <span className="flex items-center gap-1 text-gray-600">
                          🚚 {driverProfile.vehicleType}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-gray-600 font-mono text-[11px]">
                          {driverProfile.vehicleNumber}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="flex items-center gap-1 text-gray-600">
                          📍 {driverProfile.district}, {driverProfile.state}
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
                          <span className="text-base sm:text-lg font-black text-gray-900">{driverProfile.rating}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Driver Rating</span>
                      </div>

                      <div className="h-7 w-px bg-gray-200" />

                      <div>
                        <span className="text-base sm:text-lg font-black text-gray-900 block leading-tight">
                          {driverProfile.tripsCompleted}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Completed Trips</span>
                      </div>

                      <div className="h-7 w-px bg-gray-200" />

                      <div>
                        <span className="text-base sm:text-lg font-black text-[#1F7A4D] block leading-tight">
                          ₹{driverProfile.ratePerKm}/km
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base Rate</span>
                      </div>

                      <div className="h-7 w-px bg-gray-200 hidden sm:block" />

                      <div className="hidden sm:block">
                        <span className="text-base sm:text-lg font-black text-emerald-700 block leading-tight">
                          ₹{driverProfile.totalEarnings.toLocaleString('en-IN')}
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

              {/* Edit Details or Details View */}
              {isEditing ? (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">Edit Driver Profile</h3>
                    <button onClick={() => setIsEditing(false)} className="text-stone-400 hover:text-stone-700">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
                    <div className="space-y-1">
                      <label>Driver Full Name</label>
                      <input
                        type="text"
                        value={driverProfile.name}
                        onChange={e => setDriverProfile(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Phone Number</label>
                      <input
                        type="text"
                        value={driverProfile.phone}
                        onChange={e => setDriverProfile(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Vehicle Model / Type</label>
                      <input
                        type="text"
                        value={driverProfile.vehicleType}
                        onChange={e => setDriverProfile(prev => ({ ...prev, vehicleType: e.target.value }))}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Vehicle Number Plate</label>
                      <input
                        type="text"
                        value={driverProfile.vehicleNumber}
                        onChange={e => setDriverProfile(prev => ({ ...prev, vehicleNumber: e.target.value }))}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label>Rate Per Km (₹)</label>
                      <input
                        type="number"
                        value={driverProfile.ratePerKm}
                        onChange={e => setDriverProfile(prev => ({ ...prev, ratePerKm: Number(e.target.value) }))}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-6 py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <Save size={14} /> Save Changes
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider border-b border-stone-100 pb-3">Driver Documentation & Vehicle Specs</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-[10px] font-black text-stone-400 uppercase">Driving License</span>
                      <p className="font-bold text-stone-800">KA-04-2018-0091823</p>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Valid until 2038</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-[10px] font-black text-stone-400 uppercase">Commercial Permit</span>
                      <p className="font-bold text-stone-800">All India Agri-Freight</p>
                      <span className="text-[10px] text-emerald-600 font-bold">✓ Active & Insured</span>
                    </div>
                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                      <span className="text-[10px] font-black text-stone-400 uppercase">Cargo Capacity</span>
                      <p className="font-bold text-stone-800">1,500 kg (1.5 Tonne)</p>
                      <span className="text-[10px] text-stone-500 font-bold">Open Bed & Tarpaulin</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
