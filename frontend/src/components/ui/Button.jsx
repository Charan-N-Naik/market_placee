import { Loader2 } from 'lucide-react';

const VARIANT_STYLES = {
  primary:
    'bg-[var(--color-primary,#16a34a)] hover:bg-[var(--color-primary-hover,#15803d)] text-white shadow-xs border border-transparent focus-visible:ring-emerald-600',
  secondary:
    'bg-amber-500 hover:bg-amber-600 text-white shadow-xs border border-transparent focus-visible:ring-amber-500',
  outline:
    'bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 shadow-xs focus-visible:ring-stone-400',
  ghost:
    'bg-transparent hover:bg-stone-100 text-stone-700 border border-transparent focus-visible:ring-stone-400',
  danger:
    'bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-transparent focus-visible:ring-rose-600',
  soft:
    'bg-[var(--color-primary-light,#dcfce7)] hover:bg-emerald-200/70 text-emerald-900 border border-emerald-200/80 focus-visible:ring-emerald-600',
};

const SIZE_STYLES = {
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-lg gap-1.5 font-bold',
  md: 'min-h-[44px] px-4 py-2.5 text-sm rounded-xl gap-2 font-bold',
  lg: 'min-h-[48px] px-6 py-3 text-base rounded-xl gap-2.5 font-extrabold',
  icon: 'w-11 h-11 p-0 rounded-xl justify-center shrink-0',
};

/**
 * Accessible Button Component with touch-friendly 44px tap targets and focus rings.
 *
 * @param {'primary'|'secondary'|'outline'|'ghost'|'danger'|'soft'} [variant='primary']
 * @param {'sm'|'md'|'lg'|'icon'} [size='md']
 * @param {boolean} [loading=false]
 * @param {React.ReactNode} [icon]
 * @param {React.ReactNode} [iconRight]
 * @param {boolean} [fullWidth=false]
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  const variantClass = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const sizeClass = SIZE_STYLES[size] || SIZE_STYLES.md;
  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${variantClass} ${sizeClass} ${widthClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {children && <span className="truncate">{children}</span>}

      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
}
