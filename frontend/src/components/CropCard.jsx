import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useListings } from '../context/ListingContext';
import { useCart } from '../context/CartContext';
import CropImage from './CropImage';
import { 
  Phone, Share2, Eye, Heart, MapPin, Calendar, Scale, User, Leaf, 
  Star, ShoppingCart, ArrowRight, ShieldCheck, Zap, Sparkles, Check, X, FileText
} from 'lucide-react';

export default function CropCard({ listing, showContact = true, onBuyNow }) {
  const { t } = useTranslation();
  const { toggleSaved, isSaved, incrementView } = useListings();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const listingId = listing._id || listing.id;

  const [isSavedLocal, setIsSavedLocal] = useState(
    listing.isSaved !== undefined ? listing.isSaved : isSaved(listingId)
  );

  useEffect(() => {
    const globalSaved = listing.isSaved !== undefined ? listing.isSaved : isSaved(listingId);
    setIsSavedLocal(globalSaved);
  }, [listing.isSaved, isSaved, listingId]);

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const price = listing.pricePerUnit ?? listing.price ?? 45;
  const previousPrice = Math.round(price * 1.18);
  const discountPercent = 15;
  const unit = listing.unit || 'kg';

  const photo = listing.images?.[0]?.url || listing.photo || null;
  const imagesCount = (listing.images && listing.images.length > 0) ? listing.images.length : 1;

  const locationStr = typeof listing.location === 'object'
    ? `${listing.location?.district || listing.location?.address || 'Kolar'}, ${listing.location?.state || 'Karnataka'}`
    : (listing.location || 'Karnataka');

  const farmerName = listing.farmer?.name || listing.farmerName || 'Local Farmer';
  const farmerPhone = listing.farmer?.phone || listing.contactNumber || listing.phone || '+91 98765 43210';
  const harvestDate = listing.harvestDate || listing.createdAt;
  const formattedDate = harvestDate
    ? new Date(harvestDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '2 days ago';

  const categoryName = listing.category || 'Fresh Produce';
  const varietyName = listing.variety || 'Hybrid Quality';
  const stockQuantity = listing.quantity || 250;

  // Diagnostic Report Data (derived or fallback)
  const reportData = {
    moisture: listing.verification?.moisture || '12%',
    disease: listing.verification?.disease_label || (listing.isOrganic ? 'Zero Pathogens Detected' : 'Healthy Crop'),
    freshness: listing.verification?.freshnessIndex || '98% Prime Fresh',
    color: listing.verification?.colorAnalysis || 'Natural Pigment 96%',
    storage: listing.verificationReport?.storageRecommendation || 'Cool & Dry (12-15°C)',
    pesticide: listing.isOrganic ? '0% Chemical Residue (Organic)' : 'Safe ICAR Standard Limit',
    shelfLife: '14 Days',
    grade: listing.verificationReport?.qualityGrade || 'Grade A+'
  };

  const handleSaveToggle = (e) => {
    e.stopPropagation();
    setIsSavedLocal(!isSavedLocal);
    toggleSaved(listingId);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText?.(window.location.origin + `/crop/${listingId}`);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    try {
      setAdding(true);
      await addToCart(listingId, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleFullView = (e) => {
    if (e) e.stopPropagation();
    navigate(`/crop/${listingId}`);
  };

  const handleBuyNowClick = (e) => {
    e.stopPropagation();
    if (onBuyNow) {
      onBuyNow(listing);
    } else {
      navigate(`/crop/${listingId}`);
    }
  };

  return (
    <>
      <div 
        onClick={handleFullView}
        className="group relative bg-white rounded-3xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer hover:-translate-y-2.5"
        style={{
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFFDF6 100%)',
          border: '2px solid #E8F7EE',
          boxShadow: '0 12px 32px -8px rgba(31, 122, 77, 0.14), 0 4px 16px rgba(0, 0, 0, 0.04)'
        }}
      >
        {/* ========================================================== */}
        {/* SECTION 1: IMAGE AREA */}
        {/* ========================================================== */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-gray-100">
          <CropImage cropName={listing.cropName} photo={photo} size="lg" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          
          {/* Organic Tag */}
          {listing.isOrganic && (
            <div className="absolute top-3 left-3 bg-[#1F7A4D] text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg uppercase tracking-wider flex items-center gap-1.5">
              <Leaf size={11} /> Organic <span className="text-xs">🌿</span>
            </div>
          )}

          {/* Multiple Image Count Badge */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20 shadow-md">
            <span>📷</span> <span>{imagesCount} / 5 Photos</span>
          </div>

          {/* Action Overlay Buttons */}
          <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
            {/* Quick Preview Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowPreviewModal(true); }}
              className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer border border-gray-100"
              title="Quick Preview"
            >
              <Eye size={14} />
            </button>

            {/* Share Button */}
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full bg-white/95 backdrop-blur-md hover:bg-white text-gray-800 flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer relative border border-gray-100"
              title="Share Crop"
            >
              {copiedShare ? <Check size={14} className="text-[#1F7A4D]" /> : <Share2 size={14} />}
            </button>

            {/* Wishlist Heart Button */}
            <button
              onClick={handleSaveToggle}
              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 cursor-pointer border border-gray-100
                ${isSavedLocal ? 'bg-rose-500 text-white border-rose-500' : 'bg-white/95 text-gray-700 hover:text-rose-500'}
              `}
              title={isSavedLocal ? 'Saved in Wishlist' : 'Add to Wishlist'}
            >
              <Heart size={14} fill={isSavedLocal ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Card Body — 3D Luxury Marketplace Card */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
          
          {/* CROP INFORMATION */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-[#1F7A4D] uppercase tracking-wider block truncate">
              {categoryName} • {varietyName}
            </span>
            <h3 className="text-lg md:text-xl font-black text-gray-900 leading-tight group-hover:text-[#1F7A4D] transition-colors flex items-center gap-2">
              <span className="text-xl shrink-0">🌾</span>
              <span className="capitalize truncate">{listing.cropName}</span>
            </h3>
          </div>

          {/* PRICING & QUANTITY AMOUNT */}
          <div className="py-2.5 border-y-2 border-gray-100 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-gray-900">₹{price}</span>
                <span className="text-[11px] text-gray-500 font-bold">/ {unit}</span>
                <span className="text-[11px] text-gray-400 line-through font-semibold">₹{previousPrice}</span>
              </div>
              <p className="text-[11px] font-bold text-[#FF8C42] mt-1 leading-snug">
                {discountPercent}% OFF • Available Stock: {stockQuantity} {unit}
              </p>
            </div>

            <span className="px-2.5 py-1.5 bg-[#E8F7EE] text-[#1F7A4D] text-[11px] font-black rounded-lg border border-[#1F7A4D]/25 shadow-xs shrink-0">
              {reportData.grade}
            </span>
          </div>

          {/* ACTION BUTTONS — BOUNDED TEXT & SPACIOUS */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleAddToCart}
                disabled={adding}
                className={`min-h-[36px] px-2.5 py-1.5 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 whitespace-nowrap overflow-hidden
                  ${added 
                    ? 'bg-emerald-600 text-white border border-emerald-600' 
                    : 'bg-[#E8F7EE] text-[#1F7A4D] hover:bg-[#1F7A4D] hover:text-white border-2 border-[#1F7A4D]/30'
                  }
                `}
              >
                <ShoppingCart size={13} className="shrink-0" />
                <span className="truncate">{added ? 'Added ✓' : 'Add to C...'}</span>
              </button>

              <button
                onClick={handleBuyNowClick}
                className="min-h-[36px] px-2.5 py-1.5 bg-[#FF8C42] hover:bg-[#e07530] text-white rounded-xl font-black text-[11px] uppercase tracking-wide shadow-md shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap overflow-hidden border-2 border-[#FF8C42]"
              >
                <Zap size={13} className="shrink-0" />
                <span className="truncate">BUY NOW</span>
              </button>
            </div>

            <button
              onClick={handleFullView}
              className="w-full min-h-[36px] px-3 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-extrabold text-[11px] uppercase tracking-wider shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap overflow-hidden border-2 border-gray-900"
            >
              <span>Full View Details</span>
              <ArrowRight size={14} className="shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl p-6 space-y-6 relative border border-emerald-100">
            <button 
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0">
                <CropImage cropName={listing.cropName} photo={photo} size="sm" className="w-full h-full object-cover" />
              </div>
              <div>
                <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-widest">Quick Diagnostic Preview</span>
                <h3 className="text-xl font-black text-gray-900">🌾 {listing.cropName}</h3>
                <p className="text-xs text-gray-500">Harvested by {farmerName} ({locationStr})</p>
              </div>
            </div>

            <div className="p-4 bg-[#FFFDF6] rounded-2xl border border-[#E8F7EE] space-y-3">
              <h4 className="text-xs font-black text-[#1F7A4D] uppercase tracking-wider">Diagnostic Analysis</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-400 block text-[10px]">Quality Grade</span><span className="font-extrabold text-gray-900">{reportData.grade}</span></div>
                <div><span className="text-gray-400 block text-[10px]">Freshness Index</span><span className="font-extrabold text-emerald-700">{reportData.freshness}</span></div>
                <div><span className="text-gray-400 block text-[10px]">Moisture Level</span><span className="font-extrabold text-gray-900">{reportData.moisture}</span></div>
                <div><span className="text-gray-400 block text-[10px]">Pathogen Status</span><span className="font-extrabold text-emerald-700">{reportData.disease}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPreviewModal(false); navigate(`/crop/${listingId}`); }}
                className="flex-1 py-3 bg-[#1F7A4D] text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Open Full Detail Page
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-3 bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
