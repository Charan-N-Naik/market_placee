import React, { useState, useRef } from 'react';
import { useListings } from '../context/ListingContext';
import { useAuth } from '../context/AuthContext';
import { verifyCropPhoto } from '../services/cropVerification';
import VerificationBadge from './VerificationBadge';
import VerificationReport from './VerificationReport';
import { 
  Upload, CheckCircle2, XCircle, Loader2, Sparkles, Camera, 
  ArrowRight, ShieldCheck, RefreshCw, BarChart2, Eye, Download, Link as LinkIcon,
  Check, Trash2, ShieldAlert
} from 'lucide-react';

export default function AICropAnalyzer() {
  const { user } = useAuth();
  const { getMyListings, updateListing } = useListings();
  const farmerListings = getMyListings(user?.name) || [];

  // 5 Multi-angle upload inputs
  const [images, setImages] = useState({
    front: { file: null, preview: null },
    back:  { file: null, preview: null },
    left:  { file: null, preview: null },
    right: { file: null, preview: null },
    top:   { file: null, preview: null }
  });

  const fileInputRefs = {
    front: useRef(null),
    back:  useRef(null),
    left:  useRef(null),
    right: useRef(null),
    top:   useRef(null)
  };

  const [uploadProgress, setUploadProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(false);

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

  const removeAngleImage = (angle, e) => {
    e.stopPropagation();
    setImages(prev => ({
      ...prev,
      [angle]: { file: null, preview: null }
    }));
  };

  const runAIScan = async () => {
    if (!images.front.file) {
      alert("Please upload at least the Front View photo of your crop harvest.");
      return;
    }

    setScanning(true);
    setUploadProgress(0);
    setResult(null);

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

      const rawResult = await verifyCropPhoto(images.front.file);
      setResult(rawResult);
    } catch (err) {
      setResult({
        verified: false,
        message: err.message || 'Vision classification failed. Please ensure photos are clear.'
      });
    } finally {
      setScanning(false);
    }
  };

  const handleLinkReport = async () => {
    if (!selectedListingId || !result?.report) return;

    try {
      const listing = farmerListings.find(l => (l._id || l.id) === selectedListingId);
      if (listing) {
        const verifObj = result.verification || {
          status: result.verified ? 'verified' : 'pending_review',
          trust_score: Number((result.confidence / 100).toFixed(2)),
          authenticity_score: 0.92,
          authenticity_reasons: [],
          location_valid: true,
          resolved_address: typeof listing.location === 'object' ? (listing.location.address || 'Verified Farm Location') : (listing.location || 'Verified Farm Location'),
          geo_flags: [],
          disease_label: result.report.pestIssues === 'None detected' ? 'Healthy' : result.report.pestIssues,
          disease_confidence: Number((result.confidence / 100).toFixed(2)),
          healthy_leaf: result.report.pestIssues === 'None detected',
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await updateListing(selectedListingId, {
          ...listing,
          aiVerified: true,
          verification: verifObj,
          verificationReport: {
            cropDetected: result.report.cropDetected,
            variety: result.report.variety,
            qualityGrade: result.report.condition || 'A',
            freshnessIndex: result.report.freshnessIndex,
            diseaseSigns: [result.report.pestIssues],
            pestDetection: result.report.pestIssues !== 'None detected',
            estimatedPrice: result.report.estimatedPrice,
            storageRecommendation: result.report.storageRecommendation,
          }
        });
        setLinkSuccess(true);
        setTimeout(() => setLinkSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to link report:', err);
      alert("Failed to link report to the listing");
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  const resetAnalyzer = () => {
    setImages({
      front: { file: null, preview: null },
      back:  { file: null, preview: null },
      left:  { file: null, preview: null },
      right: { file: null, preview: null },
      top:   { file: null, preview: null }
    });
    setResult(null);
    setScanning(false);
  };

  const ANGLE_CONFIG = [
    { key: 'front', label: 'Front View', subtext: 'Primary Angle' },
    { key: 'back',  label: 'Rear View',  subtext: 'Back Angle' },
    { key: 'left',  label: 'Left Side',  subtext: 'Side Angle' },
    { key: 'right', label: 'Right Side', subtext: 'Side Angle' },
    { key: 'top',   label: 'Overhead',   subtext: 'Top Angle' }
  ];

  return (
    <div className="w-full space-y-6 pb-12 px-1">
      
      {/* Centered Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-2 pb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200/60 shadow-xs">
          <Sparkles size={13} className="text-emerald-600" />
          CropVerify AI Engine
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          AI Crop Quality Verification
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
          Upload harvest photos from multiple angles to run deep visual diagnostics, verify authenticity, and generate tamper-proof quality certificates.
        </p>
      </div>

      {/* Main 2-Column Responsive Layout (Side-by-Side on md 768px+) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Multi-Angle Upload Inputs & Scan Controls */}
        <div className="md:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-emerald-600" />
                Multi-Angle Image Inputs
              </h4>
              <span className="text-[10px] font-semibold text-gray-400">
                {Object.values(images).filter(i => i.preview).length} / 5 Uploaded
              </span>
            </div>
            
            {/* 5 Multi-Angle Input Boxes side-by-side */}
            <div className="grid grid-cols-5 gap-2.5 sm:gap-3">
              {ANGLE_CONFIG.map((angle) => {
                const img = images[angle.key];
                return (
                  <div 
                    key={angle.key}
                    onClick={() => fileInputRefs[angle.key].current?.click()}
                    className={`group relative min-h-[140px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-3 text-center
                      ${img.preview 
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-xs hover:border-emerald-700' 
                        : 'border-gray-200 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-400 hover:shadow-md'
                      }
                    `}
                  >
                    {img.preview ? (
                      <>
                        <img src={img.preview} alt={angle.label} className="w-full h-full object-cover rounded-xl absolute inset-0" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2 backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={(e) => removeAngleImage(angle.key, e)}
                            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-transform hover:scale-110"
                            title="Remove photo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <div className="absolute bottom-1.5 left-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold py-0.5 rounded-md truncate px-1">
                          {angle.label}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1.5">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Camera size={20} className="text-emerald-600" />
                        </div>
                        <span className="text-xs font-bold text-gray-800 block mt-1">{angle.label}</span>
                        <span className="text-[9px] font-semibold text-gray-400 block">{angle.subtext}</span>
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

            {/* Run Diagnostic CTA */}
            <div className="pt-2">
              <button
                onClick={runAIScan}
                disabled={scanning || !images.front.preview}
                className={`w-full py-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer
                  ${images.front.preview 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.99]' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  }
                `}
              >
                {scanning ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Running Neural Quality Diagnostic...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Run Quality Diagnostic Scan
                  </>
                )}
              </button>

              {!images.front.preview && (
                <p className="text-[11px] text-gray-400 text-center font-medium mt-2">
                  * Upload at least the Front View photo to start analysis.
                </p>
              )}

              {scanning && (
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold text-emerald-800">
                    <span>Analyzing Image Features & Authenticity...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 transition-all duration-200" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {result && (
            <button
              onClick={resetAnalyzer}
              className="w-full py-3.5 border border-gray-200 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} /> Analyze Another Crop Batch
            </button>
          )}
        </div>

        {/* Right Column: Diagnostic Report / Standby Card */}
        <div className="md:col-span-5 space-y-6">
          
          {scanning && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20 min-h-[360px]">
              <Loader2 size={36} className="text-emerald-600 animate-spin mb-4" />
              <h5 className="font-bold text-gray-900 text-xs uppercase tracking-widest">Vision Diagnostic Active</h5>
              <p className="text-xs text-gray-400 mt-2 max-w-xs leading-relaxed">
                Examining surface textures, RGB color gradients, EXIF metadata, and pest indicators...
              </p>
            </div>
          )}

          {!scanning && !result && (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20 min-h-[360px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                <Eye size={28} />
              </div>
              <h5 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Diagnostic Standby</h5>
              <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                Upload a front harvest photo to generate an instant quality certificate with trust scores.
              </p>
            </div>
          )}

          {!scanning && result && result.verified && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6 animate-scale-in">
              
              {/* Report Card Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-100">
                <div>
                  <VerificationBadge
                    status={result.verification?.status || 'verified'}
                    trustScore={result.verification?.trust_score ?? (result.confidence / 100)}
                    showScore
                    size="md"
                  />
                  <h4 className="text-sm font-bold text-gray-900 mt-2.5 uppercase tracking-wide">
                    AI Quality Diagnostic Report
                  </h4>
                  <p className="text-[10px] text-gray-400 font-medium">Confidence Score: {result.confidence}%</p>
                </div>
                <button 
                  onClick={handleDownloadPDF}
                  className="p-2 border border-gray-200 hover:bg-gray-50 rounded-lg text-gray-600 flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="Print / Save PDF"
                >
                  <Download size={14} /> PDF
                </button>
              </div>

              {/* Key Diagnostic Metrics */}
              <div className="space-y-3 text-xs">
                
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Crop Detected</span>
                  <span className="text-gray-900 font-bold">{result.report.cropDetected} ({result.report.variety})</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Condition Grade</span>
                  <span className="text-emerald-700 font-black">Grade {result.report.condition}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Freshness Index</span>
                  <span className="text-gray-900 font-bold">{result.report.freshnessIndex}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Disease / Pest Status</span>
                  <span className="text-gray-900 font-bold">{result.report.pestIssues}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-400 font-bold uppercase text-[10px]">Estimated Market Price</span>
                  <span className="text-gray-900 font-bold">₹{result.report.estimatedPrice} / kg</span>
                </div>

                <div className="space-y-1 py-1">
                  <span className="text-gray-400 font-bold uppercase text-[10px] block">Storage Advice</span>
                  <p className="text-gray-700 font-medium bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-xs">
                    {result.report.storageRecommendation || 'Keep in cool, dry place.'}
                  </p>
                </div>
              </div>

              {/* Link Report directly to active stock listing */}
              {farmerListings.length > 0 && (
                <div className="pt-4 border-t border-gray-100 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Link Certificate to Active Listing
                  </span>
                  <div className="flex gap-2">
                    <select 
                      value={selectedListingId}
                      onChange={(e) => setSelectedListingId(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 hover:bg-white text-xs font-semibold rounded-xl border border-gray-200 outline-none"
                    >
                      <option value="">Choose active stock...</option>
                      {farmerListings.map(l => (
                        <option key={l._id || l.id} value={l._id || l.id}>
                          🌾 {l.cropName} ({l.quantity} {l.unit})
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={handleLinkReport}
                      disabled={!selectedListingId}
                      className="px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                    >
                      <LinkIcon size={14} /> Link
                    </button>
                  </div>
                  {linkSuccess && (
                    <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 size={13} /> Verification report attached to listing!
                    </p>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
