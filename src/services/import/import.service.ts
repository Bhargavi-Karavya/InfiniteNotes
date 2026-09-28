import { assertAdmin } from "@/services/auth";
import { ImportFetchError } from "@/services/import/fetch-approved";
import {
  normalizeArtistSlug,
  normalizeSongSlug,
} from "@/services/import/import-normalizer";
import {
  commitImportInputSchema,
  previewImportInputSchema,
  validateImportedRecord,
} from "@/services/import/import-validation";
import { applyLyricsRightsPolicy } from "@/services/import/lyrics-policy";
import {
  getImportProvider,
  listImportProviders,
  requireImportProvider,
} from "@/services/import/sources";
import type {
  ImportCommitResult,
  ImportJobPreviewPayload,
  ImportPreviewResult,
  ImportRecordResult,
  ImportSelection,
  PreviewRecord,
} from "@/services/import/types";
import { MAX_IMPORT_RECORDS } from "@/services/import/types";
import {
  findArtistByNormalizedName,
  findImportJobById,
  findSongBySourceExternal,
  findSongByTitleAndArtistName,
  insertImportJob,
  insertImportRecord,
  insertImportedSong,
  listArtistsForImportMap,
  listImportJobs,
  updateImportJobById,
} from "@/repositories/imports";
import { findArtistBySlug, insertArtist } from "@/repositories/artists";
import { findSongBySlug, updateSongById } from "@/repositories/songs";
import { checkImportRateLimit } from "@/lib/import-rate-limit";

export class ImportServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportServiceError";
  }
}

export type { ImportPreviewResult };

function friendlyError(error: unknown): string {
  if (error instanceof ImportFetchError || error instanceof ImportServiceError) {
    return error.message;
  }
  if (error instanceof Error) {
    const msg = error.message;
    if (
      msg.includes("Unsupported") ||
      msg.includes("Catalog") ||
      msg.includes("MusicBrainz") ||
      msg.includes("allowlisted") ||
      msg.includes("configured") ||
      msg.includes("limited to")
    ) {
      return msg;
    }
  }
  console.error(
    "Import failed:",
    error instanceof Error ? error.message : "unknown",
  );
  return "Import failed. Please check the source and try again.";
}

async function resolveUniqueSongSlug(
  title: string,
  artistName: string,
  preferred?: string,
): Promise<string> {
  const base = normalizeSongSlug(title, artistName, preferred);
  let candidate = base || "song";
  let n = 2;
  while (await findSongBySlug(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}

async function resolveUniqueArtistSlug(
  artistName: string,
  preferred?: string,
): Promise<string> {
  const base = normalizeArtistSlug(artistName, preferred);
  let candidate = base || "artist";
  let n = 2;
  while (await findArtistBySlug(candidate)) {
    candidate = `${base}-${n}`;
    n += 1;
    if (n > 50) {
      candidate = `${base}-${Date.now()}`;
      break;
    }
  }
  return candidate;
}

async function buildPreviewRecords(
  providerId: string,
  sourceUrl: string,
  requireRights: boolean,
): Promise<PreviewRecord[]> {
  const provider = requireImportProvider(providerId);

  if (!provider.acceptsUrl(sourceUrl)) {
    throw new ImportServiceError(
      "This URL is not valid for the selected provider.",
    );
  }

  const raw = await provider.fetch(sourceUrl);
  const parsed = await provider.parse(raw, sourceUrl);

  if (parsed.length === 0) {
    throw new ImportServiceError("No importable records were found.");
  }
  if (parsed.length > MAX_IMPORT_RECORDS) {
    throw new ImportServiceError(
      `Imports are limited to ${MAX_IMPORT_RECORDS} records at a time.`,
    );
  }

  const previews: PreviewRecord[] = [];

  for (let i = 0; i < parsed.length; i += 1) {
    const gated = applyLyricsRightsPolicy(parsed[i]!, provider);
    const validation = validateImportedRecord(gated.record, { requireRights });
    const key =
      gated.record.externalId?.trim() ||
      `row-${i}-${gated.record.title}`.slice(0, 120);

    let artistMatch: PreviewRecord["artist"] = {
      status: "new",
      artistName: gated.record.artistName,
    };
    const existingArtist = await findArtistByNormalizedName(
      gated.record.artistName,
    );
    if (existingArtist) {
      artistMatch = {
        status: "existing",
        artistId: existingArtist.id,
        artistName: existingArtist.name,
        artistSlug: existingArtist.slug,
      };
    }

    let songMatch: PreviewRecord["song"] = {
      status: "new",
      title: gated.record.title,
    };

    if (gated.record.externalId) {
      const byExternal = await findSongBySourceExternal(
        gated.record.sourceName,
        gated.record.externalId,
      );
      if (byExternal) {
        songMatch = {
          status: "existing",
          songId: byExternal.id,
          title: byExternal.title,
          slug: byExternal.slug,
          existingCoverImage: byExternal.coverImage,
          existingRightsStatus: byExternal.rightsStatus,
          hasExistingLyrics: Boolean(byExternal.lyrics?.trim()),
        };
      }
    }

    if (songMatch.status === "new") {
      const byTitleArtist = await findSongByTitleAndArtistName(
        gated.record.title,
        gated.record.artistName,
      );
      if (byTitleArtist) {
        songMatch = {
          status: "existing",
          songId: byTitleArtist.id,
          title: byTitleArtist.title,
          slug: byTitleArtist.slug,
          existingCoverImage: byTitleArtist.coverImage,
          existingRightsStatus: byTitleArtist.rightsStatus,
          hasExistingLyrics: Boolean(byTitleArtist.lyrics?.trim()),
        };
      }
    }

    if (songMatch.status === "new" && gated.record.songSlug) {
      const bySlug = await findSongBySlug(gated.record.songSlug);
      if (bySlug) {
        songMatch = {
          status: "existing",
          songId: bySlug.id,
          title: bySlug.title,
          slug: bySlug.slug,
          existingCoverImage: bySlug.coverImage,
          existingRightsStatus: bySlug.rightsStatus,
          hasExistingLyrics: Boolean(bySlug.lyrics?.trim()),
        };
      }
    }

    previews.push({
      key,
      record: gated.record,
      valid: validation.ok,
      errors: validation.ok ? [] : validation.errors,
      artist: artistMatch,
      song: songMatch,
      lyricsImportable: gated.lyricsImportable,
      lyricsDecision: gated.lyricsDecision,
    });
  }

  return previews;
}

export async function getImportProvidersForAdmin() {
  await assertAdmin();
  return listImportProviders();
}

export async function previewImport(input: {
  providerId: string;
  sourceUrl: string;
  requireRights?: boolean;
}): Promise<ImportPreviewResult> {
  const admin = await assertAdmin();

  const rate = checkImportRateLimit(admin.id);
  if (!rate.ok) {
    throw new ImportServiceError(
      `Too many import requests. Try again in ${rate.retryAfterSec}s.`,
    );
  }

  const parsed = previewImportInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ImportServiceError(
      parsed.error.issues[0]?.message ?? "Invalid import request.",
    );
  }

  const provider = getImportProvider(parsed.data.providerId);
  if (!provider) {
    throw new ImportServiceError("Unsupported import provider.");
  }

  const requireRights = parsed.data.requireRights;

  try {
    const records = await buildPreviewRecords(
      parsed.data.providerId,
      parsed.data.sourceUrl,
      requireRights,
    );

    const previewPayload: ImportJobPreviewPayload = {
      requireRights,
      records,
    };

    const job = await insertImportJob({
      sourceName: provider.name,
      sourceUrl: parsed.data.sourceUrl,
      providerId: provider.id,
      status: "PENDING",
      totalRecords: records.length,
      importedRecords: 0,
      skippedRecords: 0,
      failedRecords: 0,
      previewPayload,
      createdBy: admin.id,
    });

    const artists = await listArtistsForImportMap();

    return {
      jobId: job.id,
      providerId: provider.id,
      providerName: provider.name,
      sourceUrl: parsed.data.sourceUrl,
      total: records.length,
      requireRights,
      records,
      artists,
    };
  } catch (error) {
    throw new ImportServiceError(friendlyError(error));
  }
}

function readPreviewPayload(raw: unknown): ImportJobPreviewPayload {
  if (Array.isArray(raw)) {
    return { requireRights: true, records: raw as PreviewRecord[] };
  }
  if (
    raw &&
    typeof raw === "object" &&
    Array.isArray((raw as ImportJobPreviewPayload).records)
  ) {
    const payload = raw as ImportJobPreviewPayload;
    return {
      requireRights: payload.requireRights !== false,
      records: payload.records,
    };
  }
  return { requireRights: true, records: [] };
}

export async function commitImport(input: {
  jobId: string;
  selections: ImportSelection[];
}): Promise<ImportCommitResult> {
  const admin = await assertAdmin();

  const rate = checkImportRateLimit(admin.id);
  if (!rate.ok) {
    throw new ImportServiceError(
      `Too many import requests. Try again in ${rate.retryAfterSec}s.`,
    );
  }

  const parsed = commitImportInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ImportServiceError(
      parsed.error.issues[0]?.message ?? "Invalid import selection.",
    );
  }

  const job = await findImportJobById(parsed.data.jobId);
  if (!job || job.createdBy !== admin.id) {
    throw new ImportServiceError("Import job not found.");
  }
  if (job.status !== "PENDING") {
    throw new ImportServiceError("This import job is no longer awaiting commit.");
  }

  const previewPayload = readPreviewPayload(job.previewPayload);
  const preview = previewPayload.records;
  const requireRights = previewPayload.requireRights;
  if (!Array.isArray(preview) || preview.length === 0) {
    throw new ImportServiceError("Import preview data is missing.");
  }

  const provider = requireImportProvider(job.providerId);
  const selectionMap = new Map(
    parsed.data.selections.map((s) => [s.key, s] as const),
  );

  await updateImportJobById(job.id, { status: "RUNNING" });

  const details: ImportRecordResult[] = [];
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of preview) {
    const selection = selectionMap.get(item.key);
    if (!selection || !selection.selected) {
      skipped += 1;
      details.push({
        key: item.key,
        title: item.record.title,
        artistName: item.record.artistName,
        status: "skipped",
        message: "Not selected",
      });
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.record.externalId,
        sourceUrl: item.record.sourceUrl,
        entityType: "SONG",
        status: "SKIPPED",
        title: item.record.title,
        artistName: item.record.artistName,
        errorMessage: "Not selected",
      });
      continue;
    }

    const rightsCheck = validateImportedRecord(item.record, { requireRights });
    if (!item.valid || !rightsCheck.ok) {
      failed += 1;
      const message = !rightsCheck.ok
        ? rightsCheck.errors.join("; ")
        : item.errors.join("; ") || "Validation failed";
      details.push({
        key: item.key,
        title: item.record.title,
        artistName: item.record.artistName,
        status: "failed",
        message,
      });
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.record.externalId,
        sourceUrl: item.record.sourceUrl,
        entityType: "SONG",
        status: "FAILED",
        title: item.record.title,
        artistName: item.record.artistName,
        errorMessage: message,
      });
      continue;
    }

    try {
      if (selection.artistAction === "skip") {
        skipped += 1;
        details.push({
          key: item.key,
          title: item.record.title,
          artistName: item.record.artistName,
          status: "skipped",
          message: "Artist skipped by admin",
        });
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.record.externalId,
          sourceUrl: item.record.sourceUrl,
          entityType: "SONG",
          status: "SKIPPED",
          title: item.record.title,
          artistName: item.record.artistName,
          errorMessage: "Artist skipped by admin",
        });
        continue;
      }

      if (item.song.status === "existing" && selection.songAction === "skip") {
        skipped += 1;
        details.push({
          key: item.key,
          title: item.record.title,
          artistName: item.record.artistName,
          status: "skipped",
          message: "Song already exists",
          entityId: item.song.songId,
        });
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.record.externalId,
          sourceUrl: item.record.sourceUrl,
          entityType: "SONG",
          entityId: item.song.songId,
          status: "SKIPPED",
          title: item.record.title,
          artistName: item.record.artistName,
          errorMessage: "Song already exists",
        });
        continue;
      }

      let artistId =
        selection.artistAction === "map"
          ? selection.mapArtistId
          : item.artist.artistId;

      if (selection.artistAction === "create" || !artistId) {
        const existing = await findArtistByNormalizedName(item.record.artistName);
        if (existing) {
          artistId = existing.id;
        } else {
          const slug = await resolveUniqueArtistSlug(
            item.record.artistName,
            item.record.artistSlug,
          );
          const createdArtist = await insertArtist({
            name: item.record.artistName,
            slug,
          });
          artistId = createdArtist.id;
          await insertImportRecord({
            importJobId: job.id,
            externalId: item.record.externalId,
            sourceUrl: item.record.sourceUrl,
            entityType: "ARTIST",
            entityId: createdArtist.id,
            status: "IMPORTED",
            title: null,
            artistName: item.record.artistName,
          });
        }
      }

      if (!artistId) {
        throw new Error("Artist mapping is required.");
      }

      const gated = applyLyricsRightsPolicy(item.record, provider);

      if (item.song.status === "existing" && selection.songAction === "update_metadata") {
        const songId = item.song.songId;
        if (!songId) {
          throw new Error("Existing song id missing.");
        }

        // Never overwrite lyrics via metadata update.
        const updated = await updateSongById(songId, {
          title: gated.record.title,
          coverImage: gated.record.coverImage ?? undefined,
          albumName: gated.record.albumName ?? undefined,
          releaseYear: gated.record.releaseYear ?? undefined,
          rightsStatus: gated.record.rightsStatus,
          sourceName: gated.record.sourceName,
          sourceUrl: gated.record.sourceUrl,
          externalId: gated.record.externalId ?? undefined,
          importedAt: new Date(),
        });

        imported += 1;
        details.push({
          key: item.key,
          title: item.record.title,
          artistName: item.record.artistName,
          status: "updated",
          message: "Updated permitted metadata (lyrics unchanged)",
          entityId: updated?.id ?? songId,
        });
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.record.externalId,
          sourceUrl: item.record.sourceUrl,
          entityType: "SONG",
          entityId: songId,
          status: "UPDATED",
          title: item.record.title,
          artistName: item.record.artistName,
        });
        continue;
      }

      // Fresh create
      if (item.song.status === "existing") {
        skipped += 1;
        details.push({
          key: item.key,
          title: item.record.title,
          artistName: item.record.artistName,
          status: "skipped",
          message: "Song already exists",
          entityId: item.song.songId,
        });
        await insertImportRecord({
          importJobId: job.id,
          externalId: item.record.externalId,
          sourceUrl: item.record.sourceUrl,
          entityType: "SONG",
          entityId: item.song.songId,
          status: "SKIPPED",
          title: item.record.title,
          artistName: item.record.artistName,
          errorMessage: "Song already exists",
        });
        continue;
      }

      const slug = await resolveUniqueSongSlug(
        gated.record.title,
        gated.record.artistName,
        gated.record.songSlug,
      );

      const created = await insertImportedSong({
        title: gated.record.title,
        slug,
        artistId,
        lyrics: gated.lyricsImportable ? gated.record.lyrics ?? null : null,
        coverImage: gated.record.coverImage ?? null,
        albumName: gated.record.albumName ?? null,
        releaseYear: gated.record.releaseYear ?? null,
        isPublished: false,
        rightsStatus: gated.record.rightsStatus,
        sourceName: gated.record.sourceName,
        sourceUrl: gated.record.sourceUrl,
        externalId: gated.record.externalId ?? null,
        importedAt: new Date(),
      });

      imported += 1;
      details.push({
        key: item.key,
        title: item.record.title,
        artistName: item.record.artistName,
        status: "imported",
        message: gated.lyricsImportable
          ? "Imported with authorized lyrics"
          : "Imported metadata (lyrics not imported)",
        entityId: created.id,
      });
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.record.externalId,
        sourceUrl: item.record.sourceUrl,
        entityType: "SONG",
        entityId: created.id,
        status: "IMPORTED",
        title: item.record.title,
        artistName: item.record.artistName,
      });
    } catch (error) {
      failed += 1;
      const message = friendlyError(error);
      details.push({
        key: item.key,
        title: item.record.title,
        artistName: item.record.artistName,
        status: "failed",
        message,
      });
      await insertImportRecord({
        importJobId: job.id,
        externalId: item.record.externalId,
        sourceUrl: item.record.sourceUrl,
        entityType: "SONG",
        status: "FAILED",
        title: item.record.title,
        artistName: item.record.artistName,
        errorMessage: message,
      });
    }
  }

  const status =
    imported === 0 && failed > 0
      ? "FAILED"
      : imported > 0 && (failed > 0 || skipped > 0)
        ? "PARTIAL"
        : imported > 0
          ? "COMPLETED"
          : failed > 0
            ? "FAILED"
            : "PARTIAL";

  await updateImportJobById(job.id, {
    status,
    importedRecords: imported,
    skippedRecords: skipped,
    failedRecords: failed,
    totalRecords: preview.length,
    previewPayload: null,
    completedAt: new Date(),
  });

  return {
    jobId: job.id,
    status,
    total: preview.length,
    imported,
    skipped,
    failed,
    details,
  };
}

export async function listImportHistoryForAdmin(limit = 20) {
  await assertAdmin();
  return listImportJobs(limit);
}

export { listImportProviders, getImportProvider };
