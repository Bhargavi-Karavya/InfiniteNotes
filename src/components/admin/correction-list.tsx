import Link from "next/link";
import type { CorrectionWithSong } from "@/services/lyric-corrections";
import { cn } from "@/lib/utils";

type CorrectionListProps = {
  items: CorrectionWithSong[];
  query: string;
  status: string;
  page: number;
  totalPages: number;
  total: number;
  error?: string | null;
};

const STATUS_FILTERS = [
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "all", label: "All" },
];

export function CorrectionList({
  items,
  query,
  status,
  page,
  totalPages,
  total,
  error,
}: CorrectionListProps) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Corrections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review public lyric correction suggestions
          </p>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums">
          {total.toLocaleString()} request{total === 1 ? "" : "s"}
        </p>
      </div>

      <form className="flex flex-col gap-3 sm:flex-row sm:items-center" method="get">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search song or artist"
          className="h-10 flex-1 rounded-xl border border-border bg-surface px-3 text-sm"
          aria-label="Search corrections"
        />
        <input type="hidden" name="status" value={status} />
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center rounded-xl bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
        >
          Search
        </button>
      </form>

      <div
        className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1"
        role="tablist"
        aria-label="Status filter"
      >
        {STATUS_FILTERS.map((filter) => {
          const active = filter.value === status;
          const href =
            query.trim().length > 0
              ? `/admin/corrections?status=${filter.value}&q=${encodeURIComponent(query)}`
              : `/admin/corrections?status=${filter.value}`;
          return (
            <Link
              key={filter.value}
              href={href}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium sm:text-sm",
                active
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      {error ? (
        <p className="rounded-xl border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="surface-card px-4 py-12 text-center">
          <p className="text-sm font-medium">
            {query.trim()
              ? "No correction requests found."
              : status === "PENDING"
                ? "No correction requests yet."
                : "No correction requests in this filter."}
          </p>
        </div>
      ) : (
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-surface-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Song</th>
                  <th className="px-4 py-2 font-medium">Artist</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Requested</th>
                  <th className="px-4 py-2 font-medium">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/corrections/${item.id}`}
                        className="font-medium text-brand-600 hover:underline"
                      >
                        {item.songTitle}
                      </Link>
                      {item.reason ? (
                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {item.reason}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.artistName}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {item.reviewerName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <nav
          className="flex items-center justify-between gap-3 text-sm"
          aria-label="Pagination"
        >
          <Link
            href={pageHref(page - 1, query, status)}
            className={cn(
              "rounded-lg px-3 py-1.5",
              page <= 1
                ? "pointer-events-none text-muted-foreground/50"
                : "hover:bg-surface-muted",
            )}
            aria-disabled={page <= 1}
          >
            Previous
          </Link>
          <span className="text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref(page + 1, query, status)}
            className={cn(
              "rounded-lg px-3 py-1.5",
              page >= totalPages
                ? "pointer-events-none text-muted-foreground/50"
                : "hover:bg-surface-muted",
            )}
            aria-disabled={page >= totalPages}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </div>
  );
}

function pageHref(page: number, query: string, status: string): string {
  const params = new URLSearchParams();
  params.set("status", status);
  params.set("page", String(Math.max(1, page)));
  if (query.trim()) params.set("q", query.trim());
  return `/admin/corrections?${params.toString()}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "PENDING"
      ? "bg-warning/15 text-warning"
      : status === "APPROVED"
        ? "bg-success/15 text-success"
        : "bg-surface-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        styles,
      )}
    >
      {status}
    </span>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}
