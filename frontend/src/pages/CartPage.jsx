import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useListings } from '../context/ListingContext';
import CropImage from '../components/CropImage';
import {
  ArrowLeft, ShoppingCart, Minus, Plus, Trash2, ShoppingBag, ArrowRight,
  Package, Heart, ExternalLink, ShieldCheck, MapPin, Tag, ChevronRight, Store, Phone
} from 'lucide-react';

/* ── STYLES (Flat consts to prevent esbuild printer stack overflow) ── */
const pageWrapperStyle = { minHeight: '100vh', background: '#fafaf9', fontFamily: '"Inter", system-ui, sans-serif', paddingBottom: 120 };
const topNavStyle = { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #f4f4f5' };
const topNavInnerStyle = { maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const backBtnStyle = { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', padding: '0.4rem 0.6rem', borderRadius: 8 };
const topNavCenterStyle = { display: 'flex', alignItems: 'center', gap: 10 };
const pageTitleStyle = { fontSize: '1.1rem', fontWeight: 800, color: '#18181b', margin: 0 };
const itemCountBadgeStyle = { background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', borderRadius: 99, padding: '2px 10px', fontSize: '0.7rem', fontWeight: 700 };
const contentGridStyle = { maxWidth: 1200, margin: '0 auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' };
const itemsColumnStyle = { display: 'flex', flexDirection: 'column', gap: '1rem' };
const summaryColumnStyle = { position: 'sticky', top: 80 };

const itemCardStyle = { background: '#ffffff', borderRadius: 20, border: '1px solid #f4f4f5', padding: '1.25rem', animation: 'fadeInUp 0.4s ease-out' };
const itemTopRowStyle = { display: 'flex', gap: '1rem' };
const itemImageWrapStyle = { width: 130, height: 130, borderRadius: 16, overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative', border: '1px solid #f4f4f5' };
const aiBadgeStyle = { position: 'absolute', bottom: 6, left: 6, background: 'rgba(22,101,52,0.9)', color: '#fff', display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 8, fontSize: '0.6rem', fontWeight: 700, backdropFilter: 'blur(4px)' };
const itemDetailsStyle = { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 };
const itemNameStyle = { fontSize: '1.05rem', fontWeight: 800, color: '#18181b', margin: 0, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const itemVarietyStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 };
const farmerRowStyle = { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 };
const farmerAvatarStyle = { width: 26, height: 26, borderRadius: 8, background: '#fff7ed', color: '#ea580c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, border: '1px solid #fed7aa' };
const farmerNameTextStyle = { fontSize: '0.8rem', fontWeight: 700, color: '#3f3f46', display: 'block', lineHeight: 1.2 };
const farmerLocTextStyle = { fontSize: '0.65rem', fontWeight: 500, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 3 };
const priceRowStyle = { display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 };
const priceLabelStyle = { fontSize: '1.15rem', fontWeight: 900, color: '#ea580c' };
const priceUnitStyle = { fontSize: '0.75rem', fontWeight: 600, color: '#a1a1aa' };
const stockTextStyle = { fontSize: '0.7rem', fontWeight: 600, color: '#71717a', margin: 0 };

const itemBottomRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5', flexWrap: 'wrap', gap: '0.75rem' };
const qtyGroupStyle = { display: 'flex', alignItems: 'center', gap: 0, background: '#f4f4f5', borderRadius: 12, overflow: 'hidden', border: '1px solid #e4e4e7' };
const qtyBtnStyle = { width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: 'none', color: '#3f3f46', cursor: 'pointer' };
const qtyValueStyle = { minWidth: 40, textAlign: 'center', fontSize: '0.9rem', fontWeight: 800, color: '#18181b' };
const qtyUnitLabelStyle = { fontSize: '0.7rem', fontWeight: 600, color: '#a1a1aa', padding: '0 10px 0 2px' };

const subtotalBlockStyle = { textAlign: 'right' };
const subtotalLabelStyle = { display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em' };
const subtotalValueStyle = { fontSize: '1.3rem', fontWeight: 900, color: '#18181b' };

const actionsRowStyle = { display: 'flex', alignItems: 'center', gap: 0, marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f4f4f5', flexWrap: 'wrap' };
const actionBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', fontSize: '0.75rem', fontWeight: 600, color: '#71717a', cursor: 'pointer', padding: '6px 10px', borderRadius: 8 };
const actionDividerStyle = { display: 'inline-block', width: 1, height: 16, background: '#e4e4e7' };

const summaryCardStyle = { background: '#fff', borderRadius: 20, border: '1px solid #f4f4f5', padding: '1.5rem' };
const summaryTitleStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 800, color: '#18181b', margin: '0 0 1.25rem' };
const summaryRowsStyle = { display: 'flex', flexDirection: 'column', gap: 10 };
const summaryRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#52525b' };
const summaryRowValStyle = { fontWeight: 700, color: '#18181b' };
const summaryDividerStyle = { height: 1, background: '#f4f4f5', margin: '1rem 0' };
const totalRowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1rem', fontWeight: 800, color: '#18181b', marginBottom: '1.25rem' };
const totalValStyle = { fontSize: '1.5rem', fontWeight: 900, color: '#ea580c' };
const checkoutBtnStyle = { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.9rem', background: 'linear-gradient(135deg, #ea580c, #d97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 16px rgba(234,88,12,0.25)', letterSpacing: '0.02em' };
const summaryTrustStyle = { display: 'flex', flexDirection: 'column', gap: 8, marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #f4f4f5' };
const trustItemStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 600, color: '#71717a' };

const emptyWrapperStyle = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#fafaf9', fontFamily: '"Inter", system-ui, sans-serif' };
const emptyCardStyle = { textAlign: 'center', maxWidth: 480, padding: '3rem 2rem', background: '#fff', borderRadius: 28, border: '1px solid #f4f4f5', animation: 'fadeInUp 0.5s ease-out' };
const emptyIconCircleStyle = { width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #fff7ed, #fef3c7)', border: '2px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' };
const emptyTitleStyle = { fontSize: '1.5rem', fontWeight: 900, color: '#18181b', margin: '0 0 0.75rem' };
const emptyDescStyle = { fontSize: '0.9rem', color: '#71717a', lineHeight: 1.6, margin: '0 0 1.75rem', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' };
const emptyBtnStyle = { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.85rem 2rem', background: 'linear-gradient(135deg, #ea580c, #d97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(234,88,12,0.25)' };
const emptyTrustStyle = { display: 'flex', justifyContent: 'center', gap: 12, marginTop: '2rem', flexWrap: 'wrap' };
const trustChipStyle = { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: '#f4f4f5', fontSize: '0.7rem', fontWeight: 600, color: '#52525b' };

const mobileBarStyle = { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid #f4f4f5', zIndex: 50, display: 'none' };
const mobileBarInnerStyle = { maxWidth: 600, margin: '0 auto', padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };
const mobileBarLabelStyle = { fontSize: '0.65rem', fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 };
const mobileBarTotalStyle = { fontSize: '1.4rem', fontWeight: 900, color: '#18181b', margin: 0 };
const mobileCheckoutBtnStyle = { display: 'flex', alignItems: 'center', gap: 6, padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg, #ea580c, #d97706)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,88,12,0.25)' };

/* ── SKELETON LOADING ── */
function CartSkeleton() {
  return (
    <div style={pageWrapperStyle}>
      <div style={contentGridStyle}>
        <div style={itemsColumnStyle}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ ...itemCardStyle, animation: 'pulse 1.5s ease-in-out infinite' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ width: 120, height: 120, borderRadius: 16, background: '#f4f4f5' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 18, background: '#f4f4f5', borderRadius: 8, width: '60%', marginBottom: 10 }} />
                  <div style={{ height: 14, background: '#f4f4f5', borderRadius: 8, width: '40%', marginBottom: 10 }} />
                  <div style={{ height: 14, background: '#f4f4f5', borderRadius: 8, width: '50%', marginBottom: 10 }} />
                  <div style={{ height: 32, background: '#f4f4f5', borderRadius: 8, width: '30%' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ ...summaryCardStyle, animation: 'pulse 1.5s ease-in-out infinite' }}>
            <div style={{ height: 20, background: '#f4f4f5', borderRadius: 8, width: '50%', marginBottom: 16 }} />
            <div style={{ height: 16, background: '#f4f4f5', borderRadius: 8, width: '100%', marginBottom: 12 }} />
            <div style={{ height: 16, background: '#f4f4f5', borderRadius: 8, width: '100%', marginBottom: 12 }} />
            <div style={{ height: 16, background: '#f4f4f5', borderRadius: 8, width: '100%', marginBottom: 20 }} />
            <div style={{ height: 48, background: '#f4f4f5', borderRadius: 14 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── EMPTY CART ── */
function EmptyCart({ onBrowse }) {
  return (
    <div style={emptyWrapperStyle}>
      <div style={emptyCardStyle}>
        <div style={emptyIconCircleStyle}>
          <ShoppingBag size={48} color="#d97706" strokeWidth={1.5} />
        </div>
        <h2 style={emptyTitleStyle}>Your cart is empty</h2>
        <p style={emptyDescStyle}>
          Looks like you haven't added any crops to your cart yet.
          Browse our marketplace to find fresh produce directly from farmers.
        </p>
        <button onClick={onBrowse} style={emptyBtnStyle}>
          <Store size={18} />
          Browse Marketplace
          <ArrowRight size={16} />
        </button>
        <div style={emptyTrustStyle}>
          <span style={trustChipStyle}><ShieldCheck size={14} /> AI Verified Crops</span>
          <span style={trustChipStyle}><Tag size={14} /> Best Prices</span>
        </div>
      </div>
    </div>
  );
}

/* ── CART ITEM ── */
function CartItem({ item, onQuantityChange, onRemove, onToggleSaved, isSaved, navigate }) {
  const listing = item.listing || {};
  const itemId = listing._id || listing.id || item.listing;
  const price = listing.pricePerUnit ?? item.priceAtAdd ?? 0;
  const photo = listing.images?.[0]?.url || listing.photo || null;
  const cropName = listing.cropName || 'Unknown Crop';
  const variety = listing.variety || '';
  const farmerName = listing.farmer?.name || '';
  const farmerLocation = listing.location?.address || listing.location?.district || '';
  const isAiVerified = listing.aiVerified || false;
  const stock = listing.quantity || listing.inventory || 0;
  const unit = listing.unit || 'kg';
  const subtotal = price * item.quantity;

  const whatsappLink = listing.farmer?.phone
    ? `https://wa.me/91${listing.farmer.phone.replace(/\D/g, '')}?text=Hi, I'm interested in your ${cropName} listing on KisanBazaar.`
    : null;

  return (
    <div style={itemCardStyle}>
      <div style={itemTopRowStyle}>
        <div style={itemImageWrapStyle} onClick={() => navigate(`/listing/${itemId}`)}>
          <CropImage cropName={cropName} photo={photo} size="sm" className="w-full h-full" />
          {isAiVerified && (
            <div style={aiBadgeStyle}>
              <ShieldCheck size={12} />
              <span>AI Verified</span>
            </div>
          )}
        </div>

        <div style={itemDetailsStyle}>
          <h3 style={itemNameStyle} onClick={() => navigate(`/listing/${itemId}`)}>{cropName}</h3>
          {variety && <p style={itemVarietyStyle}>{variety}</p>}

          {farmerName && (
            <div style={farmerRowStyle}>
              <div style={farmerAvatarStyle}>{farmerName.charAt(0).toUpperCase()}</div>
              <div>
                <span style={farmerNameTextStyle}>{farmerName}</span>
                {farmerLocation && (
                  <span style={farmerLocTextStyle}><MapPin size={10} /> {farmerLocation}</span>
                )}
              </div>
            </div>
          )}

          <div style={priceRowStyle}>
            <span style={priceLabelStyle}>₹{price.toLocaleString('en-IN')}</span>
            <span style={priceUnitStyle}>/ {unit}</span>
          </div>

          {stock > 0 && (
            <p style={stockTextStyle}>
              {stock > 10
                ? <><span style={{ color: '#16a34a' }}>In Stock</span> — {stock} {unit} available</>
                : <><span style={{ color: '#dc2626' }}>Low Stock</span> — Only {stock} {unit} left</>
              }
            </p>
          )}
        </div>
      </div>

      <div style={itemBottomRowStyle}>
        <div style={qtyGroupStyle}>
          <button
            onClick={() => onQuantityChange(itemId, item.quantity - 1)}
            disabled={item.quantity <= 1}
            style={{ ...qtyBtnStyle, opacity: item.quantity <= 1 ? 0.4 : 1 }}
          >
            <Minus size={14} />
          </button>
          <span style={qtyValueStyle}>{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(itemId, item.quantity + 1)}
            disabled={stock > 0 && item.quantity >= stock}
            style={{ ...qtyBtnStyle, opacity: stock > 0 && item.quantity >= stock ? 0.4 : 1 }}
          >
            <Plus size={14} />
          </button>
          <span style={qtyUnitLabelStyle}>{unit}</span>
        </div>

        <div style={subtotalBlockStyle}>
          <span style={subtotalLabelStyle}>Subtotal</span>
          <span style={subtotalValueStyle}>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
      </div>

      <div style={actionsRowStyle}>
        <button onClick={() => onRemove(itemId)} style={actionBtnStyle} title="Remove">
          <Trash2 size={14} /> Remove
        </button>
        <span style={actionDividerStyle} />
        <button onClick={() => onToggleSaved(itemId)} style={actionBtnStyle} title={isSaved ? 'Saved' : 'Save for later'}>
          <Heart size={14} fill={isSaved ? '#ea580c' : 'none'} color={isSaved ? '#ea580c' : 'currentColor'} />
          {isSaved ? 'Saved' : 'Save for Later'}
        </button>
        <span style={actionDividerStyle} />
        <button onClick={() => navigate(`/listing/${itemId}`)} style={actionBtnStyle} title="View Product">
          <ExternalLink size={14} /> View
        </button>
        {whatsappLink && (
          <>
            <span style={actionDividerStyle} />
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" style={{ ...actionBtnStyle, textDecoration: 'none' }} title="Contact Farmer">
              <Phone size={14} /> Contact
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/* ── ORDER SUMMARY ── */
function OrderSummary({ cartItems, onCheckout, itemsCount }) {
  const itemsTotal = cartItems.reduce((sum, item) => {
    const p = item.listing?.pricePerUnit ?? item.priceAtAdd ?? 0;
    return sum + p * item.quantity;
  }, 0);

  const deliveryCharge = 0;
  const finalTotal = itemsTotal + deliveryCharge;

  return (
    <div style={summaryCardStyle}>
      <h3 style={summaryTitleStyle}>
        <Package size={18} /> Order Summary
      </h3>

      <div style={summaryRowsStyle}>
        <div style={summaryRowStyle}>
          <span>Items ({itemsCount})</span>
          <span style={summaryRowValStyle}>₹{itemsTotal.toLocaleString('en-IN')}</span>
        </div>
        <div style={summaryRowStyle}>
          <span>Delivery</span>
          <span style={{ ...summaryRowValStyle, color: '#16a34a', fontWeight: 700 }}>
            {deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}
          </span>
        </div>
      </div>

      <div style={summaryDividerStyle} />

      <div style={totalRowStyle}>
        <span>Total</span>
        <span style={totalValStyle}>₹{finalTotal.toLocaleString('en-IN')}</span>
      </div>

      <button onClick={onCheckout} style={checkoutBtnStyle}>
        Proceed to Checkout
        <ChevronRight size={18} />
      </button>

      <div style={summaryTrustStyle}>
        <div style={trustItemStyle}><ShieldCheck size={14} color="#16a34a" /> Secure Checkout</div>
      </div>
    </div>
  );
}

/* ── MAIN CART PAGE ── */
export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, updateQuantity, removeFromCart, cartItemsCount } = useCart();
  const { toggleSaved, isSaved } = useListings();

  const cartItems = cart?.items || [];

  const handleQuantityChange = async (listingId, newQty) => {
    if (newQty < 1) return;
    try { await updateQuantity(listingId, newQty); } catch (err) { console.error(err); }
  };

  const handleRemove = async (listingId) => {
    try { await removeFromCart(listingId); } catch (err) { console.error(err); }
  };

  const handleToggleSaved = async (listingId) => {
    try { await toggleSaved(listingId); } catch (err) { console.error(err); }
  };

  if (loading) return <CartSkeleton />;
  if (cartItems.length === 0) return <EmptyCart onBrowse={() => navigate('/buyer/dashboard')} />;

  const totalPrice = cartItems.reduce((sum, item) => {
    const p = item.listing?.pricePerUnit ?? item.priceAtAdd ?? 0;
    return sum + p * item.quantity;
  }, 0);

  return (
    <div style={pageWrapperStyle}>
      <div style={topNavStyle}>
        <div style={topNavInnerStyle}>
          <button onClick={() => navigate(-1)} style={backBtnStyle}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div style={topNavCenterStyle}>
            <ShoppingCart size={20} color="#ea580c" />
            <h1 style={pageTitleStyle}>Shopping Cart</h1>
            <span style={itemCountBadgeStyle}>{cartItemsCount} {cartItemsCount === 1 ? 'item' : 'items'}</span>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </div>

      <div style={contentGridStyle} className="cart-content-grid">
        <div style={itemsColumnStyle}>
          {cartItems.map((item) => (
            <CartItem
              key={item.listing?._id || item.listing?.id || item.listing}
              item={item}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
              onToggleSaved={handleToggleSaved}
              isSaved={isSaved(item.listing?._id || item.listing?.id || item.listing)}
              navigate={navigate}
            />
          ))}
        </div>

        <div style={summaryColumnStyle} className="cart-summary-col">
          <OrderSummary
            cartItems={cartItems}
            itemsCount={cartItemsCount}
            onCheckout={() => navigate('/checkout')}
          />
        </div>
      </div>

      <div style={mobileBarStyle} className="cart-mobile-bar">
        <div style={mobileBarInnerStyle}>
          <div>
            <p style={mobileBarLabelStyle}>Total</p>
            <p style={mobileBarTotalStyle}>₹{totalPrice.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => navigate('/checkout')} style={mobileCheckoutBtnStyle}>
            Checkout <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 900px) {
          .cart-content-grid { grid-template-columns: 1fr !important; }
          .cart-summary-col { position: static !important; }
        }
        @media (max-width: 640px) {
          .cart-summary-col { display: none !important; }
          .cart-mobile-bar { display: block !important; }
          .cart-content-grid { padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
}
