"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_CORRECTION_REASON } from "@/validations/lyric-corrections";

type SuggestCorrectionFormProps = {
  songId: string;
  currentLyrics: string;
};

export function SuggestCorrectionForm({
  songId,
  currentLyrics,
}: SuggestCorrectionFormProps) {
  const [open, setOpen] = useState(false);
  const [suggestedLyrics, setSuggestedLyrics] = useState(currentLyrics);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();
  const lyricsId = useId();
  const reasonId = useId();
  const errorId = useId();

  const close = useCallback(() => {
    setOpen(false);
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setSuggestedLyrics(currentLyrics);
      setReason("");
      setError(null);
      setSuccess(false);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, currentLyrics]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const res = await fetch("/api/lyric-corrections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songId,
          suggestedLyrics,
          reason: reason.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Unable to submit. Please try again.");
        return;
      }
      setSuccess(true);
      setSuggestedLyrics(currentLyrics);
      setReason("");
    } catch {
      setError("Unable to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 border-t border-border pt-6">
      <p className="text-sm text-muted-foreground">
        Found a mistake?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-brand-600 underline-offset-2 transition-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 rounded"
        >
          Suggest a correction
        </button>
      </p>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="m-auto w-[min(100%,36rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-0 text-foreground shadow-[var(--shadow-soft)] backdrop:bg-black/50 open:flex open:flex-col"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 p-5 sm:p-6"
        >
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              Suggest a correction
            </h2>
            <p id={descId} className="mt-1 text-sm text-muted-foreground">
              Your suggestion will be reviewed by InfiniteNotes admins before
              any lyrics change.
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Current lyrics
            </p>
            <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              {currentLyrics || "(No lyrics published yet)"}
            </pre>
          </div>

          <div>
            <label htmlFor={lyricsId} className="text-sm font-medium">
              Suggested correction
            </label>
            <Textarea
              id={lyricsId}
              name="suggestedLyrics"
              required
              value={suggestedLyrics}
              onChange={(e) => setSuggestedLyrics(e.target.value)}
              className="mt-1.5 min-h-48 font-mono text-sm leading-relaxed"
              aria-describedby={error ? errorId : undefined}
              aria-invalid={error ? true : undefined}
            />
          </div>

          <div>
            <label htmlFor={reasonId} className="text-sm font-medium">
              Reason{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Textarea
              id={reasonId}
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, MAX_CORRECTION_REASON))}
              maxLength={MAX_CORRECTION_REASON}
              className="mt-1.5 min-h-20"
              placeholder="e.g. Line 3 seems incorrect."
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {reason.length}/{MAX_CORRECTION_REASON}
            </p>
          </div>

          <div
            className="min-h-5 text-sm"
            role="status"
            aria-live="polite"
          >
            {error ? (
              <p id={errorId} className="text-error">
                {error}
              </p>
            ) : null}
            {success ? (
              <p className="text-success">
                Thanks! Your correction has been submitted for review.
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={close}>
              {success ? "Close" : "Cancel"}
            </Button>
            {!success ? (
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit suggestion"}
              </Button>
            ) : null}
          </div>
        </form>
      </dialog>
    </div>
  );
}
