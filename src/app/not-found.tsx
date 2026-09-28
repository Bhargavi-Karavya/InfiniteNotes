import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootNotFound() {
  return (
    <div className="page-shell flex max-w-lg flex-col items-center py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        404
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        This song or artist may be unpublished, removed, or the link is
        incorrect.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Back to InfiniteNotes
        </Link>
        <Link
          href="/search"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-surface-muted px-5 text-sm font-medium hover:bg-surface-elevated"
        >
          Search
        </Link>
      </div>
    </div>
  );
}
