
const PADDING_STYLES = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-6 md:p-8',
};

const VARIANT_STYLES = {
  default: 'bg-white border-stone-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.04)]',
  muted:   'bg-stone-50/80 border-stone-200 shadow-none',
  flat:    'bg-white border-stone-200 shadow-none',
  outline: 'bg-transparent border-stone-300 shadow-none',
  accent:  'bg-emerald-50/40 border-emerald-200/80 shadow-[0_4px_20px_rgba(22,163,74,0.06)]',
};

/**
 * Shared Card Component matching KisanBazaar design system tokens.
 *
 * @param {'default'|'muted'|'flat'|'outline'|'accent'} [variant='default']
 * @param {'none'|'sm'|'md'|'lg'} [padding='md']
 * @param {boolean} [hoverable=false] - Adds hover elevation and micro-scale
 * @param {React.ReactNode} [header] - Card header section with divider
 * @param {React.ReactNode} [footer] - Card footer section with divider
 * @param {string} [className='']
 */
export default function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  header,
  footer,
  children,
  className = '',
  ...props
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.default;
  const paddingClass = PADDING_STYLES[padding] || PADDING_STYLES.md;
  const hoverClass = hoverable
    ? 'transition-all duration-200 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] hover:-translate-y-0.5'
    : 'transition-shadow duration-200';

  return (
    <div
      className={`rounded-2xl border ${variantClass} ${hoverClass} overflow-hidden ${className}`}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddingClass}>{children}</div>
      {footer && (
        <div className="px-6 py-3.5 bg-stone-50/60 border-t border-stone-100">
          {footer}
        </div>
      )}
    </div>
  );
}
