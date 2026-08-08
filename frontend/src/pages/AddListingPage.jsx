import { useState, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useListings } from '../context/ListingContext';
import { verifyCropPhoto } from '../services/cropVerification';
import { cropOptions, locations } from '../data/mockData';
import { 
  Upload, CheckCircle2, XCircle, Loader2, ImagePlus, Mic, MicOff,
  Camera, ArrowRight, ShieldCheck, RefreshCw, Sparkles, Check
} from 'lucide-react';

export default function AddListingPage({ onSuccess }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { addListing } = useListings();

  // 5 angle files and previews
  const [images, setImages] = useState({
    front: { file: null, preview: null },
    back: { file: null, preview: null },
    left: { file: null, preview: null },
    right: { file: null, preview: null },
    top: { file: null, preview: null }
  });

  const fileInputRefs = {
    front: useRef(null),
    back: useRef(null),
    left: useRef(null),
    right: useRef(null),
    top: useRef(null)
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

  const [uploadProgress, setUploadProgress] = useState(0); // 0 to 100
  const [verificationStatus, setVerificationStatus] = useState(null); // null | 'uploading' | 'verifying' | 'verified' | 'rejected'
  const [verificationResult, setVerificationResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Form errors
  const [formErrors, setFormErrors] = useState({});

  const startVoiceTyping = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice typing is not supported in this browser. Please type manually.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; 
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setFormData(prev => ({ ...prev, cropName: transcript }));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (formErrors[e.target.name]) {
      setFormErrors(prev => ({ ...prev, [e.target.name]: null }));
    }
  };

  const handleAngleUpload = (angle, file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImages(prev => ({
        ...prev,
        [angle]: { file, preview: ev.target.result }
      }));
    };
    reader.readAsDataURL(file);
  };

  const triggerAIScan = async () => {
    // We need at least 3 angles or the front angle to initiate scan
    if (!images.front.file) {
      alert("Please upload at least the Front view of the crop harvest to initiate AI analysis.");
      return;
    }

    setVerificationStatus('uploading');
    setUploadProgress(0);

    // Simulate progress bar upload
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 95;
        }
        return prev + 15;
      });
    }, 150);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      clearInterval(interval);
      setUploadProgress(100);
      setVerificationStatus('verifying');

      const result = await verifyCropPhoto(images.front.file);

      // Use actual backend AI response — no fabrication
      setVerificationResult(result);
      setVerificationStatus(result.verified ? 'verified' : 'rejected');

      // Autofill form fields ONLY from real backend-detected values
      if (result.verified && result.report) {
        const r = result.report;
        setFormData(prev => ({
          ...prev,
          cropName: prev.cropName || r.cropDetected || '',
          variety: prev.variety || r.variety || '',
          storageType: prev.storageType || (r.storageRecommendation ? 'Cold Storage' : ''),
          price: prev.price || (r.estimatedPrice ? r.estimatedPrice.toString() : '')
        }));
      }

    } catch (err) {
      setVerificationStatus('rejected');
      setVerificationResult({
        verified: false,
        message: 'AI verification failed. Please ensure the photo is clear and shows a real crop harvest.'
      });
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.cropName.trim()) errors.cropName = "Crop name is required";
    if (!formData.quantity || parseInt(formData.quantity) <= 0) errors.quantity = "Please enter a valid quantity";
    if (!formData.price || parseInt(formData.price) <= 0) errors.price = "Please enter a valid price";
    if (!formData.harvestDate) errors.harvestDate = "Harvest date is required";
    if (!formData.location) errors.location = "Please select a location";
    if (!formData.contactNumber.match(/^\d{10}$/)) errors.contactNumber = "Please enter a valid 10-digit number";
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (verificationStatus !== 'verified') {
      alert("Please trigger AI analysis & verification on your images first.");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await addListing({
        cropName: formData.cropName,
        variety: formData.variety,
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        pricePerUnit: parseInt(formData.price),
        description: formData.notes,
        harvestDate: formData.harvestDate,
        location: formData.location,
        isOrganic: false,
        photoFile: images.front.file, // default front image as primary
        report: verificationResult?.report || null,
      });
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to submit listing:', err);
      alert('Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const angles = [
    { key: 'front', label: 'Front View', required: true },
    { key: 'back', label: 'Back View', required: false },
    { key: 'left', label: 'Left Side', required: false },
    { key: 'right', label: 'Right Side', required: false },
    { key: 'top', label: 'Top View', required: false }
  ];

  return (
    <div className="max-w-[760px] mx-auto pb-16">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-6 p-6 md:p-8">
        
        {/* Multi-angle uploads */}
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 uppercase tracking-wider">Multi-Angle Crop Photographs</h3>
            <p className="text-xs text-gray-400 font-semibold mt-1">Upload crop images from different angles to run deep AI diagnostic classification.</p>
          </div>

          <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
            {angles.map((angle) => {
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
                      {angle.required ? (
                        <span className="text-[8px] text-emerald-700 font-extrabold uppercase tracking-wider block">Required</span>
                      ) : (
                        <span className="text-[8px] text-gray-400 font-medium block">Optional</span>
                      )}
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

          {/* Trigger Scan Button */}
          {images.front.preview && (
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={triggerAIScan}
                disabled={verificationStatus === 'uploading' || verificationStatus === 'verifying'}
                className="w-full py-3 bg-[#166534] hover:bg-[#14532d] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                {verificationStatus === 'uploading' || verificationStatus === 'verifying' ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Analyzing pixels...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Run AI Verification Scan
                  </>
                )}
              </button>

              {/* Progress bar */}
              {(verificationStatus === 'uploading' || verificationStatus === 'verifying') && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                    <span>Uploading angles...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#22C55E] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AI scan outputs */}
          {verificationStatus === 'verified' && verificationResult?.report && (
            <div className="p-4 rounded-xl bg-[#f0fdf4] border border-[#dcfce7] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold">
              <div className="col-span-2 sm:col-span-4 flex items-center gap-1.5 text-[#166534] font-black uppercase tracking-wider text-[10px] pb-1.5 border-b border-[#dcfce7]">
                <ShieldCheck size={14} /> AI Diagnostic Identification Report
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Crop Name</span>
                <span className="text-gray-900 font-bold block">{verificationResult.report.cropDetected}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Crop Variety</span>
                <span className="text-gray-900 font-bold block">{verificationResult.report.variety}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Quality Grade</span>
                <span className="text-gray-900 font-bold block">Grade {verificationResult.report.condition}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Freshness</span>
                <span className="text-gray-900 font-bold block">{verificationResult.report.freshnessIndex}</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Disease Signs</span>
                <span className="text-red-600 font-bold block">{verificationResult.report.disease}</span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-[9px] text-gray-400 uppercase tracking-widest block">Scan Confidence</span>
                <span className="text-gray-900 font-bold block">{verificationResult.confidence}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Input fields */}
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
                placeholder="Name detected by AI, or type manually"
                className={`w-full pl-4 pr-10 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all
                  ${formErrors.cropName ? 'border-red-500' : 'border-gray-200'}
                `}
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
            <input
              type="text"
              name="variety"
              value={formData.variety}
              onChange={handleChange}
              placeholder="e.g. Hybrid, Local"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Quantity</label>
            <div className="flex gap-2">
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="500"
                className={`flex-1 px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all
                  ${formErrors.quantity ? 'border-red-500' : 'border-gray-200'}
                `}
              />
              <select
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="px-3 py-3 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 outline-none"
              >
                <option value="kg">kg</option>
                <option value="quintal">quintal</option>
              </select>
            </div>
            {formErrors.quantity && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.quantity}</span>}
          </div>

          {/* Price */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Price Per Unit</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g. 25"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all
                ${formErrors.price ? 'border-red-500' : 'border-gray-200'}
              `}
            />
            {formErrors.price && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.price}</span>}
          </div>

          {/* Harvest Date */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Harvest Date</label>
            <input
              type="date"
              name="harvestDate"
              value={formData.harvestDate}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all
                ${formErrors.harvestDate ? 'border-red-500' : 'border-gray-200'}
              `}
            />
            {formErrors.harvestDate && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.harvestDate}</span>}
          </div>

          {/* Storage Type */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Storage Type</label>
            <select
              name="storageType"
              value={formData.storageType}
              onChange={handleChange}
              className="w-full pl-3.5 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none cursor-pointer"
            >
              <option value="">Select storage...</option>
              <option value="Cold Storage">Cold Storage</option>
              <option value="Warehouse">Warehouse</option>
              <option value="Open Field">Open Field</option>
              <option value="Home Storage">Home Storage</option>
            </select>
          </div>

          {/* Region Location */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Region Location</label>
            <select
              name="location"
              value={formData.location}
              onChange={handleChange}
              className={`w-full pl-3.5 pr-8 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none cursor-pointer
                ${formErrors.location ? 'border-red-500' : 'border-gray-200'}
              `}
            >
              <option value="">Select district...</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            {formErrors.location && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.location}</span>}
          </div>

          {/* Contact phone */}
          <div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact phone</label>
            <input
              type="text"
              name="contactNumber"
              value={formData.contactNumber}
              onChange={handleChange}
              placeholder="10-digit number"
              className={`w-full px-4 py-3 bg-gray-50 border rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all
                ${formErrors.contactNumber ? 'border-red-500' : 'border-gray-200'}
              `}
            />
            {formErrors.contactNumber && <span className="text-[10px] text-red-500 mt-1 block">{formErrors.contactNumber}</span>}
          </div>

          {/* Additional Notes */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Enter transport preference, bagging, or organic attributes"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold outline-none focus:bg-white transition-all resize-none"
            />
          </div>

        </div>

        {/* Submit */}
        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            disabled={verificationStatus !== 'verified' || submitting}
            className={`flex-1 py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm
              ${verificationStatus === 'verified' && !submitting
                ? 'bg-[#166534] hover:bg-[#14532d] text-white' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Publish Crop Listing
          </button>
        </div>

      </form>
    </div>
  );
}
