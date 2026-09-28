import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import {
  artists,
  importJobs,
  importRecords,
  songs,
  type ImportJob,
  type ImportRecord,
  type NewImportJob,
  type NewImportRecord,
  type NewSong,
  type Song,
} from "@/db/schema";
import { normalizeMatchText } from "@/services/import/import-normalizer";

export async function insertImportJob(data: NewImportJob): Promise<ImportJob> {
  const [job] = await getDb().insert(importJobs).values(data).returning();
  if (!job) throw new Error("Failed to create import job");
  return job;
}

export async function updateImportJobById(
  id: string,
  data: Partial<NewImportJob>,
): Promise<ImportJob | null> {
  const [job] = await getDb()
    .update(importJobs)
    .set(data)
    .where(eq(importJobs.id, id))
    .returning();
  return job ?? null;
}

export async function findImportJobById(id: string): Promise<ImportJob | null> {
  const [job] = await getDb()
    .select()
    .from(importJobs)
    .where(eq(importJobs.id, id))
    .limit(1);
  return job ?? null;
}

export async function listImportJobs(limit = 20): Promise<ImportJob[]> {
  return getDb()
    .select()
    .from(importJobs)
    .orderBy(desc(importJobs.createdAt))
    .limit(limit);
}

export async function insertImportRecord(
  data: NewImportRecord,
): Promise<ImportRecord> {
  const [row] = await getDb().insert(importRecords).values(data).returning();
  if (!row) throw new Error("Failed to create import record");
  return row;
}

export async function findSongBySourceExternal(
  sourceName: string,
  externalId: string,
): Promise<Song | null> {
  const [row] = await getDb()
    .select()
    .from(songs)
    .where(
      and(
        eq(songs.sourceName, sourceName),
        eq(songs.externalId, externalId),
        isNotNull(songs.externalId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findSongByTitleAndArtistName(
  title: string,
  artistName: string,
): Promise<(Song & { artistName: string }) | null> {
  const titleKey = normalizeMatchText(title);
  const artistKey = normalizeMatchText(artistName);

  const rows = await getDb()
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
    })
    .from(songs)
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(
      and(
        sql`lower(regexp_replace(trim(${songs.title}), '\\s+', ' ', 'g')) = ${titleKey}`,
        sql`lower(regexp_replace(trim(${artists.name}), '\\s+', ' ', 'g')) = ${artistKey}`,
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function findArtistByNormalizedName(
  name: string,
): Promise<{ id: string; name: string; slug: string } | null> {
  const key = normalizeMatchText(name);
  const [row] = await getDb()
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
    })
    .from(artists)
    .where(
      sql`lower(regexp_replace(trim(${artists.name}), '\\s+', ' ', 'g')) = ${key}`,
    )
    .limit(1);
  return row ?? null;
}

export async function listArtistsForImportMap(): Promise<
  Array<{ id: string; name: string; slug: string }>
> {
  return getDb()
    .select({
      id: artists.id,
      name: artists.name,
      slug: artists.slug,
    })
    .from(artists)
    .orderBy(asc(artists.name))
    .limit(500);
}

export async function insertImportedSong(data: NewSong): Promise<Song> {
  const [song] = await getDb().insert(songs).values(data).returning();
  if (!song) throw new Error("Failed to create song");
  return song;
}
