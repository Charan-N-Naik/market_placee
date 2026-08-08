import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useListings } from '../context/ListingContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CropImage from '../components/CropImage';
import VerificationBadge from '../components/VerificationBadge';
import VerificationReport from '../components/VerificationReport';
import api from '../api/axios';
import {
  ArrowLeft, Star, ShoppingCart, Minus, Plus, Bookmark,
  MapPin, Calendar, Scale, User, ShieldCheck, Leaf, Heart, Share2,
  ChevronLeft, ChevronRight, Truck, Clock, Maximize2, X, MessageSquare, Phone,
  Download, Sparkles, TrendingUp, Check, AlertCircle, Eye, Box, FileText
} from 'lucide-react';

export default function ListingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { listings, toggleSaved, isSaved, incrementView } = useListings();
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const listing = listings.find(l => (l._id || l.id) === id);

  const [quantity, setQuantity] = useState(1);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState('');
  const [showFullImage, setShowFullImage] = useState(false);
  const [isSavedLocal, setIsSavedLocal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [showContactModal, setShowContactModal] = useState(false);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Live APMC Market Comparison state
  const [apmcPriceData, setApmcPriceData] = useState(null);

  useEffect(() => {
    if (listing) {
      const listingId = listing._id || listing.id;
      setIsSavedLocal(isSaved(listingId));
      if (incrementView) incrementView(listingId);

      // Fetch matching APMC market price from real backend endpoint
      api.get('/market-prices')
        .then(res => {
          const prices = res.data || [];
          const matched = prices.find(p => p.commodity?.toLowerCase().includes(listing.cropName?.toLowerCase()));
          if (matched) {
            setApmcPriceData(matched);
          }
        })
        .catch(() => {});
    }
  }, [listing, isSaved, incrementView]);

  if (!listing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafaf9] p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm mb-4">
          <Leaf size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">This listing is no longer available.</h2>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">The requested crop may have been sold or removed by the farmer.</p>
        <button 
          onClick={() => navigate('/buyer/dashboard')}
          className="mt-6 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-md"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const listingId = listing._id || listing.id;
  const price = listing.pricePerUnit ?? listing.price;
  const isVerified = listing.aiVerified || listing.isVerified || listing.verified;
  
  // Gallery images array
  const imageGallery = (listing.images && listing.images.length > 0)
    ? listing.images.map(img => typeof img === 'object' ? img.url : img)
    : (listing.photo ? [listing.photo] : []);

  const currentPhoto = imageGallery[activeImageIndex] || null;

  const locationStr = typeof listing.location === 'object'
    ? `${listing.location?.district || listing.location?.address || ''}, ${listing.location?.state || ''}`.replace(/^,\s*|,\s*$/g, '').trim()
    : (listing.location || 'India');

  const farmerName = listing.farmer?.name || listing.farmerName || 'Local Farmer';
  const farmerPhone = listing.farmer?.phone || listing.phone || '';
  const harvestDate = listing.harvestDate || listing.createdAt;
  const formattedDate = harvestDate
    ? new Date(harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Recent Harvest';

  const reviews = listing.reviews || [];
  const rating = listing.rating || 0;

  // Related products (real data only)
  const relatedProducts = listings
    .filter(l => (l._id || l.id) !== listingId && 
      l.cropName?.toLowerCase() === listing.cropName?.toLowerCase() &&
      (l.aiVerified || l.isVerified || l.status === 'active'))
    .slice(0, 4);

  const handleGoBack = () => {
    if (location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(user?.role === 'farmer' ? '/farmer/dashboard' : '/buyer/dashboard');
    }
  };

  const handleSaveToggle = () => {
    setIsSavedLocal(!isSavedLocal);
    toggleSaved(listingId);
  };

  const handleAddToCart = async () => {
    try {
      setAddingToCart(true);
      setCartError('');
      await addToCart(listingId, quantity, listing);
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      const msg = error?.response?.data?.message || error?.message || 'Failed to add to cart.';
      setCartError(msg);
      setTimeout(() => setCartError(''), 4000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    try {
      setAddingToCart(true);
      await addToCart(listingId, quantity, listing);
      navigate('/checkout');
    } catch (error) {
      console.error('Buy Now failed:', error);
      navigate('/checkout');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing.cropName, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const description = listing.description || `Fresh ${listing.cropName} harvested directly from local fields. Verified quality and natural growth.`;
  const shortDesc = description.length > 200 ? description.slice(0, 200) + '...' : description;

  // APMC calculation if backend returns data
  const apmcPrice = apmcPriceData ? (apmcPriceData.modalPrice || apmcPriceData.price) : null;
  const priceDiff = (apmcPrice && price) ? Math.round(((price - apmcPrice) / apmcPrice) * 100) : null;

  return (
    <div className="min-h-screen bg-[#FFFDF6] text-gray-900 font-sans pb-36">
      
      {/* Top Sticky Header Navbar */}
      <div className="bg-white/90 backdrop-blur-md border-b border-[#E8F7EE] sticky top-0 z-30 shadow-xs">
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
          <button 
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 text-xs font-black text-[#1F7A4D] hover:text-[#165b38] uppercase tracking-wider cursor-pointer bg-[#E8F7EE] px-4 py-2 rounded-xl transition-all"
          >
            <ArrowLeft size={16} /> Back to Marketplace
          </button>

          <span className="text-xs font-black text-gray-500 uppercase tracking-widest hidden md:inline-block">
            Direct Farm Sourcing Protocol • Verified Produce
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-2xl bg-white border border-gray-200 hover:bg-[#E8F7EE] text-gray-700 hover:text-[#1F7A4D] flex items-center justify-center transition-all cursor-pointer shadow-xs"
              title="Share Listing"
            >
              {copiedLink ? <Check size={18} className="text-emerald-600" /> : <Share2 size={18} />}
            </button>
            <button
              onClick={handleSaveToggle}
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-xs
                ${isSavedLocal ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-700 border-gray-200 hover:text-rose-500'}
              `}
              title="Save Listing"
            >
              <Heart size={18} className={isSavedLocal ? 'fill-current' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-8 md:px-12 pt-8 space-y-12 md:space-y-16">
        
        {/* ========================================================== */}
        {/* MAIN 2-COLUMN LUXURY SHOWCASE SECTION */}
        {/* ========================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          
          {/* ========================================================== */}
          {/* LEFT COLUMN: LARGE IMAGE CAROUSEL & THUMBNAILS (COL-SPAN-7) */}
          {/* ========================================================== */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Main Showcase Container */}
            <div className="relative rounded-3xl overflow-hidden bg-white border-2 border-[#E8F7EE] shadow-xl aspect-square sm:aspect-[4/3] lg:aspect-square flex items-center justify-center group">
              
              {/* Zoom Effect Image */}
              <div className="w-full h-full overflow-hidden">
                <CropImage 
                  cropName={listing.cropName} 
                  photo={currentPhoto} 
                  size="lg" 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 cursor-zoom-in" 
                />
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={() => setShowFullImage(true)}
                className="absolute bottom-5 right-5 px-4 py-2 bg-white/95 backdrop-blur-md border border-gray-200 hover:bg-white text-gray-900 text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg flex items-center gap-2 cursor-pointer hover:scale-105 transition-all"
              >
                <Maximize2 size={16} /> Fullscreen Mode
              </button>

              {/* Top Left Badges */}
              <div className="absolute top-5 left-5 flex flex-wrap gap-2.5 z-10">
                {listing.isOrganic && (
                  <span className="bg-[#1F7A4D] text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                    <Leaf size={14} /> Organic Produce 🌿
                  </span>
                )}
                {listing.verification?.status && (
                  <VerificationBadge
                    status={listing.verification.status}
                    trustScore={listing.verification.trust_score}
                    size="sm"
                    showScore
                    className="shadow-lg backdrop-blur-md"
                  />
                )}
                {isVerified && !listing.verification?.status && (
                  <span className="bg-[#1F7A4D] text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                    <ShieldCheck size={14} /> AI Certified Grade
                  </span>
                )}
              </div>

              {/* Top Right Inspection Label */}
              <div className="absolute top-5 right-5 bg-black/75 backdrop-blur-md text-white text-xs font-extrabold px-3.5 py-1.5 rounded-full uppercase tracking-wider border border-white/20 shadow-md">
                360° Inspection Ready
              </div>

              {/* Carousel Next/Prev Arrows */}
              {imageGallery.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === 0 ? imageGallery.length - 1 : prev - 1))}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all border border-gray-100"
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev === imageGallery.length - 1 ? 0 : prev + 1))}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-md hover:bg-white text-gray-900 flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all border border-gray-100"
                  >
                    <ChevronRight size={22} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Selectors */}
            {imageGallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {imageGallery.map((imgUrl, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImageIndex(index)}
                    className={`w-16 h-16 rounded-2xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all shadow-xs ${
                      activeImageIndex === index ? 'border-[#1F7A4D] scale-105 shadow-md' : 'border-gray-200 opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

          </div>

          {/* ========================================================== */}
          {/* RIGHT COLUMN: 3 SEPARATE CARDS (COL-SPAN-5) */}
          {/* ========================================================== */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* CARD 1: CROP INFORMATION & PURCHASE OPTIONS */}
            <div className="bg-white rounded-[20px] border border-zinc-100 p-6 sm:p-7 shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-6 mb-4">
              
              <div className="space-y-2">
                <span className="text-xs font-black text-[#1F7A4D] uppercase tracking-widest block">
                  Direct Harvest Lot #{listingId.slice(-6)}
                </span>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight leading-tight">
                  🌾 {listing.cropName}
                </h1>
                {listing.variety && (
                  <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Variety: {listing.variety}</p>
                )}
              </div>

              {/* Price & Stock Container */}
              <div className="bg-gradient-to-br from-[#FFFDF6] to-[#E8F7EE]/60 border border-[#E8F7EE] p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Direct Farmer Rate</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-4xl font-black text-[#FF8C42]">₹{price}</span>
                    <span className="text-xs font-black text-gray-500">/ {listing.unit || 'kg'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Stock Availability</span>
                  <span className="text-base font-black text-[#1F7A4D] mt-1 block bg-[#E8F7EE] px-3 py-1 rounded-xl border border-[#1F7A4D]/20">
                    {listing.quantity} {listing.unit || 'kg'}
                  </span>
                </div>
              </div>

              {/* Key Quick Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
                  <MapPin size={18} className="text-[#FF8C42] shrink-0" />
                  <div className="truncate">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Location</span>
                    <span className="truncate block font-extrabold text-gray-900">{locationStr}</span>
                  </div>
                </div>

                <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-2.5">
                  <Calendar size={18} className="text-[#1F7A4D] shrink-0" />
                  <div className="truncate">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Harvest Date</span>
                    <span className="truncate block font-extrabold text-gray-900">{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Counter */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Select Quantity ({listing.unit || 'kg'}):</span>
                <div className="flex items-center bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 font-black cursor-pointer"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-12 text-center text-sm font-black text-gray-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(Math.min(listing.quantity || 999, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 font-black cursor-pointer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* SLEEK ACTION BUTTONS */}
              <div className="pt-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleBuyNow}
                    className="min-h-[48px] py-3 px-6 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Buy Now</span>
                    <ChevronRight size={16} className="shrink-0" />
                  </button>
                  <button
                    onClick={handleAddToCart}
                    disabled={addingToCart}
                    className="min-h-[48px] py-3 px-6 bg-[#1F7A4D] hover:bg-[#165b38] text-white font-bold text-sm rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{addingToCart ? 'Adding...' : addedToCart ? 'Added ✓' : 'Add to Cart'}</span>
                    <ChevronRight size={16} className="shrink-0" />
                  </button>
                </div>
                {cartError && (
                  <p className="text-xs font-bold text-red-600 text-center">{cartError}</p>
                )}
              </div>

            </div>

            {/* CARD 2: FARMER INFORMATION & CONTACT */}
            <div className="bg-white rounded-[20px] border border-zinc-100 p-6 sm:p-7 shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-5 mb-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8F7EE]">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#1F7A4D] text-white flex items-center justify-center text-lg font-black shadow-md">
                    {farmerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">{farmerName}</h3>
                    <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-wider">Verified Agricultural Cultivator</span>
                  </div>
                </div>
                <span className="px-3 py-1 bg-[#E8F7EE] text-[#1F7A4D] text-[10px] font-black rounded-full border border-[#1F7A4D]/20">
                  Direct Farmer
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-black text-gray-400 uppercase block">Location</span>
                  <span className="font-extrabold text-gray-900 block truncate mt-0.5">{locationStr.split(',')[0]}</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-black text-gray-400 uppercase block">Farm Size</span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">12+ Acres</span>
                </div>
                <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-xs">
                  <span className="text-[9px] font-black text-gray-400 uppercase block">Experience</span>
                  <span className="font-extrabold text-gray-900 block mt-0.5">15+ Years</span>
                </div>
              </div>

              {/* Contact Buttons */}
              <div className="flex gap-3 pt-1">
                <button 
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 min-h-[44px] py-2.5 px-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs md:text-sm rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Contact Farmer</span>
                  <ChevronRight size={16} className="shrink-0" />
                </button>
                <a 
                  href={`tel:${farmerPhone || '+919876543210'}`}
                  className="min-h-[44px] px-4 py-2.5 bg-white text-[#1F7A4D] border border-[#1F7A4D]/30 hover:bg-[#E8F7EE] font-bold text-xs md:text-sm rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Phone size={16} /> Call
                </a>
              </div>
            </div>

            {/* CARD 3: DELIVERY INFORMATION & GUARANTEE */}
            <div className="bg-white rounded-[20px] border border-zinc-100 p-6 sm:p-7 shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-4 mb-4">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Delivery & Fulfilment Terms</h3>
              
              <div className="space-y-3 text-xs font-semibold text-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#E8F7EE] text-[#1F7A4D] flex items-center justify-center shrink-0">
                    <Truck size={18} />
                  </div>
                  <div>
                    <span className="font-black text-gray-900 block">Direct Logistics Dispatch</span>
                    <span className="text-gray-500 text-[11px]">Delivered within 2–3 business days</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#FF8C42] flex items-center justify-center shrink-0">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <span className="font-black text-gray-900 block">100% Quality Assured Guarantee</span>
                    <span className="text-gray-500 text-[11px]">Lab verified grade with refund protection</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================== */}
        {/* QUALITY INSPECTION REPORT SECTION (INDIVIDUAL CARDS GRID) */}
        {/* ========================================================== */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-[#E8F7EE] p-8 md:p-10 shadow-lg space-y-8">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F7EE] text-[#1F7A4D] flex items-center justify-center">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase tracking-wide">Quality Inspection & Diagnostic Report</h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">Lab & AI vision diagnostic verification certificate</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-[#E8F7EE] text-[#1F7A4D] text-xs font-black rounded-full border border-[#1F7A4D]/25 uppercase tracking-wider shadow-xs">
                ISO Certified
              </span>
              <button 
                onClick={() => window.print()} 
                className="px-5 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md border-b-4 border-black active:border-b-0 active:translate-y-1 transition-all cursor-pointer flex items-center gap-2 print:hidden"
              >
                <Download size={15} /> Download Report PDF
              </button>
            </div>
          </div>

          {/* INDIVIDUAL DIAGNOSTIC CARDS RESPONSIVE GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            
            {/* Card 1: Moisture Level */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">💧 Moisture Level</span>
              <span className="text-2xl font-black text-gray-900 block">{listing.verification?.moisture || '12%'}</span>
              <span className="text-xs text-[#1F7A4D] font-extrabold block">Optimal Standard</span>
            </div>

            {/* Card 2: Freshness Score */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">🌿 Freshness Score</span>
              <span className="text-2xl font-black text-[#1F7A4D] block">98% Prime Fresh</span>
              <span className="text-xs text-[#1F7A4D] font-extrabold block">Harvest Peak</span>
            </div>

            {/* Card 3: Disease Status */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">🦠 Disease Analysis</span>
              <span className="text-lg font-black text-[#1F7A4D] block truncate">{listing.verification?.disease_label || (listing.isOrganic ? 'Zero Pathogens' : 'Healthy Crop')}</span>
              <span className="text-xs text-[#1F7A4D] font-extrabold block">100% Clean Harvest</span>
            </div>

            {/* Card 4: Pesticide Analysis */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">🧪 Pesticide Residue</span>
              <span className="text-lg font-black text-[#1F7A4D] block truncate">{listing.isOrganic ? '0% Residue (Organic)' : 'Safe ICAR Limit'}</span>
              <span className="text-xs text-[#1F7A4D] font-extrabold block">Food Safety Certified</span>
            </div>

            {/* Card 5: Shelf Life */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">⏳ Estimated Shelf Life</span>
              <span className="text-2xl font-black text-gray-900 block">14 Days</span>
              <span className="text-xs text-gray-500 font-extrabold block">Extended Durability</span>
            </div>

            {/* Card 6: Storage Recommendation */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">📦 Storage Advice</span>
              <span className="text-sm font-black text-gray-900 block truncate">{listing.storageType || 'Cool & Dry (12-15°C)'}</span>
              <span className="text-xs text-gray-500 font-extrabold block">Controlled Ambient</span>
            </div>

            {/* Card 7: Quality Grade */}
            <div className="p-5 bg-gradient-to-br from-[#FFFDF6] to-white rounded-2xl border-2 border-[#E8F7EE] shadow-sm hover:shadow-md transition-all space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">🛡️ Quality Grade</span>
              <span className="text-2xl font-black text-[#1F7A4D] block">Grade A+</span>
              <span className="text-xs text-[#1F7A4D] font-extrabold block">Premium Export Quality</span>
            </div>

            {/* Card 8: View Certificate Card */}
            <div className="p-5 bg-gradient-to-br from-[#E8F7EE]/60 to-white rounded-2xl border-2 border-[#1F7A4D]/30 shadow-sm flex flex-col justify-between space-y-3">
              <div>
                <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-widest block">📄 Official Certificate</span>
                <span className="text-xs font-black text-gray-900 block mt-1">Verified Inspection ID</span>
              </div>
              <button 
                onClick={() => window.print()}
                className="w-full py-2.5 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-sm border-b-2 border-emerald-950 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FileText size={14} /> View Certificate
              </button>
            </div>

          </div>

        </div>

        {/* CROPVERIFY AI DETAILED REPORT */}
        {listing.verification && (
          <VerificationReport
            listingId={listingId}
            verification={listing.verification}
            cropName={listing.cropName}
          />
        )}

        {/* APMC MANDI COMPARISON */}
        {apmcPriceData && (
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-[#E8F7EE] p-8 shadow-lg space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <TrendingUp size={24} className="text-[#FF8C42]" />
                <h3 className="text-base font-black text-gray-900 uppercase tracking-wider">APMC Mandi Rate Comparison</h3>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                Live Feed
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 text-xs">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase block">Farmer Price</span>
                <span className="text-2xl font-black text-[#FF8C42] mt-1 block">₹{price} / {listing.unit || 'kg'}</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase block">Today APMC Rate</span>
                <span className="text-2xl font-black text-gray-900 mt-1 block">₹{apmcPrice} / kg</span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase block">Price Difference</span>
                <span className={`text-2xl font-black mt-1 block ${priceDiff && priceDiff <= 0 ? 'text-emerald-600' : 'text-[#FF8C42]'}`}>
                  {priceDiff != null ? `${priceDiff > 0 ? '+' : ''}${priceDiff}%` : '—'}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase block">Reference Mandi</span>
                <span className="text-sm font-black text-gray-900 mt-1 block truncate">{apmcPriceData.mandi || 'Karnataka APMC'}</span>
              </div>
            </div>
          </div>
        )}

        {/* HARVEST DESCRIPTION */}
        <div className="bg-white rounded-[20px] border border-zinc-100 p-6 sm:p-8 shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Harvest Description & Cultivation Notes</h3>
          <p className="text-sm text-zinc-800 leading-relaxed font-medium">
            {showFullDesc ? description : shortDesc}
          </p>
          {description.length > 200 && (
            <button 
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-xs font-bold text-orange-600 hover:underline cursor-pointer"
            >
              {showFullDesc ? 'Show Less ↑' : 'Read Full Specs ↓'}
            </button>
          )}
        </div>

      </div>

      {/* STICKY BOTTOM ACTION CTA BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t-2 border-[#E8F7EE] p-4 md:p-5 z-40 shadow-2xl">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-100 rounded-2xl border border-gray-200 overflow-hidden">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 font-black cursor-pointer"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center text-sm font-black text-gray-900">{quantity}</span>
              <button 
                onClick={() => setQuantity(Math.min(listing.quantity || 999, quantity + 1))}
                className="w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-200 font-black cursor-pointer"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="hidden sm:block">
              <span className="text-[9px] font-black text-gray-400 uppercase block">Total Amount</span>
              <span className="text-xl font-black text-gray-900">₹{(price * quantity).toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex gap-3 flex-1 sm:flex-none">
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="flex-1 sm:px-6 min-h-[48px] py-3 bg-[#1F7A4D] hover:bg-[#165b38] text-white text-sm font-bold rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>{addingToCart ? 'Adding...' : addedToCart ? 'Added ✓' : 'Add to Cart'}</span>
              <ChevronRight size={16} className="shrink-0" />
            </button>
            <button
              onClick={handleBuyNow}
              className="flex-1 sm:px-6 min-h-[48px] py-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-sm font-bold rounded-xl cursor-pointer shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Buy Now</span>
              <ChevronRight size={16} className="shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* FARMER CONTACT DETAILS MODAL */}
      {showContactModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div 
            className="bg-white rounded-3xl border-2 border-[#E8F7EE] max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowContactModal(false)}
              className="absolute top-5 right-5 p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 border-b border-gray-100 pb-5">
              <div className="w-16 h-16 rounded-2xl bg-[#1F7A4D] text-white flex items-center justify-center text-2xl font-black shadow-md">
                {farmerName.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">{farmerName}</h3>
                <span className="text-xs font-bold text-[#1F7A4D] bg-[#E8F7EE] px-3 py-1 rounded-full border border-[#1F7A4D]/20 block mt-1">
                  Verified Crop Cultivator
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-bold text-gray-700">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block">Phone Number</span>
                  <span className="text-sm font-black text-gray-900 mt-0.5 block">{farmerPhone || '+91 98765 43210'}</span>
                </div>
                <a 
                  href={`tel:${farmerPhone || '+919876543210'}`}
                  className="px-4 py-2 bg-[#1F7A4D] text-white text-xs font-black rounded-xl hover:bg-[#165b38] flex items-center gap-1.5"
                >
                  <Phone size={14} /> Call Now
                </a>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase block">WhatsApp Contact</span>
                  <span className="text-xs font-extrabold text-emerald-700 mt-0.5 block">Direct WhatsApp Message</span>
                </div>
                <a 
                  href={`https://wa.me/${(farmerPhone || '919876543210').replace(/\D/g,'')}?text=Hi%20${encodeURIComponent(farmerName)},%20I%20am%20interested%20in%20your%20harvest%20lot%20of%20${encodeURIComponent(listing.cropName)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <MessageSquare size={14} /> WhatsApp
                </a>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[9px] font-black text-gray-400 uppercase block">Farm Location & Region</span>
                <span className="text-xs font-black text-gray-900 block">{locationStr}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  navigate('/chat');
                }}
                className="w-full py-4 bg-gray-900 hover:bg-black text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-md border-b-4 border-black active:border-b-0 active:translate-y-1 flex items-center justify-center gap-2"
              >
                <Sparkles size={16} /> Open KisanMitra AI Sourcing Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {showFullImage && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <button 
            onClick={() => setShowFullImage(false)}
            className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 text-white rounded-full cursor-pointer"
          >
            <X size={28} />
          </button>
          <img 
            src={currentPhoto} 
            alt={listing.cropName} 
            className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

    </div>
  );
}
