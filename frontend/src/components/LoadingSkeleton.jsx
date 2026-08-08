export default function LoadingSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="skeleton h-48 w-full" />
          <div className="p-4 space-y-3">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-4 w-1/3" />
            <div className="flex gap-2 mt-4">
              <div className="skeleton h-10 flex-1 rounded-xl" />
              <div className="skeleton h-10 w-20 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
