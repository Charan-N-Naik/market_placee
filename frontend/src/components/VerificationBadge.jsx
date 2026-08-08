/**
 * VerificationBadge.jsx
 * ======================
 * Reusable color-coded trust badge that shows a listing's AI verification status.
 *
 * Props:
 *   status       — 'verified' | 'flagged' | 'pending_review' | 'rejected' | null
 *   trustScore   — number 0–1 (optional, shown as %)
 *   size         — 'sm' | 'md' | 'lg'   (default 'md')
 *   showScore    — bool (default false)
 *   className    — extra CSS classes
 */

import { ShieldCheck, ShieldAlert, Shield, ShieldX, ShieldQuestion } from 'lucide-react';

const BADGE_CONFIG = {
  verified: {
    label:       'AI Verified',
    Icon:        ShieldCheck,
    bg:          '#dcfce7',
    text:        '#15803d',
    border:      '#86efac',
    iconColor:   '#16a34a',
    description: 'This listing has passed all AI authenticity, geo-location, and crop health checks.',
  },
  flagged: {
    label:       'Under Review',
    Icon:        ShieldAlert,
    bg:          '#fef9c3',
    text:        '#92400e',
    border:      '#fde68a',
    iconColor:   '#d97706',
    description: 'Some signals raised concerns — this listing is under manual review.',
  },
  pending_review: {
    label:       'Pending Verification',
    Icon:        Shield,
    bg:          '#f1f5f9',
    text:        '#475569',
    border:      '#cbd5e1',
    iconColor:   '#64748b',
    description: 'AI verification is in progress — please check back shortly.',
  },
  rejected: {
    label:       'Verification Failed',
    Icon:        ShieldX,
    bg:          '#fee2e2',
    text:        '#991b1b',
    border:      '#fca5a5',
    iconColor:   '#dc2626',
    description: 'This listing did not pass AI verification checks.',
  },
};

const SIZE_CONFIG = {
  sm: { padding: '3px 8px', fontSize: '0.65rem', iconSize: 12, gap: '4px' },
  md: { padding: '5px 12px', fontSize: '0.75rem', iconSize: 14, gap: '6px' },
  lg: { padding: '7px 16px', fontSize: '0.85rem', iconSize: 16, gap: '8px' },
};

export default function VerificationBadge({
  status,
  trustScore,
  size = 'md',
  showScore = false,
  className = '',
}) {
  const config = BADGE_CONFIG[status] || {
    label:       'Not Verified',
    Icon:        ShieldQuestion,
    bg:          '#f8fafc',
    text:        '#94a3b8',
    border:      '#e2e8f0',
    iconColor:   '#94a3b8',
    description: 'This listing has not been through AI verification.',
  };

  const sz = SIZE_CONFIG[size] || SIZE_CONFIG.md;
  const { label, Icon, bg, text, border, iconColor, description } = config;

  const scoreDisplay = (showScore && trustScore != null)
    ? ` — ${Math.round(trustScore * 100)}%`
    : '';

  return (
    <span
      role="status"
      aria-label={`Verification status: ${label}${scoreDisplay}`}
      title={description}
      className={`inline-flex items-center font-semibold rounded-full select-none transition-all ${className}`}
      style={{
        padding:     sz.padding,
        fontSize:    sz.fontSize,
        gap:         sz.gap,
        background:  bg,
        color:       text,
        border:      `1px solid ${border}`,
        minHeight:   '28px',
        cursor:      'default',
        letterSpacing: '0.01em',
      }}
    >
      <Icon size={sz.iconSize} color={iconColor} strokeWidth={2.2} aria-hidden="true" />
      {label}{scoreDisplay}
    </span>
  );
}
