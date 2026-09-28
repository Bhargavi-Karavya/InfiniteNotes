/**
 * Site-wide SEO / URL helpers.
 * Prefer NEXT_PUBLIC_SITE_URL (production: https://infinitenotes.tech).
 * Fall back to NEXT_PUBLIC_APP_URL, then localhost for local tooling.
 */

function resolveSiteOrigin(): string {
  const fromSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromSite) {
    return fromSite.replace(/\/$/, "");
  }

  const fromApp = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromApp) {
    return fromApp.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

/** Canonical site origin string (no trailing slash). */
export function getSiteUrl(): string {
  return resolveSiteOrigin();
}

/** Parsed site origin for metadataBase and absolute URL construction. */
export function getSiteUrlObject(): URL {
  return new URL(resolveSiteOrigin());
}

export function absoluteUrl(path: string): string {
  const base = getSiteUrl();
  if (!path || path === "/") {
    return base;
  }
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE_NAME = "InfiniteNotes";

export const SITE_DEFAULT_TITLE =
  "InfiniteNotes — Learn It. Play It. Understand It.";

export const SITE_DESCRIPTION =
  "InfiniteNotes is an intelligent music platform for discovering songs, exploring lyrics, learning music, and building a deeper connection with the songs you love.";

export const SITE_TAGLINE = "Learn it. Play it. Understand it.";
