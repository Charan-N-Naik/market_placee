import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useListings } from '../context/ListingContext';
import { analyzeCropMultiAngle } from '../services/cropVerification';
import { cropOptions, locations } from '../data/mockData';
import {
  Upload, CheckCircle2, XCircle, Loader2, ImagePlus, Mic, MicOff,
  Camera, ArrowRight, ShieldCheck, RefreshCw, Sparkles, Check,
  ShieldAlert, AlertTriangle, Leaf, Clock, TrendingUp, Star, Thermometer
} from 'lucide-react';

const ANGLE_CONFIG = [
  { key: 'front', label: 'Front View', required: true },
  { key: 'left',  label: 'Left Side',  required: false },
  { key: 'right', label: 'Right Side', required: false },
];

export default function AddListingPage({ onSuccess }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addListing } = useListings();

  const [images, setImages] = useState({
    front: { file: null, preview: null },
    left:  { file: null, preview: null },
    right: { file: null, preview: null },
  });

  const fileInputRefs = {
    front: useRef(null),
    left:  useRef(null),
    right: useRef(null),
  };

  const [formData, setFormData] = useState({
    cropName: '',
    variety: '',
    quantity: '',
    unit: 'kg',
    price: '',
    harvestDate: new Date().toISOString().split('T')[0],
    storageType: '',
    contactNumber: user?.phone || '',
    whatsappNumber: user?.phone || '',
    notes: '',
    location: user?.location || '',
  });

  // verificationState: null | 'analyzing' | 'done' | 'rejected' | 'error'
  const [verificationState, setVerificationState] = useState(null);
  const [verificationReport, setVerificationReport] = useState(null);
  const [rejectionReason, setRejectionReason]     = useState('');
  const [rejectionType, setRejectionType]         = useState('');
  const [errorMessage, setErrorMessage]           = useState('');

  const [submitting, setSubmitting]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [formErrors, setFormErrors]     = useState({});

  const uploadedCount = Object.values(images).filter(i => i.preview).length;

  // ── Voice typing ──────────────────────────────────────────────────────────
  const startVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('Voice typing is not supported in this browser.'); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.onstart  = () => setIsListening(true);
    recognition.onresult = (ev) => setFormData(p => ({ ...p, cropName: ev.results[0][0].transcript }));
    recognition.onerror  = () => setIsListening(false);
    recognition.onend    = () => setIsListening(false);
    recognition.start();
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (formErrors[e.target.name]) setFormErrors(p => ({ ...p, [e.target.name]: null }));
  };

  // ── Auto-analysis ─────────────────────────────────────────────────────────
  const runVerification = useCallback(async (currentImages) => {
    if (!currentImages.front.file) return;

    const files = {};
    if (currentImages.front.file) files.front = currentImages.front.file;
    if (currentImages.left.file)  files.left  = currentImages.left.file;
    if (currentImages.right.file) files.right = currentImages.right.file;

    setVerificationState('analyzing');
    setVerificationReport(null);
    setRejectionReason('');
    setErrorMessage('');

    try {
      const result = await analyzeCropMultiAngle(files, formData.cropName || '', 'farmer');

      if (result.rejected) {
        setVerificationState('rejected');
        setRejectionType(result.rejectionType || 'unknown');
        setRejectionReason(result.reason || 'Photo rejected by AI verification.');
      } else {
        setVerificationState('done');
        setVerificationReport(result.report);
        // Autofill form fields from real AI response
        const r = result.report;
        setFormData(prev => ({
          ...prev,
          cropName: prev.cropName || r.cropName || '',
          variety:  prev.variety  || r.variety  || '',
          price:    prev.price    || (r.estimatedPricePerKg ? r.estimatedPricePerKg.toString() : ''),
        }));
      }
    } catch (err) {
      setVerificationState('error');
      setErrorMessage(err.message || 'AI verification failed. Please try again.');
    }
  }, [formData.cropName]);

  const handleAngleUpload = (angle, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImages(prev => {
        const next = { ...prev, [angle]: { file, preview: ev.target.result } };
        setTimeout(() => runVerification(next), 100);
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAngleImage = (angle, e) => {
    e.stopPropagation();
    setImages(prev => {
      const next = { ...prev, [angle]: { file: null, preview: null } };
      if (!next.front.file) {
        setVerificationState(null);
        setVerificationReport(null);
      } else {
        setTimeout(() => runVerification(next), 100);
      }
      return next;
    });
  };

  // ── Form validation + submit ──────────────────────────────────────────────
  const validateForm = () => {
    const errors = {};
    if (!formData.cropName.trim())                  errors.cropName = 'Crop name is required';
    if (!formData.quantity || parseInt(formData.quantity) <= 0) errors.quantity = 'Please enter a valid quantity';
    if (!formData.price    || parseInt(formData.price)    <= 0) errors.price    = 'Please enter a valid price';
    if (!formData.harvestDate)                       errors.harvestDate = 'Harvest date is required';
    if (!formData.location)                          errors.location   = 'Please select a location';
    if (!formData.contactNumber.match(/^\d{10}$/))  errors.contactNumber = 'Please enter a valid 10-digit number';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verificationState !== 'done') {
      alert('Please wait for AI verification to complete before publishing.');
      return;
    }
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await addListing({
        cropName:   formData.cropName,
        variety:    formData.variety,
        quantity:   parseInt(formData.quantity),
        unit:       formData.unit,
        pricePerUnit: parseInt(formData.price),
        description: formData.notes,
        harvestDate: formData.harvestDate,
        location:    formData.location,
        isOrganic:   false,
        photoFile:   images.front.file,
        aiVerify:    'true',
        report:      verificationReport,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit listing:', err);
      alert('Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canPublish = verificationState === 'done' && !submitting;

  return (
    <div className="max-w-[760px] mx-auto pb-16">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-6 md:p-8">

        {/* ── Photo upload section ────────────────────────────────────────── */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">Multi-Angle Crop Photographs</h3>
                <p className="text-xs text-gray-400 font-semibold mt-1">
                  Upload from 3 angles — AI analysis starts automatically on upload.
                </p>
              </div>
              <span className="text-[10px] font-bold text-gray-400">{uploadedCount} / 3</span>
            </div>
          </div>

          {/* 3-slot grid */}
          <div className="grid grid-cols-3 gap-3">
            {ANGLE_CONFIG.map((angle) => {
              const fileData = images[angle.key];
              return (
                <div
                  key={angle.key}
                  onClick={() => fileInputRefs[angle.key].current?.click()}
                  className={`group relative min-h-[135px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-2.5 text-center
                    ${fileData.preview
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs hover:border-emerald-700'
                      : 'border-gray-200 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-400 hover:shadow-md'
                    }
                  `}
                >
                  {fileData.preview ? (
                    <>
                      <img src={fileData.preview} alt={angle.label} className="w-full h-full object-cover rounded-xl absolute inset-0" />
                      <button
                        type="button"
                        onClick={(e) => removeAngleImage(angle.key, e)}
                        className="absolute top-2 left-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                      >
                        <XCircle size={11} />
                      </button>
                      <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold py-0.5 rounded-md truncate px-1">
                        {angle.label}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1 text-center">
                      <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Camera size={18} className="text-emerald-600" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-800 block mt-1">{angle.label}</span>
                      {angle.required
                        ? <span className="text-[8px] text-emerald-700 font-extrabold uppercase tracking-wider">Required</span>
                        : <span className="text-[8px] text-gray-400 font-medium">Optional</span>
                      }
                    </div>
                  )}
                  <input
                    ref={fileInputRefs[angle.key]}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleAngleUpload(angle.key, e.target.files[0])}
                    className="hidden"
                  />
                </div>
              );
            })}
          </div>

          {/* ── Verification status panel ─────────────────────────────────── */}
          {verificationState === 'analyzing' && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
              <Loader2 size={18} className="text-emerald-600 animate-spin shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-800">AI Analysis Running...</p>
                <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Checking image authenticity and crop quality. Please wait.</p>
              </div>
            </div>
          )}

          {verificationState === 'error' && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
              <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-red-800">Analysis Failed</p>
                <p className="text-[10px] text-red-600 font-medium mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {verificationState === 'rejected' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {rejectionType === 'ai_generated' ? 'AI-Generated Image Detected' : 'Crop Mismatch Detected'}
                  </p>
                  <p className="text-[10px] text-amber-800 font-medium mt-0.5 leading-relaxed">{rejectionReason}</p>
                </div>
              </div>
              <p className="text-[10px] text-amber-700 font-bold">
                ⚠ Listing cannot be published until this is resolved.
              </p>
            </div>
          )}

          {verificationState === 'done' && verificationReport && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-3">
              <div className="flex items-center gap-1.5 text-emerald-700 font-black uppercase tracking-wider text-[10px] border-b border-emerald-100 pb-2">
                <ShieldCheck size={14} /> AI Quality Report — {verificationReport.cropName}
                <span className="ml-auto text-sm font-black">Grade {verificationReport.qualityGrade}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <MiniField label="Ripeness"   value={verificationReport.ripeness} />
                <MiniField label="Freshness"  value={verificationReport.freshness} />
                <MiniField label="Shelf Life" value={verificationReport.estimatedShelfLife} />
                <MiniField label="Trust Score" value={`${verificationReport.trustScore}%`} />
                {verificationReport.defects?.length > 0 && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest">Defects</span>
                    <span className="text-red-600 font-bold ml-1 text-[10px]">{verificationReport.defects.join(', ')}</span>
                  </div>
                )}
                {verificationReport.summary && (
                  <div className="col-span-2 sm:col-span-4">
                    <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Summary</span>
                    <p className="text-[10px] text-gray-700 font-medium mt-0.5 leading-relaxed">{verificationReport.summary}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Input fields ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-gray-100">

          {/* Crop Name */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Crop Name</label>
            <div className="relative flex items-center">
              <input
                type="text"
                name="cropName"
                value={formData.cropName}
                onChange={handleChange}
                placeholder="Auto-detected by AI, or type manually"
                className={`w-full pl-4 pr-10 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${formErrors.cropName ? 'border-red-500' : 'border-gray-200'}`}
              />
              <button
                type="button"
                onClick={startVoiceTyping}
                className={`absolute right-3 p-1.5 rounded-full ${isListening ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-500'}`}
              >
                <Mic size={14} />
              </button>
            </div>
            {formErrors.cropName && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.cropName}</span>}
          </div>

          {/* Variety */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Variety</label>
            <input type="text" name="variety" value={formData.variety} onChange={handleChange}
              placeholder="e.g. Hybrid, Local"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
            <div className="flex gap-2">
              <input type="number" name="quantity" value={formData.quantity} onChange={handleChange}
                placeholder="500"
                className={`flex-1 px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${formErrors.quantity ? 'border-red-500' : 'border-gray-200'}`}
              />
              <select name="unit" value={formData.unit} onChange={handleChange}
                className="px-3 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 outline-none">
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
              </select>
            </div>
            {formErrors.quantity && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.quantity}</span>}
          </div>

          {/* Price */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Price Per Unit (₹)</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange}
              placeholder="e.g. 25"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${formErrors.price ? 'border-red-500' : 'border-gray-200'}`}
            />
            {formErrors.price && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.price}</span>}
          </div>

          {/* Harvest Date */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Harvest Date</label>
            <input type="date" name="harvestDate" value={formData.harvestDate} onChange={handleChange}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${formErrors.harvestDate ? 'border-red-500' : 'border-gray-200'}`}
            />
            {formErrors.harvestDate && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.harvestDate}</span>}
          </div>

          {/* Storage Type */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Storage Type</label>
            <select name="storageType" value={formData.storageType} onChange={handleChange}
              className="w-full pl-3.5 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none cursor-pointer">
              <option value="">Select storage...</option>
              <option value="Cold Storage">Cold Storage</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Open Field">Open Field</option>
              <option value="Home Storage">Home Storage</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Region Location</label>
            <select name="location" value={formData.location} onChange={handleChange}
              className={`w-full pl-3.5 pr-8 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none cursor-pointer ${formErrors.location ? 'border-red-500' : 'border-gray-200'}`}>
              <option value="">Select district...</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {formErrors.location && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.location}</span>}
          </div>

          {/* Contact phone */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact Phone</label>
            <input type="text" name="contactNumber" value={formData.contactNumber} onChange={handleChange}
              placeholder="10-digit number"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all ${formErrors.contactNumber ? 'border-red-500' : 'border-gray-200'}`}
            />
            {formErrors.contactNumber && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.contactNumber}</span>}
          </div>

          {/* Notes */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Additional Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
              placeholder="Transport preference, bagging, organic attributes..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all resize-none"
            />
          </div>
        </div>

        {/* ── Submit ───────────────────────────────────────────────────────── */}
        <div className="pt-4">
          {!images.front.preview && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 font-semibold mb-4">
              ⚠ Upload the Front View photo first — AI verification is required to publish a listing.
            </p>
          )}
          {verificationState === 'rejected' && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 font-semibold mb-4">
              🚫 Fix the rejected photo before publishing.
            </p>
          )}
          <button
            type="submit"
            disabled={!canPublish}
            className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm
              ${canPublish
                ? 'bg-[#166534] hover:bg-[#14532d] text-white'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {submitting
              ? <><Loader2 size={14} className="animate-spin" /> Publishing...</>
              : <><Check size={14} /> Publish Crop Listing</>
            }
          </button>
          {!canPublish && !submitting && images.front.preview && verificationState !== 'rejected' && (
            <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">
              {verificationState === 'analyzing' ? 'Waiting for AI verification to complete...' : ''}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}

function MiniField({ label, value }) {
  return (
    <div>
      <span className="text-[9px] text-gray-400 uppercase tracking-widest block">{label}</span>
      <span className="text-gray-900 font-bold text-xs block">{value || '—'}</span>
    </div>
  );
}
