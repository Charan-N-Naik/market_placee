import React, { useState, useRef, useCallback } from 'react';
import { useListings } from '../context/ListingContext';
import { useAuth } from '../context/AuthContext';
import { analyzeCropMultiAngle } from '../services/cropVerification';
import {
  CheckCircle2, XCircle, Loader2, Sparkles, Camera,
  ShieldCheck, RefreshCw, Eye, Download, Link as LinkIcon,
  Check, Trash2, ShieldAlert, AlertTriangle, Leaf, Clock,
  TrendingUp, Thermometer, Star, Award, Truck, Info, FileCheck
} from 'lucide-react';

const ANGLE_CONFIG = [
  { key: 'front', label: 'Front View', subtext: 'Primary Angle', required: true },
  { key: 'left',  label: 'Left Side',  subtext: 'Side Angle',    required: true },
  { key: 'right', label: 'Right Side', subtext: 'Side Angle',    required: true },
];

const GRADE_COLORS = {
  'A+': 'text-emerald-700 bg-emerald-100 border-emerald-300',
  A:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  B:    'text-amber-700 bg-amber-50 border-amber-200',
  C:    'text-red-700 bg-red-50 border-red-200'
};

export default function AICropAnalyzer() {
  const { user } = useAuth();
  const { getMyListings, updateListing } = useListings();
  const farmerListings = getMyListings(user?.name) || [];

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

  // analysisState: null | 'analyzing' | 'done' | 'rejected' | 'error'
  const [analysisState, setAnalysisState] = useState(null);
  const [analysisReport, setAnalysisReport] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionType, setRejectionType] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [duplicateError, setDuplicateError] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [linkSuccess, setLinkSuccess] = useState(false);

  const uploadedCount = Object.values(images).filter(i => i.preview).length;

  // ── Compute a file fingerprint to detect duplicate uploads ──────────────────
  const getFingerprint = (file) => `${file.name}__${file.size}__${file.lastModified}`;

  const hasDuplicates = (imgs) => {
    const files = Object.values(imgs).map(i => i.file).filter(Boolean);
    if (files.length < 2) return false;
    const fps = files.map(getFingerprint);
    return new Set(fps).size < fps.length;
  };

  // ── Run Analysis ONLY when all 3 images are uploaded ──────────────────────
  const runAnalysis = useCallback(async (currentImages) => {
    // Require ALL 3 photos (Front, Left, Right)
    if (!currentImages.front.file || !currentImages.left.file || !currentImages.right.file) {
      return;
    }

    const files = {
      front: currentImages.front.file,
      left:  currentImages.left.file,
      right: currentImages.right.file,
    };

    setAnalysisState('analyzing');
    setAnalysisReport(null);
    setRejectionReason('');
    setErrorMessage('');

    try {
      const result = await analyzeCropMultiAngle(files, '', user?.role || 'buyer');

      if (result.rejected) {
        setAnalysisState('rejected');
        setRejectionType(result.rejectionType || 'unknown');
        setRejectionReason(result.reason || 'Photos rejected by AI verification.');
      } else {
        setAnalysisState('done');
        setAnalysisReport(result.report);
      }
    } catch (err) {
      setAnalysisState('error');
      setErrorMessage(err.message || 'Analysis failed. Please try again.');
    }
  }, [user?.role]);

  const handleAngleUpload = (angle, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImages(prev => {
        const next = { ...prev, [angle]: { file, preview: ev.target.result } };
        const count = Object.values(next).filter(i => i.file).length;

        // ── Duplicate photo check ─────────────────────────────────────────────
        if (hasDuplicates(next)) {
          setDuplicateError(true);
          setAnalysisState(null);
          setAnalysisReport(null);
          return next;
        }

        setDuplicateError(false);

        // Auto-trigger analysis once all 3 unique photos are uploaded
        if (count === 3) {
          setTimeout(() => runAnalysis(next), 100);
        } else {
          setAnalysisState(null);
          setAnalysisReport(null);
        }
        return next;
      });
    };
    reader.readAsDataURL(file);
  };

  const removeAngleImage = (angle, e) => {
    e.stopPropagation();
    setImages(prev => {
      const next = { ...prev, [angle]: { file: null, preview: null } };
      setDuplicateError(false);
      setAnalysisState(null);
      setAnalysisReport(null);
      return next;
    });
  };

  const rerunScan = () => {
    if (uploadedCount === 3) {
      runAnalysis(images);
    }
  };

  const handleLinkReport = async () => {
    if (!selectedListingId || !analysisReport) return;
    try {
      const listing = farmerListings.find(l => (l._id || l.id) === selectedListingId);
      if (listing) {
        await updateListing(selectedListingId, {
          ...listing,
          aiVerified: true,
          verificationReport: analysisReport,
        });
        setLinkSuccess(true);
        setTimeout(() => setLinkSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to link report:', err);
      alert('Failed to link report to the listing');
    }
  };

  const resetAnalyzer = () => {
    setImages({
      front: { file: null, preview: null },
      left:  { file: null, preview: null },
      right: { file: null, preview: null }
    });
    setAnalysisState(null);
    setAnalysisReport(null);
    setRejectionReason('');
    setErrorMessage('');
    setDuplicateError(false);
  };

  // ── Download Printable AI Verification Certificate ────────────────────────
  const handleDownloadCertificate = () => {
    if (!analysisReport) return;

    const certId = `KB-CERT-${Math.floor(100000 + Math.random() * 900000)}`;
    const certDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download/print the certificate.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Crop Verification Certificate - ${analysisReport.cropName}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 24px; color: #111827; background: #fff; }
          .cert-card { border: 8px double #059669; padding: 32px; max-width: 800px; margin: 0 auto; border-radius: 16px; position: relative; background: #fafdfb; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: 900; color: #065f46; letter-spacing: -0.5px; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 13px; font-weight: 600; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
          .meta-row { display: flex; justify-content: space-between; font-size: 12px; color: #4b5563; margin-bottom: 20px; border-bottom: 1px dashed #d1d5db; padding-bottom: 12px; }
          .photo-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
          .photo-box { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; height: 140px; text-align: center; background: #f3f4f6; }
          .photo-box img { width: 100%; height: 115px; object-fit: cover; }
          .photo-label { font-size: 10px; font-weight: 700; color: #374151; padding: 3px 0; background: #e5e7eb; text-transform: uppercase; }
          .grade-banner { display: flex; align-items: center; justify-content: space-between; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 12px; padding: 16px 24px; margin-bottom: 24px; }
          .grade-title { font-size: 22px; font-weight: 900; color: #065f46; margin: 0; }
          .grade-badge { font-size: 36px; font-weight: 900; color: #047857; background: #fff; border: 2px solid #059669; padding: 4px 20px; border-radius: 12px; }
          .section-title { font-size: 13px; font-weight: 800; color: #065f46; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 20px; margin-bottom: 8px; border-left: 4px solid #059669; padding-left: 8px; }
          .metrics-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
          .metrics-table th, .metrics-table td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
          .metrics-table th { background: #f9fafb; font-weight: 700; color: #374151; }
          .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; font-size: 12px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 32px; border-top: 2px solid #e5e7eb; padding-top: 16px; font-size: 11px; color: #6b7280; }
          .stamp { border: 2px dashed #059669; border-radius: 50%; width: 90px; height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #047857; font-weight: 800; font-size: 9px; text-transform: uppercase; transform: rotate(-8deg); }
          @media print {
            body { padding: 0; background: #fff; }
            .cert-card { border-width: 4px; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="cert-card">
          <div class="header">
            <h1 class="title">Official AI Crop Quality Certificate</h1>
            <div class="subtitle">KisanBazaar Multi-Angle Diagnostic Engine</div>
          </div>

          <div class="meta-row">
            <div><strong>Certificate ID:</strong> ${certId}</div>
            <div><strong>Issued Date:</strong> ${certDate}</div>
            <div><strong>Verification Status:</strong> VERIFIED REAL CROP</div>
          </div>

          <div class="photo-grid">
            <div class="photo-box">
              <img src="${images.front.preview}" alt="Front View" />
              <div class="photo-label">Front View</div>
            </div>
            <div class="photo-box">
              <img src="${images.left.preview}" alt="Left Side" />
              <div class="photo-label">Left Side</div>
            </div>
            <div class="photo-box">
              <img src="${images.right.preview}" alt="Right Side" />
              <div class="photo-label">Right Side</div>
            </div>
          </div>

          <div class="grade-banner">
            <div>
              <h2 class="grade-title">${analysisReport.cropName}</h2>
              <div style="font-size:13px; font-weight:600; color:#047857; margin-top:2px;">Variety: ${analysisReport.variety} | AI Trust Score: ${analysisReport.trustScore}%</div>
            </div>
            <div class="grade-badge">Grade ${analysisReport.qualityGrade}</div>
          </div>

          <div class="section-title">Visual Diagnostic Metrics</div>
          <table class="metrics-table">
            <tr>
              <th>Ripeness</th>
              <td>${analysisReport.ripeness}</td>
              <th>Freshness</th>
              <td>${analysisReport.freshness}</td>
            </tr>
            <tr>
              <th>Color Uniformity</th>
              <td>${analysisReport.colorUniformity}</td>
              <th>Surface Texture</th>
              <td>${analysisReport.surfaceTexture}</td>
            </tr>
            <tr>
              <th>Est. Shelf Life</th>
              <td>${analysisReport.estimatedShelfLife}</td>
              <th>Est. APMC Price</th>
              <td>₹${analysisReport.estimatedPricePerKg}/kg</td>
            </tr>
            <tr>
              <th>Visible Defects</th>
              <td>${analysisReport.defects?.length > 0 ? analysisReport.defects.join(', ') : 'None detected'}</td>
              <th>Pest Damage</th>
              <td>${analysisReport.pestDetection ? 'Pest damage detected' : 'Clean (No pests detected)'}</td>
            </tr>
          </table>

          <div class="section-title">Storage & Logistics Guidance</div>
          <div class="summary-box">
            <strong>Storage Advice:</strong> ${analysisReport.storageRecommendation || 'Store in a cool, dry place.'}<br/>
            <strong>Transport Handling:</strong> ${analysisReport.logisticsAdvice || 'Transport in clean, ventilated containers.'}<br/>
            <strong>APMC Pricing Justification:</strong> ${analysisReport.priceGradeJustification}
          </div>

          <div class="section-title">Full Diagnostic Summary</div>
          <div class="summary-box">
            ${analysisReport.summary}
          </div>

          <div class="footer">
            <div>
              <strong>Issued by KisanBazaar AI Vision Engine</strong><br/>
              Verified using 3-angle computer vision forensic analysis.
            </div>
            <div class="stamp">
              <div>✔ AI VERIFIED</div>
              <div style="font-size:7px; margin-top:2px;">KisanBazaar</div>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // ── Score bar component ───────────────────────────────────────────────────
  const ScoreBar = ({ value, max = 100, color = 'bg-emerald-500' }) => (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-all duration-700 ease-out`}
        style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
      />
    </div>
  );

  return (
    <div className="w-full space-y-6 pb-12 px-1">

      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-2 pb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-200/60 shadow-xs">
          <Sparkles size={13} className="text-emerald-600" />
          Multi-Angle Vision AI Engine
        </span>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          AI Crop Quality Verification
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
          Upload harvest photos from <strong className="text-gray-800">all 3 angles</strong> (Front View, Left Side, Right Side). Full AI diagnostic analysis starts as soon as all 3 photos are uploaded.
        </p>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Left Column: Upload Inputs */}
        <div className="md:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">

            {/* Header & Status Progress */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Camera size={16} className="text-emerald-600" />
                3-Angle Image Inputs
              </h4>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                duplicateError
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : uploadedCount === 3
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}>
                {duplicateError ? '⚠ Duplicate Detected' : `${uploadedCount} / 3 Uploaded`}
              </span>
            </div>

            {/* Progress / Duplicate Error Notification Bar */}
            <div className={`w-full rounded-xl p-3 text-center border ${
              duplicateError
                ? 'bg-red-50 border-red-300'
                : 'bg-gray-50 border-gray-100'
            }`}>
              {duplicateError ? (
                <p className="text-xs text-red-800 font-bold flex items-center justify-center gap-1.5">
                  <XCircle size={14} className="text-red-600 shrink-0" />
                  Duplicate photos detected! Upload a <strong>different</strong> real photo for each angle slot (Front, Left, Right).
                </p>
              ) : uploadedCount === 0 ? (
                <p className="text-xs text-gray-500 font-medium flex items-center justify-center gap-1.5">
                  <Info size={14} className="text-amber-500" />
                  Please upload photos for <strong>Front View</strong>, <strong>Left Side</strong>, and <strong>Right Side</strong>.
                </p>
              ) : uploadedCount === 1 ? (
                <p className="text-xs text-amber-800 font-semibold flex items-center justify-center gap-1.5">
                  <Clock size={14} className="text-amber-600" />
                  1 of 3 uploaded. Please upload <strong>Left Side</strong> and <strong>Right Side</strong> photos.
                </p>
              ) : uploadedCount === 2 ? (
                <p className="text-xs text-amber-800 font-semibold flex items-center justify-center gap-1.5">
                  <Clock size={14} className="text-amber-600" />
                  2 of 3 uploaded. Upload <strong>Right Side</strong> photo to unlock full AI analysis.
                </p>
              ) : (
                <p className="text-xs text-emerald-800 font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  All 3 unique angle photos ready! Running full AI verification...
                </p>
              )}
            </div>

            {/* 3-Slot Image Upload Grid */}
            <div className="grid grid-cols-3 gap-3">
              {ANGLE_CONFIG.map((angle) => {
                const img = images[angle.key];
                // Check if THIS slot's file fingerprint matches any other slot
                const isDuplicateSlot = duplicateError && img.file && (() => {
                  const myFp = getFingerprint(img.file);
                  return ANGLE_CONFIG
                    .filter(a => a.key !== angle.key)
                    .some(a => images[a.key].file && getFingerprint(images[a.key].file) === myFp);
                })();
                return (
                  <div
                    key={angle.key}
                    onClick={() => fileInputRefs[angle.key].current?.click()}
                    className={`group relative min-h-[150px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 p-3 text-center
                      ${isDuplicateSlot
                        ? 'border-red-500 bg-red-50/30 shadow-xs'
                        : img.preview
                        ? 'border-emerald-600 bg-emerald-50/20 shadow-xs hover:border-emerald-700'
                        : 'border-gray-200 bg-gray-50/50 hover:bg-emerald-50/30 hover:border-emerald-400 hover:shadow-md'
                      }
                    `}
                  >
                    {img.preview ? (
                      <>
                        <img src={img.preview} alt={angle.label} className="w-full h-full object-cover rounded-xl absolute inset-0" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center backdrop-blur-xs">
                          <button
                            type="button"
                            onClick={(e) => removeAngleImage(angle.key, e)}
                            className="p-1.5 bg-red-600 text-white rounded-full hover:bg-red-700 transition-transform hover:scale-110"
                            title="Remove photo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        {isDuplicateSlot ? (
                          <span className="absolute top-2 right-2 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm z-10 animate-pulse">
                            <XCircle size={14} />
                          </span>
                        ) : (
                          <span className="absolute top-2 right-2 w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] shadow-sm">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
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
                        <span className="text-[8px] font-black text-emerald-700 uppercase tracking-wide">Required</span>
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

            {/* Action Trigger Button */}
            <div className="pt-2">
              {duplicateError && (
                <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <XCircle size={14} className="text-red-500 shrink-0" />
                  <p className="text-[11px] text-red-700 font-bold leading-tight">
                    Remove the duplicate photo and upload a different image from a different angle of the same crop.
                  </p>
                </div>
              )}
              <button
                onClick={rerunScan}
                disabled={uploadedCount < 3 || analysisState === 'analyzing' || duplicateError}
                className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                  uploadedCount === 3 && !duplicateError
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 hover:scale-[1.01] cursor-pointer'
                    : duplicateError
                    ? 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                }`}
              >
                {analysisState === 'analyzing' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Executing 3-Angle AI Analysis...
                  </>
                ) : duplicateError ? (
                  <>
                    <XCircle size={16} />
                    Duplicate Photos Detected — Please Fix
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    {uploadedCount < 3
                      ? `Upload All 3 Photos to Analyze (${uploadedCount}/3)`
                      : 'Analyze 3-Angle Crop Batch'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Reset button shown after analysis */}
          {analysisState && analysisState !== 'analyzing' && (
            <button
              onClick={resetAnalyzer}
              className="w-full py-3.5 border border-gray-200 hover:bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-700 rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <RefreshCw size={14} /> Analyze Another Crop Batch
            </button>
          )}
        </div>

        {/* Right Column: Detailed AI Quality Report */}
        <div className="md:col-span-6">

          {/* STANDBY */}
          {!analysisState && (
            <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center py-20 min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 text-emerald-600">
                <Eye size={28} />
              </div>
              <h5 className="font-bold text-gray-800 text-sm uppercase tracking-wider">3-Angle Diagnostic Standby</h5>
              <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                Upload photos for <strong>Front View</strong>, <strong>Left Side</strong>, and <strong>Right Side</strong> to trigger complete AI quality verification.
              </p>
            </div>
          )}

          {/* ANALYZING */}
          {analysisState === 'analyzing' && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[420px] space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                  <Sparkles size={28} className="text-emerald-600 animate-pulse" />
                </div>
                <Loader2 size={64} className="text-emerald-500/30 animate-spin absolute -inset-0" strokeWidth={1} />
              </div>
              <div>
                <h5 className="font-bold text-gray-900 text-xs uppercase tracking-widest">3-Angle Vision AI Active</h5>
                <p className="text-xs text-emerald-700 mt-1 font-semibold">Performing multi-angle crop species & quality diagnostic...</p>
                <p className="text-[11px] text-gray-400 mt-2 max-w-xs leading-relaxed">
                  Evaluating Front, Left, and Right camera angles for color, texture, calyx firmness, surface defects, and APMC valuation...
                </p>
              </div>
              <div className="w-full max-w-xs space-y-1">
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: '75%' }} />
                </div>
              </div>
            </div>
          )}

          {/* ERROR */}
          {analysisState === 'error' && (
            <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm space-y-4 min-h-[200px]">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <XCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900 text-sm">Analysis Failed</h5>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{errorMessage}</p>
                </div>
              </div>
              <button
                onClick={rerunScan}
                className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={13} /> Try Again
              </button>
            </div>
          )}

          {/* REJECTED */}
          {analysisState === 'rejected' && (
            <div className="bg-white border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-start gap-3 pb-4 border-b border-amber-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} className="text-amber-600" />
                </div>
                <div>
                  <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block">
                    {rejectionType === 'ai_generated' ? 'AI-Generated Image Detected' : 'Crop Mismatch Detected'}
                  </span>
                  <h5 className="font-bold text-gray-900 text-sm mt-0.5">Verification Rejected</h5>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-xs text-amber-900 font-medium leading-relaxed">{rejectionReason}</p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-600 font-medium">
                <strong className="text-gray-800 block mb-1">What to do:</strong>
                {rejectionType === 'ai_generated'
                  ? 'Take real camera photos of your crop at your farm and re-upload.'
                  : 'Ensure all 3 photos show the exact same crop batch from Front, Left, and Right angles.'}
              </div>

              <button
                onClick={rerunScan}
                className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-xl border border-amber-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={13} /> Re-analyze Current Photos
              </button>
            </div>
          )}

          {/* SUCCESS — Detailed Quality Verification Certificate & Report */}
          {analysisState === 'done' && analysisReport && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm space-y-0 overflow-hidden">

              {/* Certificate Header Banner */}
              <div className={`px-5 py-4 border-b flex items-center justify-between ${GRADE_COLORS[analysisReport.qualityGrade] || 'bg-emerald-50 border-emerald-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 shadow-xs flex items-center justify-center">
                    <ShieldCheck size={22} className="text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block flex items-center gap-1">
                      <Award size={12} /> Official AI Quality Certificate
                    </span>
                    <h4 className="font-black text-gray-900 text-base leading-tight">{analysisReport.cropName}</h4>
                    <span className="text-[11px] text-gray-600 font-semibold">{analysisReport.variety}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 text-2xl font-black rounded-xl border shadow-xs ${GRADE_COLORS[analysisReport.qualityGrade] || 'text-emerald-700 bg-emerald-100'}`}>
                    Grade {analysisReport.qualityGrade}
                  </span>
                </div>
              </div>

              {/* Download Certificate Action Bar */}
              <div className="px-5 py-3 bg-emerald-950 text-white flex items-center justify-between">
                <span className="text-[11px] font-bold flex items-center gap-1.5">
                  <FileCheck size={14} className="text-emerald-400" />
                  3-Angle Diagnostic Report Ready
                </span>
                <button
                  onClick={handleDownloadCertificate}
                  className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Download size={13} /> Download Certificate
                </button>
              </div>

              {/* Trust Score Bar */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Trust Score</span>
                  <span className="text-xs font-black text-gray-900">{analysisReport.trustScore}%</span>
                </div>
                <ScoreBar value={analysisReport.trustScore} color={analysisReport.trustScore >= 75 ? 'bg-emerald-500' : analysisReport.trustScore >= 50 ? 'bg-amber-400' : 'bg-red-400'} />
              </div>

              {/* Comprehensive Diagnostic Metrics Grid */}
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-gray-100 bg-white">
                <MetricCell icon={<Leaf size={14} />} label="Ripeness" value={analysisReport.ripeness} />
                <MetricCell icon={<Star size={14} />} label="Freshness" value={analysisReport.freshness} />
                <MetricCell icon={<Clock size={14} />} label="Est. Shelf Life" value={analysisReport.estimatedShelfLife} />
                <MetricCell icon={<TrendingUp size={14} />} label="Est. APMC Price" value={analysisReport.estimatedPricePerKg > 0 ? `₹${analysisReport.estimatedPricePerKg}/kg` : 'N/A'} />
                <MetricCell icon={<Award size={14} />} label="Color Uniformity" value={analysisReport.colorUniformity} />
                <MetricCell icon={<Sparkles size={14} />} label="Surface Texture" value={analysisReport.surfaceTexture} />
              </div>

              {/* Visible Defects & Pest Inspection */}
              <div className="px-5 py-4 border-b border-gray-100 space-y-2">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Defect & Disease Inspection</span>
                {analysisReport.defects && analysisReport.defects.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {analysisReport.defects.map((d, i) => (
                      <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
                        <XCircle size={11} /> {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Clean surface (No physical defects detected across all 3 angles)
                  </span>
                )}
                {analysisReport.diseaseSigns && analysisReport.diseaseSigns.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {analysisReport.diseaseSigns.map((ds, i) => (
                      <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-semibold flex items-center gap-1">
                        <AlertTriangle size={11} /> {ds}
                      </span>
                    ))}
                  </div>
                )}
                {analysisReport.pestDetection && (
                  <span className="text-[11px] text-red-600 font-bold flex items-center gap-1 block pt-1">
                    <AlertTriangle size={12} /> Pest damage identified during multi-angle scan
                  </span>
                )}
              </div>

              {/* Storage & Logistics Handling Advice */}
              <div className="px-5 py-4 border-b border-gray-100 space-y-3">
                <div>
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Storage Recommendation</span>
                  <p className="text-xs text-gray-700 font-medium leading-relaxed flex items-start gap-1.5">
                    <Thermometer size={14} className="text-blue-500 shrink-0 mt-0.5" />
                    {analysisReport.storageRecommendation || 'Store in a cool, dry place.'}
                  </p>
                </div>
                {analysisReport.logisticsAdvice && (
                  <div>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Transit & Logistics Advice</span>
                    <p className="text-xs text-gray-700 font-medium leading-relaxed flex items-start gap-1.5">
                      <Truck size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                      {analysisReport.logisticsAdvice}
                    </p>
                  </div>
                )}
              </div>

              {/* APMC Price Justification */}
              {analysisReport.priceGradeJustification && (
                <div className="px-5 py-3 border-b border-gray-100 bg-amber-50/40">
                  <span className="text-[9px] font-black text-amber-800 uppercase tracking-widest block mb-1">APMC Pricing Justification</span>
                  <p className="text-xs text-amber-900 font-medium leading-relaxed">{analysisReport.priceGradeJustification}</p>
                </div>
              )}

              {/* Plain-Language Assessment Summary */}
              <div className="px-5 py-4 border-b border-gray-100">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Diagnostic Assessment Summary</span>
                <p className="text-xs text-gray-700 font-medium leading-relaxed">{analysisReport.summary}</p>
              </div>

              {/* Actionable Recommendations */}
              {analysisReport.recommendations && analysisReport.recommendations.length > 0 && (
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Grower Handling Advice</span>
                  <ul className="space-y-1">
                    {analysisReport.recommendations.map((rec, i) => (
                      <li key={i} className="text-xs text-gray-600 font-medium flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Analyzed Angles Bar */}
              <div className="px-5 py-3 bg-gray-100/70 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  Verified using 3 Photo Angles (Front, Left, Right)
                </span>
                <button
                  onClick={rerunScan}
                  className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 hover:text-emerald-900 cursor-pointer"
                >
                  <RefreshCw size={11} /> Re-run Scan
                </button>
              </div>

              {/* Link Certificate to Farmer Listing */}
              {farmerListings.length > 0 && (
                <div className="px-5 py-4 border-t border-gray-100 space-y-3 bg-white">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Attach Certificate to Active Listing
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
                      <CheckCircle2 size={13} /> Verification certificate linked to crop listing!
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

function MetricCell({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
      <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value || 'N/A'}</span>
      </div>
    </div>
  );
}
