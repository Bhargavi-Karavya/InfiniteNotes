/**
 * Simple in-memory rate limiter for anonymous lyric corrections.
 * Keyed by a privacy-conscious anonymous client id (cookie), never by full IP.
 * Process-local — sufficient for v1; replace with Redis later if needed.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 8;
const MAX_PER_SONG_WINDOW = 3;

function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkCorrectionRateLimit(input: {
  anonId: string;
  songId: string;
}): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);

  const globalKey = `g:${input.anonId}`;
  const songKey = `s:${input.anonId}:${input.songId}`;

  for (const [key, max] of [
    [globalKey, MAX_PER_WINDOW],
    [songKey, MAX_PER_SONG_WINDOW],
  ] as const) {
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, bucket);
    }
    if (bucket.count >= max) {
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }
  }

  for (const key of [globalKey, songKey]) {
    const bucket = buckets.get(key)!;
    bucket.count += 1;
  }

  return { ok: true };
}

export const ANON_COOKIE_NAME = "in_anon";
