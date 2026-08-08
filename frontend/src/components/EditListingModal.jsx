import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { cropOptions, locations } from '../data/mockData';

export default function EditListingModal({ listing, onClose, onSave }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    quantity: '',
    unit: 'kg',
    price: '',
    harvestDate: '',
    storageType: '',
    contactNumber: '',
    whatsappNumber: '',
    notes: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (listing) {
      setFormData({
        cropName: listing.cropName || '',
        variety: listing.variety || '',
        quantity: listing.quantity || '',
        unit: listing.unit || 'kg',
        price: listing.pricePerUnit || listing.price || '',
        harvestDate: listing.harvestDate || '',
        storageType: listing.storageType || '',
        contactNumber: listing.contactNumber || '',
        whatsappNumber: listing.whatsappNumber || '',
        notes: listing.description || listing.notes || '',
        location: listing.location?.address || listing.location || '',
      });
    }
  }, [listing]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave(listing._id || listing.id, {
        ...formData,
        quantity: parseInt(formData.quantity),
        pricePerUnit: parseInt(formData.price),
        price: parseInt(formData.price),
        description: formData.notes
      });
      onClose();
    } catch (error) {
      console.error("Failed to update listing", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!listing) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="text-xl font-black text-gray-900">{t('editListing') || 'Edit Harvest Stock'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('cropName')}</label>
            <input
              type="text"
              name="cropName"
              value={formData.cropName}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('variety')}</label>
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('quantityAvailable')}</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all"
              />
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all appearance-none"
              >
                <option value="kg">{t('kg')}</option>
                <option value="quintal">{t('quintal')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('pricePerUnit')}</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('harvestDate')}</label>
            <input
              type="date"
              name="harvestDate"
              value={formData.harvestDate}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('storageType')}</label>
            <select
              name="storageType"
              value={formData.storageType}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all appearance-none"
            >
              <option value="">{t('selectStorage')}</option>
              <option value="Cold Storage">{t('coldStorage')}</option>
              <option value="Warehouse">{t('warehouse')}</option>
              <option value="Open Field">{t('openField')}</option>
              <option value="Home Storage">{t('homeStorage')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('location')}</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all appearance-none"
            >
              <option value="">Select location</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('additionalNotes')}</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none bg-gray-50 focus:bg-white transition-all resize-none"
            />
          </div>

          <div className="sm:col-span-2 mt-4">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-3.5 rounded-xl font-semibold text-base transition-all duration-300 cursor-pointer flex items-center justify-center gap-2
                ${submitting ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:from-blue-700'}`}
            >
              {submitting && <Loader2 size={18} className="animate-spin" />}
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
