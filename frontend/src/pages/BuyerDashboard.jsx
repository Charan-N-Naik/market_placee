import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useListings } from '../context/ListingContext';
import { useCart } from '../context/CartContext';
import CropCard from '../components/CropCard';
import CheckoutModal from '../components/CheckoutModal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import AIChatbot from './AIChatbot';
import AICropAnalyzer from '../components/AICropAnalyzer';
import DashboardLayout from '../components/DashboardLayout';
import IndiaCropMap from '../components/IndiaCropMap';
import CropImage from '../components/CropImage';
import api from '../api/axios';
import {
  Search, Heart, Bot, Eye, User, Sparkles,
  ShoppingBag, Bookmark, Filter, X, ArrowRight, ShoppingCart, Pencil, Save, Check,
  CloudSun, TrendingUp, Bell, MapPin, ShieldCheck, RefreshCw, Star, Layers, Package,
  Phone, Info, CheckCircle2, ChevronRight, SlidersHorizontal, ArrowUpRight,
  Trash2, Camera, Globe, Settings, CreditCard, Mic
} from 'lucide-react';
import { locations, cropOptions } from '../data/mockData';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 text-red-900 min-h-screen">
          <h2 className="text-xl font-bold">Buyer Dashboard Error:</h2>
          <pre className="mt-2 text-xs font-mono">{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BuyerDashboard() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const toggleLanguage = () => {
    const newLang = lang.startsWith('en') ? 'kn' : 'en';
    i18n.changeLanguage(newLang);
  };
  const { user, logout, updateProfile } = useAuth();
  const { listings, toggleSaved, isSaved, savedListings, fetchListings } = useListings();
  const { cartItemsCount, addToCart } = useCart();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterOrganic, setFilterOrganic] = useState(false);
  const [filterVerified, setFilterVerified] = useState(false);
  const [sortBy, setSortBy] = useState('newest');

  // Checkout Modal State
  const [activeCheckoutListing, setActiveCheckoutListing] = useState(null);

  // Voice & Image Search State
  const [isListening, setIsListening] = useState(false);
  const imageInputRef = React.useRef(null);

  const handleVoiceCommand = (transcript) => {
    const cmd = transcript.toLowerCase().trim();
    // ── Navigation intent map ──────────────────────────────────────────────
    const navMap = [
      { keys: ['order', 'orders', 'pending', 'my order', 'track'], action: () => { navigate('/buyer/pending-orders'); showToast(`🎙 "${transcript}" → Orders`); } },
      { keys: ['cart', 'basket', 'checkout', 'my cart'], action: () => { navigate('/cart'); showToast(`🎙 "${transcript}" → Cart`); } },
      { keys: ['weather', 'forecast', 'rain', 'temperature', 'climate'], action: () => { navigate('/weather'); showToast(`🎙 "${transcript}" → Weather`); } },
      { keys: ['market price', 'market', 'mandi', 'price', 'rates', 'apmc'], action: () => { navigate('/market-prices'); showToast(`🎙 "${transcript}" → Market Prices`); } },
      { keys: ['wishlist', 'wish list', 'favourite', 'favorite', 'liked'], action: () => { setActiveTab('wishlist'); showToast(`🎙 "${transcript}" → Wishlist`); } },
      { keys: ['saved', 'saved listing', 'bookmark'], action: () => { setActiveTab('saved'); showToast(`🎙 "${transcript}" → Saved Listings`); } },
      { keys: ['notification', 'alert', 'updates'], action: () => { setActiveTab('notifications'); showToast(`🎙 "${transcript}" → Notifications`); } },
      { keys: ['profile', 'account', 'my profile', 'settings'], action: () => { setActiveTab('profile'); showToast(`🎙 "${transcript}" → Profile`); } },
      { keys: ['assistant', 'ai', 'chatbot', 'chat', 'help', 'bot'], action: () => { setActiveTab('assistant'); showToast(`🎙 "${transcript}" → AI Assistant`); } },
      { keys: ['analyzer', 'analyse', 'analyze', 'verify', 'crop verify', 'verification'], action: () => { setActiveTab('analyzer'); showToast(`🎙 "${transcript}" → Crop Verification`); } },
      { keys: ['dashboard', 'home', 'main', 'overview'], action: () => { setActiveTab('dashboard'); showToast(`🎙 "${transcript}" → Dashboard`); } },
      { keys: ['browse', 'shop', 'marketplace', 'listing', 'buy', 'search', 'find', 'show me'], action: () => {
        // Extract what comes after action words for search
        const searchTermMatch = cmd.match(/(?:find|search|show me|buy|browse|shop for|looking for)\s+(.+)/);
        if (searchTermMatch) {
          setSearchQuery(searchTermMatch[1]);
        }
        setActiveTab('browse');
        showToast(`🎙 "${transcript}" → Browse`);
      }},
    ];

    // ── Kannada navigation keywords ────────────────────────────────────────
    const kannadaMap = [
      { keys: ['ಆರ್ಡರ್', 'ಆದೇಶ'], action: () => { navigate('/buyer/pending-orders'); showToast(`🎙 ಆರ್ಡರ್‌ಗಳು`); } },
      { keys: ['ಕಾರ್ಟ್', 'ಬುಟ್ಟಿ'], action: () => { navigate('/cart'); showToast(`🎙 ಕಾರ್ಟ್`); } },
      { keys: ['ಹವಾಮಾನ', 'ಮಳೆ'], action: () => { navigate('/weather'); showToast(`🎙 ಹವಾಮಾನ`); } },
      { keys: ['ಮಾರುಕಟ್ಟೆ', 'ಬೆಲೆ', 'ಮಂಡಿ'], action: () => { navigate('/market-prices'); showToast(`🎙 ಮಾರುಕಟ್ಟೆ ಬೆಲೆ`); } },
    ];

    // ── Try navigation match first ─────────────────────────────────────────
    for (const entry of [...navMap, ...kannadaMap]) {
      if (entry.keys.some(k => cmd.includes(k))) {
        entry.action();
        return;
      }
    }

    // ── Fallback: treat as produce search ─────────────────────────────────
    setSearchQuery(transcript);
    setActiveTab('browse');
    showToast(`🎙 Searching for "${transcript}"`);
  };

  const startVoiceSearch = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser.");
      return;
    }
    if (isListening) return; // prevent double-start
    try {
      const rec = new SpeechRecognition();
      rec.lang = lang === 'kn' ? 'kn-IN' : 'en-IN';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsListening(true);
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setIsListening(false);
        handleVoiceCommand(transcript);
      };
      rec.onerror = (e) => {
        setIsListening(false);
        if (e.error !== 'no-speech') showToast(`Voice error: ${e.error}`, 'error');
      };
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch (_) {
      setIsListening(false);
    }
  };

  const handleCameraSearch = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSearchQuery(file.name.split('.')[0] || 'Crop');
      setActiveTab('browse');
    }
  };

  // Quick View Modal
  const [quickViewListing, setQuickViewListing] = useState(null);

  // Buyer orders & notification states
  const [buyerOrders, setBuyerOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Profile Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Redesigned Profile & Wishlist states
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [addresses, setAddresses] = useState(() => {
    try {
      const s = localStorage.getItem('kb_addresses');
      if (s) return JSON.parse(s);
    } catch (_) { }
    return [{
      id: 'addr_default',
      name: user?.name || 'Primary Address',
      phone: user?.phone || '',
      line1: user?.location?.address || 'MG Road, Main Market',
      line2: '',
      city: user?.location?.district || 'Bengaluru',
      state: user?.location?.state || 'Karnataka',
      pin: '560001',
      isDefault: true,
    }];
  });

  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressEditId, setAddressEditId] = useState(null);
  const [addressForm, setAddressForm] = useState({ name: '', phone: '', line1: '', line2: '', city: '', state: '', pin: '', isDefault: false });

  const [paymentMethods, setPaymentMethods] = useState([
    { id: 'pay_1', type: 'UPI', label: 'Google Pay / PhonePe', detail: 'xxxxxx@okhdfcbank', primary: true },
    { id: 'pay_2', type: 'Net Banking', label: 'State Bank of India', detail: 'A/C: xxxx-xxxx-4921', primary: false },
    { id: 'pay_3', type: 'COD', label: 'Cash on Delivery', detail: 'Pay when crop arrives', primary: false }
  ]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ type: 'UPI', label: '', detail: '', primary: false });

  const [buyerSettings, setBuyerSettings] = useState({
    speechFeedback: true,
    emailAlerts: true,
    pushNotifications: false,
    autoLocation: true
  });

  // Sync addresses to localStorage for CheckoutPage sharing
  useEffect(() => {
    localStorage.setItem('kb_addresses', JSON.stringify(addresses));
  }, [addresses]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  useEffect(() => {
    if (!user || user.role !== 'buyer') {
      navigate('/login/buyer');
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch buyer orders
        const ordersRes = await api.get('/orders/buyer').catch(() => ({ data: [] }));
        setBuyerOrders(ordersRes.data || []);

        // Fetch notifications
        const notifsRes = await api.get('/notifications').catch(() => ({ data: [] }));
        setNotifications(notifsRes.data || []);

      } catch (err) {
        console.error('Error loading buyer dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSetTab = (tabId) => {
    if (tabId === 'cart') {
      navigate('/cart');
      return;
    }
    if (tabId === 'orders') {
      navigate('/buyer/pending-orders');
      return;
    }
    if (tabId === 'weather') {
      navigate('/weather');
      return;
    }
    if (tabId === 'market') {
      navigate('/market-prices');
      return;
    }
    setActiveTab(tabId);
  };

  const navItems = [
    { id: 'dashboard', icon: ShoppingBag, label: t('sidebar.dashboard') },
    { id: 'browse', icon: Search, label: t('sidebar.browseMarketplace') },
    { id: 'saved', icon: Bookmark, label: t('sidebar.savedListings') },
    { id: 'orders', icon: ShoppingCart, label: t('sidebar.orders'), external: '/buyer/pending-orders' },
    { id: 'wishlist', icon: Heart, label: t('sidebar.wishlist') },
    { id: 'cart', icon: ShoppingCart, label: `${t('sidebar.cart')}${cartItemsCount > 0 ? ` (${cartItemsCount})` : ''}`, external: '/cart' },
    { id: 'assistant', icon: Bot, label: t('sidebar.aiAssistant'), badge: 'AI' },
    { id: 'analyzer', icon: Eye, label: t('sidebar.cropVerification'), badge: 'AI' },
    { id: 'weather', icon: CloudSun, label: t('sidebar.weather'), external: '/weather' },
    { id: 'market', icon: TrendingUp, label: t('sidebar.marketPrices'), external: '/market-prices' },
    { id: 'notifications', icon: Bell, label: t('sidebar.notifications') },
    { id: 'profile', icon: User, label: t('sidebar.profile') },
  ];

  const savedItems = savedListings || [];

  // Filter listings
  const getFilteredListings = () => {
    let result = (Array.isArray(listings) ? listings : []).filter(l => {
      const isVerified = l.aiVerified || l.isVerified || l.status === 'active';
      if (!isVerified) return false;
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        (l.cropName && l.cropName.toLowerCase().includes(q)) ||
        (l.variety && l.variety.toLowerCase().includes(q)) ||
        (l.farmer?.name && l.farmer.name.toLowerCase().includes(q)) ||
        (typeof l.location === 'string' && l.location.toLowerCase().includes(q)) ||
        (typeof l.location === 'object' && `${l.location.district || ''} ${l.location.state || ''}`.toLowerCase().includes(q))
      );
    }

    if (filterCategory !== 'all') {
      result = result.filter(l => l.cropName?.toLowerCase().includes(filterCategory.toLowerCase()));
    }

    if (filterLocation) {
      result = result.filter(l => {
        const locStr = typeof l.location === 'object'
          ? `${l.location.district || ''} ${l.location.state || ''}`.toLowerCase()
          : (l.location || '').toLowerCase();
        return locStr.includes(filterLocation.toLowerCase());
      });
    }

    if (filterOrganic) {
      result = result.filter(l => l.isOrganic);
    }

    if (filterVerified) {
      result = result.filter(l => l.aiVerified || l.isVerified);
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.pricePerUnit || a.price) - (b.pricePerUnit || b.price));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.pricePerUnit || b.price) - (a.pricePerUnit || a.price));
    } else if (sortBy === 'quantity') {
      result.sort((a, b) => (b.quantity || 0) - (a.quantity || 0));
    } else {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return result;
  };

  const filteredListings = getFilteredListings();

  // Categories list for premium pills
  const categories = [
    { id: 'all', label: 'All Crops', icon: '🌾' },
    { id: 'vegetable', label: 'Vegetables', icon: '🥦' },
    { id: 'fruit', label: 'Fruits', icon: '🍎' },
    { id: 'grain', label: 'Grains', icon: '🌽' },
    { id: 'pulse', label: 'Pulses', icon: '🫘' },
    { id: 'spice', label: 'Spices', icon: '🌶️' },
    { id: 'herb', label: 'Herbs', icon: '🌿' },
  ];

  if (!user) return null;

  return (
    <ErrorBoundary>
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        navItems={navItems}
        activeTab={activeTab}
        setActiveTab={handleSetTab}
        role="buyer"
        topBarExtra={
          <button
            onClick={() => navigate('/cart')}
            className="relative p-2.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-full border border-orange-200 cursor-pointer transition-all active:scale-95"
            title="View Cart"
          >
            <ShoppingCart size={18} />
            {cartItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center bg-orange-600 text-white text-[10px] font-black rounded-full shadow-md">
                {cartItemsCount}
              </span>
            )}
          </button>
        }
      >
        <div className="w-full mx-auto pb-24 space-y-12 md:space-y-16 page-enter">

          {/* ========================================================== */}
          {/* BUYER DASHBOARD HOME TAB — LUXURY MARKETPLACE LAYOUT */}
          {/* ========================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-12">

              {/* Single Airy Linear-Style Hero & Search Engine */}
              <div className="rounded-3xl border border-[#E8F7EE] bg-gradient-to-br from-white via-[#FFFDF6] to-[#E8F7EE]/30 p-8 md:p-10 shadow-sm space-y-6">

                {/* Greeting & Badges Row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-[#FF8C42] font-black uppercase tracking-widest">
                      {new Date().getHours() < 12 ? t('buyerDashboard.goodMorning') : new Date().getHours() < 17 ? t('buyerDashboard.goodAfternoon') : t('buyerDashboard.goodEvening')}
                    </p>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">
                      {t('buyerDashboard.welcomeBack')} <span className="text-[#1F7A4D]">{user.name?.split(' ')[0]}</span>.
                    </h1>
                    <p className="text-xs md:text-sm text-gray-600 font-semibold pt-0.5">
                      {t('buyerDashboard.browseFreshProduce')}
                    </p>
                  </div>


                </div>

                {/* ========================================================== */}
                {/* ELEGANT 'LITTLE BIG' SEARCH COMPONENT (0.55CM / 21PX SIDE PADDING) */}
                {/* ========================================================== */}
                <div className="bg-white/95 backdrop-blur-xl p-5 md:p-6 rounded-3xl border border-[#E8F7EE] shadow-md space-y-4" style={{ paddingLeft: '21px', paddingRight: '21px' }}>

                  {/* SEARCH INPUT BAR (TASTEFUL 56PX HEIGHT) */}
                  <div className="relative w-full h-14">
                    <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1F7A4D] pointer-events-none z-10" />
                    <input
                      type="text"
                      placeholder={t('buyerDashboard.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setActiveTab('browse');
                      }}
                      className="w-full h-full pl-12 pr-6 py-3.5 bg-[#F7F7F7] hover:bg-white focus:bg-white text-gray-900 text-xs md:text-sm font-semibold rounded-2xl border border-gray-200 focus:border-[#1F7A4D] focus:ring-2 focus:ring-[#1F7A4D]/10 outline-none transition-all placeholder:text-gray-400 shadow-inner"
                    />
                  </div>

                  {/* ACTION CONTROLS BAR (TASTEFUL SPACING) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                      <span className="w-2 h-2 rounded-full bg-[#1F7A4D]"></span>
                      <span>{t('buyerDashboard.marketplaceSearch')} • {listings.length} {t('buyerDashboard.liveProduceListings')}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Voice Search Button */}
                      <button
                        type="button"
                        onClick={startVoiceSearch}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95 border
                          ${isListening
                            ? 'bg-rose-500 text-white border-rose-500 animate-pulse'
                            : 'bg-[#E8F7EE] text-[#1F7A4D] border-[#1F7A4D]/20 hover:bg-[#1F7A4D] hover:text-white'
                          }
                        `}
                        title={t('buyerDashboard.voiceSearch')}
                      >
                        <Mic size={16} />
                        <span>{isListening ? t('buyerDashboard.listening') : t('buyerDashboard.voiceSearch')}</span>
                      </button>

                      {/* Image Search Button */}
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-[#E8F7EE] text-[#1F7A4D] border border-[#1F7A4D]/20 font-bold text-xs flex items-center gap-2 hover:bg-[#1F7A4D] hover:text-white transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                        title={t('buyerDashboard.imageSearch')}
                      >
                        <Camera size={16} />
                        <span>{t('buyerDashboard.imageSearch')}</span>
                      </button>
                      <input
                        type="file"
                        ref={imageInputRef}
                        onChange={handleCameraSearch}
                        accept="image/*"
                        className="hidden"
                      />

                      {/* Filter Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setActiveTab('browse')}
                        className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs hover:scale-105 active:scale-95"
                      >
                        <Filter size={16} className="text-[#FF8C42]" />
                        <span>{t('buyerDashboard.filter')}</span>
                      </button>

                      {/* Browse Catalogue Button */}
                      <button
                        onClick={() => setActiveTab('browse')}
                        className="px-6 py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2 hover:scale-105 active:scale-95"
                      >
                        <span>{t('buyerDashboard.browseCatalogue')}</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>

                </div>

              </div>



              {/* RECOMMENDED CROPS GRID — 6 SECTION CROPCARD COMPONENT */}
              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Recommended Crop Harvests</h3>
                    <p className="text-xs text-gray-500 font-semibold mt-0.5">Fresh produce sourced directly from verified local farms</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="text-xs font-black text-[#1F7A4D] hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    View All Crops <ArrowRight size={14} />
                  </button>
                </div>

                {loading ? (
                  <LoadingSkeleton count={3} />
                ) : filteredListings.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center space-y-3 shadow-sm">
                    <div className="text-5xl">🌾</div>
                    <h4 className="text-base font-black text-gray-900">No crop produce found</h4>
                    <p className="text-xs text-gray-500 max-w-sm mx-auto">Try clearing search filters or selecting another category.</p>
                    <button
                      onClick={() => { setSearchQuery(''); setFilterCategory('all'); fetchListings(); }}
                      className="px-5 py-2.5 bg-[#1F7A4D] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                    >
                      <RefreshCw size={14} /> Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 lg:gap-14 xl:gap-16">
                    {filteredListings.slice(0, 6).map((listing) => (
                      <CropCard
                        key={listing._id || listing.id}
                        listing={listing}
                        showContact={true}
                        onBuyNow={(item) => setActiveCheckoutListing(item)}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* BROWSE MARKETPLACE TAB */}
          {/* ========================================================== */}
          {activeTab === 'browse' && (
            <div className="space-y-6">

              {/* Search & Filter Bar */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider">Crop Marketplace</h2>
                    <p className="text-xs text-gray-500 font-medium">Direct farm sourcing catalogue</p>
                  </div>
                  {(searchQuery || filterCategory !== 'all' || filterLocation || filterOrganic || filterVerified) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setFilterCategory('all');
                        setFilterLocation('');
                        setFilterOrganic(false);
                        setFilterVerified(false);
                      }}
                      className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <X size={14} /> Clear All Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                  <div className="relative md:col-span-2">
                    <Search size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search crop, variety, or farmer..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-white focus:bg-white text-xs font-semibold rounded-xl border border-gray-200 outline-none transition-all"
                    />
                  </div>

                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 hover:bg-white text-xs font-semibold rounded-xl border border-gray-200 outline-none cursor-pointer"
                  >
                    <option value="all">All Commodities</option>
                    {cropOptions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 hover:bg-white text-xs font-semibold rounded-xl border border-gray-200 outline-none cursor-pointer"
                  >
                    <option value="">All Locations</option>
                    {locations.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 hover:bg-white text-xs font-semibold rounded-xl border border-gray-200 outline-none cursor-pointer"
                  >
                    <option value="newest">Sort: Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="quantity">Largest Quantity</option>
                  </select>
                </div>

                <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100 text-xs font-bold text-gray-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterOrganic}
                      onChange={(e) => setFilterOrganic(e.target.checked)}
                      className="accent-orange-600 rounded"
                    />
                    <span>Organic Crops Only 🌿</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterVerified}
                      onChange={(e) => setFilterVerified(e.target.checked)}
                      className="accent-[#166534] rounded"
                    />
                    <span>AI Verified Only 🛡️</span>
                  </label>
                </div>
              </div>

              {/* Products Grid */}
              {loading ? (
                <LoadingSkeleton count={6} />
              ) : filteredListings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 py-16 px-6 text-center space-y-4 shadow-sm">
                  <div className="text-5xl">🌾</div>
                  <h3 className="text-lg font-bold text-gray-900">No crops available yet</h3>
                  <p className="text-xs text-gray-500 font-medium max-w-sm mx-auto">Farmers have not published any crops matching your criteria.</p>
                  <button
                    onClick={() => fetchListings()}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <RefreshCw size={14} /> Refresh Feed
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-12 lg:gap-14 xl:gap-16">
                  {filteredListings.map((listing) => (
                    <div key={listing._id || listing.id}>
                      <CropCard
                        listing={{
                          ...listing,
                          onToggleSave: toggleSaved,
                          isSaved: isSaved(listing._id || listing.id)
                        }}
                        showContact={true}
                        onBuyNow={(item) => setActiveCheckoutListing(item)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* India Crop Intelligence Map */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                  <span className="text-xl">🗺️</span>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">India Crop Intelligence Map</h3>
                    <p className="text-[11px] text-gray-400 font-medium">Click any state to explore primary agricultural output</p>
                  </div>
                </div>
                <IndiaCropMap onStateClick={(stateName) => navigate(`/state/${encodeURIComponent(stateName)}`)} />
              </div>

            </div>
          )}

          {/* ========================================================== */}
          {/* SAVED / WISHLIST TAB */}
          {/* ==          {/* ========================================================== */}
          {/* SAVED LISTINGS TAB */}
          {/* ========================================================== */}
          {activeTab === 'saved' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Saved Listings</h2>
                <p className="text-xs text-gray-500 font-medium mt-1">Crops you bookmarked for direct procurement</p>
              </div>

              {savedItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed border-gray-200 py-16 px-6 text-center space-y-4 shadow-sm">
                  <div className="text-5xl">🔖</div>
                  <h3 className="text-lg font-bold text-gray-900">No Saved Items</h3>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">You haven't saved any crop listings yet.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm"
                  >
                    Browse Marketplace
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedItems.map((listing) => (
                    <div key={listing._id || listing.id}>
                      <CropCard
                        listing={{
                          ...listing,
                          onToggleSave: toggleSaved,
                          isSaved: true
                        }}
                        showContact={true}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* WISHLIST TAB */}
          {/* ========================================================== */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-rose-50 rounded-2xl">
                    <Heart className="text-rose-500 fill-rose-500" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-stone-900 tracking-tight">My Wishlist</h2>
                    <p className="text-xs text-stone-500 font-semibold mt-0.5">High-quality farm crops saved for direct deal negotiation</p>
                  </div>
                </div>
                <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-black">
                  {savedItems.length} {savedItems.length === 1 ? 'Crop' : 'Crops'}
                </span>
              </div>

              {savedItems.length === 0 ? (
                <div className="bg-white rounded-3xl border border-stone-200 py-16 px-6 text-center shadow-sm">
                  <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 border border-rose-100 animate-pulse">
                    <Heart size={24} className="text-rose-400 fill-rose-400" />
                  </div>
                  <h3 className="text-stone-850 font-black text-lg">Wishlist is Empty</h3>
                  <p className="text-stone-400 text-xs font-semibold max-w-xs mx-auto mt-1">Bookmark fresh crop harvests directly from local farmers to view them here.</p>
                  <button
                    onClick={() => setActiveTab('browse')}
                    className="mt-6 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black tracking-wide cursor-pointer transition-all shadow-md shadow-orange-600/15"
                  >
                    Explore Farm Listings
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedItems.map((listing) => {
                    const listingId = listing._id || listing.id;
                    const cropPhoto = listing.images?.[0]?.url || listing.photo || null;
                    const farmerName = listing.farmer?.name || listing.farmerName || 'Local Farmer';
                    return (
                      <div key={listingId} className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between">

                        {/* Image overlay */}
                        <div className="relative h-48 bg-stone-50 overflow-hidden group">
                          <CropImage cropName={listing.cropName} photo={cropPhoto} size="md" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                          {/* AI Verified Badge */}
                          {listing.aiVerified && (
                            <div className="absolute top-3 left-3 bg-emerald-950/90 text-emerald-400 backdrop-blur-sm border border-emerald-800/80 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                              <ShieldCheck size={11} className="text-emerald-400" />
                              AI Verified
                            </div>
                          )}

                          {/* Trash button */}
                          <button
                            onClick={() => {
                              toggleSaved(listingId);
                              showToast('Removed item from Wishlist.');
                            }}
                            className="absolute top-3 right-3 p-2 bg-white/90 hover:bg-white text-stone-500 hover:text-red-600 rounded-full shadow-sm hover:scale-105 active:scale-95 transition-all outline-none"
                            title="Remove Crop"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Description */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="text-sm font-black text-stone-800 truncate">{listing.cropName}</h4>
                              <span className="text-sm font-black text-orange-600">₹{listing.pricePerUnit || listing.price}/{listing.unit || 'kg'}</span>
                            </div>
                            {listing.variety && <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider block">{listing.variety}</span>}
                            <p className="text-[10px] font-semibold text-stone-500">Farmer: <span className="text-stone-850 font-extrabold">{farmerName}</span></p>
                            {listing.location && (
                              <p className="text-[10px] font-semibold text-stone-400 flex items-center gap-1">
                                <MapPin size={11} className="text-stone-400" />
                                {typeof listing.location === 'object' ? `${listing.location.district || ''}, ${listing.location.state || ''}` : listing.location}
                              </p>
                            )}
                          </div>

                          {/* Action Grid */}
                          <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-stone-100">
                            <button
                              onClick={() => navigate(`/listing/${listingId}`)}
                              className="py-2.5 border border-stone-200 hover:border-stone-450 text-stone-600 hover:text-stone-900 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Eye size={13} /> View Product
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await addToCart(listing, 1);
                                  await toggleSaved(listingId);
                                  showToast('Moved item to Cart!');
                                } catch (_) {
                                  showToast('Failed to add crop to cart.', 'error');
                                }
                              }}
                              className="py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-md shadow-orange-600/15"
                            >
                              <ShoppingCart size={13} /> Move to Cart
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* OTHER TABS */}
          {/* ========================================================== */}
          {activeTab === 'assistant' && <AIChatbot />}
          {activeTab === 'analyzer' && <AICropAnalyzer />}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider">Buyer Notifications</h2>
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div key={n._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 text-xs text-gray-700">
                    <p className="font-semibold">{n.message}</p>
                    <span className="text-[10px] text-gray-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-8">No unread notifications</p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* REDESIGNED BUYER PROFILE TAB */}
          {/* ========================================================== */}
          {activeTab === 'profile' && (
            <div className="max-w-5xl mx-auto space-y-8 animate-fadeIn">

              {/* Cover Banner & Profile Head */}
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                <div className="h-44 bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-500 relative">
                  <div className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 px-3 py-1.5 rounded-xl text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all">
                    <Camera size={12} /> Edit Cover
                  </div>
                </div>
                <div className="px-6 pb-6 pt-4 relative">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end -mt-20 gap-4">
                    <div className="flex items-end gap-4">
                      <div className="w-28 h-28 rounded-full bg-white p-1.5 shadow-xl relative group">
                        <div className="w-full h-full bg-gradient-to-br from-orange-600 to-amber-500 text-white rounded-full flex items-center justify-center text-4xl font-black shadow-inner">
                          {user.name?.charAt(0) || 'B'}
                        </div>
                        <div className="absolute inset-1.5 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Camera size={18} />
                        </div>
                      </div>
                      <div className="mb-2">
                        <h2 className="text-xl font-black text-stone-900 tracking-tight">{user.name}</h2>
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100 tracking-wider uppercase mt-1">
                          Direct Procurement Partner
                        </span>
                      </div>
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => {
                          setEditForm({
                            name: user.name || '',
                            phone: user.phone || '',
                            companySector: user.buyerProfile?.companySector || user.companySector || '',
                            district: user.location?.district || '',
                            state: user.location?.state || '',
                            address: user.location?.address || '',
                          });
                          setIsEditing(true);
                        }}
                        className="px-4 py-2 border border-stone-250 bg-white hover:bg-stone-50 text-stone-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Pencil size={12} /> Edit Profile
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Multi-Column Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column: Personal details */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Account Information Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <User size={16} className="text-orange-600" />
                      <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">Personal Profile Details</h3>
                    </div>

                    {isEditing ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Full Name</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Phone Number</label>
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Industry / Sector</label>
                          <input
                            type="text"
                            value={editForm.companySector}
                            onChange={(e) => setEditForm({ ...editForm, companySector: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                            placeholder="e.g. Retail, Wholesale, Agri-Tech"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Local Address</label>
                          <input
                            type="text"
                            value={editForm.address}
                            onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">District / City</label>
                          <input
                            type="text"
                            value={editForm.district}
                            onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">State</label>
                          <input
                            type="text"
                            value={editForm.state}
                            onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                            className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
                          />
                        </div>

                        <div className="sm:col-span-2 flex gap-2 pt-2">
                          <button
                            onClick={async () => {
                              try {
                                setSaving(true);
                                await updateProfile({
                                  name: editForm.name,
                                  phone: editForm.phone,
                                  location: {
                                    district: editForm.district,
                                    state: editForm.state,
                                    address: editForm.address,
                                  },
                                  buyerProfile: {
                                    companySector: editForm.companySector
                                  }
                                });
                                setIsEditing(false);
                                showToast('Profile details updated successfully!');
                              } catch (err) {
                                showToast(err.message, 'error');
                              } finally {
                                setSaving(false);
                              }
                            }}
                            disabled={saving}
                            className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md shadow-orange-600/15"
                          >
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-stone-600">
                        <div className="border-b border-stone-50 py-2.5">
                          <span className="text-stone-400 font-black uppercase text-[9px] tracking-wider block">Email Address</span>
                          <span className="text-stone-900 font-extrabold mt-0.5 block">{user.email || 'N/A'}</span>
                        </div>
                        <div className="border-b border-stone-50 py-2.5">
                          <span className="text-stone-400 font-black uppercase text-[9px] tracking-wider block">Contact Phone</span>
                          <span className="text-stone-900 font-extrabold mt-0.5 block">{user.phone || 'N/A'}</span>
                        </div>
                        <div className="border-b border-stone-50 py-2.5">
                          <span className="text-stone-400 font-black uppercase text-[9px] tracking-wider block">Company Sector</span>
                          <span className="text-stone-900 font-extrabold mt-0.5 block">{user.buyerProfile?.companySector || user.companySector || 'Direct buyer'}</span>
                        </div>
                        <div className="border-b border-stone-50 py-2.5">
                          <span className="text-stone-400 font-black uppercase text-[9px] tracking-wider block">Primary Location</span>
                          <span className="text-stone-900 font-extrabold mt-0.5 block">
                            {user.location?.district ? `${user.location.district}, ${user.location.state}` : (user.location || 'India')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Saved Delivery Addresses Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-orange-600" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">Saved Procurement Addresses</h3>
                      </div>
                      {!showAddressForm && (
                        <button
                          onClick={() => {
                            setAddressEditId(null);
                            setAddressForm({ name: '', phone: '', line1: '', line2: '', city: '', state: '', pin: '', isDefault: false });
                            setShowAddressForm(true);
                          }}
                          className="text-orange-600 hover:text-orange-700 text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <Pencil size={11} /> Add New
                        </button>
                      )}
                    </div>

                    {showAddressForm ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (addressEditId) {
                          setAddresses(prev => prev.map(a => a.id === addressEditId ? { ...a, ...addressForm } : a));
                          showToast('Address details saved.');
                        } else {
                          const n = { ...addressForm, id: `addr_${Date.now()}` };
                          setAddresses(prev => [...prev, n]);
                          showToast('New procurement address added.');
                        }
                        setShowAddressForm(false);
                      }} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Contact Name *</label>
                            <input required value={addressForm.name} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Phone Number *</label>
                            <input required value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Street Address Line 1 *</label>
                            <input required value={addressForm.line1} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Area / Landmark (Optional)</label>
                            <input value={addressForm.line2} onChange={e => setAddressForm({ ...addressForm, line2: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">City / District *</label>
                            <input required value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">State *</label>
                            <input required value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-stone-400 uppercase tracking-wide mb-1">Pincode *</label>
                            <input required value={addressForm.pin} onChange={e => setAddressForm({ ...addressForm, pin: e.target.value })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="submit" className="px-5 py-2 bg-orange-600 text-white rounded-xl text-xs font-black uppercase">Save</button>
                          <button type="button" onClick={() => setShowAddressForm(false)} className="px-5 py-2 bg-stone-100 text-stone-600 rounded-xl text-xs font-black uppercase">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-3">
                        {addresses.map((a) => (
                          <div key={a.id} className="border border-stone-200 rounded-2xl p-4 flex justify-between items-center bg-stone-50/30">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-black text-stone-800">{a.name}</h4>
                                {a.isDefault && <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[8px] font-black border border-emerald-150 uppercase tracking-wide">Default</span>}
                              </div>
                              <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} - {a.pin}</p>
                              {a.phone && <p className="text-[10px] font-bold text-stone-400 mt-1 flex items-center gap-1">📞 {a.phone}</p>}
                            </div>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => {
                                  setAddressEditId(a.id);
                                  setAddressForm({ name: a.name, phone: a.phone, line1: a.line1, line2: a.line2 || '', city: a.city, state: a.state, pin: a.pin, isDefault: a.isDefault });
                                  setShowAddressForm(true);
                                }}
                                className="p-2 border border-stone-200 bg-white hover:bg-stone-50 rounded-xl text-stone-500 hover:text-stone-800 transition-colors"
                              >
                                <Pencil size={11} />
                              </button>
                              {addresses.length > 1 && (
                                <button
                                  onClick={() => {
                                    setAddresses(prev => prev.filter(x => x.id !== a.id));
                                    showToast('Procurement address removed.');
                                  }}
                                  className="p-2 border border-stone-200 bg-white hover:bg-stone-50 rounded-xl text-stone-500 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Cards for Stats, Payments, Language, and settings */}
                <div className="space-y-6">

                  {/* Quick stats board */}
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      onClick={() => navigate('/buyer/pending-orders')}
                      className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm text-center cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group"
                    >
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-wide">TOTAL ORDERS</span>
                      <span className="block text-2xl font-black text-orange-600 group-hover:scale-105 transition-all mt-1">{buyerOrders.length}</span>
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 mt-2">
                        View List <ChevronRight size={8} />
                      </span>
                    </div>

                    <div
                      onClick={() => setActiveTab('wishlist')}
                      className="bg-white border border-stone-200 rounded-3xl p-5 shadow-sm text-center cursor-pointer hover:shadow-md hover:border-rose-250 transition-all group"
                    >
                      <span className="text-[9px] font-black text-stone-400 uppercase tracking-wide">WISHLIST ITEMS</span>
                      <span className="block text-2xl font-black text-rose-500 group-hover:scale-105 transition-all mt-1">{savedItems.length}</span>
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-full border border-rose-100 mt-2">
                        View List <ChevronRight size={8} />
                      </span>
                    </div>
                  </div>

                  {/* Payment Instruments Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard size={15} className="text-orange-600" />
                        <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">Payment Options</h3>
                      </div>
                      {!showPaymentForm && (
                        <button
                          onClick={() => {
                            setPaymentForm({ type: 'UPI', label: '', detail: '', primary: false });
                            setShowPaymentForm(true);
                          }}
                          className="text-orange-600 hover:text-orange-700 text-xs font-black cursor-pointer transition-colors"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    {showPaymentForm ? (
                      <form onSubmit={(e) => {
                        e.preventDefault();
                        if (paymentForm.label && paymentForm.detail) {
                          const n = { ...paymentForm, id: `pay_${Date.now()}` };
                          setPaymentMethods(prev => [...prev, n]);
                          showToast('Payment method added.');
                        }
                        setShowPaymentForm(false);
                      }} className="space-y-3 bg-stone-50 rounded-2xl p-4 border border-stone-100">
                        <div>
                          <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">Type</label>
                          <select value={paymentForm.type} onChange={e => setPaymentForm({ ...paymentForm, type: e.target.value })} className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs">
                            <option value="UPI">UPI / Mobile App</option>
                            <option value="Net Banking">Net Banking</option>
                            <option value="Card">Credit / Debit Card</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">Provider Name</label>
                          <input required placeholder="e.g. HDFC Bank, GPay" value={paymentForm.label} onChange={e => setPaymentForm({ ...paymentForm, label: e.target.value })} className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-none" />
                        </div>
                        <div>
                          <label className="block text-[8px] font-black text-stone-400 uppercase mb-1">Account details / VPA</label>
                          <input required placeholder="e.g. acc-no or upi-id" value={paymentForm.detail} onChange={e => setPaymentForm({ ...paymentForm, detail: e.target.value })} className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs outline-none" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="px-4 py-1.5 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase">Add Instrument</button>
                          <button type="button" onClick={() => setShowPaymentForm(false)} className="px-4 py-1.5 bg-white border border-stone-200 text-stone-600 rounded-xl text-[10px] font-black uppercase">Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-2">
                        {paymentMethods.map(p => (
                          <div key={p.id} className="border border-stone-100 rounded-2xl p-3 bg-stone-50/50 flex justify-between items-center">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-stone-400 uppercase tracking-wide">{p.type}</span>
                                {p.primary && <span className="text-[7px] font-black text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-1.5">Primary</span>}
                              </div>
                              <h4 className="text-xs font-black text-stone-850 mt-0.5">{p.label}</h4>
                              <p className="text-[10px] text-stone-500 font-semibold">{p.detail}</p>
                            </div>
                            <button
                              onClick={() => {
                                setPaymentMethods(prev => prev.filter(x => x.id !== p.id));
                                showToast('Payment method removed.');
                              }}
                              className="text-stone-400 hover:text-red-600 transition-colors p-1"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Language Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <Globe size={15} className="text-orange-600" />
                      <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">{t('buyerDashboard.systemLanguage')}</h3>
                    </div>
                    <div className="flex items-center justify-between bg-stone-50/50 border border-stone-100 rounded-2xl p-3">
                      <div>
                        <span className="text-xs font-black text-stone-800">
                          {lang === 'en' ? t('buyerDashboard.englishIndia') : t('buyerDashboard.kannadaLang')}
                        </span>
                        <p className="text-[10px] text-stone-400 font-semibold mt-0.5">{t('buyerDashboard.toggleLanguagePref')}</p>
                      </div>
                      <button
                        onClick={toggleLanguage}
                        className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-black transition-all hover:bg-orange-700 active:scale-95 shadow-sm cursor-pointer"
                      >
                        {lang === 'en' ? t('buyerDashboard.switchToKannada') : t('buyerDashboard.switchToEnglish')}
                      </button>
                    </div>
                  </div>

                  {/* Settings Preferences Card */}
                  <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
                      <Settings size={15} className="text-orange-600" />
                      <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider">System Preferences</h3>
                    </div>

                    <div className="space-y-3">
                      {[
                        { key: 'speechFeedback', label: 'Speech Feedback', desc: 'Narrate crop grading details' },
                        { key: 'emailAlerts', label: 'Email Alerts', desc: 'Receive invoice copies via email' },
                        { key: 'pushNotifications', label: 'Instant Alerts', desc: 'Alert when farmer accepts deals' },
                        { key: 'autoLocation', label: 'Auto Location', desc: 'Detect district coordinates' }
                      ].map(pref => (
                        <div key={pref.key} className="flex justify-between items-center py-1">
                          <div>
                            <span className="text-xs font-black text-stone-700">{pref.label}</span>
                            <p className="text-[9px] text-stone-400 font-semibold">{pref.desc}</p>
                          </div>
                          <button
                            onClick={() => {
                              setBuyerSettings(prev => {
                                const updated = { ...prev, [pref.key]: !prev[pref.key] };
                                showToast(`Preference "${pref.label}" ${updated[pref.key] ? 'Enabled' : 'Disabled'}.`);
                                return updated;
                              });
                            }}
                            className={`w-10 h-6.5 rounded-full p-1 transition-all outline-none ${buyerSettings[pref.key] ? 'bg-orange-600 text-white pl-4.5' : 'bg-stone-250 text-stone-300'
                              }`}
                          >
                            <div className="w-4.5 h-4.5 bg-white rounded-full shadow-sm" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            </div>
          )}

        </div>

        {/* Quick View Modal */}
        {quickViewListing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-gray-200 shadow-2xl relative space-y-4">
              <button
                onClick={() => setQuickViewListing(null)}
                className="absolute right-4 top-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="h-44 bg-gray-50 rounded-xl overflow-hidden">
                <CropImage
                  cropName={quickViewListing.cropName}
                  photo={quickViewListing.images?.[0]?.url || quickViewListing.photo}
                  size="md"
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-900">🌾 {quickViewListing.cropName}</h3>
                  <span className="text-base font-black text-orange-600">₹{quickViewListing.pricePerUnit || quickViewListing.price}/{quickViewListing.unit || 'kg'}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Farmer: <span className="font-bold text-gray-900">{quickViewListing.farmer?.name || 'Local Farmer'}</span></p>
                <p className="text-xs text-gray-400 mt-0.5">Location: {typeof quickViewListing.location === 'object' ? `${quickViewListing.location.district || ''}, ${quickViewListing.location.state || ''}` : quickViewListing.location}</p>
              </div>

              <div className="pt-2 text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl">
                <p><span className="font-bold text-gray-800">Available Stock:</span> {quickViewListing.quantity} {quickViewListing.unit || 'kg'}</p>
                <p><span className="font-bold text-gray-800">Harvest Date:</span> {quickViewListing.harvestDate ? new Date(quickViewListing.harvestDate).toLocaleDateString('en-IN') : 'Recent'}</p>
                <p><span className="font-bold text-gray-800">Storage Type:</span> {quickViewListing.storageType || 'Standard'}</p>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => {
                    addToCart(quickViewListing);
                    setQuickViewListing(null);
                  }}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <ShoppingCart size={14} /> Add to Cart
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Checkout Modal for Buy Now Flow */}
        {activeCheckoutListing && (
          <CheckoutModal
            listing={activeCheckoutListing}
            onClose={() => setActiveCheckoutListing(null)}
            onSuccess={() => {
              // Refresh orders list
              api.get('/orders/buyer').then(res => setBuyerOrders(res.data || [])).catch(() => { });
            }}
          />
        )}

      </DashboardLayout>
    </ErrorBoundary>
  );
}
