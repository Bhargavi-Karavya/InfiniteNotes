/**
 * Lightweight loading skeleton for public/admin surfaces.
 */
export function LoadingState({
  rows = 3,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div
      className={`page-shell animate-pulse space-y-4 py-8 ${className ?? ""}`}
      aria-hidden
    >
      <div className="h-8 w-40 rounded-lg bg-surface-muted" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl bg-surface-muted" />
      ))}
    </div>
  );
}
