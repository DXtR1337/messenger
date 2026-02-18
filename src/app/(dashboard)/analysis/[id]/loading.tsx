export default function AnalysisLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-card" />
        <div className="h-4 w-40 animate-pulse rounded bg-card" />
      </div>
      {/* KPI cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="h-64 animate-pulse rounded-xl bg-card" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-card" />
        <div className="h-48 animate-pulse rounded-xl bg-card" />
      </div>
    </div>
  );
}
