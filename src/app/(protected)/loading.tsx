// Skeleton screen shown while server components are fetching
// Next.js automatically uses this while the page is streaming
export default function ProtectedLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)]" />
        <div className="space-y-2">
          <div className="h-6 w-40 rounded-xl bg-[var(--surface-2)]" />
          <div className="h-4 w-24 rounded-xl bg-[var(--surface-2)]" />
        </div>
      </div>

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--surface-2)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded-lg bg-[var(--surface-2)]" />
              <div className="h-3 w-48 rounded-lg bg-[var(--surface-2)]" />
            </div>
          </div>
          <div className="h-3 w-full rounded-lg bg-[var(--surface-2)]" />
          <div className="h-3 w-3/4 rounded-lg bg-[var(--surface-2)]" />
        </div>
      ))}
    </div>
  )
}
