import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import CropImage from '../components/CropImage';
import api from '../api/axios';
import {
  ArrowLeft, MapPin, CheckCircle2, CreditCard, ShieldCheck, Truck, Package,
  ChevronRight, Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw, PhoneCall,
  ShoppingBag, ArrowRight, X, Home, Wallet, Smartphone, Building2,
  Receipt, Download, Eye, Clock, Sparkles, Lock, IndianRupee, User, Phone, Star
} from 'lucide-react';
import { fetchRealDeliveryAgents } from '../utils/deliveryService';

/* ─── Razorpay loader ─── */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/* ─── Invoice generator ─── */
function generateInvoiceHTML(order, items, address, paymentMethod, total) {
  const dateStr = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  const orderId = order?.orderId?.slice?.(-8)?.toUpperCase?.() || ('KB' + Date.now().toString().slice(-6));
  const rows = items.map(item => {
    const l = item.listing || {};
    const p = l.pricePerUnit ?? item.priceAtAdd ?? 0;
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px">${l.cropName || 'Crop'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center">${item.quantity} ${l.unit || 'kg'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right">₹${p.toLocaleString('en-IN')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:right;font-weight:700">₹${(p * item.quantity).toLocaleString('en-IN')}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><title>Invoice #${orderId}</title>
<style>@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style></head>
<body style="font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:40px;background:#f8f8f8">
<div style="max-width:680px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08)">
  <div style="background:linear-gradient(135deg,#ea580c,#d97706);padding:32px 40px;color:#fff">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div><h1 style="margin:0;font-size:24px;font-weight:900">KisanBazaar</h1>
        <p style="margin:4px 0 0;font-size:11px;opacity:0.85;text-transform:uppercase;letter-spacing:2px">Tax Invoice</p></div>
      <div style="text-align:right"><p style="margin:0;font-size:13px;opacity:0.9">Invoice #${orderId}</p>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.9">${dateStr}</p></div>
    </div>
  </div>
  <div style="padding:32px 40px">
    <div style="display:flex;justify-content:space-between;margin-bottom:28px">
      <div><p style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Deliver To</p>
        <p style="margin:0;font-weight:700;font-size:14px;color:#1a1a1a">${address?.name || 'Customer'}</p>
        <p style="margin:3px 0 0;font-size:13px;color:#666">${address?.addressLine1 || ''}${address?.addressLine2 ? ', ' + address.addressLine2 : ''}</p>
        <p style="margin:3px 0 0;font-size:13px;color:#666">${address?.city || ''}, ${address?.state || ''} - ${address?.postalCode || ''}</p>
        ${address?.phone ? `<p style="margin:3px 0 0;font-size:13px;color:#666">Phone: ${address.phone}</p>` : ''}
      </div>
      <div style="text-align:right"><p style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px">Payment</p>
        <p style="margin:0;font-size:13px;color:#1a1a1a;font-weight:600">${paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
      <thead><tr style="background:#fafafa">
        <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f0f0f0">Item</th>
        <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f0f0f0">Qty</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f0f0f0">Rate</th>
        <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f0f0f0">Amount</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="display:flex;justify-content:flex-end">
      <div style="width:240px">
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#666"><span>Subtotal</span><span>₹${total.toLocaleString('en-IN')}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#16a34a"><span>Delivery</span><span>FREE</span></div>
        <div style="border-top:2px solid #ea580c;margin-top:8px;padding-top:10px;display:flex;justify-content:space-between;font-size:16px;font-weight:900;color:#ea580c"><span>Total</span><span>₹${total.toLocaleString('en-IN')}</span></div>
      </div>
    </div>
  </div>
  <div style="background:#fafafa;padding:20px 40px;text-align:center;border-top:1px solid #f0f0f0">
    <p style="margin:0;font-size:12px;color:#999">Thank you for supporting Indian farmers directly through KisanBazaar.</p>
  </div>
</div></body></html>`;
}

/* ─── Step config ─── */
const STEPS = [
  { id: 1, label: 'Address', icon: MapPin },
  { id: 2, label: 'Summary', icon: Package },
  { id: 3, label: 'Payment', icon: CreditCard },
  { id: 4, label: 'Confirm', icon: CheckCircle2 },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading: cartLoading, fetchCart } = useCart();
  const { user } = useAuth();
  const topRef = useRef(null);

  const cartItems = cart?.items || [];
  const [step, setStep] = useState(1);
  const [animDir, setAnimDir] = useState('right');

  /* ── Address state ── */
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
  const [selectedAddr, setSelectedAddr] = useState(() => addresses[0]?.id || '');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', line1: '', line2: '', city: '', state: '', pin: '' });

  /* ── Payment state ── */
  const [payMethod, setPayMethod] = useState('online');
  const [onlineSub, setOnlineSub] = useState('razorpay');

  /* ── Order state ── */
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState(null); // { status: 'success'|'failed', data, error }
  const [deliveryMode, setDeliveryMode] = useState('auto_assign'); // 'auto_assign' | 'buyer_choice'
  const [availableAgents, setAvailableAgents] = useState([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [loadingAgents, setLoadingAgents] = useState(false);

  /* ── Fetch Real Delivery Agents from MongoDB ── */
  useEffect(() => {
    let mounted = true;
    const loadAgents = async () => {
      setLoadingAgents(true);
      try {
        const agents = await fetchRealDeliveryAgents();
        if (mounted && agents && agents.length > 0) {
          setAvailableAgents(agents);
          setSelectedAgentId(prev => prev || agents[0]?.id || agents[0]?._id || '');
        }
      } catch (err) {
        console.error('Failed loading delivery agents:', err);
      } finally {
        if (mounted) setLoadingAgents(false);
      }
    };
    loadAgents();
    return () => { mounted = false; };
  }, []);

  /* ── Persist addresses ── */
  useEffect(() => {
    try { localStorage.setItem('kb_addresses', JSON.stringify(addresses)); } catch (_) { }
  }, [addresses]);

  /* ── Scroll to top on step change ── */
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  /* ── Calculations ── */
  const subtotal = cartItems.reduce((s, i) => {
    const p = i.listing?.pricePerUnit ?? i.priceAtAdd ?? 0;
    return s + p * i.quantity;
  }, 0);
  const delivery = 0;
  const total = subtotal + delivery;
  const activeAddr = addresses.find(a => a.id === selectedAddr) || addresses[0];
  const selectedAgent = availableAgents.find(a => (a.id === selectedAgentId || a._id === selectedAgentId)) || availableAgents[0];

  /* ── Step navigation ── */
  const goTo = (s) => {
    setAnimDir(s > step ? 'right' : 'left');
    setStep(s);
  };

  /* ── Address handlers ── */
  const saveAddr = (e) => {
    e.preventDefault();
    if (!form.line1 || !form.city || !form.state || !form.pin) return;
    if (editId) {
      setAddresses(p => p.map(a => a.id === editId ? { ...a, ...form } : a));
    } else {
      const n = { ...form, id: `addr_${Date.now()}`, isDefault: !addresses.length };
      setAddresses(p => [...p, n]);
      setSelectedAddr(n.id);
    }
    resetForm();
  };
  const startEdit = (a) => {
    setEditId(a.id);
    setForm({ name: a.name || '', phone: a.phone || '', line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', state: a.state || '', pin: a.pin || '' });
    setShowForm(true);
  };
  const deleteAddr = (id) => {
    if (addresses.length <= 1) return;
    const f = addresses.filter(a => a.id !== id);
    setAddresses(f);
    if (selectedAddr === id) setSelectedAddr(f[0].id);
  };
  const resetForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm({ name: user?.name || '', phone: user?.phone || '', line1: '', line2: '', city: '', state: '', pin: '' });
  };

  /* ── Place order ── */
  const placeOrder = async () => {
    if (!activeAddr) { goTo(1); return; }
    setPlacing(true);

    const deliveryAddress = {
      addressLine1: activeAddr.line1,
      addressLine2: activeAddr.line2 || '',
      city: activeAddr.city,
      state: activeAddr.state,
      postalCode: activeAddr.pin,
      country: 'India',
      fullAddress: `${activeAddr.line1}${activeAddr.line2 ? ', ' + activeAddr.line2 : ''}, ${activeAddr.city}, ${activeAddr.state} - ${activeAddr.pin}`,
    };
    const payload = {
      items: cartItems.map(i => ({
        listing: i.listing?._id || i.listing?.id || i.listing,
        quantity: i.quantity,
      })),
      deliveryAddress,
      paymentMethod: 'pending_farmer_approval',
      deliveryMode,
      chosenAgentId: deliveryMode === 'buyer_choice' ? selectedAgentId : undefined,
      selectedAgentId: deliveryMode === 'buyer_choice' ? selectedAgentId : undefined,
      totalAmount: total,
    };

    try {
      const res = await api.post('/orders', payload);
      const orderData = res.data;

      setOrderResult({ status: 'success', data: orderData });
      fetchCart();
      setStep(4);
    } catch (err) {
      console.error('Order creation failed:', err);
      setOrderResult({
        status: 'failed',
        error: err.response?.data?.message || 'Failed to submit buy request. Please try again.'
      });
    } finally {
      setPlacing(false);
    }
  };

  /* ── Invoice download ── */
  const downloadInvoice = () => {
    const primaryOrder = orderResult?.data?.orders?.[0] || orderResult?.data;
    const html = generateInvoiceHTML(primaryOrder, cartItems, activeAddr, payMethod, total);
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  };

  /* ═══════════════════════════════════════════════════
     RENDER: SUCCESS
  ═══════════════════════════════════════════════════ */
  if (orderResult?.status === 'success') {
    const ordersList = orderResult.data?.orders?.length
      ? orderResult.data.orders
      : [orderResult.data];

    return (
      <div style={S.page}>
        <div style={S.statusWrap}>
          <div style={S.successCard}>
            {/* Animated rings */}
            <div style={S.successRings}>
              <div style={S.ring1} />
              <div style={S.ring2} />
              <div style={S.successIcon}>
                <CheckCircle2 size={48} color="#fff" strokeWidth={2.5} />
              </div>
            </div>

            <h1 style={S.successTitle}>
              {ordersList.length > 1
                ? `Buy Requests Sent to ${ordersList.length} Farmers! 🌾`
                : 'Buy Request Sent! 🌾'}
            </h1>
            <p style={S.successSub}>
              {ordersList.length > 1
                ? `Your cart contained crops from ${ordersList.length} different farmers. A separate direct buy request has been created and dispatched to each farmer's inbox:`
                : "Your buy request has been sent to the farmer's inbox. Once the farmer accepts your request, you can complete payment from your Approved Requests section."}
            </p>

            {/* Loop through each farmer order */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', margin: '18px 0' }}>
              {ordersList.map((ord, idx) => {
                const oid = ord.orderId?.slice?.(-8)?.toUpperCase?.() || ord._id?.slice?.(-8)?.toUpperCase?.() || ('KB' + (idx + 1));
                const ordTotal = ord.totalAmount ?? total;
                const cropNames = ord.items?.map(i => i.listing?.cropName || i.cropName || 'Crop').filter(Boolean).join(', ') || 'Fresh Crops';

                return (
                  <div key={ord._id || idx} style={S.metaCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f4f4f5', paddingBottom: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#18181b' }}>
                        {ordersList.length > 1 ? `Farmer Order #${idx + 1}` : 'Order Summary'}
                      </span>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: 9999, background: '#fef3c7', color: '#b45309' }}>
                        {ord.status === 'pending' ? 'Pending Approval' : ord.status}
                      </span>
                    </div>
                    <MetaRow label="Request ID" value={`#${oid}`} highlight />
                    <MetaRow label="Crops" value={cropNames} />
                    <MetaRow label="Delivery Mode" value={ord.deliveryMode === 'buyer_choice' ? 'Buyer Choice Agent' : 'Auto-Assign Agent'} />
                    <MetaRow label="Estimated Amount" value={`₹${ordTotal.toLocaleString('en-IN')}`} highlight />
                    <MetaRow label="Deliver To" value={`${activeAddr?.city}, ${activeAddr?.state}`} />
                  </div>
                );
              })}
            </div>

            <div style={S.successActions}>
              <button onClick={() => navigate('/buyer/pending-orders')} style={S.primaryBtn}>
                <Eye size={16} /> Track Request Status
              </button>
              <button onClick={() => navigate('/buyer/dashboard')} style={S.ghostBtn}>
                Continue Sourcing <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER: FAILED
  ═══════════════════════════════════════════════════ */
  if (orderResult?.status === 'failed') {
    return (
      <div style={S.page}>
        <div style={S.statusWrap}>
          <div style={S.failCard}>
            <div style={S.failIconWrap}>
              <AlertCircle size={48} color="#dc2626" strokeWidth={2.5} />
            </div>
            <h1 style={S.failTitle}>Payment Failed</h1>
            <p style={S.failSub}>{orderResult.error || 'We could not complete your transaction. No funds were debited.'}</p>
            <div style={S.failActions}>
              <button onClick={() => { setOrderResult(null); setPlacing(false); }} style={S.primaryBtn}>
                <RefreshCw size={16} /> Retry Payment
              </button>
              <button onClick={() => { setOrderResult(null); setPlacing(false); goTo(3); }} style={S.outlineBtn}>
                <CreditCard size={16} /> Change Payment Method
              </button>
              <a href="tel:1800123456" style={{ ...S.ghostBtn, textDecoration: 'none' }}>
                <PhoneCall size={16} /> Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER: EMPTY CART
  ═══════════════════════════════════════════════════ */
  if (!cartLoading && cartItems.length === 0 && !placing) {
    return (
      <div style={S.page}>
        <div style={S.statusWrap}>
          <div style={{ ...S.failCard, borderColor: '#f4f4f5' }}>
            <ShoppingBag size={48} color="#d97706" style={{ margin: '0 auto 1rem' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#18181b', margin: '0 0 0.5rem' }}>Your cart is empty</h2>
            <p style={{ fontSize: '0.88rem', color: '#71717a', margin: '0 0 1.5rem' }}>Add some crops before checking out.</p>
            <button onClick={() => navigate('/buyer/dashboard')} style={S.primaryBtn}>Browse Marketplace</button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════
     RENDER: CHECKOUT FLOW
  ═══════════════════════════════════════════════════ */
  return (
    <div style={S.page} ref={topRef}>

      {/* ── Header ── */}
      <header style={S.header}>
        <div style={S.headerInner}>
          <button onClick={() => navigate('/cart')} style={S.backBtn}>
            <ArrowLeft size={18} /> Back
          </button>
          <div style={S.headerCenter}>
            <Lock size={16} color="#ea580c" />
            <h1 style={S.headerTitle}>Secure Checkout</h1>
          </div>
          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* ── Step Indicator ── */}
      <div style={S.stepBar}>
        <div style={S.stepBarInner}>
          {STEPS.map(({ id, label, icon: Icon }, idx) => {
            const active = step === id;
            const done = step > id;
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => done && goTo(id)}
                  style={{
                    ...S.stepBtn,
                    cursor: done ? 'pointer' : 'default',
                    opacity: !active && !done ? 0.45 : 1,
                  }}
                >
                  <div style={{
                    ...S.stepCircle,
                    background: done ? '#16a34a' : active ? 'linear-gradient(135deg,#ea580c,#d97706)' : '#e4e4e7',
                    color: done || active ? '#fff' : '#a1a1aa',
                    boxShadow: active ? '0 4px 16px rgba(234,88,12,0.35)' : done ? '0 4px 12px rgba(22,163,106,0.3)' : 'none',
                  }}>
                    {done ? <Check size={14} strokeWidth={3} /> : <Icon size={14} />}
                  </div>
                  <span style={{
                    ...S.stepLabel,
                    color: active ? '#ea580c' : done ? '#16a34a' : '#a1a1aa',
                    fontWeight: active || done ? 700 : 500,
                  }}>{label}</span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div style={{ ...S.stepLine, background: done ? '#16a34a' : '#e4e4e7' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Multi-item Cart Notice ── */}
      {cartItems.length > 1 && (
        <div style={{ maxWidth: 1200, margin: '1.25rem auto 0', padding: '0 1.5rem' }}>
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fed7aa',
            borderRadius: 14,
            padding: '0.85rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            boxShadow: '0 1px 4px rgba(234, 88, 12, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={18} color="#ea580c" />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#9a3412' }}>
                This order includes {cartItems.length} items from your cart
              </span>
            </div>
            <Link
              to="/cart"
              style={{
                color: '#ea580c',
                fontSize: '0.85rem',
                fontWeight: 800,
                textDecoration: 'underline',
                whiteSpace: 'nowrap'
              }}
            >
              Edit in Cart
            </Link>
          </div>
        </div>
      )}

      {/* ── Content grid ── */}
      <div style={S.grid} className="checkout-grid">
        <div style={S.mainCol}>

          {/* ═══ STEP 1: ADDRESS ═══ */}
          {step === 1 && (
            <div style={S.card}>
              <SectionHead icon={MapPin} title="Delivery Address" />

              {!showForm ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {addresses.map(a => {
                      const sel = selectedAddr === a.id;
                      return (
                        <div key={a.id} onClick={() => setSelectedAddr(a.id)} style={{
                          ...S.addrCard,
                          borderColor: sel ? '#ea580c' : '#f4f4f5',
                          background: sel ? '#fff7ed' : '#fff',
                          boxShadow: sel ? '0 0 0 3px rgba(234,88,12,0.08)' : 'none',
                        }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1 }}>
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sel ? '#ea580c' : '#d4d4d8'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
                            }}>
                              {sel && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ea580c' }} />}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <h4 style={S.addrName}>{a.name}</h4>
                                {a.isDefault && <span style={S.defaultBadge}>Default</span>}
                              </div>
                              <p style={S.addrText}>{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} - {a.pin}</p>
                              {a.phone && <p style={S.addrPhone}><Phone size={11} /> {a.phone}</p>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <IconBtn icon={Edit2} onClick={(e) => { e.stopPropagation(); startEdit(a); }} />
                            {addresses.length > 1 && (
                              <IconBtn icon={Trash2} color="#dc2626" onClick={(e) => { e.stopPropagation(); deleteAddr(a.id); }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => { resetForm(); setShowForm(true); }} style={S.addAddrBtn}>
                    <Plus size={16} /> Add New Address
                  </button>
                  <StepFooter>
                    <button onClick={() => goTo(2)} style={S.nextBtn}>
                      Deliver Here & Continue <ChevronRight size={16} />
                    </button>
                  </StepFooter>
                </>
              ) : (
                <form onSubmit={saveAddr} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#18181b', margin: 0 }}>
                    {editId ? 'Edit Address' : 'New Address'}
                  </h3>
                  <div style={S.formGrid}>
                    <FormField label="Full Name *" icon={User}>
                      <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ramesh Kumar" style={S.input} />
                    </FormField>
                    <FormField label="Phone *" icon={Phone}>
                      <input required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" style={S.input} />
                    </FormField>
                    <div style={{ gridColumn: 'span 2' }}>
                      <FormField label="Address Line 1 *" icon={Home}>
                        <input required value={form.line1} onChange={e => setForm({ ...form, line1: e.target.value })} placeholder="Street, Building, APMC Gate" style={S.input} />
                      </FormField>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <FormField label="Address Line 2 (Optional)" icon={MapPin}>
                        <input value={form.line2} onChange={e => setForm({ ...form, line2: e.target.value })} placeholder="Landmark, Area" style={S.input} />
                      </FormField>
                    </div>
                    <FormField label="City / District *">
                      <input required value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Tumakuru" style={S.input} />
                    </FormField>
                    <FormField label="State *">
                      <input required value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Karnataka" style={S.input} />
                    </FormField>
                    <FormField label="Pincode *">
                      <input required value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} placeholder="572101" style={S.input} />
                    </FormField>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                    <button type="button" onClick={resetForm} style={S.cancelBtn}>Cancel</button>
                    <button type="submit" style={S.nextBtn}>Save Address</button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ═══ STEP 2: ORDER SUMMARY ═══ */}
          {step === 2 && (
            <div style={S.card}>
              <SectionHead icon={Package} title={`Order Items (${cartItems.length})`} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cartItems.map(item => <ProductRow key={item.listing?._id || item.listing?.id || item.listing} item={item} />)}
              </div>
              <StepFooter>
                <button onClick={() => goTo(1)} style={S.cancelBtn}><ArrowLeft size={16} /> Back</button>
                <button onClick={() => goTo(3)} style={S.nextBtn}>Choose Payment <ChevronRight size={16} /></button>
              </StepFooter>
            </div>
          )}

          {/* ═══ STEP 3: PAYMENT & DELIVERY ═══ */}
          {step === 3 && (
            <div style={S.card}>
              <SectionHead icon={CreditCard} title="Delivery & Payment Workflow" />

              {/* Delivery Mode Selection */}
              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-wider text-stone-700 mb-3">
                  Delivery Agent Allocation Mode *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setDeliveryMode('auto_assign')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                      deliveryMode === 'auto_assign'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Truck size={17} className={deliveryMode === 'auto_assign' ? 'text-emerald-700' : 'text-stone-500'} />
                        <span className="text-sm font-black text-stone-900">Auto-Assign Agent</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Fastest
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                      Auto-broadcasts offer to the nearest verified delivery agents once the farmer packs the order (6h pickup window).
                    </p>
                  </div>

                  <div
                    onClick={() => setDeliveryMode('buyer_choice')}
                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all ${
                      deliveryMode === 'buyer_choice'
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <User size={17} className={deliveryMode === 'buyer_choice' ? 'text-emerald-700' : 'text-stone-500'} />
                        <span className="text-sm font-black text-stone-900">Buyer's Choice</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Choose Partner
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 font-medium leading-relaxed">
                      Select your preferred verified delivery partner. A targeted offer is sent directly to them.
                    </p>
                  </div>
                </div>

                {/* Delivery Agent Picker for Buyer's Choice */}
                {deliveryMode === 'buyer_choice' && (
                  <div className="mt-4 p-4 bg-stone-50/90 border border-stone-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                          <Truck size={14} className="text-emerald-600" /> Select Delivery Partner
                        </h4>
                        <p className="text-[11px] text-stone-500">Pick the driver to handle your farm-to-door transit</p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {availableAgents.length} Available
                      </span>
                    </div>

                    {loadingAgents ? (
                      <div className="p-6 text-center text-xs text-stone-500">
                        <RefreshCw size={16} className="animate-spin inline-block mr-2" />
                        Loading verified delivery partners from directory...
                      </div>
                    ) : availableAgents.length === 0 ? (
                      <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-xs">
                        No delivery partners found nearby. Auto-assign will be used upon checkout.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {availableAgents.map((agent) => {
                          const agId = agent.id || agent._id;
                          const isSelected = (selectedAgentId === agId) || (!selectedAgentId && agent === availableAgents[0]);
                          return (
                            <div
                              key={agId}
                              onClick={() => setSelectedAgentId(agId)}
                              className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex flex-col justify-between ${
                                isSelected
                                  ? 'border-emerald-600 bg-white shadow-sm ring-1 ring-emerald-500/20'
                                  : 'border-stone-200/80 bg-white/70 hover:border-stone-300'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <img
                                  src={agent.profilePhoto || agent.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                                  alt={agent.name}
                                  className="w-10 h-10 rounded-full object-cover border border-stone-200 shrink-0"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <h5 className="text-xs font-black text-stone-900 truncate flex items-center gap-1">
                                      {agent.name}
                                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                                    </h5>
                                    {isSelected ? (
                                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">
                                        ✓
                                      </span>
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-stone-300 shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-stone-600 font-medium truncate mt-0.5">
                                    {agent.vehicleType || 'Commercial Vehicle'}
                                  </p>
                                  <p className="text-[10px] text-stone-400">
                                    📍 {agent.district || agent.location || 'Karnataka'}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                                <span className="flex items-center gap-1 font-bold text-amber-600">
                                  <Star size={12} className="fill-amber-400 text-amber-500" />
                                  {agent.rating || 4.8}
                                  <span className="text-[10px] text-stone-400 font-normal">
                                    ({agent.totalReviews || agent.reviews?.length || 12})
                                  </span>
                                </span>
                                <span className="font-black text-stone-900">
                                  ₹{agent.ratePerKm || 18} <span className="text-[10px] font-normal text-stone-500">/ km</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 2-Stage Farmer Approval Banner */}
              <div className="p-5 bg-amber-50/80 border border-amber-200/80 rounded-2xl mb-6 space-y-2 text-amber-900">
                <div className="flex items-center gap-2 font-black text-sm text-amber-800">
                  <Sparkles size={18} className="text-amber-600" />
                  <span>2-Stage Farmer Approval Process</span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-amber-800">
                  Submitting this request alerts the farmer in their notification inbox. You do <strong>NOT</strong> pay now. Once the farmer accepts your request, you can complete payment from your <strong>Approved Requests</strong> section.
                </p>
              </div>

              <StepFooter>
                <button onClick={() => goTo(2)} style={S.cancelBtn}><ArrowLeft size={16} /> Back</button>
                <button onClick={() => goTo(4)} style={S.nextBtn}>Review Request <ChevronRight size={16} /></button>
              </StepFooter>
            </div>
          )}

          {/* ═══ STEP 4: REVIEW & PLACE ═══ */}
          {step === 4 && (
            <div style={S.card}>
              <SectionHead icon={CheckCircle2} title="Review & Send Buy Request" />

              <div style={S.reviewGrid}>
                {/* Address summary */}
                <div style={S.reviewBox}>
                  <div style={S.reviewBoxHead}>
                    <MapPin size={15} color="#ea580c" />
                    <span>Delivery</span>
                    <button onClick={() => goTo(1)} style={S.changeLink}>Change</button>
                  </div>
                  <p style={S.reviewBold}>{activeAddr?.name}</p>
                  <p style={S.reviewText}>{activeAddr?.line1}{activeAddr?.line2 ? `, ${activeAddr.line2}` : ''}</p>
                  <p style={S.reviewText}>{activeAddr?.city}, {activeAddr?.state} - {activeAddr?.pin}</p>
                  {activeAddr?.phone && <p style={S.reviewText}>📞 {activeAddr.phone}</p>}
                </div>

                {/* Payment summary */}
                <div style={S.reviewBox}>
                  <div style={S.reviewBoxHead}>
                    <CreditCard size={15} color="#ea580c" />
                    <span>Workflow</span>
                    <button onClick={() => goTo(3)} style={S.changeLink}>Info</button>
                  </div>
                  <p style={S.reviewBold}>Request-then-Pay Flow</p>
                  <p style={S.reviewText}>No payment required right now. Payment triggers after farmer approves.</p>
                </div>

                {/* Delivery Mode summary */}
                <div style={S.reviewBox}>
                  <div style={S.reviewBoxHead}>
                    <Truck size={15} color="#ea580c" />
                    <span>Delivery Mode</span>
                    <button onClick={() => goTo(3)} style={S.changeLink}>Change</button>
                  </div>
                  <p style={S.reviewBold}>
                    {deliveryMode === 'buyer_choice' ? "Buyer's Choice Partner" : "Auto-Assign Partner"}
                  </p>
                  <p style={S.reviewText}>
                    {deliveryMode === 'buyer_choice'
                      ? (selectedAgent ? `🚚 ${selectedAgent.name} • ${selectedAgent.vehicleType || 'Commercial Vehicle'} (₹${selectedAgent.ratePerKm || 18}/km)` : 'Targeted offer to preferred driver')
                      : 'Auto-broadcasted to top 3 nearest verified agents'}
                  </p>
                </div>
              </div>

              {/* Items mini-list */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#18181b', margin: '0 0 10px' }}>
                  Items ({cartItems.length})
                </h4>
                <div style={S.miniList}>
                  {cartItems.map(item => {
                    const l = item.listing || {};
                    const p = l.pricePerUnit ?? item.priceAtAdd ?? 0;
                    return (
                      <div key={l._id || l.id} style={S.miniRow}>
                        <span style={{ fontWeight: 600, color: '#18181b' }}>{l.cropName || 'Crop'} × {item.quantity} {l.unit || 'kg'}</span>
                        <span style={{ fontWeight: 800, color: '#ea580c' }}>₹{(p * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <StepFooter>
                <button onClick={() => goTo(3)} style={S.cancelBtn}><ArrowLeft size={16} /> Back</button>
                <button onClick={placeOrder} disabled={placing} style={{
                  ...S.placeBtn,
                  opacity: placing ? 0.7 : 1,
                  pointerEvents: placing ? 'none' : 'auto',
                }}>
                  {placing ? (
                    <><span style={S.spinner} /> Submitting Request...</>
                  ) : (
                    <><Sparkles size={18} /> SEND BUY REQUEST TO FARMER — ₹{total.toLocaleString('en-IN')}</>
                  )}
                </button>
              </StepFooter>
            </div>
          )}
        </div>

        {/* ── Sidebar: Price Details ── */}
        <div style={S.sideCol} className="checkout-sidebar">
          <div style={S.summaryCard}>
            <h3 style={S.summaryTitle}><Receipt size={18} color="#ea580c" /> Price Details</h3>

            <div style={S.summaryRows}>
              <div style={S.summaryRow}>
                <span>Subtotal ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})</span>
                <span style={S.summaryVal}>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div style={S.summaryRow}>
                <span>Delivery</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>FREE</span>
              </div>
            </div>

            <div style={S.divider} />

            <div style={S.totalRow}>
              <span>Grand Total</span>
              <span style={S.totalVal}>₹{total.toLocaleString('en-IN')}</span>
            </div>

            <div style={S.trustBlock}>
              <TrustItem icon={ShieldCheck} color="#16a34a" text="Direct Farmer Purchase" />
              <TrustItem icon={Truck} color="#ea580c" text="Farm-to-Door Delivery" />
              <TrustItem icon={Lock} color="#6366f1" text="Secure Payment" />
            </div>
          </div>

          {/* Mini item preview in sidebar */}
          {cartItems.length > 0 && (
            <div style={{ ...S.summaryCard, marginTop: 16 }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>
                Cart Items
              </h4>
              {cartItems.slice(0, 3).map(item => {
                const l = item.listing || {};
                const photo = l.images?.[0]?.url || l.photo || null;
                return (
                  <div key={l._id || l.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
                      <CropImage cropName={l.cropName} photo={photo} size="sm" className="w-full h-full" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#18181b', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.cropName}</p>
                      <p style={{ fontSize: '0.7rem', color: '#71717a', margin: 0 }}>{item.quantity} {l.unit || 'kg'}</p>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#ea580c' }}>₹{((l.pricePerUnit ?? item.priceAtAdd ?? 0) * item.quantity).toLocaleString('en-IN')}</span>
                  </div>
                );
              })}
              {cartItems.length > 3 && (
                <p style={{ fontSize: '0.72rem', color: '#a1a1aa', margin: '4px 0 0', fontWeight: 600 }}>+{cartItems.length - 3} more item{cartItems.length - 3 > 1 ? 's' : ''}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Responsive styles ── */}
      <style>{`
        @media (max-width: 960px) {
          .checkout-grid { grid-template-columns: 1fr !important; }
          .checkout-sidebar { position: static !important; }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════════ */

function SectionHead({ icon: Icon, title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color="#ea580c" />
      </div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#18181b', margin: 0 }}>{title}</h2>
    </div>
  );
}

function StepFooter({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingTop: 20, borderTop: '1px solid #f4f4f5' }}>
      {children}
    </div>
  );
}

function ProductRow({ item }) {
  const l = item.listing || {};
  const p = l.pricePerUnit ?? item.priceAtAdd ?? 0;
  const photo = l.images?.[0]?.url || l.photo || null;
  return (
    <div style={S.prodRow}>
      <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
        <CropImage cropName={l.cropName || 'Crop'} photo={photo} size="sm" className="w-full h-full" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#18181b', margin: 0 }}>{l.cropName || 'Crop Item'}</h4>
        {l.variety && <p style={{ fontSize: '0.7rem', color: '#a1a1aa', margin: '2px 0 0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>{l.variety}</p>}
        <p style={{ fontSize: '0.78rem', color: '#52525b', margin: '4px 0 0' }}>
          Farmer: <strong>{l.farmer?.name || 'Local Farmer'}</strong>
        </p>
        <p style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: 700, margin: '2px 0 0' }}>
          ₹{p.toLocaleString('en-IN')} × {item.quantity} {l.unit || 'kg'}
        </p>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: '1.05rem', fontWeight: 900, color: '#18181b', margin: 0 }}>
          ₹{(p * item.quantity).toLocaleString('en-IN')}
        </p>
      </div>
    </div>
  );
}

function RadioDot({ selected }) {
  return (
    <div style={{
      width: 20, height: 20, borderRadius: '50%', border: `2px solid ${selected ? '#ea580c' : '#d4d4d8'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2,
    }}>
      {selected && <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ea580c' }} />}
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, color = '#71717a' }) {
  return (
    <button onClick={onClick} style={{
      background: '#f4f4f5', border: 'none', borderRadius: 8, padding: 6,
      color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = '#e4e4e7'}
      onMouseLeave={e => e.currentTarget.style.background = '#f4f4f5'}
    >
      <Icon size={14} />
    </button>
  );
}

function FormField({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={S.label}>
        {Icon && <Icon size={12} style={{ opacity: 0.5 }} />} {label}
      </label>
      {children}
    </div>
  );
}

function MetaRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem', padding: '8px 0', borderBottom: '1px solid #f4f4f5' }}>
      <span style={{ color: '#71717a' }}>{label}</span>
      <span style={{ fontWeight: 700, color: highlight ? '#ea580c' : '#18181b' }}>{value}</span>
    </div>
  );
}

function TrustItem({ icon: Icon, color, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.74rem', fontWeight: 600, color: '#71717a' }}>
      <Icon size={14} color={color} /> {text}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   STYLES (flat constants — avoids esbuild stack overflow)
═══════════════════════════════════════════════════ */
const S = {
  page: { minHeight: '100vh', background: '#fafaf9', fontFamily: '"Inter", system-ui, sans-serif', paddingBottom: 60 },

  /* Header */
  header: { position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid #f4f4f5' },
  headerInner: { maxWidth: 1200, margin: '0 auto', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#71717a', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' },
  headerCenter: { display: 'flex', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: '1.1rem', fontWeight: 800, color: '#18181b', margin: 0 },

  /* Steps */
  stepBar: { background: '#fff', borderBottom: '1px solid #f4f4f5', padding: '1rem 1.5rem' },
  stepBarInner: { maxWidth: 700, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  stepBtn: { display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, transition: 'opacity 0.3s' },
  stepCircle: { width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' },
  stepLabel: { fontSize: '0.78rem', whiteSpace: 'nowrap', transition: 'color 0.3s' },
  stepLine: { width: 48, height: 2, borderRadius: 2, margin: '0 8px', transition: 'background 0.3s' },

  /* Grid */
  grid: { maxWidth: 1200, margin: '0 auto', padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' },
  mainCol: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  sideCol: { position: 'sticky', top: 130 },

  /* Card */
  card: { background: '#fff', borderRadius: 20, border: '1px solid #f4f4f5', padding: '1.5rem', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' },

  /* Address */
  addrCard: { border: '1.5px solid', borderRadius: 16, padding: '1rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s', gap: 12 },
  addrName: { fontSize: '0.95rem', fontWeight: 800, color: '#18181b', margin: 0 },
  addrText: { fontSize: '0.8rem', color: '#52525b', margin: '4px 0 0', lineHeight: 1.5 },
  addrPhone: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#71717a', margin: '4px 0 0' },
  defaultBadge: { fontSize: '0.6rem', fontWeight: 800, background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '0.05em' },
  addAddrBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, background: '#fff7ed', border: '1px solid #fed7aa', color: '#ea580c', padding: '0.65rem 1.2rem', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'background 0.15s' },

  /* Form */
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  label: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: '#52525b', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' },
  input: { width: '100%', padding: '0.72rem 0.9rem', border: '1.5px solid #e4e4e7', borderRadius: 12, background: '#fafaf9', fontSize: '0.85rem', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },

  /* Product */
  prodRow: { display: 'flex', alignItems: 'center', gap: 14, padding: '0.85rem', background: '#fafaf9', borderRadius: 16, border: '1px solid #f4f4f5' },

  /* Payment */
  payCard: { border: '1.5px solid', borderRadius: 16, padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s' },
  payTitle: { fontSize: '0.95rem', fontWeight: 800, color: '#18181b', margin: 0 },
  payDesc: { fontSize: '0.78rem', color: '#71717a', margin: '4px 0 0' },
  subPayGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 },
  subPayChip: { padding: '9px 12px', border: '1.5px solid', borderRadius: 10, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: 'none', transition: 'all 0.15s' },

  /* Review */
  reviewGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  reviewBox: { background: '#fafaf9', borderRadius: 14, padding: '1rem', border: '1px solid #f4f4f5' },
  reviewBoxHead: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', fontWeight: 800, color: '#18181b', marginBottom: 10 },
  changeLink: { marginLeft: 'auto', background: 'none', border: 'none', color: '#ea580c', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 },
  reviewBold: { fontSize: '0.85rem', fontWeight: 700, color: '#18181b', margin: '0 0 2px' },
  reviewText: { fontSize: '0.8rem', color: '#52525b', margin: '2px 0', lineHeight: 1.5 },
  miniList: { background: '#fafaf9', borderRadius: 12, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 8 },
  miniRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' },

  /* Buttons */
  nextBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.8rem 1.5rem', background: 'linear-gradient(135deg,#ea580c,#d97706)', color: '#fff', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 4px 14px rgba(234,88,12,0.25)', transition: 'transform 0.15s, box-shadow 0.15s', marginLeft: 'auto' },
  cancelBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0.8rem 1.2rem', background: '#f4f4f5', color: '#52525b', border: 'none', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' },
  placeBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0.9rem 2rem', background: 'linear-gradient(135deg,#ea580c,#d97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.95rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 6px 24px rgba(234,88,12,0.3)', marginLeft: 'auto', transition: 'all 0.2s' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem 1.5rem', background: 'linear-gradient(135deg,#ea580c,#d97706)', color: '#fff', border: 'none', borderRadius: 14, fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer', width: '100%', boxShadow: '0 4px 16px rgba(234,88,12,0.25)' },
  outlineBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem 1.5rem', background: '#fff', color: '#18181b', border: '1.5px solid #e4e4e7', borderRadius: 14, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', width: '100%' },
  ghostBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.85rem 1.5rem', background: '#f4f4f5', color: '#52525b', border: 'none', borderRadius: 14, fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', width: '100%' },

  /* Summary sidebar */
  summaryCard: { background: '#fff', borderRadius: 20, border: '1px solid #f4f4f5', padding: '1.25rem', boxShadow: '0 1px 8px rgba(0,0,0,0.03)' },
  summaryTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', fontWeight: 800, color: '#18181b', margin: '0 0 16px' },
  summaryRows: { display: 'flex', flexDirection: 'column', gap: 10 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#52525b' },
  summaryVal: { fontWeight: 700, color: '#18181b' },
  divider: { height: 1, background: '#f4f4f5', margin: '14px 0' },
  totalRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  totalVal: { fontSize: '1.5rem', fontWeight: 900, color: '#ea580c' },
  trustBlock: { marginTop: 16, paddingTop: 14, borderTop: '1px solid #f4f4f5', display: 'flex', flexDirection: 'column', gap: 8 },

  /* Success */
  statusWrap: { maxWidth: 520, margin: '3rem auto', padding: '0 1rem' },
  successCard: { background: '#fff', borderRadius: 28, border: '1px solid #f4f4f5', padding: '2.5rem', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' },
  successRings: { position: 'relative', width: 100, height: 100, margin: '0 auto 1.5rem' },
  ring1: { position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid #dcfce7', animation: 'pulseRing 2s ease-out infinite' },
  ring2: { position: 'absolute', inset: 8, borderRadius: '50%', border: '2px solid #bbf7d0', animation: 'pulseRing 2s ease-out 0.4s infinite' },
  successIcon: { position: 'absolute', inset: 16, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(22,163,106,0.35)' },
  successTitle: { fontSize: '1.6rem', fontWeight: 900, color: '#18181b', margin: '0 0 0.5rem' },
  successSub: { fontSize: '0.88rem', color: '#71717a', lineHeight: 1.6, margin: '0 0 1.5rem' },
  metaCard: { background: '#fafaf9', borderRadius: 16, border: '1px solid #f4f4f5', padding: '1rem 1.25rem', margin: '0 0 1.5rem', textAlign: 'left' },
  successActions: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* Failed */
  failCard: { background: '#fff', borderRadius: 28, border: '1px solid #fecaca', padding: '2.5rem', textAlign: 'center', boxShadow: '0 4px 32px rgba(0,0,0,0.06)' },
  failIconWrap: { width: 90, height: 90, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' },
  failTitle: { fontSize: '1.6rem', fontWeight: 900, color: '#dc2626', margin: '0 0 0.5rem' },
  failSub: { fontSize: '0.88rem', color: '#71717a', lineHeight: 1.6, margin: '0 0 1.5rem' },
  failActions: { display: 'flex', flexDirection: 'column', gap: 10 },

  /* Spinner */
  spinner: { display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' },
};
