export function CardSkeleton() {
  return (
    <div className="w-40 shrink-0 sm:w-48">
      <div className="aspect-square w-full animate-pulse rounded-lg bg-card" />
      <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-card" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-card" />
    </div>
  );
}

export function TrackRowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 px-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2 md:grid-cols-[auto_minmax(0,4fr)_minmax(0,3fr)_minmax(0,2fr)_auto]">
          <div className="h-4 w-8 animate-pulse rounded bg-card" />
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded bg-card" />
            <div className="flex-1">
              <div className="h-4 w-1/2 animate-pulse rounded bg-card" />
              <div className="mt-1.5 h-3 w-1/3 animate-pulse rounded bg-card" />
            </div>
          </div>
          <div className="hidden h-4 w-24 animate-pulse rounded bg-card md:block" />
          <div className="h-4 w-10 animate-pulse rounded bg-card" />
        </div>
      ))}
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="px-6 py-8">
      <div className="mb-8 h-10 w-64 animate-pulse rounded bg-card" />
      <div className="mb-10 flex gap-4 overflow-hidden px-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="mb-4 h-7 w-48 animate-pulse rounded bg-card" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
