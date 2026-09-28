"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type ShareButtonProps = {
  title: string;
  text?: string;
  url: string;
};

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onShare() {
    setFeedback(null);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({ title, text, url });
        return;
      }

      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setFeedback("Link copied");
        window.setTimeout(() => setFeedback(null), 2000);
        return;
      }

      setFeedback("Copy this URL from the address bar");
    } catch (error) {
      // User cancelled share sheet — ignore.
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setFeedback("Unable to share right now");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onShare}
        aria-label={`Share ${title}`}
      >
        Share
      </Button>
      {feedback ? (
        <span className="text-xs text-muted-foreground" role="status">
          {feedback}
        </span>
      ) : null}
    </div>
  );
}
