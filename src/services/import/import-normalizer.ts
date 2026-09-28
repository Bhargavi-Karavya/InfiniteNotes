import { slugify } from "@/lib/utils";

/** Collapse whitespace and lowercase for duplicate matching. */
export function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function songMatchKey(title: string, artistName: string): string {
  return `${normalizeMatchText(title)}::${normalizeMatchText(artistName)}`;
}

export function normalizeArtistSlug(
  artistName: string,
  artistSlug?: string,
): string {
  const fromSlug = artistSlug?.trim() ? slugify(artistSlug) : "";
  return fromSlug || slugify(artistName);
}

export function normalizeSongSlug(
  title: string,
  artistName: string,
  songSlug?: string,
): string {
  if (songSlug?.trim()) {
    return slugify(songSlug);
  }
  const base = slugify(title);
  const artistPart = slugify(artistName);
  if (!base) {
    return artistPart || "song";
  }
  return artistPart ? `${base}-${artistPart}` : base;
}

export function isAuthorizedLyricsRights(
  rightsStatus: string,
): boolean {
  return rightsStatus === "AUTHORIZED" || rightsStatus === "PUBLIC_DOMAIN";
}

/** Songs may be imported only with explicit rights/permission. */
export function hasImportPermission(rightsStatus: string): boolean {
  return isAuthorizedLyricsRights(rightsStatus);
}
