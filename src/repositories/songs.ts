import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  ne,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import { artists, songs, type NewSong, type Song } from "@/db/schema";

export type SongListFilters = {
  q?: string;
  artistId?: string;
  published?: "all" | "published" | "unpublished";
  limit: number;
  offset: number;
  publishedOnly?: boolean;
};

export type SongWithArtist = Song & {
  artistName: string;
  artistSlug: string;
};

function buildSongFilters(filters: SongListFilters): SQL | undefined {
  const conditions: SQL[] = [];

  if (filters.publishedOnly || filters.published === "published") {
    conditions.push(eq(songs.isPublished, true));
  } else if (filters.published === "unpublished") {
    conditions.push(eq(songs.isPublished, false));
  }

  if (filters.artistId) {
    conditions.push(eq(songs.artistId, filters.artistId));
  }

  const term = filters.q?.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      or(ilike(songs.title, pattern), ilike(artists.name, pattern))!,
    );
  }

  if (conditions.length === 0) {
    return undefined;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return and(...conditions);
}

export async function findSongsWithArtist(
  filters: SongListFilters,
): Promise<{ items: SongWithArtist[]; total: number }> {
  const where = buildSongFilters(filters);
  const db = getDb();

  const totalQuery = db
    .select({ value: count() })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .$dynamic();

  const [totalRow] = where
    ? await totalQuery.where(where)
    : await totalQuery;

  const listQuery = db
    .select({
      id: songs.id,
      title: songs.title,
      slug: songs.slug,
      artistId: songs.artistId,
      lyrics: songs.lyrics,
      coverImage: songs.coverImage,
      albumName: songs.albumName,
      releaseYear: songs.releaseYear,
      isPublished: songs.isPublished,
      rightsStatus: songs.rightsStatus,
      sourceName: songs.sourceName,
      sourceUrl: songs.sourceUrl,
      externalId: songs.externalId,
      importedAt: songs.importedAt,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .$dynamic();

  const filtered = where ? listQuery.where(where) : listQuery;

  const rows = await filtered
    .orderBy(desc(songs.updatedAt), asc(songs.title))
    .limit(filters.limit)
    .offset(filters.offset);

  return {
    items: rows,
    total: totalRow?.value ?? 0,
  };
}

export async function findSongById(id: string): Promise<SongWithArtist | null> {
  const [row] = await getDb()
    .select({
      id: songs.id,
      title: songs.title,
      slug: songs.slug,
      artistId: songs.artistId,
      lyrics: songs.lyrics,
      coverImage: songs.coverImage,
      albumName: songs.albumName,
      releaseYear: songs.releaseYear,
      isPublished: songs.isPublished,
      rightsStatus: songs.rightsStatus,
      sourceName: songs.sourceName,
      sourceUrl: songs.sourceUrl,
      externalId: songs.externalId,
      importedAt: songs.importedAt,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(eq(songs.id, id))
    .limit(1);

  return row ?? null;
}

export async function findSongBySlug(
  slug: string,
  excludeId?: string,
): Promise<Song | null> {
  const conditions = [eq(songs.slug, slug)];
  if (excludeId) {
    conditions.push(ne(songs.id, excludeId));
  }

  const [song] = await getDb()
    .select()
    .from(songs)
    .where(and(...conditions))
    .limit(1);

  return song ?? null;
}

export async function findPublishedSongBySlug(
  slug: string,
): Promise<SongWithArtist | null> {
  const [row] = await getDb()
    .select({
      id: songs.id,
      title: songs.title,
      slug: songs.slug,
      artistId: songs.artistId,
      lyrics: songs.lyrics,
      coverImage: songs.coverImage,
      albumName: songs.albumName,
      releaseYear: songs.releaseYear,
      isPublished: songs.isPublished,
      rightsStatus: songs.rightsStatus,
      sourceName: songs.sourceName,
      sourceUrl: songs.sourceUrl,
      externalId: songs.externalId,
      importedAt: songs.importedAt,
      createdAt: songs.createdAt,
      updatedAt: songs.updatedAt,
      artistName: artists.name,
      artistSlug: artists.slug,
    })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(and(eq(songs.slug, slug), eq(songs.isPublished, true)))
    .limit(1);

  return row ?? null;
}

export async function insertSong(data: NewSong): Promise<Song> {
  const [song] = await getDb().insert(songs).values(data).returning();
  if (!song) {
    throw new Error("Failed to create song");
  }
  return song;
}

export async function updateSongById(
  id: string,
  data: Partial<NewSong>,
): Promise<Song | null> {
  const [song] = await getDb()
    .update(songs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(songs.id, id))
    .returning();

  return song ?? null;
}

export async function deleteSongById(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(songs)
    .where(eq(songs.id, id))
    .returning({ id: songs.id });

  return deleted.length > 0;
}

export async function listArtistOptions(): Promise<
  Array<{ id: string; name: string }>
> {
  return getDb()
    .select({
      id: artists.id,
      name: artists.name,
    })
    .from(artists)
    .orderBy(asc(artists.name));
}

/** Lightweight existence check used when validating artistId. */
export async function artistExists(artistId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.id, artistId))
    .limit(1);
  return Boolean(row);
}

/** Sitemap-only fields for published songs (easy to extend into sitemap indexes later). */
export async function listPublishedSongSitemapEntries(
  limit = 50_000,
): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return getDb()
    .select({
      slug: songs.slug,
      updatedAt: songs.updatedAt,
    })
    .from(songs)
    .where(eq(songs.isPublished, true))
    .orderBy(desc(songs.updatedAt))
    .limit(limit);
}
