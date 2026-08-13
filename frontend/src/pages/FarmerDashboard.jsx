import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useListings } from '../context/ListingContext';
import CropCard from '../components/CropCard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import AddListingPage from './AddListingPage';
import AIChatbot from './AIChatbot';
import AICropAnalyzer from '../components/AICropAnalyzer';
import AIModelManager from '../components/AIModelManager';
import EditListingModal from '../components/EditListingModal';
import DashboardLayout from '../components/DashboardLayout';
import CropImage from '../components/CropImage';
import LiveDeliveryTracker from '../components/LiveDeliveryTracker';
import api from '../api/axios';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  BarChart, Bar, Legend, ComposedChart, Line
} from 'recharts';
import {
  LayoutDashboard, Plus, Bot, Eye, Brain, User, Package, BadgeCheck, Clock, Eye as EyeIcon, CloudSun,
  TrendingUp, ChevronRight, Pencil, Save, Check, ShoppingCart, Trash2, ArrowUpRight, ArrowDownRight,
  Search, Filter, SlidersHorizontal, RefreshCw, AlertTriangle, Calendar, Star, Sparkles,
  ShieldCheck, MapPin, Inbox, Info, Bell, CheckSquare, Settings as SettingsIcon, Play, Pause, Copy,
  Download, FileText, ExternalLink, Mail, Phone, Layers, BarChart3, Edit, Truck
} from 'lucide-react';

export default function FarmerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { listings, getMyListings, deleteListing, updateListing, addListing } = useListings();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [editingListing, setEditingListing] = useState(null);

  // Profile edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Orders, Notifications, Weather data states
  const [sellerOrders, setSellerOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    pendingOrdersCount: 0,
    completedOrdersCount: 0,
  });



  // Search & Filter states for listings
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [organicFilter, setOrganicFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Real Meteorological API State (Open-Meteo)
  // Weather data — null until real API response arrives
  const [weatherData, setWeatherData] = useState(null);

  // APMC prices — null until real API data is fetched
  const [apmcData, setApmcData] = useState(null);

  // Order tabs: Pending, Accepted, Packed, Shipped, Delivered, Cancelled
  const [orderActiveTab, setOrderActiveTab] = useState('pending');
  const [invoiceOrder, setInvoiceOrder] = useState(null); // Selected order for Invoice modal
  const [trackingFarmerOrder, setTrackingFarmerOrder] = useState(null); // Track shipped order on map

  // Inventory sub-tab: 'current' | 'low' | 'out' | 'expired' | 'upcoming'
  const [inventorySubTab, setInventorySubTab] = useState('current');

  useEffect(() => {
    if (!user || user.role !== 'farmer') {
      navigate('/login/farmer');
      return;
    }
    fetchDashboardData();
    fetchRealWeather();
  }, [user, navigate, listings]);

  // Dynamic Open-Meteo Weather API integration (zero API keys required)
  const fetchRealWeather = async () => {
    try {
      const lat = 13.34; // Fallback district coordinates (Karnataka center / Tumkur area)
      const lng = 77.10;

      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&relative_humidity_2m=true`);
      const data = await res.json();
      if (data && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature);
        const wind = Math.round(data.current_weather.windspeed);

        // Map weather code to description
        const code = data.current_weather.weathercode;
        let cond = 'Clear Sky';
        let forecast = 'Ideal for sowing';
        if (code > 0 && code <= 3) cond = 'Partly Cloudy';
        else if (code > 3 && code <= 48) cond = 'Foggy / Overcast';
        else if (code > 48 && code <= 67) { cond = 'Rainy'; forecast = 'Ideal for moisture retention'; }
        else if (code > 67) { cond = 'Thunderstorm'; forecast = 'Seek indoor storage protection'; }

        setWeatherData({
          temp: temp.toString(),
          humidity: data.current_weather.relative_humidity_2m ? `${data.current_weather.relative_humidity_2m}%` : '62%',
          rain: code > 48 ? '85%' : '15%',
          wind: `${wind} km/h`,
          forecast: forecast,
          condition: cond
        });
      }
    } catch (err) {
      console.error('Error fetching weather data:', err);
    }
  };

  useEffect(() => {
    const handleNewOrder = (e) => {
      console.log('New order received on Farmer Dashboard:', e.detail);
      fetchDashboardData();
    };
    window.addEventListener('new_order_placed', handleNewOrder);
    return () => window.removeEventListener('new_order_placed', handleNewOrder);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      let apiOrders = [];
      try {
        const ordersRes = await api.get('/orders/seller');
        apiOrders = ordersRes.data || [];
      } catch (e) {
        console.warn('API seller orders fetch failed:', e.message);
      }

      const localOrders = JSON.parse(localStorage.getItem('kisan_orders') || '[]');
      const combined = [...apiOrders, ...localOrders];

      // De-duplicate by _id
      const uniqueOrders = [];
      const seen = new Set();
      combined.forEach(o => {
        const key = o._id || o.orderId || o.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          uniqueOrders.push(o);
        }
      });

      setSellerOrders(uniqueOrders);
      
      let apiNotifs = [];
      try {
        const notifsRes = await api.get('/notifications');
        apiNotifs = (notifsRes.data || []).map(n => ({
          ...n,
          // Ensure dates are valid ISO strings
          createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString()
        }));
      } catch (_) {}

      setNotifications(apiNotifs);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfYear = new Date(today.getFullYear(), 0, 1);

      let todayRev = 0;
      let weekRev = 0;
      let monthRev = 0;
      let yearRev = 0;
      let pending = 0;
      let completed = 0;

      (uniqueOrders || []).forEach(order => {
        if (!order) return;
        const dateVal = order.createdAt || order.date;
        const orderDate = dateVal ? new Date(dateVal) : new Date();
        const validDate = isNaN(orderDate.getTime()) ? new Date() : orderDate;
        const isRevenueState = ['paid', 'shipped', 'delivered', 'received'].includes(order.status);
        const amount = Number(order.totalAmount) || 0;

        if (isRevenueState) {
          if (validDate >= today) todayRev += amount;
          if (validDate >= startOfWeek) weekRev += amount;
          if (validDate >= startOfMonth) monthRev += amount;
          if (validDate >= startOfYear) yearRev += amount;
        }

        if (order.status === 'pending') {
          pending++;
        } else if (['delivered', 'received'].includes(order.status)) {
          completed++;
        }
      });

      setDashboardStats({
        todayRevenue: todayRev,
        weeklyRevenue: weekRev,
        monthlyRevenue: monthRev,
        yearlyRevenue: yearRev,
        pendingOrdersCount: pending,
        completedOrdersCount: completed
      });

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handlePauseToggle = async (listing) => {
    try {
      const newStatus = listing.status === 'active' ? 'expired' : 'active';
      await updateListing(listing._id || listing.id, { ...listing, status: newStatus });
      alert(`Listing status updated to ${newStatus}`);
    } catch (err) {
      alert('Failed to update listing status');
    }
  };

  const handleDuplicateListing = async (listing) => {
    try {
      const duplicateData = {
        cropName: listing.cropName,
        variety: listing.variety,
        quantity: listing.quantity,
        unit: listing.unit,
        pricePerUnit: listing.pricePerUnit || listing.price,
        price: listing.pricePerUnit || listing.price,
        description: listing.description,
        isOrganic: listing.isOrganic,
        location: listing.location,
        harvestDate: new Date(),
      };
      await addListing(duplicateData);
      alert('Listing duplicated successfully!');
    } catch (err) {
      alert('Failed to duplicate listing');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      try {
        await api.put(`/orders/${orderId}/status`, { status: newStatus });
      } catch (e) {
        console.warn('API update order status failed, syncing locally:', e);
      }
      setSellerOrders(prev =>
        prev.map(o => (o._id === orderId || o.id === orderId || o.orderId === orderId) ? { ...o, status: newStatus } : o)
      );
      const localOrders = JSON.parse(localStorage.getItem('kisan_orders') || '[]');
      const updatedLocal = localOrders.map(o => (o._id === orderId || o.id === orderId || o.orderId === orderId) ? { ...o, status: newStatus } : o);
      localStorage.setItem('kisan_orders', JSON.stringify(updatedLocal));

      alert(`Order status updated to ${newStatus}`);
    } catch (err) {
      alert('Failed to update order status');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/all/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark notifications as read', err);
    }
  };

  const getMyListingsList = () => {
    return getMyListings(user?.name) || [];
  };

  const myListings = getMyListingsList();
  const activeCount = myListings.filter(l => l.status === 'active').length;
  const verifiedCount = myListings.filter(l => l.aiVerified || l.isVerified).length;
  const totalViews = myListings.reduce((sum, l) => sum + (l.views || 0), 0);

  const getShelfLife = (cropName) => {
    const name = cropName.toLowerCase();
    if (name.includes('tomato')) return '7 - 10 Days';
    if (name.includes('onion')) return '2 - 3 Months';
    if (name.includes('potato')) return '3 - 4 Months';
    if (name.includes('ragi') || name.includes('rice') || name.includes('wheat')) return '12 - 18 Months';
    if (name.includes('banana') || name.includes('mango')) return '5 - 7 Days';
    return '1 - 2 Weeks';
  };

  const getFilteredListings = () => {
    let result = [...myListings];

    if (searchTerm) {
      result = result.filter(l => l.cropName.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (statusFilter !== 'all') {
      result = result.filter(l => l.status === statusFilter);
    }

    if (verificationFilter !== 'all') {
      const wantVerified = verificationFilter === 'verified';
      result = result.filter(l => (l.aiVerified || l.isVerified) === wantVerified);
    }

    if (organicFilter !== 'all') {
      const wantOrganic = organicFilter === 'organic';
      result = result.filter(l => (l.isOrganic) === wantOrganic);
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.pricePerUnit || a.price) - (b.pricePerUnit || b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.pricePerUnit || b.price) - (a.pricePerUnit || a.price));
    } else if (sortBy === 'views') {
      result.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  };

  const filteredListings = getFilteredListings();
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  const paginatedListings = filteredListings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Filters for Inventory Tab categories
  const getInventoryCrops = () => {
    switch (inventorySubTab) {
      case 'low':
        return myListings.filter(l => l.quantity < 10 && l.quantity > 0);
      case 'out':
        return myListings.filter(l => l.quantity === 0);
      case 'expired':
        return myListings.filter(l => l.status === 'expired');
      case 'upcoming':
        return myListings.filter(l => new Date(l.harvestDate) > new Date());
      default:
        return myListings;
    }
  };

  const inventoryCrops = getInventoryCrops();

  // Build revenue chart data from REAL orders — safely handled
  const revenueChartData = (() => {
    const months = {};
    (sellerOrders || []).forEach(order => {
      if (!order) return;
      const isRevenueState = ['paid', 'shipped', 'delivered', 'received'].includes(order.status);
      if (!isRevenueState) return;
      const dateVal = order.createdAt || order.date;
      if (!dateVal) return;
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return; // Safe guard against Invalid Date RangeError
      const key = d.toLocaleString('en-US', { month: 'short' });
      if (!months[key]) months[key] = { name: key, revenue: 0, orders: 0 };
      months[key].revenue += (Number(order.totalAmount) || 0);
      months[key].orders += 1;
    });
    return Object.values(months);
  })();

  // Crop performance from REAL listing views and order counts
  const cropPerformanceData = (myListings || []).slice(0, 5).map(l => ({
    name: l.cropName || 'Crop',
    views: l.views || 0,
    sales: (sellerOrders || []).filter(o => o?.items?.[0]?.listing?._id === l._id || o?.items?.[0]?.listing === l._id).length
  }));

  const handleExportCSV = () => {
    if (revenueChartData.length === 0) {
      alert('No sales data available to export.');
      return;
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Month,Revenue,Orders\n";
    revenueChartData.forEach(row => {
      csvContent += `${row.name},${row.revenue},${row.orders}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Farmer_Sales_Report_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      role="farmer"
    >
      <div className="w-full max-w-7xl mx-auto pb-16 page-enter space-y-8 px-4 sm:px-6 lg:px-8">

        {/* ========================================================== */}
        {/* DASHBOARD HOME TAB */}
        {/* ========================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">

            {/* Header Title section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-100">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
                <p className="text-xs text-gray-500 font-medium">Real-time business performance and stock metrics</p>
              </div>
              <button
                onClick={() => setActiveTab('add')}
                className="bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
              >
                <Plus size={14} /> Add Crop
              </button>
            </div>

            {/* Minimal SaaS Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Earnings / Monthly Revenue */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[120px]">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Monthly Earnings</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">₹{dashboardStats.monthlyRevenue}</span>
                  <span className="text-xs text-[#22C55E] font-medium">Active</span>
                </div>
              </div>

              {/* Today's Revenue */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[120px]">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Today's Revenue</span>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">₹{dashboardStats.todayRevenue}</span>
                </div>
              </div>

              {/* Listings */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[120px]">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Crops Listed</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">{myListings.length}</span>
                  <span className="text-xs text-gray-400 font-medium">Items</span>
                </div>
              </div>

              {/* Orders */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between min-h-[120px]">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Pending Orders</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-orange-600">{dashboardStats.pendingOrdersCount}</span>
                  <span className="text-xs text-gray-400 font-medium">/{dashboardStats.completedOrdersCount} completed</span>
                </div>
              </div>

            </div>

            {/* Core Business Data Grid — Revenue Analytics & Recent Orders */}
            <div className="space-y-8">

              {/* Revenue Analytics — derived from real orders */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Revenue Analytics</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Sales value from completed orders</p>
                  </div>
                </div>

                {revenueChartData.length > 0 ? (
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="colorRevDash" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#166534" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                        <YAxis stroke="#a1a1aa" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#166534" fillOpacity={1} fill="url(#colorRevDash)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[180px] flex flex-col items-center justify-center text-center">
                    <TrendingUp size={28} className="text-gray-200 mb-3" />
                    <p className="text-xs font-bold text-gray-400">No revenue data yet</p>
                    <p className="text-[10px] text-gray-300 mt-1 max-w-xs">Revenue analytics will appear here once buyers complete orders for your listed crops.</p>
                  </div>
                )}
              </div>

              {/* Recent Orders Table */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Recent Orders</h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-bold text-[#166534] hover:underline"
                  >
                    View All Orders
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Crop</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-xs text-gray-600">
                      {sellerOrders.slice(0, 5).map((order) => (
                        <tr key={order._id} className="hover:bg-gray-50/50">
                          <td className="py-3 font-mono font-bold text-gray-400">#{order._id?.slice(-6)}</td>
                          <td className="py-3 font-bold text-gray-900">{order.items?.[0]?.listing?.cropName || 'Farm Stock'}</td>
                          <td className="py-3 font-bold">₹{order.totalAmount}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border
                              ${order.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                              ${['delivered', 'received'].includes(order.status) ? 'bg-green-50 text-[#166534] border-[#dcfce7]' : ''}
                              ${!['pending', 'delivered', 'received'].includes(order.status) ? 'bg-orange-50 text-orange-700 border-orange-100' : ''}
                            `}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 text-right text-gray-400 font-medium">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                        </tr>
                      ))}
                      {sellerOrders.length === 0 && (
                        <tr>
                          <td colSpan="5" className="text-center py-6 text-gray-400 italic">No purchase orders found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* MY LISTINGS TAB */}
        {/* ========================================================== */}
        {activeTab === 'listings' && (
          <div className="space-y-6">

            {/* Filter / Search Header */}
            <div className="bg-white rounded-[24px] border border-[#e5e7d0] p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-black text-[#166534]">Crop Listings Catalogue</h2>
                  <p className="text-xs text-gray-500 font-semibold mt-1">Manage and update active farm stock available for buyers</p>
                </div>
                <button
                  onClick={() => setActiveTab('add')}
                  className="ds-btn-primary bg-[#22C55E] hover:bg-[#166534] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer text-xs"
                >
                  <Plus size={16} /> Add Listing
                </button>
              </div>

              {/* Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                {/* Search */}
                <div className="relative md:col-span-2">
                  <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search crop stocks..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 hover:bg-white focus:bg-white text-sm font-semibold rounded-xl border border-gray-200 outline-none transition-all farmer-search"
                  />
                </div>

                {/* Status Filter */}
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full appearance-none pl-3.5 pr-8 py-3 bg-gray-50 hover:bg-white text-sm font-bold rounded-xl border border-gray-200 outline-none transition-all cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Paused/Expired</option>
                  </select>
                </div>

                {/* Verification */}
                <div className="relative">
                  <select
                    value={verificationFilter}
                    onChange={(e) => { setVerificationFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full appearance-none pl-3.5 pr-8 py-3 bg-gray-50 hover:bg-white text-sm font-bold rounded-xl border border-gray-200 outline-none transition-all cursor-pointer"
                  >
                    <option value="all">All Verification</option>
                    <option value="verified">AI Verified Only</option>
                    <option value="unverified">Unverified Only</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    className="w-full appearance-none pl-3.5 pr-8 py-3 bg-gray-50 hover:bg-white text-sm font-bold rounded-xl border border-gray-200 outline-none transition-all cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="views">Most Popular</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Listings Grid */}
            {loading ? (
              <LoadingSkeleton count={3} />
            ) : paginatedListings.length === 0 ? (
              <div className="bg-white rounded-[24px] border border-dashed border-[#e5e7d0] py-16 px-6 text-center space-y-4 shadow-sm">
                <div className="text-5xl">🌾</div>
                <h3 className="text-lg font-black text-gray-900">No matching crop listings</h3>
                <p className="text-xs text-gray-500 font-semibold max-w-sm mx-auto">Try updating your filters or search terms above to find active stocks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedListings.map((listing) => {
                  const isVerified = listing.aiVerified || listing.isVerified;
                  const price = listing.pricePerUnit ?? listing.price;
                  const photo = listing.images?.[0]?.url || listing.photo || null;
                  const locationStr = typeof listing.location === 'object'
                    ? `${listing.location?.district || ''}, ${listing.location?.state || ''}`
                    : (listing.location || '');

                  return (
                    <div
                      key={listing._id || listing.id}
                      className="bg-white rounded-[24px] border border-[#e5e7d0] overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between listing-card-hover group relative"
                    >
                      {/* Image Frame */}
                      <div className="relative h-48 overflow-hidden bg-gray-50">
                        <CropImage cropName={listing.cropName} photo={photo} size="md" className="group-hover:scale-105 transition-transform duration-500 w-full h-full object-cover" />

                        {/* Tags */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                          {listing.isOrganic && (
                            <span className="bg-[#84CC16] text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md">
                              Organic 🌿
                            </span>
                          )}
                          {isVerified && (
                            <span className="bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md flex items-center gap-0.5">
                              <ShieldCheck size={10} /> AI Verified
                            </span>
                          )}
                          <span className={`text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md
                            ${listing.status === 'active' ? 'bg-[#22C55E]' : 'bg-gray-500'}
                          `}>
                            {listing.status === 'active' ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        {/* Price badge */}
                        <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-gray-100 shadow-md">
                          <span className="text-sm font-black text-[#166534]">₹{price}</span>
                          <span className="text-[10px] font-bold text-gray-400">/{listing.unit === 'quintal' ? 'q' : 'kg'}</span>
                        </div>
                      </div>

                      {/* Info body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h4 className="text-base font-black text-gray-900">🌾 {listing.cropName}</h4>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border flex items-center gap-1 ${listing.aiVerified || listing.isVerified
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-gray-50 text-gray-500 border-gray-200'
                              }`}>
                              {listing.aiVerified || listing.isVerified ? (
                                <><BadgeCheck size={12} className="text-emerald-600" /> AI Verified ✓</>
                              ) : (
                                <>Grade {listing.verificationReport?.qualityGrade || 'B'}</>
                              )}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-medium line-clamp-2">
                            {listing.description || 'Premium harvest stock available for bulk transport.'}
                          </p>

                          {/* Attribute details */}
                          <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-bold text-gray-500">
                            <div>Stock: <span className="text-gray-900 font-black">{listing.quantity} {listing.unit}</span></div>
                            <div>Region: <span className="text-gray-900 font-black">{locationStr || 'Karnataka'}</span></div>
                            <div>Shelf Life: <span className="text-gray-900 font-black">{getShelfLife(listing.cropName)}</span></div>
                            <div>Harvested: <span className="text-gray-900 font-black">{listing.harvestDate ? new Date(listing.harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}</span></div>
                          </div>
                        </div>

                        {/* Views / Saved statistics row */}
                        <div className="pt-3 border-t border-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1"><Eye size={12} /> {listing.views || 0} views</span>
                          <span className="flex items-center gap-1"><Star size={12} /> {listing.savedBy?.length || 0} wishlists</span>
                        </div>

                        {/* Action buttons (6) */}
                        <div className="grid grid-cols-2 gap-2 pt-1.5">
                          <button
                            onClick={() => navigate(`/listing/${listing._id || listing.id}`)}
                            className="py-2.5 bg-gray-50 hover:bg-[#FFFDF5] border border-gray-200 text-[#166534] rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            View
                          </button>
                          <button
                            onClick={() => setEditingListing(listing)}
                            className="py-2.5 bg-gray-50 hover:bg-[#FFFDF5] border border-gray-200 text-blue-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setActiveTab('analyzer')}
                            className="py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <ShieldCheck size={12} className="text-emerald-600" /> Verify with AI
                          </button>
                          <button
                            onClick={() => handlePauseToggle(listing)}
                            className={`py-2.5 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1
                              ${listing.status === 'active'
                                ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                                : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              }
                            `}
                          >
                            {listing.status === 'active' ? <Pause size={10} /> : <Play size={10} />}
                            {listing.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => handleDuplicateListing(listing)}
                            className="py-2.5 bg-gray-50 hover:bg-[#FFFDF5] border border-gray-200 text-[#84CC16] rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1 col-span-2"
                          >
                            <Copy size={10} /> Duplicate Listing
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this listing?")) {
                                deleteListing(listing._id || listing.id);
                              }
                            }}
                            className="py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer col-span-2 flex items-center justify-center gap-1"
                          >
                            <Trash2 size={12} /> Delete Catalogue Item
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-6">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx + 1)}
                    className={`w-8 h-8 rounded-lg border text-xs font-black transition-all cursor-pointer
                      ${currentPage === idx + 1
                        ? 'bg-[#166534] border-[#166534] text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }
                    `}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            )}

          </div>
        )}

        {/* ========================================================== */}
        {/* ADD NEW CROP TAB */}
        {/* ========================================================== */}
        {activeTab === 'add' && (
          <AddListingPage onSuccess={() => setActiveTab('listings')} />
        )}

        {/* ========================================================== */}
        {/* ORDERS TAB */}
        {/* ========================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-zinc-900 tracking-tight">Sales Orders</h2>
                <p className="text-xs text-zinc-400 font-medium mt-1">Manage and track all incoming orders.</p>
              </div>
              <button
                onClick={() => fetchDashboardData()}
                className="flex items-center gap-2 px-4 py-2 bg-[#166534] hover:bg-[#14532d] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shrink-0 whitespace-nowrap"
              >
                <RefreshCw size={14} /> Refresh Orders
              </button>
            </div>

            {/* Pipeline Status Cards — Compact Centered Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                { id: 'pending',   label: 'Pending',   emoji: '🕐', activeBg: 'bg-orange-50',  activeBorder: 'border-orange-400',  activeText: 'text-orange-700',  countBg: 'bg-orange-500' },
                { id: 'accepted',  label: 'Accepted',  emoji: '✅', activeBg: 'bg-blue-50',    activeBorder: 'border-blue-400',    activeText: 'text-blue-700',    countBg: 'bg-blue-500' },
                { id: 'packed',    label: 'Packed',    emoji: '📦', activeBg: 'bg-purple-50',  activeBorder: 'border-purple-400',  activeText: 'text-purple-700',  countBg: 'bg-purple-500' },
                { id: 'shipped',   label: 'Shipped',   emoji: '🚚', activeBg: 'bg-indigo-50',  activeBorder: 'border-indigo-400',  activeText: 'text-indigo-700',  countBg: 'bg-indigo-500' },
                { id: 'delivered', label: 'Delivered', emoji: '🎉', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-400', activeText: 'text-emerald-700', countBg: 'bg-emerald-500' },
                { id: 'cancelled', label: 'Cancelled', emoji: '❌', activeBg: 'bg-red-50',     activeBorder: 'border-red-400',     activeText: 'text-red-700',     countBg: 'bg-red-500' },
              ].map((tab) => {
                const count = sellerOrders.filter(o => o.status === tab.id).length;
                const isActive = orderActiveTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setOrderActiveTab(tab.id)}
                    className={`relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border transition-all cursor-pointer text-center ${
                      isActive
                        ? `${tab.activeBg} ${tab.activeBorder} shadow-sm font-black`
                        : 'bg-white border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="text-lg">{tab.emoji}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? tab.activeText : 'text-zinc-500'}`}>
                      {tab.label}
                    </span>
                    {count > 0 && (
                      <span className={`absolute -top-1.5 -right-1.5 text-[9px] font-black text-white px-2 py-0.5 rounded-full shadow-xs ${tab.countBg}`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Orders List */}
            {(() => {
              const filteredOrders = sellerOrders.filter(o => o.status === orderActiveTab);
              if (filteredOrders.length === 0) {
                return (
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-16 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingCart size={28} className="text-gray-300" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-400">No {orderActiveTab} orders</p>
                      <p className="text-xs text-gray-300 mt-1">Orders placed by buyers will appear here once they reach the <span className="font-bold">{orderActiveTab}</span> stage.</p>
                    </div>
                    <button
                      onClick={() => fetchDashboardData()}
                      className="mt-2 flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      <RefreshCw size={13} /> Refresh Now
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const rawDate = order.createdAt || order.date;
                    const parsedDate = rawDate ? new Date(rawDate) : null;
                    const formattedDate = parsedDate && !isNaN(parsedDate.getTime())
                      ? parsedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Date not recorded';

                    const cropName = order.items?.[0]?.listing?.cropName || order.items?.[0]?.cropName || 'Crop Item';
                    const qty = order.items?.[0]?.quantity || order.items?.reduce((s, i) => s + (i.quantity || 0), 0) || 1;
                    const buyerName = order.buyer?.name || order.buyerName || 'Buyer';
                    const buyerPhone = order.buyer?.phone || order.buyerPhone || '';

                    const statusConfig = {
                      pending:   { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
                      accepted:  { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500' },
                      packed:    { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
                      shipped:   { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
                      delivered: { bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',dot: 'bg-emerald-500' },
                      cancelled: { bg: 'bg-red-50',     text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500' },
                    };
                    const sc = statusConfig[order.status] || statusConfig.pending;

                    return (
                      <Fragment key={order._id || order.orderId}>
                      <div className="bg-white rounded-[20px] border border-zinc-100 shadow-[0_1px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden p-5 space-y-4">

                        {/* Card Top Strip */}
                        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                          <div className="flex items-center gap-3">
                            <div className="font-mono text-xs text-zinc-400 font-bold">
                              #{(order._id || order.orderId)?.slice(-8) || 'N/A'}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-semibold">
                            <Calendar size={11} />
                            {formattedDate}
                          </div>
                        </div>

                        {/* Card Body Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">

                          {/* Buyer Info */}
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Buyer</p>
                            <p className="text-xs font-black text-zinc-900">{buyerName}</p>
                            {buyerPhone && (
                              <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                <Phone size={10} /> {buyerPhone}
                              </p>
                            )}
                          </div>

                          {/* Crop */}
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Crop</p>
                            <p className="text-xs font-bold text-zinc-800">🌾 {cropName}</p>
                            <p className="text-[11px] text-zinc-500 font-medium">{qty} units</p>
                          </div>

                          {/* Amount */}
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total</p>
                            <p className="text-base font-black text-[#166534]">₹{order.totalAmount || 0}</p>
                            <p className="text-[10px] text-zinc-400 font-medium uppercase">{order.paymentMethod || 'COD'}</p>
                          </div>

                          {/* Action Buttons (Compact & Sleek) */}
                          <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'accepted')}
                                className="min-h-[36px] px-3.5 py-1.5 bg-[#166534] hover:bg-[#14532d] text-white rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                              >
                                <Check size={13} /> Accept Order
                              </button>
                            )}
                            {order.status === 'accepted' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'packed')}
                                className="min-h-[36px] px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                              >
                                Mark Packed
                              </button>
                            )}
                            {order.status === 'packed' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'shipped')}
                                className="min-h-[36px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                              >
                                Mark Shipped
                              </button>
                            )}
                            {order.status === 'shipped' && (
                              <button
                                onClick={() => setTrackingFarmerOrder(order._id === trackingFarmerOrder ? null : order._id)}
                                className="min-h-[36px] px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-xs whitespace-nowrap"
                              >
                                <Truck size={13} /> Track on Map
                              </button>
                            )}
                            {!['delivered', 'cancelled'].includes(order.status) && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order._id, 'cancelled')}
                                className="min-h-[36px] px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={() => setInvoiceOrder(order)}
                              className="min-h-[36px] px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 rounded-lg font-bold text-xs transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
                            >
                              <FileText size={12} /> Invoice
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* INLINE LIVE MAP for shipped orders */}
                      {order.status === 'shipped' && trackingFarmerOrder === order._id && (
                        <div className="mt-4 border border-blue-100 rounded-2xl overflow-hidden bg-blue-50/30">
                          <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100 bg-white">
                            <div className="flex items-center gap-2">
                              <Truck size={15} className="text-blue-600" />
                              <span className="text-xs font-black text-blue-900 uppercase tracking-wider">Live Route: Farm {'->'} Buyer</span>
                            </div>
                            <button
                              onClick={() => setTrackingFarmerOrder(null)}
                              className="text-xs text-zinc-400 hover:text-zinc-700 font-bold px-2 py-1 rounded-lg hover:bg-zinc-100 transition-all"
                            >
                              Close Map x
                            </button>
                          </div>
                          <div className="p-4">
                            <LiveDeliveryTracker order={order} onClose={() => setTrackingFarmerOrder(null)} />
                          </div>
                        </div>
                      )}
                      </Fragment>
                    );
                  })}
                </div>
              );
            })()}

          </div>
        )}

        {/* ========================================================== */}

        {/* ========================================================== */}
        {/* ANALYTICS TAB */}
        {/* ========================================================== */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">

            {/* Header info */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">Interactive Analytics Dashboard</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">Review revenue curves, top crop categories, and monthly sales logs.</p>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Download size={14} /> Export CSV Report
              </button>
            </div>

            {/* Stats block */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Today's Earnings</span>
                <span className="text-2xl font-black mt-2 text-gray-900">₹{dashboardStats.todayRevenue}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Weekly Earnings</span>
                <span className="text-2xl font-black mt-2 text-gray-900">₹{dashboardStats.weeklyRevenue}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Monthly Earnings</span>
                <span className="text-2xl font-black mt-2 text-gray-900">₹{dashboardStats.monthlyRevenue}</span>
              </div>
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Yearly Earnings</span>
                <span className="text-2xl font-black mt-2 text-gray-900">₹{dashboardStats.yearlyRevenue}</span>
              </div>
            </div>

            {/* Recharts Layout — all driven by real order data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Revenue Curve */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly Revenue Curve</h3>
                <div className="h-[260px] w-full">
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#166534" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                        <YAxis stroke="#a1a1aa" fontSize={10} />
                        <Tooltip />
                        <Area type="monotone" dataKey="revenue" stroke="#166534" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <TrendingUp size={28} className="text-gray-200 mb-3" />
                      <p className="text-xs font-bold text-gray-400">No revenue data yet</p>
                      <p className="text-[10px] text-gray-300 mt-1 max-w-xs">Revenue will populate as buyers complete orders.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Crop views / sales */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Listed Crop Performance</h3>
                <div className="h-[260px] w-full">
                  {cropPerformanceData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={cropPerformanceData}>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                        <YAxis stroke="#a1a1aa" fontSize={10} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="views" fill="#84CC16" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="sales" fill="#166534" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <Package size={28} className="text-gray-200 mb-3" />
                      <p className="text-xs font-bold text-gray-400">No crop performance data</p>
                      <p className="text-[10px] text-gray-300 mt-1 max-w-xs">Add crop listings to see views and sales metrics here.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Ratings Distribution — empty state until backend provides review data */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Customer Ratings Distribution</h3>
                <div className="h-[220px] w-full flex flex-col items-center justify-center text-center">
                  <Star size={28} className="text-gray-200 mb-3" />
                  <p className="text-xs font-bold text-gray-400">No ratings data available</p>
                  <p className="text-[10px] text-gray-300 mt-1 max-w-xs">Customer ratings will appear here once buyers submit reviews on delivered orders.</p>
                </div>
              </div>

              {/* Demand Trend Tracker */}
              <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Demand Trend Tracker</h3>
                <div className="h-[220px] w-full">
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <ComposedChart data={revenueChartData}>
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} />
                        <YAxis stroke="#a1a1aa" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="orders" fill="#e4e4e7" radius={[4, 4, 0, 0]} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-10">
                      <BarChart3 size={28} className="text-gray-200 mb-3" />
                      <p className="text-xs font-bold text-gray-400">No demand data yet</p>
                      <p className="text-[10px] text-gray-300 mt-1 max-w-xs">Order volume trends will populate here as sales activity grows.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================== */}
        {/* NOTIFICATIONS TAB */}
        {/* ========================================================== */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-[24px] border border-[#e5e7d0] p-6 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-[#166534]">Farmer Notifications</h2>
                <p className="text-xs text-gray-500 font-semibold mt-1">Real-time alerts, orders, and quality verification approvals</p>
              </div>
              <button
                onClick={markAllAsRead}
                className="text-xs font-black text-[#166534] hover:underline"
              >
                Mark all as read
              </button>
            </div>

            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-4 rounded-2xl border flex items-start gap-3.5 transition-all
                    ${n.isRead
                      ? 'bg-gray-50 border-gray-200 opacity-70'
                      : 'bg-[#FFFDF5] border-[#e5e7d0] shadow-sm'
                    }
                  `}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                    ${n.isRead ? 'bg-gray-200 text-gray-500' : 'bg-[#f0fdf4] text-[#166534] border border-[#dcfce7]'}
                  `}>
                    <Bell size={16} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className={`text-xs leading-relaxed ${n.isRead ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>
                      {n.message}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {new Date(n.createdAt).toLocaleDateString('en-IN', { hour: 'numeric', minute: 'numeric', day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <div className="text-center py-12 text-gray-400 italic">No notifications found</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* SETTINGS TAB */}
        {/* ========================================================== */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-[24px] border border-[#e5e7d0] p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-2xl font-black text-[#166534]">Portal Settings</h2>
              <p className="text-xs text-gray-500 font-semibold mt-1">Configure language preference, location defaults, and notifications.</p>
            </div>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Language Preferences</label>
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider bg-[#FFFDF5] border-[#166534] text-[#166534]">English</button>
                  <button className="flex-1 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider bg-white border-gray-200 text-gray-500">ಕನ್ನಡ (Kannada)</button>
                  <button className="flex-1 py-2.5 border rounded-xl text-xs font-black uppercase tracking-wider bg-white border-gray-200 text-gray-500">हिंदी (Hindi)</button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">SMS Notification Alerts</label>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700">
                  <CheckSquare size={16} className="text-[#166534]" />
                  <span>Receive SMS notifications for new buyer order requests</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* CROP HEALTH ANALYZER TAB */}
        {/* ========================================================== */}
        {activeTab === 'analyzer' && (
          <AICropAnalyzer />
        )}

        {/* ========================================================== */}
        {/* AI ASSISTANT TAB */}
        {/* ========================================================== */}
        {activeTab === 'assistant' && (
          <AIChatbot />
        )}

        {/* ========================================================== */}
        {/* PROFILE TAB */}
        {/* ========================================================== */}
        {activeTab === 'profile' && (
          <div className="space-y-8">

            {/* SUCCESS BANNER */}
            {saveSuccess && (
              <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-sm animate-pulse">
                <div className="w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0">
                  <Check size={18} />
                </div>
                <span className="text-sm font-black text-emerald-800">Profile updated successfully!</span>
              </div>
            )}

            {/* PREMIUM PROFILE HERO CARD */}
            <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-xl overflow-hidden">

              {/* Cover Banner */}
              <div className="h-52 bg-gradient-to-br from-[#052e16] via-[#166534] to-[#15803d] relative overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:18px_18px]" />
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute top-5 right-6 flex items-center gap-2 text-emerald-300/80 text-xs font-black uppercase tracking-widest">
                  <ShieldCheck size={14} /> Kisan Verified Portal
                </div>
              </div>

              {/* Avatar + Name Row */}
              <div className="px-8 pb-8 relative">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-14 gap-6">

                  {/* Avatar */}
                  <div className="flex items-end gap-5">
                    <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#22C55E] to-[#166534] border-4 border-white shadow-2xl flex items-center justify-center text-4xl font-black text-white relative z-10 shrink-0">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="Profile" className="w-full h-full object-cover rounded-3xl" />
                      ) : (
                        <span>{user?.name?.charAt(0)?.toUpperCase() || 'F'}</span>
                      )}
                    </div>
                    <div className="pb-2 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight">{user?.name}</h2>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border-2 border-emerald-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
                          <Check size={11} /> Verified Farmer
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 font-semibold">
                        📍 {typeof user?.location === 'object'
                          ? `${user.location?.district || ''}, ${user.location?.state || ''}`
                          : user?.location || 'Location not set'}
                      </p>
                      <p className="text-xs text-gray-400 font-medium">
                        🌾 Primary: {user?.farmerProfile?.primaryCrops?.join(', ') || user?.primaryCrops || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Edit button */}
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setEditForm({
                          name: user?.name || '',
                          phone: user?.phone || '',
                          email: user?.email || '',
                          farmSize: user?.farmerProfile?.farmSize || user?.farmSize || '',
                          primaryCrops: user?.farmerProfile?.primaryCrops?.join(', ') || user?.primaryCrops || '',
                          district: user?.location?.district || '',
                          state: user?.location?.state || '',
                          experience: user?.farmerProfile?.experience || '',
                          bio: user?.farmerProfile?.bio || '',
                        });
                        setIsEditing(true);
                        setSaveSuccess(false);
                      }}
                      className="flex items-center gap-2 px-5 py-3 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95 border-2 border-[#166534]"
                    >
                      <Edit size={15} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

              {/* LEFT COLUMN: Edit Form or Details View */}
              <div className="lg:col-span-2 space-y-6">

                {isEditing ? (
                  /* ─── EDIT FORM ─────────────────────────────── */
                  <div className="bg-white rounded-3xl border-2 border-[#E8F7EE] shadow-xl p-8 space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b-2 border-gray-100">
                      <div>
                        <h3 className="text-lg font-black text-gray-900">Edit Profile</h3>
                        <p className="text-xs text-gray-400 font-semibold mt-0.5">All changes will be saved to your account</p>
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[10px] font-black uppercase tracking-wider">Editing Mode</span>
                    </div>

                    {/* Personal Info Section */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Personal Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Full Name</label>
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="Your full name"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Phone Number</label>
                          <input
                            type="tel"
                            value={editForm.phone || ''}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="+91 XXXXXXXXXX"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Email Address</label>
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="your@email.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Years of Experience</label>
                          <input
                            type="number"
                            value={editForm.experience || ''}
                            onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="e.g. 8"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location Section */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">District</label>
                          <input
                            type="text"
                            value={editForm.district || ''}
                            onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="e.g. Chickmagalur"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">State</label>
                          <input
                            type="text"
                            value={editForm.state || ''}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="e.g. Karnataka"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Farm Details Section */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Farm Details</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Farm Size (acres)</label>
                          <input
                            type="text"
                            value={editForm.farmSize || ''}
                            onChange={(e) => setEditForm({ ...editForm, farmSize: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="e.g. 24"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-black text-gray-600">Primary Crops (comma-separated)</label>
                          <input
                            type="text"
                            value={editForm.primaryCrops || ''}
                            onChange={(e) => setEditForm({ ...editForm, primaryCrops: e.target.value })}
                            className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all placeholder:text-gray-300"
                            placeholder="e.g. Ragi, Tomato, Onion"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bio Section */}
                    <div className="space-y-1.5">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bio / About</h4>
                      <textarea
                        value={editForm.bio || ''}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-2xl bg-gray-50 focus:bg-white text-sm font-semibold outline-none focus:ring-4 focus:ring-[#22C55E]/10 focus:border-[#22C55E] transition-all resize-none placeholder:text-gray-300"
                        placeholder="Tell buyers about your farm, cultivation practices, and certifications..."
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2 border-t-2 border-gray-100">
                      <button
                        onClick={async () => {
                          try {
                            setSaving(true);
                            await updateProfile({
                              name: editForm.name,
                              phone: editForm.phone,
                              email: editForm.email,
                              location: { district: editForm.district, state: editForm.state },
                              farmerProfile: {
                                farmSize: editForm.farmSize,
                                primaryCrops: editForm.primaryCrops.split(',').map(c => c.trim()).filter(Boolean),
                                experience: editForm.experience,
                                bio: editForm.bio,
                              },
                            });
                            setSaveSuccess(true);
                            setIsEditing(false);
                            setTimeout(() => setSaveSuccess(false), 4000);
                          } catch (err) {
                            alert(err.message || 'Failed to save profile. Please try again.');
                          } finally {
                            setSaving(false);
                          }
                        }}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#166534] hover:bg-[#14532d] text-white rounded-2xl text-xs font-black tracking-widest uppercase transition-all shadow-lg cursor-pointer disabled:opacity-50 border-2 border-[#166534] hover:scale-[1.02] active:scale-95"
                      >
                        {saving ? (
                          <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving...</span>
                        ) : (
                          <><Save size={15} /> Save All Changes</>
                        )}
                      </button>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-8 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-black tracking-widest uppercase transition-all cursor-pointer border-2 border-gray-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                ) : (
                  /* ─── VIEW MODE ─────────────────────────────── */
                  <div className="bg-white rounded-3xl border-2 border-gray-200 shadow-lg overflow-hidden">
                    <div className="px-8 pt-7 pb-4 border-b-2 border-gray-100 flex items-center justify-between">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Farmer Profile Details</h3>
                      <button
                        onClick={() => {
                          setEditForm({
                            name: user?.name || '',
                            phone: user?.phone || '',
                            email: user?.email || '',
                            farmSize: user?.farmerProfile?.farmSize || user?.farmSize || '',
                            primaryCrops: user?.farmerProfile?.primaryCrops?.join(', ') || user?.primaryCrops || '',
                            district: user?.location?.district || '',
                            state: user?.location?.state || '',
                            experience: user?.farmerProfile?.experience || '',
                            bio: user?.farmerProfile?.bio || '',
                          });
                          setIsEditing(true);
                          setSaveSuccess(false);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border-2 border-[#dcfce7] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                      >
                        <Edit size={13} /> Edit Details
                      </button>
                    </div>

                    <div className="divide-y-2 divide-gray-100">
                      {[
                        { label: 'Full Name', value: user?.name },
                        { label: 'Email', value: user?.email },
                        { label: 'Phone', value: user?.phone || 'Not provided' },
                        { label: 'Location', value: typeof user?.location === 'object' ? `${user?.location?.district || ''}, ${user?.location?.state || ''}` : user?.location || 'Not set' },
                        { label: 'Farm Size', value: `${user?.farmerProfile?.farmSize || user?.farmSize || '—'} Acres` },
                        { label: 'Primary Crops', value: user?.farmerProfile?.primaryCrops?.join(', ') || user?.primaryCrops || 'Not specified' },
                        { label: 'Experience', value: user?.farmerProfile?.experience ? `${user.farmerProfile.experience} Years` : '8 Years' },
                        { label: 'Bio / About', value: user?.farmerProfile?.bio || 'Dedicated local cultivator focusing on high-density organic produce.' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-start justify-between gap-4 px-8 py-4">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest w-32 shrink-0 pt-0.5">{label}</span>
                          <span className="text-sm font-semibold text-gray-800 text-right flex-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QUICK STATS ROW */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-center shadow-sm">
                    <span className="block text-2xl font-black text-[#166534]">{myListings?.length || 0}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Listings</span>
                  </div>
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-center shadow-sm">
                    <span className="block text-2xl font-black text-[#166534]">{sellerOrders?.filter(o => ['delivered','received'].includes(o.status))?.length || 0}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Completed</span>
                  </div>
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-5 text-center shadow-sm">
                    <span className="block text-2xl font-black text-orange-600">{sellerOrders?.filter(o => o.status === 'pending')?.length || 0}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pending</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Buyer Reviews */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border-2 border-gray-200 p-7 shadow-lg space-y-5">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Buyer Reviews</h4>
                  <div className="flex flex-col items-center justify-center text-center py-10 space-y-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                      <Star size={28} className="text-gray-300" />
                    </div>
                    <p className="text-sm font-black text-gray-400">No buyer reviews yet</p>
                    <p className="text-xs text-gray-300 max-w-[180px] leading-relaxed">Reviews will appear here once buyers rate your delivered orders.</p>
                  </div>
                </div>

                {/* Verification Badge Card */}
                <div className="bg-gradient-to-br from-[#052e16] to-[#166534] rounded-3xl border-2 border-emerald-700 p-7 text-white space-y-3 shadow-xl">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
                    <ShieldCheck size={26} className="text-emerald-300" />
                  </div>
                  <h4 className="font-black text-base">Verified Farmer</h4>
                  <p className="text-xs text-emerald-200 font-medium leading-relaxed">
                    Your account is verified on the KisanBazaar Direct-to-Buyer platform. Buyers trust your listings.
                  </p>
                  <div className="pt-2 border-t border-white/15 text-[10px] font-black text-emerald-300 uppercase tracking-widest">
                    ✓ Identity Verified &nbsp;|&nbsp; ✓ Active Seller
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

      </div>

      {/* Invoice Modal Popup */}
      {invoiceOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 md:p-8 max-w-lg w-full border border-gray-200 shadow-2xl relative space-y-6">
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-widest pb-3 border-b border-gray-100">
              Tax Invoice Certificate
            </h3>

            {/* Invoice Details */}
            <div className="space-y-4 text-xs text-gray-600 font-medium">
              <div className="flex justify-between">
                <span>Invoice ID:</span>
                <span className="font-bold text-gray-900">#INV-{invoiceOrder._id?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Order Date:</span>
                <span className="font-bold text-gray-900">{new Date(invoiceOrder.createdAt).toLocaleDateString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Buyer Account:</span>
                <span className="font-bold text-gray-900">{invoiceOrder.buyer?.name || 'Buyer Partner'}</span>
              </div>

              <div className="pt-4 border-t border-gray-50 flex justify-between font-bold text-gray-900">
                <span>Crop Product</span>
                <span>Subtotal</span>
              </div>
              <div className="flex justify-between">
                <span>🌾 {invoiceOrder.items?.[0]?.listing?.cropName || 'Farm Crop'} x {invoiceOrder.items?.[0]?.quantity || 1} units</span>
                <span className="font-bold text-gray-900">₹{invoiceOrder.totalAmount}</span>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between text-sm font-black text-gray-900">
                <span>Total Amount Due</span>
                <span>₹{invoiceOrder.totalAmount}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Print Invoice
              </button>
              <button
                onClick={() => setInvoiceOrder(null)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Listing Modal */}
      {editingListing && (
        <EditListingModal
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSave={updateListing}
        />
      )}
    </DashboardLayout>
  );
}
