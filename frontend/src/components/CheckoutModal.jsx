import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import api from '../api/axios';
import { 
  X, Check, ChevronRight, ShieldCheck, MapPin, Truck, CreditCard, 
  CheckCircle2, Scale, Calendar, Sparkles, Receipt, Download, RefreshCw, Smartphone
} from 'lucide-react';

export default function CheckoutModal({ listing, onClose, onSuccess }) {
  const { user } = useAuth();
  const { fetchCart } = useCart();
  const listingId = listing._id || listing.id;

  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [deliveryOption, setDeliveryOption] = useState('express'); // 'express' | 'pickup'

  // Customer & Address Details
  const [customerDetails, setCustomerDetails] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    line1: user?.location?.address || 'MG Road, Main Market',
    city: user?.location?.district || 'Bengaluru',
    state: user?.location?.state || 'Karnataka',
    pin: '560001'
  });

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState('upi'); // 'upi' | 'card' | 'netbanking' | 'cod'

  // Order Result State
  const [placingOrder, setPlacingOrder] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [orderError, setOrderError] = useState('');

  const unitPrice = listing.pricePerUnit ?? listing.price ?? 45;
  const unit = listing.unit || 'kg';
  const itemTotal = unitPrice * quantity;
  const shippingFee = deliveryOption === 'pickup' ? 0 : (itemTotal > 500 ? 0 : 40);
  const taxAmount = Math.round(itemTotal * 0.05); // 5% GST
  const discountAmount = Math.round(itemTotal * 0.10); // 10% instant discount
  const finalTotal = itemTotal + shippingFee + taxAmount - discountAmount;

  const handlePlaceOrder = async () => {
    setPlacingOrder(true);
    setOrderError('');

    try {
      const orderPayload = {
        items: [{ listing: listingId, quantity }],
        deliveryAddress: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          addressLine1: customerDetails.line1,
          city: customerDetails.city,
          state: customerDetails.state,
          postalCode: customerDetails.pin,
        },
        paymentMethod: paymentMethod === 'cod' ? 'cod' : 'online',
        totalAmount: finalTotal
      };

      const res = await api.post('/orders', orderPayload);
      setCreatedOrder(res.data);
      if (fetchCart) fetchCart();
      setStep(5); // Move to Step 5 confirmation & invoice
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error('Order creation failed:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to place order.';
      setOrderError(msg);
    } finally {
      setPlacingOrder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#FFFDF6] rounded-3xl max-w-2xl w-full border border-[#E8F7EE] shadow-2xl overflow-hidden my-auto space-y-0 relative">
        
        {/* Modal Header */}
        <div className="bg-white px-6 py-4 border-b border-[#E8F7EE] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-[#E8F7EE] text-[#1F7A4D] font-black text-xs flex items-center justify-center">
              {step < 5 ? `Step ${step}/4` : '✓'}
            </span>
            <div>
              <h3 className="text-base font-black text-gray-900">
                {step === 1 && 'Select Quantity & Delivery'}
                {step === 2 && 'Customer & Address Details'}
                {step === 3 && 'Payment Method'}
                {step === 4 && 'Order Breakdown & Confirmation'}
                {step === 5 && 'Order Placed Successfully! 🎉'}
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                Direct Farm Checkout • 🌾 {listing.cropName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: QUANTITY & DELIVERY */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Crop Mini summary */}
              <div className="p-4 bg-white rounded-2xl border border-[#E8F7EE] flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-[#E8F7EE] flex items-center justify-center text-2xl font-bold shrink-0">
                  🌾
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-base text-gray-900">{listing.cropName}</h4>
                  <p className="text-xs text-gray-500 font-semibold">{listing.variety || 'Fresh Harvest'} • ₹{unitPrice}/{unit}</p>
                  <p className="text-[10px] text-[#1F7A4D] font-bold mt-1">Available Stock: {listing.quantity || 250} {unit}</p>
                </div>
              </div>

              {/* Quantity Stepper */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">1. Select Purchase Quantity</label>
                <div className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-gray-200">
                  <button 
                    type="button"
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-900 font-black text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="text-xl font-black text-gray-900 w-12 text-center">{quantity}</span>
                  <button 
                    type="button"
                    onClick={() => setQuantity(prev => Math.min(listing.quantity || 500, prev + 1))}
                    className="w-10 h-10 rounded-xl bg-[#1F7A4D] text-white font-black text-lg flex items-center justify-center cursor-pointer shadow-md"
                  >
                    +
                  </button>
                  <span className="text-xs font-bold text-gray-500">Total: {quantity} {unit}</span>
                </div>
              </div>

              {/* Delivery Option Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">2. Select Delivery Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    onClick={() => setDeliveryOption('express')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      deliveryOption === 'express' 
                        ? 'bg-[#E8F7EE] border-[#1F7A4D] ring-2 ring-[#1F7A4D]/20' 
                        : 'bg-white border-gray-200 hover:border-[#1F7A4D]/50'
                    }`}
                  >
                    <Truck size={20} className={deliveryOption === 'express' ? 'text-[#1F7A4D]' : 'text-gray-400'} />
                    <p className="font-black text-xs text-gray-900 mt-2">Express Farm Logistics</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Delivered in 24-48 hrs</p>
                  </div>
                  <div 
                    onClick={() => setDeliveryOption('pickup')}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      deliveryOption === 'pickup' 
                        ? 'bg-[#E8F7EE] border-[#1F7A4D] ring-2 ring-[#1F7A4D]/20' 
                        : 'bg-white border-gray-200 hover:border-[#1F7A4D]/50'
                    }`}
                  >
                    <MapPin size={20} className={deliveryOption === 'pickup' ? 'text-[#1F7A4D]' : 'text-gray-400'} />
                    <p className="font-black text-xs text-gray-900 mt-2">Direct Farm Pickup</p>
                    <p className="text-[10px] text-gray-500 font-semibold mt-0.5">Collect from farmer location</p>
                  </div>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-3.5 bg-[#1F7A4D] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#165b38] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Proceed to Customer & Address Details <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2: CUSTOMER & ADDRESS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">Full Name</label>
                  <input 
                    type="text" 
                    value={customerDetails.name}
                    onChange={(e) => setCustomerDetails({...customerDetails, name: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={customerDetails.phone}
                    onChange={(e) => setCustomerDetails({...customerDetails, phone: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">Street Address</label>
                <input 
                  type="text" 
                  value={customerDetails.line1}
                  onChange={(e) => setCustomerDetails({...customerDetails, line1: e.target.value})}
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">City/District</label>
                  <input 
                    type="text" 
                    value={customerDetails.city}
                    onChange={(e) => setCustomerDetails({...customerDetails, city: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">State</label>
                  <input 
                    type="text" 
                    value={customerDetails.state}
                    onChange={(e) => setCustomerDetails({...customerDetails, state: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block mb-1">Pincode</label>
                  <input 
                    type="text" 
                    value={customerDetails.pin}
                    onChange={(e) => setCustomerDetails({...customerDetails, pin: e.target.value})}
                    className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-semibold outline-none focus:border-[#1F7A4D]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1 py-3.5 bg-[#1F7A4D] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#165b38] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Proceed to Payment Options <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PAYMENT METHOD */}
          {step === 3 && (
            <div className="space-y-4">
              <label className="text-xs font-black text-gray-900 uppercase tracking-wider block">Select Payment Gateway</label>
              
              <div className="space-y-2.5">
                {[
                  { id: 'upi', label: 'UPI Instant (Google Pay / PhonePe / Paytm)', icon: Smartphone },
                  { id: 'card', label: 'Credit / Debit Card (Visa, MasterCard, RuPay)', icon: CreditCard },
                  { id: 'netbanking', label: 'Net Banking (SBI, HDFC, ICICI, Axis)', icon: CreditCard },
                  { id: 'cod', label: 'Cash on Delivery (Pay when produce arrives)', icon: Truck },
                ].map((pm) => {
                  const Icon = pm.icon;
                  return (
                    <div 
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                        paymentMethod === pm.id 
                          ? 'bg-[#E8F7EE] border-[#1F7A4D] ring-2 ring-[#1F7A4D]/20 font-bold' 
                          : 'bg-white border-gray-200 hover:border-[#1F7A4D]/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === pm.id ? 'border-[#1F7A4D] bg-[#1F7A4D]' : 'border-gray-300'
                      }`}>
                        {paymentMethod === pm.id && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <Icon size={18} className={paymentMethod === pm.id ? 'text-[#1F7A4D]' : 'text-gray-400'} />
                      <span className="text-xs text-gray-900 font-semibold">{pm.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(4)}
                  className="flex-1 py-3.5 bg-[#1F7A4D] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md hover:bg-[#165b38] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  Review Order Summary <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: ORDER BREAKDOWN & CONFIRM */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-2xl border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Crop Produce ({quantity} {unit} × ₹{unitPrice})</span>
                  <span className="font-bold text-gray-900">₹{itemTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Delivery Logistics</span>
                  <span className="font-bold text-emerald-700">{shippingFee === 0 ? 'FREE' : `₹${shippingFee}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Mandatory GST (5%)</span>
                  <span className="font-bold text-gray-900">₹{taxAmount}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Instant Direct Farmer Discount</span>
                  <span>-₹{discountAmount}</span>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-black text-[#1F7A4D]">
                  <span>Total Amount Payable</span>
                  <span>₹{finalTotal}</span>
                </div>
              </div>

              {orderError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                  {orderError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-3.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Back
                </button>
                <button 
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={placingOrder}
                  className="flex-1 py-3.5 bg-[#FF8C42] hover:bg-[#e07530] text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  {placingOrder ? (
                    <>Creating Order & Notifying Farmer...</>
                  ) : (
                    <>Confirm & Pay ₹{finalTotal}</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: SUCCESS CONFIRMATION & INVOICE GENERATOR */}
          {step === 5 && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#1F7A4D] flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <span className="text-[10px] font-black text-[#1F7A4D] uppercase tracking-widest bg-[#E8F7EE] px-3 py-1 rounded-full border border-[#1F7A4D]/20">
                  Notification Sent to Farmer 🌾
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-2">Order Confirmed!</h3>
                <p className="text-xs text-gray-500 font-semibold mt-1">
                  Order ID: <span className="font-mono text-gray-900 font-bold">{createdOrder?.orderId || createdOrder?._id || 'KB-882910'}</span>
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-gray-200 text-left text-xs space-y-2">
                <div className="flex justify-between font-bold text-gray-900 pb-2 border-b border-gray-100">
                  <span>Product: 🌾 {listing.cropName}</span>
                  <span>{quantity} {unit}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Total Amount Paid:</span>
                  <span className="font-extrabold text-[#1F7A4D]">₹{finalTotal}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Shipping Address:</span>
                  <span className="font-semibold text-gray-800">{customerDetails.line1}, {customerDetails.city}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Delivery:</span>
                  <span className="font-bold text-emerald-700">Within 24-48 Hours</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-gray-900 hover:bg-gray-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Receipt size={16} /> Print Official Invoice
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-[#1F7A4D] text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
                >
                  Close & View Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
