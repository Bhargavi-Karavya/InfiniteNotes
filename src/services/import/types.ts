import type { SongRightsStatus } from "@/db/schema";

/**
 * Normalized import record — never write raw provider payloads to the DB.
 */
export type ImportedMusicRecord = {
  title: string;
  artistName: string;
  artistSlug?: string;
  songSlug?: string;
  albumName?: string;
  releaseYear?: number;
  coverImage?: string;
  lyrics?: string | null;
  sourceUrl: string;
  sourceName: string;
  externalId?: string;
  rightsStatus: SongRightsStatus;
  metadata: Record<string, unknown>;
};

export type MusicDataSource = {
  id: string;
  name: string;
  description: string;
  canImportMetadata: boolean;
  canImportLyrics: boolean;
  /** Hostnames this provider may fetch (exact match, lowercase). */
  allowedHosts: string[];
  /** Returns true when the URL is shaped for this provider. */
  acceptsUrl(url: string): boolean;
  fetch(url: string): Promise<unknown>;
  parse(data: unknown, sourceUrl: string): Promise<ImportedMusicRecord[]>;
};

export type PreviewMatchArtist = {
  status: "new" | "existing";
  artistId?: string;
  artistName: string;
  artistSlug?: string;
};

export type PreviewMatchSong = {
  status: "new" | "existing";
  songId?: string;
  title: string;
  slug?: string;
  existingCoverImage?: string | null;
  existingRightsStatus?: SongRightsStatus;
  hasExistingLyrics?: boolean;
};

export type PreviewRecord = {
  key: string;
  record: ImportedMusicRecord;
  valid: boolean;
  errors: string[];
  artist: PreviewMatchArtist;
  song: PreviewMatchSong;
  /** Lyrics that would actually be written after rights gating. */
  lyricsImportable: boolean;
  lyricsDecision: "import" | "blocked" | "not_provided";
};

export type ImportSelection = {
  key: string;
  selected: boolean;
  artistAction: "create" | "skip" | "map";
  mapArtistId?: string;
  songAction: "create" | "skip" | "update_metadata";
};

export type ImportRecordResult = {
  key: string;
  title: string;
  artistName: string;
  status: "imported" | "updated" | "skipped" | "failed";
  message: string;
  entityId?: string;
};

export type ImportCommitResult = {
  jobId: string;
  status: "COMPLETED" | "PARTIAL" | "FAILED";
  total: number;
  imported: number;
  skipped: number;
  failed: number;
  details: ImportRecordResult[];
};

export type ImportPreviewResult = {
  jobId: string;
  providerId: string;
  providerName: string;
  sourceUrl: string;
  total: number;
  /** When true, only AUTHORIZED / PUBLIC_DOMAIN records are importable. */
  requireRights: boolean;
  records: PreviewRecord[];
  artists: Array<{ id: string; name: string; slug: string }>;
};

export type ImportJobPreviewPayload = {
  requireRights: boolean;
  records: PreviewRecord[];
};

export const MAX_IMPORT_RECORDS = 100;
export const IMPORT_FETCH_TIMEOUT_MS = 12_000;
export const IMPORT_MAX_RESPONSE_BYTES = 1_500_000;
