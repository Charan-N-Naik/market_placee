
/**
 * Pulse skeleton block utility.
 */
function PulseBlock({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-stone-200/80 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Crop / Product Card Grid Skeleton (Preserves 100% backward compatibility)
 */
function CardGridSkeleton({ count = 6, cols = 3 }) {
  const colClass =
    cols === 2
      ? 'grid-cols-1 md:grid-cols-2'
      : cols === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div className={`grid ${colClass} gap-6`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden shadow-xs border border-stone-200/80"
        >
          <PulseBlock className="h-48 w-full rounded-none" />
          <div className="p-5 space-y-3">
            <PulseBlock className="h-6 w-3/4 rounded-lg" />
            <PulseBlock className="h-4 w-1/2 rounded-md" />
            <PulseBlock className="h-4 w-2/3 rounded-md" />
            <PulseBlock className="h-4 w-1/3 rounded-md" />
            <div className="flex gap-2.5 mt-5 pt-3 border-t border-stone-100">
              <PulseBlock className="h-10 flex-1 rounded-xl" />
              <PulseBlock className="h-10 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table Skeleton for orders, requests, and transactions
 */
function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="w-full bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs">
      <div className="p-4 border-b border-stone-100 bg-stone-50/60 flex items-center justify-between">
        <PulseBlock className="h-5 w-40 rounded-lg" />
        <PulseBlock className="h-8 w-24 rounded-lg" />
      </div>
      <div className="p-4 space-y-3">
        {/* Table header */}
        <div className="flex gap-4 pb-2 border-b border-stone-100">
          {Array.from({ length: cols }).map((_, c) => (
            <PulseBlock key={c} className="h-3.5 flex-1 rounded-md" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-3 border-b border-stone-50 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <PulseBlock
                key={c}
                className={`h-4 flex-1 rounded-md ${c === 0 ? 'w-24' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard Stat Cards Skeleton
 */
function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between">
            <PulseBlock className="h-3.5 w-24 rounded-md" />
            <PulseBlock className="w-8 h-8 rounded-xl" />
          </div>
          <div className="mt-4 space-y-2">
            <PulseBlock className="h-8 w-32 rounded-lg" />
            <PulseBlock className="h-3 w-20 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Vertical List Skeleton (Notifications, chat, driver jobs)
 */
function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl p-4 border border-stone-200/80 flex items-center gap-4 shadow-xs"
        >
          <PulseBlock className="w-11 h-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <PulseBlock className="h-4 w-1/3 rounded-md" />
            <PulseBlock className="h-3.5 w-2/3 rounded-md" />
          </div>
          <PulseBlock className="w-16 h-7 rounded-lg shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Main LoadingSkeleton component.
 *
 * @param {'cards'|'table'|'stats'|'list'} [variant='cards']
 * @param {number} [count=6]
 * @param {number} [rows=5]
 * @param {number} [cols=3]
 */
export default function LoadingSkeleton({
  variant = 'cards',
  count = 6,
  rows = 5,
  cols = 3,
}) {
  switch (variant) {
    case 'table':
      return <TableSkeleton rows={rows} cols={cols === 3 ? 5 : cols} />;
    case 'stats':
      return <StatsSkeleton count={count === 6 ? 4 : count} />;
    case 'list':
      return <ListSkeleton count={count === 6 ? 4 : count} />;
    case 'cards':
    default:
      return <CardGridSkeleton count={count} cols={cols} />;
  }
}

// Subcomponent attachments for clean declarative usage
LoadingSkeleton.Cards = CardGridSkeleton;
LoadingSkeleton.Table = TableSkeleton;
LoadingSkeleton.Stats = StatsSkeleton;
LoadingSkeleton.List = ListSkeleton;
LoadingSkeleton.Block = PulseBlock;
