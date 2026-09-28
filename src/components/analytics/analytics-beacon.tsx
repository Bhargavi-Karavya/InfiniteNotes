"use client";

import { useEffect, useRef } from "react";

type AnalyticsBeaconProps =
  | {
      eventType: "SONG_VIEW";
      entityId: string;
      path: string;
    }
  | {
      eventType: "ARTIST_VIEW";
      entityId: string;
      path: string;
    }
  | {
      eventType: "SEARCH";
      query: string;
      path: string;
    }
  | {
      eventType: "PAGE_VIEW";
      path: string;
    };

/**
 * Client-only page-view beacon.
 * Dedupes via sessionStorage so SSR/hydration/Strict Mode remounts
 * do not inflate counts for the same path in the same browser tab session.
 * Failures are swallowed — public UX never depends on analytics.
 */
export function AnalyticsBeacon(props: AnalyticsBeaconProps) {
  const sent = useRef(false);
  const eventType = props.eventType;
  const path = props.path;
  const entityId =
    props.eventType === "SONG_VIEW" || props.eventType === "ARTIST_VIEW"
      ? props.entityId
      : null;
  const query = props.eventType === "SEARCH" ? props.query : null;

  useEffect(() => {
    if (sent.current) return;

    const key =
      eventType === "SEARCH"
        ? `in-analytics:SEARCH:${path}:${(query ?? "").trim().toLowerCase()}`
        : eventType === "PAGE_VIEW"
          ? `in-analytics:PAGE_VIEW:${path}`
          : `in-analytics:${eventType}:${entityId}:${path}`;

    try {
      if (sessionStorage.getItem(key)) {
        sent.current = true;
        return;
      }
      sessionStorage.setItem(key, "1");
    } catch {
      // sessionStorage may be unavailable
    }

    sent.current = true;

    let body: Record<string, string>;
    if (eventType === "SEARCH") {
      body = { eventType, path, query: query ?? "" };
    } else if (eventType === "PAGE_VIEW") {
      body = { eventType, path };
    } else {
      body = { eventType, path, entityId: entityId ?? "" };
    }

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, [eventType, path, entityId, query]);

  return null;
}
