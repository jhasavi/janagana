export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <div className="space-y-4 w-full max-w-7xl px-4">
        <div className="h-12 bg-muted animate-pulse rounded-lg w-1/3" />
        <div className="h-64 bg-muted animate-pulse rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
