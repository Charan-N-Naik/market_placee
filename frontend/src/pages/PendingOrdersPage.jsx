import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CropImage from '../components/CropImage';
import LiveDeliveryTracker from '../components/LiveDeliveryTracker';
import api from '../api/axios';
import {
  ArrowLeft, ShoppingBag, MapPin, Phone, MessageSquare, Star, Info,
  CheckCircle, Truck, Package, Clock, ShieldCheck, Download, AlertTriangle,
  RefreshCw, X, ChevronRight, MessageCircle, ExternalLink, Calendar, Receipt,
  Check, PhoneCall
} from 'lucide-react';

/* ─── Invoice HTML generator ─── */
function generateInvoiceHTML(order, listingCache) {
  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const orderId = order?._id?.slice?.(-8)?.toUpperCase?.() || 'KB-ORDER';
  
  const rows = order.items.map(item => {
    const listingId = item.listing?._id || item.listing;
    const cache = listingCache[listingId] || {};
    const cropName = cache.cropName || item.listing?.cropName || 'Crop';
    const unit = cache.unit || item.listing?.unit || 'kg';
    const price = item.priceAtPurchase || cache.pricePerUnit || item.listing?.pricePerUnit || 0;
    return `<tr>
      <td style="padding:12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1f2937">${cropName}</td>
      <td style="padding:12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#4b5563;text-align:center">${item.quantity} ${unit}</td>
      <td style="padding:12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#4b5563;text-align:right">₹${price.toLocaleString('en-IN')}</td>
      <td style="padding:12px;border-bottom:1px solid #f3f4f6;font-size:14px;color:#1f2937;text-align:right;font-weight:700">₹${(price * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Invoice #${orderId}</title>
<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
<body style="font-family:'Inter',system-ui,sans-serif;margin:0;padding:40px;background:#fafafa">
<div style="max-width:700px;margin:0 auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 25px rgba(0,0,0,0.05);border:1px solid #e5e7eb">
  <div style="background:linear-gradient(135deg,#ea580c,#d97706);padding:36px 40px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:-0.5px">KisanBazaar</h1>
        <p style="margin:4px 0 0;font-size:12px;opacity:0.85;text-transform:uppercase;letter-spacing:1.5px">TAX INVOICE</p></div>
      <div style="text-align:right"><p style="margin:0;font-size:14px;opacity:0.9">Invoice #${orderId}</p>
        <p style="margin:4px 0 0;font-size:14px;opacity:0.9">${dateStr}</p></div>
    </div>
  </div>
  <div style="padding:40px">
    <div style="display:flex;justify-content:space-between;margin-bottom:32px">
      <div><p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Billed To</p>
        <p style="margin:0;font-weight:700;font-size:15px;color:#111827">${order.deliveryAddress?.name || 'Customer'}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#4b5563">${order.deliveryAddress?.addressLine1 || ''}${order.deliveryAddress?.addressLine2 ? ', ' + order.deliveryAddress.addressLine2 : ''}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#4b5563">${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.postalCode || ''}</p>
      </div>
      <div style="text-align:right"><p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Payment Status</p>
        <p style="margin:0;font-size:13px;color:#111827;font-weight:700;text-transform:uppercase">${order.status === 'pending' ? 'Pending' : order.status === 'cancelled' ? 'Cancelled' : 'Paid'}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#6b7280">${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px">
      <thead><tr style="background:#fafafa">
        <th style="padding:12px;text-align:left;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Crop Description</th>
        <th style="padding:12px;text-align:center;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Qty</th>
        <th style="padding:12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Unit Price</th>
        <th style="padding:12px;text-align:right;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e5e7eb">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <div style="width:250px">
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#4b5563"><span>Subtotal</span><span>₹${order.totalAmount.toLocaleString('en-IN')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:14px;color:#16a34a"><span>Delivery</span><span>FREE</span></div>
        <div style="border-top:2px solid #ea580c;margin-top:10px;padding-top:12px;display:flex;justify-content:space-between;font-size:18px;font-weight:900;color:#ea580c"><span>Total Amount</span><span>₹${order.totalAmount.toLocaleString('en-IN')}</span></div>
      </div>
    </div>
  </div>
  <div style="background:#fafafa;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:13px;color:#6b7280;font-weight:500">Thank you for directly supporting local agriculture on KisanBazaar.</p>
  </div>
</div></body></html>`;
}

export default function BuyerOrdersPage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user } = useAuth();
  
  const [orders, setOrders] = useState([]);
  const [listingCache, setListingCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab control
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [trackingOrder, setTrackingOrder] = useState(null);
  const [contactingOrder, setContactingOrder] = useState(null);
  const [ratingOrder, setRatingOrder] = useState(null);
  
  // Rating states
  const [ratingVal, setRatingVal] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let apiOrders = [];
      try {
        const response = await api.get('/orders/my');
        apiOrders = response.data || [];
      } catch (e) {
        console.warn('API get orders failed, falling back to local storage orders:', e);
      }

      const ordersKey = `kisan_orders_${user?._id || user?.id || 'guest'}`;
      const localOrders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
      
      // Combine API & Local orders, removing duplicates by ID
      // API orders take priority (they have the latest DB status from farmer actions)
      const combined = [...apiOrders, ...localOrders];
      const uniqueOrders = [];
      const seenIds = new Set();
      
      combined.forEach(o => {
        const idKey = o._id || o.orderId || o.id;
        if (idKey && !seenIds.has(idKey)) {
          seenIds.add(idKey);
          uniqueOrders.push(o);
        }
      });

      // Sync localStorage with latest API statuses so stale data doesn't persist
      if (apiOrders.length > 0) {
        const apiMap = new Map(apiOrders.map(o => [o._id || o.orderId || o.id, o]));
        const updatedLocal = localOrders.map(lo => {
          const key = lo._id || lo.orderId || lo.id;
          const apiVersion = apiMap.get(key);
          return apiVersion ? { ...lo, status: apiVersion.status } : lo;
        });
        localStorage.setItem(ordersKey, JSON.stringify(updatedLocal));
      }

      setOrders(uniqueOrders);
      setError('');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load order history.');
    } finally {
      setLoading(false);
    }
  };

  /* ─── Lazy load listing details for crops and farmers ─── */
  useEffect(() => {
    const fetchMissingListings = async () => {
      const missingIds = [];
      orders.forEach(order => {
        order.items?.forEach(item => {
          const lid = item.listing?._id || item.listing;
          if (lid && !listingCache[lid] && !missingIds.includes(lid)) {
            missingIds.push(lid);
          }
        });
      });

      if (missingIds.length === 0) return;

      const newCache = { ...listingCache };
      await Promise.all(missingIds.map(async (id) => {
        try {
          const { data } = await api.get(`/listings/${id}`);
          newCache[id] = data;
        } catch (err) {
          console.warn(`Could not resolve listing details for id ${id}:`, err);
        }
      }));
      setListingCache(newCache);
    };

    if (orders.length > 0) {
      fetchMissingListings();
    }
  }, [orders]);

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleMarkAsReceived = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/receive`);
      setOrders(prev =>
        prev.map(o => o._id === orderId ? { ...o, status: 'received', receivedDate: new Date() } : o)
      );
      showToast('Order successfully marked as received!');
    } catch (err) {
      console.error('Error receiving order:', err);
      showToast(err.response?.data?.message || 'Failed to mark order as received', 'error');
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingOrder) return;
    try {
      setSubmittingRating(true);
      await api.post(`/orders/${ratingOrder._id}/rate`, {
        rating: ratingVal,
        ratingComment,
      });

      setOrders(prev =>
        prev.map(o => o._id === ratingOrder._id ? { ...o, rating: ratingVal, ratingComment } : o)
      );
      setRatingOrder(null);
      setRatingComment('');
      showToast('Thank you! Review submitted.');
    } catch (err) {
      console.error('Error submitting rating:', err);
      showToast(err.response?.data?.message || 'Failed to submit rating', 'error');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleBuyAgain = async (order) => {
    try {
      let addedCount = 0;
      for (const item of order.items) {
        const listingId = item.listing?._id || item.listing;
        if (listingId) {
          await addToCart(listingId, item.quantity);
          addedCount++;
        }
      }
      showToast(`Added ${addedCount} crop${addedCount > 1 ? 's' : ''} to cart!`, 'success');
      setTimeout(() => navigate('/cart'), 800);
    } catch (err) {
      console.error('Error adding to cart:', err);
      showToast('Some items could not be re-ordered.', 'error');
    }
  };

  const handleContactFarmer = async (farmerId) => {
    if (!farmerId) return;
    try {
      const { data } = await api.post('/chat/chat', { participantId: farmerId });
      setContactingOrder(null);
      if (data?._id) {
        navigate(`/chat-test`); // Renders AIChatbot test flow
      } else {
        showToast('Chat session initialized.', 'success');
      }
    } catch (err) {
      console.error('Error starting chat:', err);
      showToast('Could not initialize chat room.', 'error');
    }
  };

  const downloadInvoice = (order) => {
    const html = generateInvoiceHTML(order, listingCache);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 400);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      try {
        await api.put(`/orders/${orderId}/status`, { status: 'cancelled' });
      } catch (e) {
        console.warn('API cancel failed, updating local state:', e);
      }
      setOrders(prev =>
        prev.map(o => (o._id === orderId || o.id === orderId || o.orderId === orderId) ? { ...o, status: 'cancelled' } : o)
      );
      const ordersKey = `kisan_orders_${user?._id || user?.id || 'guest'}`;
      const localOrders = JSON.parse(localStorage.getItem(ordersKey) || '[]');
      const updatedLocal = localOrders.map(o => (o._id === orderId || o.id === orderId || o.orderId === orderId) ? { ...o, status: 'cancelled' } : o);
      localStorage.setItem(ordersKey, JSON.stringify(updatedLocal));

      showToast('Order cancelled successfully.');
    } catch (err) {
      console.error('Error cancelling order:', err);
      showToast(err.response?.data?.message || 'Failed to cancel order', 'error');
    }
  };

  /* ─── Status Filter Mapping ─── */
  const matchesTab = (order, tab) => {
    const status = order.status;
    if (tab === 'pending') return status === 'pending';
    if (tab === 'confirmed') return ['paid', 'accepted', 'packed'].includes(status);
    if (tab === 'shipped') return status === 'shipped';
    if (tab === 'delivered') return ['delivered', 'received'].includes(status);
    if (tab === 'cancelled') return ['cancelled', 'refunded'].includes(status);
    return false;
  };

  const filteredOrders = orders.filter(order => {
    const tabMatches = matchesTab(order, activeTab);
    if (!tabMatches) return false;

    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    
    // Search by Order ID
    if (order._id?.toLowerCase().includes(lowerQuery)) return true;
    
    // Search by Crop Name
    const hasCrop = order.items?.some(item => {
      const cache = listingCache[item.listing?._id || item.listing];
      const cropName = cache?.cropName || item.listing?.cropName || '';
      return cropName.toLowerCase().includes(lowerQuery);
    });

    return hasCrop;
  });

  const getTabCount = (tab) => orders.filter(o => matchesTab(o, tab)).length;

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50 gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-orange-100 border-t-orange-600 animate-spin" />
        <p className="text-stone-600 font-bold text-sm">Loading your orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-24">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl transition-all duration-300 transform translate-y-0 ${
          toast.type === 'success' 
            ? 'bg-emerald-950 text-emerald-100 border border-emerald-800' 
            : 'bg-red-950 text-red-100 border border-red-800'
        }`}>
          <div className={`p-1.5 rounded-lg ${toast.type === 'success' ? 'bg-emerald-800' : 'bg-red-800'}`}>
            {toast.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          </div>
          <span className="text-xs font-black tracking-wide">{toast.message}</span>
        </div>
      )}

      {/* Header wrapper */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/buyer/dashboard')} className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-bold text-sm">
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 px-4 py-1.5 rounded-full">
            <ShoppingBag size={14} className="text-orange-600 animate-bounce" />
            <span className="text-[10px] font-black text-orange-700 tracking-wider uppercase">Buyer Portal</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 sm:px-10 lg:px-12 pt-16 pb-8 space-y-8 flex flex-col items-center">
        
        {/* Title Block */}
        <div className="bg-white rounded-[20px] border border-zinc-100 p-6 sm:p-8 md:p-10 shadow-[0_1px_8px_rgba(0,0,0,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-stone-900 tracking-tight">My Crop Orders</h1>
            <p className="text-stone-500 text-xs sm:text-sm font-semibold">Track updates, download receipts, and contact farmers directly</p>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Search by Crop or Order ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-72 px-5 py-3 rounded-xl border border-zinc-200 bg-zinc-50 text-xs sm:text-sm font-bold outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all placeholder:text-zinc-400"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-[20px] text-xs sm:text-sm font-bold flex items-center gap-3">
            <AlertTriangle size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Controls */}
        <div className="flex border-b border-zinc-200 gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {[
            { id: 'pending', label: 'Pending', color: 'border-blue-600 text-blue-600 bg-blue-50/50' },
            { id: 'confirmed', label: 'Confirmed', color: 'border-orange-600 text-orange-600 bg-orange-50/50' },
            { id: 'shipped', label: 'Shipped', color: 'border-indigo-600 text-indigo-600 bg-indigo-50/50' },
            { id: 'delivered', label: 'Delivered', color: 'border-emerald-600 text-emerald-600 bg-emerald-50/50' },
            { id: 'cancelled', label: 'Cancelled', color: 'border-red-600 text-red-600 bg-red-50/50' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            const count = getTabCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3.5 border-b-3 font-black text-xs sm:text-sm whitespace-nowrap transition-all flex items-center gap-2.5 cursor-pointer rounded-t-xl ${
                  isActive 
                    ? `${tab.color} border-current` 
                    : 'border-transparent text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  isActive ? 'bg-white shadow-xs border border-stone-200' : 'bg-stone-200 text-stone-600'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Orders Stack */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20 bg-white border border-zinc-100 rounded-[20px] shadow-[0_1px_8px_rgba(0,0,0,0.03)] space-y-4">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto text-zinc-400 border border-zinc-200">
              <ShoppingBag size={28} />
            </div>
            <h3 className="text-stone-900 font-black text-xl">No orders found</h3>
            <p className="text-stone-400 text-xs sm:text-sm font-semibold max-w-sm mx-auto">There are currently no orders matching this category filter.</p>
            <button 
              onClick={() => navigate('/buyer/dashboard')}
              className="mt-4 px-8 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider shadow-md shadow-orange-600/20 active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
            >
              Browse Crop Marketplace
            </button>
          </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mt-8 max-w-6xl mx-auto px-4 w-full">
              {filteredOrders.map(order => {
              const shortId = order._id?.slice(-8).toUpperCase() || 'KB-ORDER';
              const formattedDate = new Date(order.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
              });
              
              return (
                <div key={order._id} className="bg-white rounded-[20px] border border-zinc-100 overflow-hidden shadow-[0_1px_8px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-300">
                  
                  {/* Card Header */}
                  <div className="bg-zinc-50/80 border-b border-zinc-100 p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-6 flex-wrap">
                      <div>
                        <span className="text-[10px] font-black text-stone-400 tracking-widest block uppercase">ORDER ID</span>
                        <h3 className="text-base font-black text-stone-900 tracking-tight">#{shortId}</h3>
                      </div>
                      <div className="hidden sm:block h-8 w-0.5 bg-stone-200" />
                      <div>
                        <span className="text-[10px] font-black text-stone-400 tracking-widest block uppercase">ORDER DATE</span>
                        <h4 className="text-xs sm:text-sm font-bold text-stone-700">{formattedDate}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8 flex-wrap justify-between w-full sm:w-auto">
                      <div>
                        <span className="text-[10px] font-black text-stone-400 tracking-widest block uppercase">TOTAL AMOUNT</span>
                        <span className="text-xl sm:text-2xl font-black text-orange-600">₹{order.totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-stone-400 tracking-widest block uppercase mb-1">STATUS</span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  </div>

                  {/* Card Items & details */}
                  <div className="p-5 sm:p-6 flex flex-col lg:flex-row gap-6">
                    
                    {/* Items List */}
                    <div className="flex-1 flex flex-col gap-4">
                      {order.items?.map((item, idx) => {
                        const listingId = item.listing?._id || item.listing;
                        const cache = listingCache[listingId] || {};
                        const cropName = cache.cropName || item.listing?.cropName || 'Crop';
                        const variety = cache.variety || item.listing?.variety || '';
                        const unit = cache.unit || item.listing?.unit || 'kg';
                        const price = item.priceAtPurchase || cache.pricePerUnit || item.listing?.pricePerUnit || 0;
                        const farmerName = cache.farmer?.name || item.listing?.farmer?.name || 'Local Farmer';
                        const cropPhoto = cache.images?.[0]?.url || cache.photo || item.listing?.photo || null;

                        return (
                          <div key={idx} className="flex gap-4 items-center bg-zinc-50 border border-zinc-100 rounded-2xl p-4">
                            <div className="w-18 h-18 rounded-xl overflow-hidden border border-zinc-200 shrink-0">
                              <CropImage cropName={cropName} photo={cropPhoto} size="sm" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-black text-stone-900 truncate">{cropName}</h4>
                              {variety && <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mt-0.5">{variety}</span>}
                              <p className="text-xs font-semibold text-stone-500 mt-1">Farmer: <span className="text-stone-800 font-extrabold">{farmerName}</span></p>
                              <p className="text-xs font-black text-orange-600 mt-1">₹{price} × {item.quantity} {unit}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-base font-black text-stone-900">₹{(price * item.quantity).toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery Block */}
                    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-zinc-100 pt-6 lg:pt-0 lg:pl-6 flex flex-col justify-between space-y-4">
                      <div>
                        <span className="text-[10px] font-black text-stone-400 tracking-widest block uppercase mb-2">DELIVERY ADDRESS</span>
                        <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-4 space-y-1">
                          <p className="text-xs sm:text-sm font-black text-stone-800">{order.deliveryAddress?.name || user?.name}</p>
                          <p className="text-xs font-semibold text-stone-600 leading-relaxed">
                            {order.deliveryAddress?.fullAddress || 
                             `${order.deliveryAddress?.addressLine1 || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''}`}
                          </p>
                        </div>
                      </div>
                      
                      {/* Rating details display if already rated */}
                      {order.rating && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-[9px] font-black text-amber-800 block uppercase tracking-wider">YOUR RATING</span>
                            <p className="text-xs font-semibold text-amber-700 italic mt-0.5">"{order.ratingComment || 'No comments'}"</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-white border border-amber-300 px-3 py-1.5 rounded-xl shrink-0">
                            <Star size={14} className="text-amber-500 fill-current" />
                            <span className="text-xs font-black text-amber-800">{order.rating}/5</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Actions — BOUNDED BUTTON TEXT */}
                  <div className="bg-zinc-50/50 border-t border-zinc-100 p-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <button 
                        onClick={() => downloadInvoice(order)}
                        className="min-h-[44px] px-5 py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Download size={15} className="shrink-0" />
                        <span>Invoice</span>
                      </button>
                      <button 
                        onClick={() => setContactingOrder(order)}
                        className="min-h-[44px] px-5 py-2.5 border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                      >
                        <Phone size={15} className="shrink-0" />
                        <span>Contact Farmer</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Track Order — only show button for non-shipped (shipped shows map inline) */}
                      {!['shipped'].includes(order.status) && (
                        <button 
                          onClick={() => setTrackingOrder(order)}
                          className="min-h-[44px] px-5 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <Truck size={15} className="shrink-0" />
                          <span>Track Order</span>
                        </button>
                      )}

                      {/* Buy Again */}
                      <button 
                        onClick={() => handleBuyAgain(order)}
                        className="min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm shadow-orange-600/20 cursor-pointer whitespace-nowrap"
                      >
                        <RefreshCw size={15} className="shrink-0" />
                        <span>Buy Again</span>
                      </button>

                      {/* Cancel Order */}
                      {['pending', 'accepted'].includes(order.status) && (
                        <button 
                          onClick={() => handleCancelOrder(order._id || order.id || order.orderId)}
                          className="min-h-[44px] px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <X size={15} className="shrink-0" />
                          <span>Cancel Order</span>
                        </button>
                      )}

                      {/* Receive confirmation */}
                      {['shipped', 'delivered'].includes(order.status) && (
                        <button 
                          onClick={() => handleMarkAsReceived(order._id || order.id)}
                          className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle size={15} className="shrink-0" />
                          <span>Mark Received</span>
                        </button>
                      )}

                      {/* Rate Order */}
                      {(order.status === 'received' || order.status === 'delivered') && !order.rating && (
                        <button 
                          onClick={() => {
                            setRatingOrder(order);
                            setRatingVal(5);
                            setRatingComment('');
                          }}
                          className="min-h-[44px] px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          <Star size={14} /> Rate Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ─── INLINE MAP TRACKER for shipped orders ─── */}
                  {order.status === 'shipped' && (
                    <div className="border-t border-zinc-100 p-5 sm:p-6">
                      <LiveDeliveryTracker order={order} onClose={() => {}} />
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ─── TRACK ORDER MODAL ─── */}
      {trackingOrder && (
        <Modal onClose={() => setTrackingOrder(null)} title="Live Shipment & GPS Tracking" maxWidth="max-w-5xl">
          <LiveDeliveryTracker order={trackingOrder} onClose={() => setTrackingOrder(null)} />
        </Modal>
      )}

      {/* ─── CONTACT FARMER MODAL ─── */}
      {contactingOrder && (() => {
        const firstItem = contactingOrder.items?.[0];
        const listingId = firstItem?.listing?._id || firstItem?.listing;
        const cache = listingCache[listingId] || {};
        const farmerName = cache.farmer?.name || 'Local Farmer';
        const farmerPhone = cache.farmer?.phone || '';
        const cropName = cache.cropName || 'Crop';
        const quantity = firstItem?.quantity || 1;
        const unit = cache.unit || 'kg';
        const orderId = contactingOrder._id?.slice(-8).toUpperCase();

        const messageText = encodeURIComponent(
          `Hi ${farmerName}, I'm ${user?.name || 'Customer'}. I'm reaching out about my KisanBazaar order #${orderId} of ${cropName} (${quantity} ${unit}).`
        );
        const waLink = farmerPhone ? `https://wa.me/91${farmerPhone.replace(/\D/g, '')}?text=${messageText}` : '#';

        return (
          <Modal onClose={() => setContactingOrder(null)} title="Contact Farmer">
            <div className="flex flex-col gap-6 text-center">
              
              {/* Farmer Meta */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600 text-xl mb-3 shadow-inner">
                  {farmerName.charAt(0)}
                </div>
                <h3 className="text-sm font-black text-stone-800">{farmerName}</h3>
                <p className="text-stone-400 text-[10px] font-bold tracking-wider uppercase mt-1">PRODUCER / SELLER</p>
                {cache.location && (
                  <p className="text-[11px] font-semibold text-stone-500 mt-2 flex items-center gap-1">
                    <MapPin size={12} className="text-orange-500" />
                    {cache.location.district || 'Tumakuru'}, {cache.location.state || 'Karnataka'}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {farmerPhone ? (
                  <>
                    <a 
                      href={waLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/15"
                    >
                      <MessageCircle size={16} /> WhatsApp Farmer
                    </a>
                    <a 
                      href={`tel:${farmerPhone}`}
                      className="py-3 border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <PhoneCall size={16} /> Call Direct (+91 {farmerPhone})
                    </a>
                  </>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-[11px] text-yellow-800 font-semibold flex items-center gap-2 text-left">
                    <Info size={16} className="flex-shrink-0" />
                    Farmer phone number is not available. Please try initiating system chat.
                  </div>
                )}
                
                {/* Platform Chat */}
                <button
                  onClick={() => handleContactFarmer(cache.farmer?._id || cache.farmer)}
                  className="py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all shadow-md shadow-orange-600/15"
                >
                  <MessageSquare size={16} /> Start Chat on Platform
                </button>
              </div>

              <button 
                onClick={() => setContactingOrder(null)}
                className="py-3 border border-stone-200 text-stone-500 hover:text-stone-800 rounded-2xl text-xs font-black transition-all"
              >
                Close
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* ─── RATING & REVIEW MODAL ─── */}
      {ratingOrder && (
        <Modal onClose={() => setRatingOrder(null)} title="Rate Your Crop Purchase">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-wide">ORDER QUALITY ASSESSMENT</span>
              <h4 className="text-sm font-black text-stone-800 mt-1">How is the crop quality?</h4>
            </div>

            {/* Interactive Stars */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const selected = star <= ratingVal;
                return (
                  <button
                    key={star}
                    onClick={() => setRatingVal(star)}
                    className="p-1 hover:scale-110 active:scale-95 transition-all outline-none"
                  >
                    <Star 
                      size={36} 
                      className={`transition-colors ${selected ? 'text-yellow-500 fill-current' : 'text-stone-300'}`} 
                    />
                  </button>
                );
              })}
            </div>

            {/* Comments input */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-stone-400 uppercase tracking-wider">COMMENTS (OPTIONAL)</label>
              <textarea 
                value={ratingComment}
                onChange={e => setRatingComment(e.target.value)}
                placeholder="Share your experience with the crop shelf-life, size, freshness..."
                rows={4}
                className="w-full px-4 py-3 border border-stone-200 rounded-2xl bg-stone-50 text-xs font-semibold outline-none focus:border-orange-500 focus:bg-white transition-all resize-none shadow-inner"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-4">
              <button 
                onClick={() => setRatingOrder(null)}
                className="flex-1 py-3 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-2xl text-xs font-black transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all shadow-md shadow-yellow-500/10"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════ */

function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-blue-50 text-blue-700 border-blue-100',
    accepted: 'bg-orange-50 text-orange-700 border-orange-100',
    paid: 'bg-orange-50 text-orange-700 border-orange-100',
    packed: 'bg-purple-50 text-purple-700 border-purple-100',
    shipped: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-red-50 text-red-700 border-red-100',
    refunded: 'bg-red-50 text-red-700 border-red-100',
  };

  const labels = {
    pending: 'Awaiting Acceptance',
    accepted: 'Order Confirmed ✅',
    paid: 'Order Confirmed',
    packed: 'Being Packed 📦',
    shipped: 'Shipped 🚚',
    delivered: 'Delivered',
    received: 'Received',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
      styles[status] || styles.pending
    }`}>
      {labels[status] || status}
    </span>
  );
}

function TrackerStep({ label, desc, done, date }) {
  return (
    <div className="flex gap-4 items-start relative">
      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center z-10 flex-shrink-0 transition-all ${
        done 
          ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
          : 'bg-stone-100 text-stone-400 border border-stone-200'
      }`}>
        <Check size={14} strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h4 className={`text-xs font-black ${done ? 'text-stone-800 font-extrabold' : 'text-stone-400'}`}>{label}</h4>
          {date && <span className="text-[10px] font-bold text-stone-400">{date}</span>}
        </div>
        <p className={`text-[10px] font-semibold mt-0.5 ${done ? 'text-stone-500' : 'text-stone-300'}`}>{desc}</p>
      </div>
    </div>
  );
}

function Modal({ children, onClose, title, maxWidth = "max-w-md" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className={`bg-white rounded-[20px] border border-zinc-100 ${maxWidth} w-full p-6 shadow-xl relative animate-scale-in max-h-[92vh] overflow-y-auto`}>
        
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-stone-100 pb-4 mb-5">
          <h3 className="text-sm font-black text-stone-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        {children}
      </div>
    </div>
  );
}
