"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  approveCorrectionAction,
  rejectCorrectionAction,
  type CorrectionActionResult,
} from "@/app/admin/(protected)/corrections/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CorrectionWithSong } from "@/services/lyric-corrections";
import { cn } from "@/lib/utils";

type CorrectionReviewProps = {
  correction: CorrectionWithSong;
  flash?: "approved" | "rejected" | null;
};

export function CorrectionReview({
  correction,
  flash,
}: CorrectionReviewProps) {
  const pending = correction.status === "PENDING";
  const [approveState, approveAction, approvePending] = useActionState(
    async () => {
      return approveCorrectionAction(correction.id);
    },
    null as CorrectionActionResult | null,
  );

  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectCorrectionAction.bind(null, correction.id),
    null as CorrectionActionResult | null,
  );

  const actionError =
    (approveState && !approveState.ok && approveState.error) ||
    (rejectState && !rejectState.ok && rejectState.error) ||
    null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/admin/corrections"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Corrections
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Review correction
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link
            href={`/admin/songs/${correction.songId}/edit`}
            className="font-medium text-brand-600 hover:underline"
          >
            {correction.songTitle}
          </Link>{" "}
          · {correction.artistName}
        </p>
      </div>

      {flash ? (
        <p
          className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          {flash === "approved"
            ? "Correction approved. Published lyrics were updated."
            : "Correction rejected. Published lyrics were not changed."}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <StatusBadge status={correction.status} />
        <span className="text-muted-foreground">
          Requested {formatDateTime(correction.createdAt)}
        </span>
        {correction.reviewedAt ? (
          <span className="text-muted-foreground">
            Reviewed {formatDateTime(correction.reviewedAt)}
            {correction.reviewerName ? ` by ${correction.reviewerName}` : ""}
          </span>
        ) : null}
      </div>

      {correction.reason ? (
        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Reason</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {correction.reason}
          </p>
        </section>
      ) : null}

      {correction.adminNote ? (
        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Admin note</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {correction.adminNote}
          </p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Current lyrics</h2>
          <pre className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {correction.currentLyrics || "(empty)"}
          </pre>
        </section>
        <section className="surface-card p-4 sm:p-5">
          <h2 className="text-sm font-semibold">Suggested correction</h2>
          <pre className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
            {correction.suggestedLyrics}
          </pre>
        </section>
      </div>

      {actionError ? (
        <p className="text-sm text-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {pending ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-start">
          <form action={approveAction}>
            <Button type="submit" disabled={approvePending || rejectPending}>
              {approvePending ? "Approving…" : "Approve & update lyrics"}
            </Button>
          </form>

          <form action={rejectAction} className="flex flex-1 flex-col gap-2">
            <label htmlFor="adminNote" className="text-sm font-medium">
              Rejection note{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id="adminNote"
              name="adminNote"
              className="min-h-20"
              maxLength={1000}
            />
            <div>
              <Button
                type="submit"
                variant="danger"
                disabled={approvePending || rejectPending}
              >
                {rejectPending ? "Rejecting…" : "Reject"}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This request has already been reviewed and cannot be changed.
        </p>
      )}
    </div>
  );
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
        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
        styles,
      )}
    >
      {status}
    </span>
  );
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}
