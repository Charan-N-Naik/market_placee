import { useState } from 'react';
import { X, Loader, MapPin, Truck, CreditCard } from 'lucide-react';
import axios from 'axios';

export default function BuyModal({ listing, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  
  const [deliveryAddress, setDeliveryAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const price = listing.pricePerUnit ?? listing.price;
  const totalAmount = price * quantity;
  const maxQuantity = listing.inventory || listing.quantity || 1000;

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setDeliveryAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleBuy = async () => {
    if (!deliveryAddress.addressLine1 || !deliveryAddress.city || !deliveryAddress.state || !deliveryAddress.postalCode) {
      setError('Please fill in all address fields');
      return;
    }

    if (quantity < 1 || quantity > maxQuantity) {
      setError(`Quantity must be between 1 and ${maxQuantity}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const orderData = {
        items: [{ listing: listing._id || listing.id, quantity }],
        deliveryAddress: {
          ...deliveryAddress,
          country: 'India',
          fullAddress: `${deliveryAddress.addressLine1}, ${deliveryAddress.addressLine2 || ''} ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postalCode}`,
        },
        paymentMethod,
      };

      const response = await axios.post('/api/orders', orderData);
      
      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (err) {
      console.error('Error creating order:', err);
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-[28px]">
          <h2 className="text-xl font-black text-gray-900">Buy {listing.cropName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Quantity Section */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <label className="text-xs font-black text-gray-600 uppercase tracking-widest">Quantity ({listing.unit || 'kg'})</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors font-bold"
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  if (val <= maxQuantity) setQuantity(val);
                }}
                className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors font-bold"
              >
                +
              </button>
            </div>
            <p className="text-xs text-gray-500 font-medium">Available: {maxQuantity} {listing.unit || 'kg'}</p>
          </div>

          {/* Price Section */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Unit Price:</span>
                <span className="font-bold text-gray-900">₹{price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 font-medium">Quantity:</span>
                <span className="font-bold text-gray-900">{quantity} {listing.unit || 'kg'}</span>
              </div>
              <div className="border-t border-emerald-200 pt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-black text-emerald-600">₹{totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
              <CreditCard size={14} />
              Payment Method
            </label>
            <div className="space-y-2">
              {['cod', 'online', 'wallet'].map(method => (
                <label key={method} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="font-medium text-gray-700 capitalize">
                    {method === 'cod' ? 'Cash on Delivery' : method === 'online' ? 'Online Payment' : 'Wallet'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-3">
            <label className="text-xs font-black text-gray-600 uppercase tracking-widest flex items-center gap-2">
              <MapPin size={14} />
              Delivery Address
            </label>
            
            <div className="space-y-2">
              <input
                type="text"
                name="addressLine1"
                placeholder="Address Line 1 (required)"
                value={deliveryAddress.addressLine1}
                onChange={handleAddressChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <input
                type="text"
                name="addressLine2"
                placeholder="Address Line 2 (optional)"
                value={deliveryAddress.addressLine2}
                onChange={handleAddressChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <input
                type="text"
                name="city"
                placeholder="City (required)"
                value={deliveryAddress.city}
                onChange={handleAddressChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <input
                type="text"
                name="state"
                placeholder="State (required)"
                value={deliveryAddress.state}
                onChange={handleAddressChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <input
                type="text"
                name="postalCode"
                placeholder="Postal Code (required)"
                value={deliveryAddress.postalCode}
                onChange={handleAddressChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
            </div>
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-2 py-2">
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
              <span>✓</span>
              <span className="font-medium">Farmer Verified</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 p-2 rounded-lg">
              <Truck size={14} />
              <span className="font-medium">Direct Delivery</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3 rounded-b-[28px]">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleBuy}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Placing...
              </>
            ) : (
              `Buy for ₹${totalAmount}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
