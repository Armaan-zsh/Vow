export function ProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Profile Header Skeleton */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 bg-gray-300 rounded-full animate-pulse"></div>
            <div>
              <div className="h-8 w-48 bg-gray-300 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-4 w-64 bg-gray-300 rounded animate-pulse mt-2"></div>
            </div>
          </div>
          <div className="flex space-x-2">
            <div className="h-10 w-20 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="text-center border-2 border-gray-300 p-4">
            <div className="h-8 w-8 bg-gray-300 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mx-auto"></div>
          </div>
          <div className="text-center border-2 border-gray-300 p-4">
            <div className="h-8 w-8 bg-gray-300 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mx-auto"></div>
          </div>
          <div className="text-center border-2 border-gray-300 p-4">
            <div className="h-8 w-8 bg-gray-300 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mx-auto"></div>
          </div>
        </div>
      </div>

      {/* Filters Skeleton */}
      <div className="mb-6 border-2 border-gray-300 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="h-4 w-16 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 w-12 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div>
            <div className="h-4 w-16 bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-10 w-full bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Items Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-2 border-gray-300 p-4">
            <div className="h-32 bg-gray-300 rounded animate-pulse mb-4"></div>
            <div className="h-4 w-full bg-gray-300 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-3/4 bg-gray-300 rounded animate-pulse"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
