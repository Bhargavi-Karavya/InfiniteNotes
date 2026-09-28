"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Floating back-to-top control for long lyric pages.
 * Hidden until the user scrolls; respects prefers-reduced-motion via CSS.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 480);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function scrollTop() {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <button
      type="button"
      onClick={scrollTop}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-5 right-4 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)] transition-ui",
        "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 sm:bottom-8 sm:right-8",
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 15 7-7 7 7" />
      </svg>
    </button>
  );
}
