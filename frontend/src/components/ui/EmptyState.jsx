import Button from './Button';

/**
 * Standardized Empty State Component across all dashboards and listing views.
 *
 * @param {React.ReactNode} [icon] - Lucide icon component or emoji string
 * @param {string} title - Heading text for the empty condition
 * @param {string} [description] - Helpful guidance or instructions
 * @param {string} [actionLabel] - Primary action CTA text
 * @param {() => void} [onAction] - Primary action handler
 * @param {React.ReactNode} [actionIcon]
 * @param {string} [secondaryActionLabel]
 * @param {() => void} [onSecondaryAction]
 * @param {'dashed'|'subtle'|'none'} [border='dashed']
 * @param {string} [className='']
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  secondaryActionLabel,
  onSecondaryAction,
  border = 'dashed',
  className = '',
  children,
}) {
  const borderClass =
    border === 'dashed'
      ? 'border-2 border-dashed border-stone-200'
      : border === 'subtle'
        ? 'border border-stone-200 shadow-xs'
        : 'border-0';

  return (
    <div
      className={`rounded-2xl bg-white p-8 sm:p-12 text-center flex flex-col items-center justify-center space-y-4 ${borderClass} ${className}`}
    >
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 mb-1">
          {typeof icon === 'string' ? (
            <span className="text-2xl" role="img" aria-label="empty icon">
              {icon}
            </span>
          ) : (
            icon
          )}
        </div>
      )}

      <div className="max-w-md space-y-1.5">
        <h3 className="text-base sm:text-lg font-black font-outfit text-stone-900 tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {children}

      {(actionLabel || secondaryActionLabel) && (
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button
              variant="primary"
              size="md"
              icon={actionIcon}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              variant="outline"
              size="md"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
