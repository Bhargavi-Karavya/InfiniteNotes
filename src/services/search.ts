import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { artists, songs } from "@/db/schema";
import type { SearchQueryInput } from "@/validations/songs";
import { findSongsWithArtist } from "@/repositories/songs";

export type SearchSongHit = {
  id: string;
  title: string;
  slug: string;
  artistName: string;
  artistSlug: string;
  coverImage: string | null;
};

export type SearchArtistHit = {
  id: string;
  name: string;
  slug: string;
  profileImage: string | null;
  songCount: number;
};

export type SearchResult = {
  songs: SearchSongHit[];
  artists: SearchArtistHit[];
};

/**
 * Public catalog search — published songs only; artists that have published songs.
 */
export async function searchCatalog(
  input: SearchQueryInput,
): Promise<SearchResult> {
  const q = input.q.trim();
  if (!q) {
    return { songs: [], artists: [] };
  }

  const [{ items: songRows }, artistRows] = await Promise.all([
    findSongsWithArtist({
      q,
      publishedOnly: true,
      limit: input.limit,
      offset: 0,
    }),
    searchPublishedArtists(q, input.limit),
  ]);

  return {
    songs: songRows.map((song) => ({
      id: song.id,
      title: song.title,
      slug: song.slug,
      artistName: song.artistName,
      artistSlug: song.artistSlug,
      coverImage: song.coverImage,
    })),
    artists: artistRows,
  };
}

async function searchPublishedArtists(
  q: string,
  limit: number,
): Promise<SearchArtistHit[]> {
  const pattern = `%${q}%`;

  const rows = await getDb()
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
      profileImage: artists.profileImage,
      songCount: sql<number>`cast(count(${songs.id}) as int)`,
    })
    .from(artists)
    .innerJoin(
      songs,
      and(eq(songs.artistId, artists.id), eq(songs.isPublished, true)),
    )
    .where(or(ilike(artists.name, pattern), ilike(artists.slug, pattern)))
    .groupBy(artists.id)
    .orderBy(asc(artists.name))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    profileImage: row.profileImage,
    songCount: Number(row.songCount),
  }));
}
