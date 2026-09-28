import type { Artist } from "@/db/schema";
import type {
  ArtistListQuery,
  CreateArtistInput,
  UpdateArtistInput,
} from "@/validations/artists";
import { assertAdmin } from "@/services/auth";
import {
  countSongsByArtistId,
  deleteArtistById,
  findArtistById,
  findArtistBySlug,
  findArtistsWithPublishedSongs,
  findArtistsWithSongCount,
  insertArtist,
  listPublicArtistSitemapEntries,
  updateArtistById,
  type ArtistWithSongCount,
} from "@/repositories/artists";

export class ArtistConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtistConflictError";
  }
}

export class ArtistNotFoundError extends Error {
  constructor(message = "Artist not found") {
    super(message);
    this.name = "ArtistNotFoundError";
  }
}

export class ArtistHasSongsError extends Error {
  constructor(
    message = "This artist cannot be deleted because songs are associated with this artist.",
  ) {
    super(message);
    this.name = "ArtistHasSongsError";
  }
}

export type PublicArtist = {
  id: string;
  name: string;
  slug: string;
  profileImage: string | null;
  biography: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicArtistWithSongCount = PublicArtist & {
  songCount: number;
};

export type ArtistListResult = {
  items: PublicArtistWithSongCount[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function toPublicArtist(artist: Artist): PublicArtist {
  return {
    id: artist.id,
    name: artist.name,
    slug: artist.slug,
    profileImage: artist.profileImage,
    biography: artist.biography,
    createdAt: artist.createdAt,
    updatedAt: artist.updatedAt,
  };
}

function toPublicArtistWithSongCount(
  artist: ArtistWithSongCount,
): PublicArtistWithSongCount {
  return {
    ...toPublicArtist(artist),
    songCount: artist.songCount,
  };
}

export async function listArtists(
  query: ArtistListQuery,
): Promise<ArtistListResult> {
  await assertAdmin();

  const offset = (query.page - 1) * query.pageSize;
  const { items, total } = await findArtistsWithSongCount({
    q: query.q,
    limit: query.pageSize,
    offset,
  });

  return {
    items: items.map(toPublicArtistWithSongCount),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getArtistById(id: string): Promise<PublicArtist> {
  await assertAdmin();

  const artist = await findArtistById(id);
  if (!artist) {
    throw new ArtistNotFoundError();
  }

  return toPublicArtist(artist);
}

export async function getArtistBySlug(slug: string): Promise<PublicArtist | null> {
  const artist = await findArtistBySlug(slug);
  return artist ? toPublicArtist(artist) : null;
}

/**
 * Public catalog: artists that currently have at least one published song.
 * Does not require admin authentication.
 */
export async function getFeaturedArtists(
  limit = 8,
): Promise<PublicArtistWithSongCount[]> {
  const items = await findArtistsWithPublishedSongs(limit);
  return items.map(toPublicArtistWithSongCount);
}

/** Lean public-artist URL list for sitemap generation. */
export async function getPublicArtistSitemapEntries(limit = 50_000) {
  return listPublicArtistSitemapEntries(limit);
}

export async function createArtist(
  input: CreateArtistInput,
): Promise<PublicArtist> {
  await assertAdmin();

  const existing = await findArtistBySlug(input.slug);
  if (existing) {
    throw new ArtistConflictError("An artist with this slug already exists.");
  }

  try {
    const artist = await insertArtist({
      name: input.name,
      slug: input.slug,
      profileImage: input.profileImage,
      biography: input.biography,
    });
    return toPublicArtist(artist);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ArtistConflictError("An artist with this slug already exists.");
    }
    throw error;
  }
}

export async function updateArtist(
  id: string,
  input: UpdateArtistInput,
): Promise<PublicArtist> {
  await assertAdmin();

  const existing = await findArtistById(id);
  if (!existing) {
    throw new ArtistNotFoundError();
  }

  if (input.slug !== existing.slug) {
    const slugOwner = await findArtistBySlug(input.slug, id);
    if (slugOwner) {
      throw new ArtistConflictError("An artist with this slug already exists.");
    }
  }

  try {
    const updated = await updateArtistById(id, {
      name: input.name,
      slug: input.slug,
      profileImage: input.profileImage,
      biography: input.biography,
    });

    if (!updated) {
      throw new ArtistNotFoundError();
    }

    return toPublicArtist(updated);
  } catch (error) {
    if (error instanceof ArtistNotFoundError) {
      throw error;
    }
    if (isUniqueViolation(error)) {
      throw new ArtistConflictError("An artist with this slug already exists.");
    }
    throw error;
  }
}

export async function deleteArtist(id: string): Promise<void> {
  await assertAdmin();

  const existing = await findArtistById(id);
  if (!existing) {
    throw new ArtistNotFoundError();
  }

  const songCount = await countSongsByArtistId(id);
  if (songCount > 0) {
    throw new ArtistHasSongsError();
  }

  const deleted = await deleteArtistById(id);
  if (!deleted) {
    throw new ArtistNotFoundError();
  }
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
