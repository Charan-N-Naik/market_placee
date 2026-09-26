import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck, MapPin, Phone, MessageSquare, ShieldCheck, CheckCircle2,
  Clock, DollarSign, Navigation, ArrowRight, User, AlertCircle, RefreshCw, LogOut, Check
} from 'lucide-react';
import { getAvailableDeliveryAgents, getDeliveryBooking, updateDeliveryBookingStatus } from '../utils/deliveryService';
import api from '../api/axios';

export default function DeliveryAgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'profile'
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChatData, setActiveChatData] = useState(null);

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
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black text-xl border border-white/30">
              🚚
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white leading-tight">{driverProfile.name}</h1>
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

          {(activeTab === 'active' ? activeJobs : completedJobs).length === 0 && !loading && (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 space-y-3">
              <span className="text-4xl block">🚚</span>
              <h3 className="font-bold text-stone-800 text-sm">No {activeTab} delivery jobs</h3>
              <p className="text-xs text-stone-400 font-medium">New farm pickup requests will appear here automatically when booked by buyers.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
