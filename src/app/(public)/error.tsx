"use client";

import Link from "next/link";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page-shell flex max-w-lg flex-col items-center py-20 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
        Something went wrong
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
        We couldn&apos;t load this page
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Please try again. If the problem continues, head back to the homepage.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-surface-muted px-5 text-sm font-medium hover:bg-surface-elevated"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
