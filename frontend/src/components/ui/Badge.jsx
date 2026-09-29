
/**
 * Maps semantic status strings across orders, listings, and deliveries to visual badge tokens.
 */
const STATUS_CONFIG = {
  // Success states (Green tokens - WCAG AA compliant: emerald-800 on emerald-50 is 7.2:1)
  delivered: { variant: 'success', label: 'Delivered' },
  completed: { variant: 'success', label: 'Completed' },
  received: { variant: 'success', label: 'Received' },
  paid: { variant: 'success', label: 'Paid' },
  verified: { variant: 'success', label: 'Verified' },
  active: { variant: 'success', label: 'Active' },
  accepted: { variant: 'success', label: 'Accepted' },
  driver_accepted: { variant: 'success', label: 'Driver Assigned' },

  // Pending states (Amber tokens - amber-800 on amber-50 is 5.4:1)
  pending: { variant: 'pending', label: 'Pending' },
  pending_farmer_approval: { variant: 'pending', label: 'Awaiting Approval' },
  pending_driver_approval: { variant: 'pending', label: 'Awaiting Driver' },
  pending_review: { variant: 'pending', label: 'Under Review' },
  requested: { variant: 'pending', label: 'Requested' },
  upcoming: { variant: 'pending', label: 'Upcoming' },

  // Info / In-Transit states (Blue tokens - blue-800 on blue-50 is 6.8:1)
  shipped: { variant: 'info', label: 'Shipped' },
  collected: { variant: 'info', label: 'In Transit' },
  in_transit: { variant: 'info', label: 'In Transit' },
  packed: { variant: 'info', label: 'Packed' },
  initiated: { variant: 'info', label: 'Initiated' },

  // Error / Warning states (Rose tokens - rose-800 on rose-50 is 6.5:1)
  cancelled: { variant: 'error', label: 'Cancelled' },
  rejected: { variant: 'error', label: 'Rejected' },
  driver_rejected: { variant: 'error', label: 'Driver Declined' },
  failed: { variant: 'error', label: 'Failed' },
  refunded: { variant: 'error', label: 'Refunded' },
  flagged: { variant: 'error', label: 'Flagged' },
  expired: { variant: 'error', label: 'Expired' },
  out_of_stock: { variant: 'error', label: 'Out of Stock' },

  // Neutral states (Stone tokens - stone-700 on stone-100 is 5.8:1)
  sold: { variant: 'neutral', label: 'Sold' },
  none: { variant: 'neutral', label: 'None' },
  draft: { variant: 'neutral', label: 'Draft' },
  offline: { variant: 'neutral', label: 'Offline' },
};

const VARIANT_STYLES = {
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
  pending: 'bg-amber-50 text-amber-800 border-amber-200/90',
  info:    'bg-blue-50 text-blue-800 border-blue-200/90',
  error:   'bg-rose-50 text-rose-800 border-rose-200/90',
  neutral: 'bg-stone-100 text-stone-700 border-stone-200',
  primary: 'bg-emerald-50 text-emerald-900 border-emerald-300 font-bold',
};

const DOT_STYLES = {
  success: 'bg-emerald-500',
  pending: 'bg-amber-500',
  info:    'bg-blue-500',
  error:   'bg-rose-500',
  neutral: 'bg-stone-400',
  primary: 'bg-emerald-600',
};

const SIZE_STYLES = {
  sm: 'text-[11px] px-2 py-0.5 gap-1.5 leading-none',
  md: 'text-xs px-2.5 py-1 gap-1.5 leading-normal',
  lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
};

/**
 * Unified Badge / Status-Pill Component
 *
 * @param {string} [status] - Semantic status key (e.g. 'pending', 'delivered', 'collected')
 * @param {string} [variant] - Explicit variant override ('success' | 'pending' | 'info' | 'error' | 'neutral')
 * @param {string} [size='sm'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [showDot=true] - Shows small status circle
 * @param {React.ReactNode} [icon] - Custom icon component
 * @param {React.ReactNode} [children] - Custom label (falls back to mapped label or status)
 * @param {string} [className='']
 */
export default function Badge({
  status,
  variant,
  size = 'sm',
  showDot = false,
  icon,
  children,
  className = '',
  ...props
}) {
  const normKey = status ? String(status).toLowerCase().trim() : null;
  const config = normKey ? STATUS_CONFIG[normKey] : null;

  const resolvedVariant = variant || config?.variant || 'neutral';
  const resolvedLabel = children || config?.label || status || 'Unknown';

  const variantClass = VARIANT_STYLES[resolvedVariant] || VARIANT_STYLES.neutral;
  const dotClass = DOT_STYLES[resolvedVariant] || DOT_STYLES.neutral;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.sm;

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded-full border transition-colors select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{resolvedLabel}</span>
    </span>
  );
}
