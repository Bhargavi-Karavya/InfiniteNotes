import { assertAdmin } from "@/services/auth";
import { findArtistById } from "@/repositories/artists";
import {
  artistExists,
  deleteSongById,
  findPublishedSongBySlug,
  findSongById,
  findSongBySlug,
  findSongsWithArtist,
  insertSong,
  listArtistOptions,
  listPublishedSongSitemapEntries,
  updateSongById,
  type SongWithArtist,
} from "@/repositories/songs";
import type {
  CreateSongInput,
  SongListQuery,
  UpdateSongInput,
} from "@/validations/songs";

export class SongConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SongConflictError";
  }
}

export class SongNotFoundError extends Error {
  constructor(message = "Song not found") {
    super(message);
    this.name = "SongNotFoundError";
  }
}

export class SongArtistNotFoundError extends Error {
  constructor(message = "Selected artist was not found.") {
    super(message);
    this.name = "SongArtistNotFoundError";
  }
}

export class SongPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SongPublishError";
  }
}

export type PublicSong = {
  id: string;
  title: string;
  slug: string;
  artistId: string;
  artistName: string;
  artistSlug: string;
  lyrics: string | null;
  coverImage: string | null;
  albumName: string | null;
  releaseYear: number | null;
  isPublished: boolean;
  rightsStatus: import("@/db/schema").SongRightsStatus;
  sourceName: string | null;
  sourceUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SongListResult = {
  items: PublicSong[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ArtistOption = {
  id: string;
  name: string;
};

export function toPublicSong(song: SongWithArtist): PublicSong {
  return {
    id: song.id,
    title: song.title,
    slug: song.slug,
    artistId: song.artistId,
    artistName: song.artistName,
    artistSlug: song.artistSlug,
    lyrics: song.lyrics,
    coverImage: song.coverImage,
    albumName: song.albumName ?? null,
    releaseYear: song.releaseYear ?? null,
    isPublished: song.isPublished,
    rightsStatus: song.rightsStatus,
    sourceName: song.sourceName ?? null,
    sourceUrl: song.sourceUrl ?? null,
    createdAt: song.createdAt,
    updatedAt: song.updatedAt,
  };
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code =
    "code" in error
      ? String(error.code)
      : "cause" in error &&
          error.cause &&
          typeof error.cause === "object" &&
          "code" in error.cause
        ? String(error.cause.code)
        : null;

  return code === "23505";
}

async function ensureArtistExists(artistId: string): Promise<void> {
  const exists = await artistExists(artistId);
  if (!exists) {
    throw new SongArtistNotFoundError();
  }
}

/** Admin: paginated song list with search + filters. */
export async function listSongsAdmin(
  query: SongListQuery,
): Promise<SongListResult> {
  await assertAdmin();

  const offset = (query.page - 1) * query.pageSize;
  const { items, total } = await findSongsWithArtist({
    q: query.q,
    artistId: query.artistId,
    published: query.published,
    limit: query.pageSize,
    offset,
  });

  return {
    items: items.map(toPublicSong),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getSongById(id: string): Promise<PublicSong> {
  await assertAdmin();

  const song = await findSongById(id);
  if (!song) {
    throw new SongNotFoundError();
  }

  return toPublicSong(song);
}

export async function listArtistsForSongForm(): Promise<ArtistOption[]> {
  await assertAdmin();
  return listArtistOptions();
}

export async function createSong(input: CreateSongInput): Promise<PublicSong> {
  await assertAdmin();
  await ensureArtistExists(input.artistId);

  const existing = await findSongBySlug(input.slug);
  if (existing) {
    throw new SongConflictError("A song with this slug already exists.");
  }

  try {
    const created = await insertSong({
      title: input.title,
      slug: input.slug,
      artistId: input.artistId,
      lyrics: input.lyrics,
      coverImage: input.coverImage,
      isPublished: input.isPublished,
    });

    const song = await findSongById(created.id);
    if (!song) {
      throw new SongNotFoundError();
    }
    return toPublicSong(song);
  } catch (error) {
    if (error instanceof SongNotFoundError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new SongConflictError("A song with this slug already exists.");
    }
    throw error;
  }
}

export async function updateSong(
  id: string,
  input: UpdateSongInput,
): Promise<PublicSong> {
  await assertAdmin();

  const existing = await findSongById(id);
  if (!existing) {
    throw new SongNotFoundError();
  }

  await ensureArtistExists(input.artistId);

  if (input.slug !== existing.slug) {
    const slugOwner = await findSongBySlug(input.slug, id);
    if (slugOwner) {
      throw new SongConflictError("A song with this slug already exists.");
    }
  }

  try {
    const updated = await updateSongById(id, {
      title: input.title,
      slug: input.slug,
      artistId: input.artistId,
      lyrics: input.lyrics,
      coverImage: input.coverImage,
      isPublished: input.isPublished,
    });

    if (!updated) {
      throw new SongNotFoundError();
    }

    const song = await findSongById(id);
    if (!song) {
      throw new SongNotFoundError();
    }
    return toPublicSong(song);
  } catch (error) {
    if (
      error instanceof SongNotFoundError ||
      error instanceof SongArtistNotFoundError ||
      error instanceof SongConflictError
    ) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new SongConflictError("A song with this slug already exists.");
    }
    throw error;
  }
}

export async function deleteSong(id: string): Promise<void> {
  await assertAdmin();

  const existing = await findSongById(id);
  if (!existing) {
    throw new SongNotFoundError();
  }

  const deleted = await deleteSongById(id);
  if (!deleted) {
    throw new SongNotFoundError();
  }
}

/**
 * Quick publish / unpublish from the song list.
 * Publishing requires non-empty lyrics.
 */
export async function setSongPublished(
  id: string,
  isPublished: boolean,
): Promise<PublicSong> {
  await assertAdmin();

  const existing = await findSongById(id);
  if (!existing) {
    throw new SongNotFoundError();
  }

  if (isPublished) {
    const lyrics = existing.lyrics?.trim() ?? "";
    if (!lyrics) {
      throw new SongPublishError(
        `“${existing.title}” needs lyrics before it can be published.`,
      );
    }
  }

  const updated = await updateSongById(id, { isPublished });
  if (!updated) {
    throw new SongNotFoundError();
  }

  const song = await findSongById(id);
  if (!song) {
    throw new SongNotFoundError();
  }
  return toPublicSong(song);
}

export type BulkPublishResult = {
  updated: number;
  skipped: number;
  failed: Array<{ id: string; title: string; error: string }>;
};

/** Bulk publish / unpublish selected songs. */
export async function setSongsPublished(
  ids: string[],
  isPublished: boolean,
): Promise<BulkPublishResult> {
  await assertAdmin();

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const result: BulkPublishResult = {
    updated: 0,
    skipped: 0,
    failed: [],
  };

  for (const id of uniqueIds) {
    try {
      const existing = await findSongById(id);
      if (!existing) {
        result.failed.push({
          id,
          title: "Unknown",
          error: "Song not found",
        });
        continue;
      }

      if (existing.isPublished === isPublished) {
        result.skipped += 1;
        continue;
      }

      if (isPublished) {
        const lyrics = existing.lyrics?.trim() ?? "";
        if (!lyrics) {
          result.failed.push({
            id,
            title: existing.title,
            error: "Needs lyrics before publishing",
          });
          continue;
        }
      }

      await updateSongById(id, { isPublished });
      result.updated += 1;
    } catch (error) {
      result.failed.push({
        id,
        title: "Unknown",
        error:
          error instanceof Error ? error.message : "Could not update song",
      });
    }
  }

  return result;
}

/** Bulk delete selected songs. Artists are not deleted. */
export async function deleteSongs(ids: string[]): Promise<{
  deleted: number;
  failed: Array<{ id: string; title: string; error: string }>;
}> {
  await assertAdmin();

  const uniqueIds = [...new Set(ids.filter(Boolean))];
  const result = {
    deleted: 0,
    failed: [] as Array<{ id: string; title: string; error: string }>,
  };

  for (const id of uniqueIds) {
    try {
      const existing = await findSongById(id);
      if (!existing) {
        result.failed.push({
          id,
          title: "Unknown",
          error: "Song not found",
        });
        continue;
      }

      const deleted = await deleteSongById(id);
      if (!deleted) {
        result.failed.push({
          id,
          title: existing.title,
          error: "Could not delete song",
        });
        continue;
      }
      result.deleted += 1;
    } catch (error) {
      result.failed.push({
        id,
        title: "Unknown",
        error:
          error instanceof Error ? error.message : "Could not delete song",
      });
    }
  }

  return result;
}

/**
 * Public catalog helpers — always filter to published songs only.
 * Do not use these for admin screens.
 */
export async function getPublishedSongBySlug(
  slug: string,
): Promise<PublicSong | null> {
  const song = await findPublishedSongBySlug(slug);
  return song ? toPublicSong(song) : null;
}

export async function getPublishedSongs(options?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<SongListResult> {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const { items, total } = await findSongsWithArtist({
    q: options?.q,
    publishedOnly: true,
    limit: pageSize,
    offset,
  });

  return {
    items: items.map(toPublicSong),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getArtistSongs(
  artistId: string,
  options?: { page?: number; pageSize?: number },
): Promise<SongListResult> {
  const artist = await findArtistById(artistId);
  if (!artist) {
    return {
      items: [],
      page: options?.page ?? 1,
      pageSize: options?.pageSize ?? 20,
      total: 0,
      totalPages: 1,
    };
  }

  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const { items, total } = await findSongsWithArtist({
    artistId,
    publishedOnly: true,
    limit: pageSize,
    offset,
  });

  return {
    items: items.map(toPublicSong),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Public popular songs from analytics (published only).
 * Returns an empty list when there is no view data yet.
 */
export async function getPopularPublishedSongs(
  limit = 6,
): Promise<PublicSong[]> {
  const { findTopSongsByViews } = await import("@/repositories/analytics");
  const top = await findTopSongsByViews(null, limit * 2);
  if (top.length === 0) {
    return [];
  }

  const results: PublicSong[] = [];
  for (const item of top) {
    if (results.length >= limit) {
      break;
    }
    const song = await findPublishedSongBySlug(item.slug);
    if (song) {
      results.push(toPublicSong(song));
    }
  }
  return results;
}

/** Lean published-song URL list for sitemap generation. */
export async function getPublishedSongSitemapEntries(limit = 50_000) {
  return listPublishedSongSitemapEntries(limit);
}
