import { z } from "zod";
import type { ImportedMusicRecord, MusicDataSource } from "../types";
import { assertAllowedImportUrl, fetchApprovedJson } from "../fetch-approved";
import { assertRecordLimit } from "../import-validation";
import { MAX_IMPORT_RECORDS } from "../types";

const catalogRecordSchema = z.object({
  title: z.string().trim().min(1).max(255),
  artistName: z.string().trim().min(1).max(255),
  artistSlug: z.string().trim().max(255).optional(),
  songSlug: z.string().trim().max(255).optional(),
  albumName: z.string().trim().max(255).optional(),
  releaseYear: z.number().int().min(1000).max(2100).optional(),
  coverImage: z.string().trim().url().max(2000).optional(),
  lyrics: z.string().max(200_000).nullable().optional(),
  externalId: z.string().trim().max(255).optional(),
  rightsStatus: z
    .enum([
      "PENDING_PERMISSION",
      "AUTHORIZED",
      "PUBLIC_DOMAIN",
      "NOT_PROVIDED",
      "REMOVED",
    ])
    .default("PENDING_PERMISSION"),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const catalogFeedSchema = z.object({
  sourceName: z.string().trim().min(1).max(255),
  licenseNote: z.string().trim().max(1000).optional(),
  records: z.array(catalogRecordSchema).min(1).max(MAX_IMPORT_RECORDS),
});

function getCatalogAllowedHosts(): string[] {
  const fromEnv = process.env.IMPORT_CATALOG_ALLOWED_HOSTS?.trim();
  const hosts = fromEnv
    ? fromEnv
        .split(",")
        .map((h) => h.trim().toLowerCase())
        .filter(Boolean)
    : [];

  // Local fixtures for development / automated tests only.
  if (process.env.NODE_ENV !== "production") {
    for (const local of ["localhost", "127.0.0.1"]) {
      if (!hosts.includes(local)) hosts.push(local);
    }
  }

  return hosts;
}

/**
 * Structured InfiniteNotes catalog JSON feed.
 * Only allowlisted hosts may be fetched. Lyrics import only when
 * rightsStatus is AUTHORIZED or PUBLIC_DOMAIN (enforced later by policy).
 */
export const catalogJsonSource: MusicDataSource = {
  id: "catalog-json",
  name: "Structured Catalog JSON",
  description:
    "Approved JSON catalog feeds (allowlisted hosts). Metadata always; lyrics only when the feed marks AUTHORIZED or PUBLIC_DOMAIN rights.",
  canImportMetadata: true,
  canImportLyrics: true,
  get allowedHosts() {
    return getCatalogAllowedHosts();
  },
  acceptsUrl(url) {
    try {
      const parsed = new URL(url);
      const hosts = getCatalogAllowedHosts();
      return hosts.includes(parsed.hostname.toLowerCase());
    } catch {
      return false;
    }
  },
  async fetch(url) {
    const hosts = getCatalogAllowedHosts();
    if (hosts.length === 0) {
      throw new Error(
        "No catalog hosts are configured. Set IMPORT_CATALOG_ALLOWED_HOSTS.",
      );
    }

    assertAllowedImportUrl(url, hosts, {
      allowLocalhost: process.env.NODE_ENV !== "production",
    });

    return fetchApprovedJson({
      url,
      allowedHosts: hosts,
      allowLocalhost: process.env.NODE_ENV !== "production",
    });
  },
  async parse(data, sourceUrl) {
    const parsed = catalogFeedSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(
        "Catalog JSON must include sourceName and a records array of song metadata.",
      );
    }

    assertRecordLimit(parsed.data.records.length);

    const records: ImportedMusicRecord[] = parsed.data.records.map((item) => ({
      title: item.title,
      artistName: item.artistName,
      artistSlug: item.artistSlug,
      songSlug: item.songSlug,
      albumName: item.albumName,
      releaseYear: item.releaseYear,
      coverImage: item.coverImage,
      lyrics: item.lyrics ?? null,
      sourceUrl,
      sourceName: parsed.data.sourceName,
      externalId: item.externalId,
      rightsStatus: item.rightsStatus,
      metadata: {
        provider: "catalog-json",
        licenseNote: parsed.data.licenseNote,
        ...(item.metadata ?? {}),
      },
    }));

    return records;
  },
};
