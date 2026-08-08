/**
 * VerificationReport.jsx
 * ========================
 * Full verification breakdown panel for a product listing.
 * Shown inside ListingDetails.jsx when the product has been through CropVerify AI.
 *
 * Features:
 *   - Progressive disclosure accordion (collapsed by default)
 *   - Color-coded trust score bar
 *   - Three-signal breakdown: Image Authenticity, Geo-location, Disease Detection
 *   - Human-readable flag explanations (no raw snake_case strings)
 *   - "Download Report" button with loading state → calls GET /api/product/:id/report
 *   - Multilingual-safe: flex-wrap containers, no fixed-width labels
 *
 * Props:
 *   listingId      — string MongoDB ObjectId
 *   verification   — verification sub-doc from the listing
 *   cropName       — string (for download filename)
 */

import { useState } from 'react';
import {
  ChevronDown, ChevronUp, Download, ShieldCheck, ShieldAlert,
  MapPin, Leaf, Image as ImageIcon, Loader2, CheckCircle2, XCircle,
  AlertTriangle, Info,
} from 'lucide-react';
import VerificationBadge from './VerificationBadge';
import api from '../api/axios';

// --------------------------------------------------------------------------
// Flag explanations — human-readable for each raw flag key
// --------------------------------------------------------------------------
const FLAG_EXPLANATIONS = {
  missing_exif:                  'Photo has no camera metadata — may be a screenshot or web image.',
  editing_software_detected:     'Photo was processed in image-editing software (e.g. Photoshop).',
  duplicate_detected:            'This image matches one already uploaded by another listing.',
  photo_too_old:                 'Photo timestamp is older than 60 days — may not represent current stock.',
  future_timestamp:              'Photo timestamp is set to a future date — suspicious.',
  missing_camera_model:          'No camera device found in photo metadata.',
  unnaturally_uniform_colors:    'Image colors are artificially uniform — may be AI-generated.',
  low_texture_density:           'Photo lacks natural texture detail expected in field photos.',
  null_island:                   'GPS coordinates were (0,0) — invalid location.',
  outside_india_latitude:        'GPS latitude is outside India\'s geographic bounds.',
  outside_india_longitude:       'GPS longitude is outside India\'s geographic bounds.',
  suspiciously_round_coordinates:'GPS coordinates are suspiciously rounded — possible manual entry.',
  geocode_outside_india:         'Reverse geocoding placed this location outside India.',
  non_agricultural_location:     'GPS location resolved to a non-agricultural place (airport, hospital, etc.).',
  large_distance_mismatch:       'Listing location is more than 200km from your registered address.',
  extreme_location_mismatch:     'Listing location is more than 1000km from your registered address.',
  no_gps_provided:               'No GPS coordinates were submitted with this listing.',
  geocode_timeout:               'Address lookup timed out — location could not be resolved.',
  geocode_api_key_missing:       'Geocoding service not configured — address lookup skipped.',
};

// --------------------------------------------------------------------------
// Signal row component
// --------------------------------------------------------------------------
function SignalRow({ icon: Icon, label, value, score, isOk, flags = [] }) {
  const scoreColor = isOk ? '#16a34a' : score >= 0.4 ? '#d97706' : '#dc2626';
  const scorePct   = score != null ? `${Math.round(score * 100)}%` : '—';

  return (
    <div style={{
      padding:       '12px 0',
      borderBottom:  '1px solid #f3f4f6',
      display:       'flex',
      flexDirection: 'column',
      gap:           '6px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: '8px',
          background: isOk ? '#dcfce7' : score >= 0.4 ? '#fef3c7' : '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={16} color={isOk ? '#16a34a' : score >= 0.4 ? '#d97706' : '#dc2626'} />
        </div>
        <div style={{ flex: 1, minWidth: '120px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#111827' }}>{label}</div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '1px' }}>{value}</div>
        </div>
        <div style={{
          fontSize: '0.78rem', fontWeight: 700,
          color: scoreColor,
          background: `${scoreColor}15`,
          padding: '2px 8px',
          borderRadius: '999px',
          flexShrink: 0,
        }}>
          {scorePct}
        </div>
      </div>

      {/* Flags */}
      {flags.length > 0 && (
        <div style={{ paddingLeft: '42px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {flags.map(flag => (
            <div key={flag} style={{ display: 'flex', gap: '5px', alignItems: 'flex-start' }}>
              <AlertTriangle size={11} color="#d97706" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '0.68rem', color: '#92400e', lineHeight: 1.4 }}>
                {FLAG_EXPLANATIONS[flag] || flag.replace(/_/g, ' ')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------------------------------
// Trust score bar
// --------------------------------------------------------------------------
function TrustBar({ score }) {
  const pct     = Math.round((score || 0) * 100);
  const color   = pct >= 75 ? '#16a34a' : pct >= 55 ? '#d97706' : pct >= 40 ? '#f59e0b' : '#dc2626';
  const bgColor = pct >= 75 ? '#dcfce7' : pct >= 55 ? '#fef9c3' : pct >= 40 ? '#fef3c7' : '#fee2e2';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500 }}>Overall Trust Score</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>
          {pct}%
          <span style={{ fontSize: '0.65rem', fontWeight: 400, color: '#9ca3af', marginLeft: '5px' }}>
            {pct >= 75 ? 'High Confidence' : pct >= 55 ? 'Moderate' : pct >= 40 ? 'Low Confidence' : 'Rejected'}
          </span>
        </span>
      </div>
      <div style={{ height: '8px', borderRadius: '999px', background: '#f1f5f9', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          borderRadius: '999px',
          transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------
export default function VerificationReport({ listingId, verification, cropName }) {
  const [expanded, setExpanded]   = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  if (!verification) return null;

  const {
    status, trust_score, authenticity_score, authenticity_reasons = [],
    location_valid, resolved_address, distance_from_registered_km,
    geo_flags = [], disease_label, disease_confidence, healthy_leaf,
    verified_at,
  } = verification;

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      const res = await api.get(`/product/${listingId}/report`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `CropVerify_${cropName || 'Report'}_${listingId.slice(-6)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloadDone(true);
      setTimeout(() => setDownloadDone(false), 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Download failed.';
      setDownloadError(msg);
      setTimeout(() => setDownloadError(''), 5000);
    } finally {
      setDownloading(false);
    }
  };

  const verifiedDate = verified_at
    ? new Date(verified_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  // Disease signal
  const diseaseOk    = healthy_leaf !== false;
  const diseaseLabel = diseaseOk
    ? 'No disease or pest issues detected'
    : `${disease_label || 'Possible disease'} (${Math.round((disease_confidence || 0) * 100)}% confidence)`;

  // Geo signal
  const geoScore   = location_valid ? 0.85 : 0.30;
  const geoDisplay = resolved_address && resolved_address !== 'Address not resolved'
    ? resolved_address.length > 80 ? resolved_address.slice(0, 80) + '…' : resolved_address
    : location_valid ? 'Location validated' : 'Location could not be verified';

  const distDisplay = distance_from_registered_km != null
    ? ` (${distance_from_registered_km}km from registered address)`
    : '';

  return (
    <div style={{
      background:   '#ffffff',
      border:       '1px solid #e5e7eb',
      borderRadius: '16px',
      overflow:     'hidden',
      marginTop:    '16px',
      boxShadow:    '0 2px 8px rgba(0,0,0,0.04)',
    }}>

      {/* Header — always visible */}
      <button
        id={`verification-panel-${listingId}`}
        aria-expanded={expanded}
        aria-controls={`verification-body-${listingId}`}
        onClick={() => setExpanded(e => !e)}
        style={{
          width:      '100%',
          display:    'flex',
          alignItems: 'center',
          gap:        '10px',
          padding:    '14px 16px',
          background: 'none',
          border:     'none',
          cursor:     'pointer',
          textAlign:  'left',
        }}
      >
        <VerificationBadge status={status} trustScore={trust_score} showScore size="md" />
        <span style={{ flex: 1 }} />
        {verifiedDate && (
          <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
            {verifiedDate}
          </span>
        )}
        {expanded
          ? <ChevronUp size={16} color="#9ca3af" />
          : <ChevronDown size={16} color="#9ca3af" />}
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          id={`verification-body-${listingId}`}
          style={{ padding: '0 16px 16px', borderTop: '1px solid #f3f4f6' }}
        >
          <div style={{ height: '12px' }} />

          {/* Trust bar */}
          <TrustBar score={trust_score} />

          {/* Signal rows */}
          <SignalRow
            icon={ImageIcon}
            label="Image Authenticity"
            value={
              (authenticity_score >= 0.6 ? 'Image appears genuine' :
               authenticity_score >= 0.4 ? 'Some concerns noted' : 'Image could not be verified')
            }
            score={authenticity_score}
            isOk={authenticity_score >= 0.60}
            flags={authenticity_reasons}
          />

          <SignalRow
            icon={MapPin}
            label="Geo-location"
            value={`${geoDisplay}${distDisplay}`}
            score={geoScore}
            isOk={location_valid}
            flags={geo_flags}
          />

          <SignalRow
            icon={Leaf}
            label="Crop Health / Disease"
            value={diseaseLabel}
            score={diseaseOk ? 1.0 : 0.25}
            isOk={diseaseOk}
            flags={[]}
          />

          {/* Info note */}
          <div style={{
            display:      'flex',
            gap:          '7px',
            alignItems:   'flex-start',
            padding:      '10px',
            background:   '#f8fafc',
            borderRadius: '10px',
            marginTop:    '12px',
          }}>
            <Info size={13} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
            <p style={{ fontSize: '0.67rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              Scores reflect algorithmic analysis of the submitted photo and GPS data.
              This is not a certified laboratory or government inspection.
            </p>
          </div>

          {/* Download button */}
          {(status === 'verified' || status === 'flagged') && (
            <button
              id={`download-report-${listingId}`}
              onClick={handleDownload}
              disabled={downloading}
              style={{
                marginTop:     '12px',
                width:         '100%',
                display:       'flex',
                alignItems:    'center',
                justifyContent:'center',
                gap:           '7px',
                padding:       '10px 16px',
                borderRadius:  '10px',
                border:        'none',
                cursor:        downloading ? 'not-allowed' : 'pointer',
                fontWeight:    600,
                fontSize:      '0.78rem',
                background:    downloadDone ? '#dcfce7' : '#16a34a',
                color:         downloadDone ? '#15803d' : '#ffffff',
                transition:    'all 0.2s ease',
                opacity:       downloading ? 0.7 : 1,
              }}
            >
              {downloading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF…</>
                : downloadDone
                  ? <><CheckCircle2 size={14} /> Downloaded!</>
                  : <><Download size={14} /> Download Verification Report</>}
            </button>
          )}

          {downloadError && (
            <div style={{
              marginTop: '8px', padding: '8px 12px',
              background: '#fee2e2', borderRadius: '8px',
              fontSize: '0.72rem', color: '#991b1b',
              display: 'flex', gap: '6px', alignItems: 'center',
            }}>
              <XCircle size={13} />
              {downloadError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
