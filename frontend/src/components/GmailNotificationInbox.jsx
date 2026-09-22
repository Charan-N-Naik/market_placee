import { useState } from 'react';
import {
  Mail, Star, CheckSquare, Square, Trash2, RotateCw, Search,
  Tag, ArrowLeft, CheckCircle2, XCircle, MessageSquare, Clock,
  MapPin, ShoppingBag, ShieldCheck, ChevronRight, Filter, AlertCircle
} from 'lucide-react';

export default function GmailNotificationInbox({ notifications = [], sellerOrders = [], onUpdateOrderStatus, onMarkAsRead, onRefresh }) {
  const [selectedTab, setSelectedTab] = useState('all'); // 'all' | 'orders' | 'unread' | 'starred'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeNotificationId, setActiveNotificationId] = useState(null);
  const [starredIds, setStarredIds] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Merge backend notifications & seller orders into a rich Gmail inbox feed
  const rawFeed = [...notifications];

  // Also build email notifications for seller orders if not present in notifications
  sellerOrders.forEach((order) => {
    const orderId = order._id || order.id || order.orderId;
    const exists = rawFeed.some(n => n.relatedOrder?._id === orderId || n.relatedOrder === orderId);
    if (!exists) {
      const buyerName = order.buyer?.name || 'KisanBazaar Buyer';
      const cropName = order.items?.[0]?.listing?.cropName || 'Crop Harvest';
      const qty = order.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 1;

      rawFeed.push({
        _id: `order_notif_${orderId}`,
        type: 'order_placed',
        title: `[NEW ORDER #${String(orderId).slice(-6).toUpperCase()}] ${cropName} Order Request`,
        message: `Buyer ${buyerName} placed an order for ${qty} units of ${cropName}. Total Amount: ₹${order.totalAmount || 0}. Delivery: ${order.deliveryAddress?.city || 'Local'}.`,
        createdAt: order.createdAt || new Date().toISOString(),
        isRead: false,
        sender: {
          name: buyerName,
          email: order.buyer?.email || `${buyerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          avatar: null,
        },
        relatedOrder: order,
      });
    }
  });

  // Sort by date newest first
  rawFeed.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Toggle star
  const toggleStar = (id, e) => {
    e.stopPropagation();
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select checkbox
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter feed based on tab & search
  const filteredFeed = rawFeed.filter(item => {
    if (selectedTab === 'unread' && item.isRead) return false;
    if (selectedTab === 'starred' && !starredIds.has(item._id)) return false;
    if (selectedTab === 'orders' && item.type !== 'order_placed') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchMsg = item.message?.toLowerCase().includes(q);
      const matchSender = item.sender?.name?.toLowerCase().includes(q);
      return matchTitle || matchMsg || matchSender;
    }
    return true;
  });

  const activeItem = rawFeed.find(n => n._id === activeNotificationId);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden flex flex-col min-h-[640px]">

      {/* ── Gmail Top Header & Search Bar ──────────────────────────────── */}
      <div className="bg-[#f6f8fc] px-5 py-3.5 border-b border-gray-200 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeNotificationId && (
            <button
              onClick={() => setActiveNotificationId(null)}
              className="p-2 hover:bg-gray-200/70 rounded-full text-gray-600 transition-colors"
              title="Back to Inbox"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              M
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-1.5">
                Kisan Mailbox <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full">Gmail UI</span>
              </h2>
              <p className="text-[10px] text-gray-400 font-medium">Order requests & live alerts inbox</p>
            </div>
          </div>
        </div>

        {/* Search input in Gmail style */}
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search mail, orders, buyers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white hover:bg-gray-50 focus:bg-white text-xs font-semibold text-gray-800 rounded-full border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all shadow-inner"
          />
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onRefresh && onRefresh()}
            className="p-2 hover:bg-gray-200/70 rounded-full text-gray-600 transition-colors cursor-pointer"
            title="Refresh Inbox"
          >
            <RotateCw size={16} />
          </button>
          {onMarkAsRead && (
            <button
              onClick={onMarkAsRead}
              className="text-xs font-bold text-blue-700 hover:text-blue-900 px-3 py-1.5 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ── Inbox View (List vs Detail) ─────────────────────────────────── */}
      {!activeNotificationId ? (
        <div className="flex-1 flex flex-col">

          {/* Gmail Tabs: Primary, Order Requests, Starred, Unread */}
          <div className="flex border-b border-gray-200 bg-white text-xs font-bold text-gray-600 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('all')}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 transition-colors cursor-pointer ${
                selectedTab === 'all'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40 font-black'
                  : 'border-transparent hover:bg-gray-50 text-gray-500'
              }`}
            >
              <Mail size={15} /> All Mail ({rawFeed.length})
            </button>
            <button
              onClick={() => setSelectedTab('orders')}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 transition-colors cursor-pointer ${
                selectedTab === 'orders'
                  ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40 font-black'
                  : 'border-transparent hover:bg-gray-50 text-gray-500'
              }`}
            >
              <ShoppingBag size={15} /> Order Requests ({rawFeed.filter(i => i.type === 'order_placed').length})
            </button>
            <button
              onClick={() => setSelectedTab('unread')}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 transition-colors cursor-pointer ${
                selectedTab === 'unread'
                  ? 'border-amber-500 text-amber-600 bg-amber-50/40 font-black'
                  : 'border-transparent hover:bg-gray-50 text-gray-500'
              }`}
            >
              <AlertCircle size={15} /> Unread ({rawFeed.filter(i => !i.isRead).length})
            </button>
            <button
              onClick={() => setSelectedTab('starred')}
              className={`flex items-center gap-2 px-6 py-3.5 border-b-2 transition-colors cursor-pointer ${
                selectedTab === 'starred'
                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50/40 font-black'
                  : 'border-transparent hover:bg-gray-50 text-gray-500'
              }`}
            >
              <Star size={15} className="fill-yellow-400 text-yellow-500" /> Starred ({starredIds.size})
            </button>
          </div>

          {/* Email Rows List */}
          <div className="divide-y divide-gray-100 flex-1 overflow-y-auto">
            {filteredFeed.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                  <Mail size={24} />
                </div>
                <p className="text-sm font-bold text-gray-500">Your mail inbox is empty</p>
                <p className="text-xs text-gray-400">New order requests from buyers will show up here instantly.</p>
              </div>
            ) : (
              filteredFeed.map((item) => {
                const isStarred = starredIds.has(item._id);
                const isSelected = selectedIds.has(item._id);
                const senderName = item.sender?.name || (item.type === 'order_placed' ? 'Buyer Order' : 'KisanBazaar System');
                const initial = senderName.charAt(0).toUpperCase();

                // Get order object if available
                const order = typeof item.relatedOrder === 'object' ? item.relatedOrder : null;
                const orderStatus = order?.status || 'pending';

                return (
                  <div
                    key={item._id}
                    onClick={() => setActiveNotificationId(item._id)}
                    className={`flex items-center gap-3 px-4 py-3 hover:shadow-sm cursor-pointer transition-colors group ${
                      !item.isRead ? 'bg-white font-bold' : 'bg-[#fcfcfc] text-gray-600 font-normal'
                    } ${isSelected ? 'bg-blue-50/60' : ''}`}
                  >
                    {/* Checkbox & Star */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => toggleSelect(item._id, e)}
                        className="text-gray-300 hover:text-gray-500 cursor-pointer"
                      >
                        {isSelected ? <CheckSquare size={16} className="text-blue-600" /> : <Square size={16} />}
                      </button>
                      <button
                        onClick={(e) => toggleStar(item._id, e)}
                        className="text-gray-300 hover:text-yellow-400 cursor-pointer"
                      >
                        <Star size={16} className={isStarred ? 'fill-yellow-400 text-yellow-400' : ''} />
                      </button>
                    </div>

                    {/* Sender Avatar / Initial */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#166534] to-[#22C55E] text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0">
                      {initial}
                    </div>

                    {/* Sender Name */}
                    <div className="w-36 shrink-0 truncate text-xs font-bold text-gray-900">
                      {senderName}
                    </div>

                    {/* Email Subject & Snippet */}
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      {item.type === 'order_placed' && (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded shrink-0">
                          Order Request
                        </span>
                      )}
                      <p className="text-xs truncate">
                        <span className="text-gray-900 font-bold">{item.title}</span>
                        <span className="text-gray-400 font-normal ml-2">— {item.message}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    {orderStatus && (
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                        orderStatus === 'pending' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        ['accepted', 'shipped', 'delivered', 'received'].includes(orderStatus) ? 'bg-green-50 text-emerald-700 border border-emerald-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {orderStatus}
                      </span>
                    )}

                    {/* Date timestamp */}
                    <div className="text-[11px] text-gray-400 font-semibold shrink-0 text-right w-24">
                      {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* ── Expandable Email Detail View (Gmail Message Reader) ──────────── */
        <div className="p-6 space-y-6 flex-1 bg-white">
          {(() => {
            const item = activeItem;
            if (!item) return null;

            const order = typeof item.relatedOrder === 'object' ? item.relatedOrder : null;
            const buyerName = item.sender?.name || order?.buyer?.name || 'KisanBazaar Buyer';
            const buyerEmail = item.sender?.email || order?.buyer?.email || `${buyerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
            const initial = buyerName.charAt(0).toUpperCase();
            const orderId = order?._id || order?.id || order?.orderId;
            const orderStatus = order?.status || 'pending';

            return (
              <div className="space-y-6 max-w-4xl mx-auto">

                {/* Email Subject Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <h1 className="text-xl font-black text-gray-900 leading-snug">
                    {item.title}
                  </h1>
                  <span className={`self-start sm:self-auto text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                    orderStatus === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    ['accepted', 'shipped', 'delivered', 'received'].includes(orderStatus) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {orderStatus}
                  </span>
                </div>

                {/* Sender Header Info */}
                <div className="flex items-start justify-between gap-4 bg-[#f8fafc] p-4 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#166534] text-white flex items-center justify-center font-black text-sm shadow-sm">
                      {initial}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">{buyerName}</span>
                        <span className="text-xs text-gray-400 font-mono">&lt;{buyerEmail}&gt;</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium">to me (Farmer Portal)</p>
                    </div>
                  </div>

                  <div className="text-right text-xs text-gray-400 font-semibold">
                    <div>{new Date(item.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div>{new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>

                {/* Email Body Card */}
                <div className="bg-[#FFFDF5] border border-[#e5e7d0] rounded-2xl p-6 shadow-sm space-y-6">

                  {/* Summary Message */}
                  <div className="text-sm text-gray-800 leading-relaxed font-medium bg-white p-4 rounded-xl border border-amber-100">
                    📢 <span className="font-bold text-gray-900">{item.message}</span>
                  </div>

                  {/* Order Details Breakdown */}
                  {order && (
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                        <ShoppingBag size={14} className="text-[#166534]" /> Order Summary Breakdown
                      </h3>

                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-100">
                            <tr>
                              <th className="p-3">Crop Product</th>
                              <th className="p-3">Quantity</th>
                              <th className="p-3">Price / Unit</th>
                              <th className="p-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {order.items?.map((it, idx) => (
                              <tr key={idx}>
                                <td className="p-3 font-bold text-gray-900">{it.listing?.cropName || 'Crop Harvest'}</td>
                                <td className="p-3 font-semibold">{it.quantity} {it.listing?.unit || 'kg'}</td>
                                <td className="p-3 font-semibold">₹{it.priceAtPurchase || it.listing?.pricePerUnit || 0}</td>
                                <td className="p-3 text-right font-bold text-[#166534]">₹{(it.quantity || 1) * (it.priceAtPurchase || it.listing?.pricePerUnit || 0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Total & Delivery Meta */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Delivery Address</span>
                          <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
                            <MapPin size={12} className="text-red-500" />
                            {typeof order.deliveryAddress === 'object'
                              ? `${order.deliveryAddress?.street || ''}, ${order.deliveryAddress?.city || ''}, ${order.deliveryAddress?.state || ''} - ${order.deliveryAddress?.pincode || ''}`
                              : (order.deliveryAddress || 'Standard Local Dispatch')}
                          </p>
                        </div>

                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex flex-col justify-between">
                          <span className="text-[10px] font-black text-emerald-700 uppercase">Total Payable Amount</span>
                          <span className="text-2xl font-black text-emerald-900">₹{order.totalAmount || 0}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Action Toolbar */}
                  {orderId && (
                    <div className="pt-4 border-t border-amber-200/60 flex flex-wrap items-center gap-3">
                      {orderStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              if (onUpdateOrderStatus) onUpdateOrderStatus(orderId, 'accepted');
                            }}
                            className="bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 size={16} /> Accept Order Request
                          </button>

                          <button
                            onClick={() => {
                              if (onUpdateOrderStatus) onUpdateOrderStatus(orderId, 'cancelled');
                            }}
                            className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <XCircle size={16} /> Reject Request
                          </button>
                        </>
                      )}

                      {orderStatus === 'accepted' && (
                        <button
                          onClick={() => {
                            if (onUpdateOrderStatus) onUpdateOrderStatus(orderId, 'shipped');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm cursor-pointer"
                        >
                          <ShoppingBag size={16} /> Mark as Shipped
                        </button>
                      )}

                      <button
                        onClick={() => alert(`Starting chat thread with buyer ${buyerName}...`)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <MessageSquare size={15} /> Chat with Buyer
                      </button>

                      <button
                        onClick={() => setActiveNotificationId(null)}
                        className="ml-auto text-xs font-bold text-gray-500 hover:text-gray-800 px-3 py-2 cursor-pointer"
                      >
                        Back to Inbox
                      </button>
                    </div>
                  )}

                </div>

              </div>
            );
          })()}
        </div>
      )}

    </div>
  );
}
