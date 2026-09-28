import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, songs, type Artist, type NewArtist } from "@/db/schema";

export type ArtistListFilters = {
  q?: string;
  limit: number;
  offset: number;
};

export type ArtistWithSongCount = Artist & {
  songCount: number;
};

function searchCondition(q: string | undefined): SQL | undefined {
  const term = q?.trim();
  if (!term) {
    return undefined;
  }

  const pattern = `%${term}%`;
  return or(ilike(artists.name, pattern), ilike(artists.slug, pattern));
}

export async function findArtistsWithSongCount(
  filters: ArtistListFilters,
): Promise<{ items: ArtistWithSongCount[]; total: number }> {
  const where = searchCondition(filters.q);
  const db = getDb();

  const totalQuery = db.select({ value: count() }).from(artists);
  const [totalRow] = where ? await totalQuery.where(where) : await totalQuery;

  const listQuery = db
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      profileImage: artists.profileImage,
      biography: artists.biography,
      createdAt: artists.createdAt,
      updatedAt: artists.updatedAt,
      songCount: sql<number>`cast(count(${songs.id}) as int)`,
    })
    .from(artists)
    .leftJoin(songs, eq(songs.artistId, artists.id))
    .$dynamic();

  const filtered = where ? listQuery.where(where) : listQuery;

  const rows = await filtered
    .groupBy(artists.id)
    .orderBy(asc(artists.name))
    .limit(filters.limit)
    .offset(filters.offset);

  return {
    items: rows.map((row) => ({
      ...row,
      songCount: Number(row.songCount),
    })),
    total: totalRow?.value ?? 0,
  };
}

/** Artists that have at least one published song (for public surfaces). */
export async function findArtistsWithPublishedSongs(
  limit: number,
): Promise<ArtistWithSongCount[]> {
  const rows = await getDb()
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      profileImage: artists.profileImage,
      biography: artists.biography,
      createdAt: artists.createdAt,
      updatedAt: artists.updatedAt,
      songCount: sql<number>`cast(count(${songs.id}) as int)`,
    })
    .from(artists)
    .innerJoin(
      songs,
      and(eq(songs.artistId, artists.id), eq(songs.isPublished, true)),
    )
    .groupBy(artists.id)
    .orderBy(desc(sql`count(${songs.id})`), asc(artists.name))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    songCount: Number(row.songCount),
  }));
}

export async function findArtistById(id: string): Promise<Artist | null> {
  const [artist] = await getDb()
    .select()
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);

  return artist ?? null;
}

export async function findArtistBySlug(
  slug: string,
  excludeId?: string,
): Promise<Artist | null> {
  const conditions = [eq(artists.slug, slug)];
  if (excludeId) {
    conditions.push(ne(artists.id, excludeId));
  }

  const [artist] = await getDb()
    .select()
    .from(artists)
    .where(and(...conditions))
    .limit(1);

  return artist ?? null;
}

export async function insertArtist(data: NewArtist): Promise<Artist> {
  const [artist] = await getDb().insert(artists).values(data).returning();

  if (!artist) {
    throw new Error("Failed to create artist");
  }

  return artist;
}

export async function updateArtistById(
  id: string,
  data: Partial<NewArtist>,
): Promise<Artist | null> {
  const [artist] = await getDb()
    .update(artists)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(artists.id, id))
    .returning();

  return artist ?? null;
}

export async function deleteArtistById(id: string): Promise<boolean> {
  const deleted = await getDb()
    .delete(artists)
    .where(eq(artists.id, id))
    .returning({ id: artists.id });

  return deleted.length > 0;
}

export async function countSongsByArtistId(artistId: string): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(songs)
    .where(eq(songs.artistId, artistId));

  return row?.value ?? 0;
}

/** Sitemap-only fields for artists that have published songs. */
export async function listPublicArtistSitemapEntries(
  limit = 50_000,
): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return getDb()
    .select({
      slug: artists.slug,
      updatedAt: artists.updatedAt,
    })
    .from(artists)
    .innerJoin(
      songs,
      and(eq(songs.artistId, artists.id), eq(songs.isPublished, true)),
    )
    .groupBy(artists.id)
    .orderBy(desc(artists.updatedAt))
    .limit(limit);
}
