import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  analyticsEvents,
  artists,
  songs,
  type NewAnalyticsEvent,
} from "@/db/schema";

export async function insertAnalyticsEvent(
  data: NewAnalyticsEvent,
): Promise<void> {
  await getDb().insert(analyticsEvents).values(data);
}

export function buildCreatedAtFilter(since: Date | null): SQL | undefined {
  if (!since) return undefined;
  return gte(analyticsEvents.createdAt, since);
}

export async function countEventsByType(
  eventType: NewAnalyticsEvent["eventType"],
  since: Date | null,
): Promise<number> {
  const where = and(
    eq(analyticsEvents.eventType, eventType),
    buildCreatedAtFilter(since),
  );

  const [row] = await getDb()
    .select({ value: count() })
    .from(analyticsEvents)
    .where(where);

  return Number(row?.value ?? 0);
}

export async function countAllEvents(since: Date | null): Promise<number> {
  const where = buildCreatedAtFilter(since);
  const query = getDb().select({ value: count() }).from(analyticsEvents);
  const [row] = where ? await query.where(where) : await query;
  return Number(row?.value ?? 0);
}

export async function findTopSongsByViews(
  since: Date | null,
  limit = 10,
): Promise<
  Array<{
    songId: string;
    title: string;
    slug: string;
    artistName: string;
    views: number;
  }>
> {
  const where = and(
    eq(analyticsEvents.eventType, "SONG_VIEW"),
    eq(analyticsEvents.entityType, "SONG"),
    buildCreatedAtFilter(since),
  );

  const rows = await getDb()
    .select({
      songId: songs.id,
      title: songs.title,
      slug: songs.slug,
      artistName: artists.name,
      views: count(analyticsEvents.id),
    })
    .from(analyticsEvents)
    .innerJoin(songs, eq(analyticsEvents.entityId, songs.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .where(where)
    .groupBy(songs.id, songs.title, songs.slug, artists.name)
    .orderBy(desc(count(analyticsEvents.id)))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    views: Number(row.views),
  }));
}

export async function findTopArtistsByViews(
  since: Date | null,
  limit = 10,
): Promise<
  Array<{
    artistId: string;
    name: string;
    slug: string;
    views: number;
  }>
> {
  const where = and(
    eq(analyticsEvents.eventType, "ARTIST_VIEW"),
    eq(analyticsEvents.entityType, "ARTIST"),
    buildCreatedAtFilter(since),
  );

  const rows = await getDb()
    .select({
      artistId: artists.id,
      name: artists.name,
      slug: artists.slug,
      views: count(analyticsEvents.id),
    })
    .from(analyticsEvents)
    .innerJoin(artists, eq(analyticsEvents.entityId, artists.id))
    .where(where)
    .groupBy(artists.id, artists.name, artists.slug)
    .orderBy(desc(count(analyticsEvents.id)))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    views: Number(row.views),
  }));
}

export async function findTopSearches(
  since: Date | null,
  limit = 10,
): Promise<Array<{ query: string; searches: number }>> {
  const where = and(
    eq(analyticsEvents.eventType, "SEARCH"),
    buildCreatedAtFilter(since),
  );

  const rows = await getDb()
    .select({
      query: sql<string>`lower(trim(${analyticsEvents.metadata}->>'query'))`,
      searches: count(analyticsEvents.id),
    })
    .from(analyticsEvents)
    .where(where)
    .groupBy(sql`lower(trim(${analyticsEvents.metadata}->>'query'))`)
    .orderBy(desc(count(analyticsEvents.id)))
    .limit(limit);

  return rows
    .filter((row) => row.query)
    .map((row) => ({
      query: row.query,
      searches: Number(row.searches),
    }));
}

export async function findViewsOverTime(
  since: Date | null,
): Promise<Array<{ date: string; views: number }>> {
  const where = and(
    sql`${analyticsEvents.eventType} in ('PAGE_VIEW', 'SONG_VIEW', 'ARTIST_VIEW')`,
    buildCreatedAtFilter(since),
  );

  const rows = await getDb()
    .select({
      date: sql<string>`to_char(date_trunc('day', ${analyticsEvents.createdAt}), 'YYYY-MM-DD')`,
      views: count(analyticsEvents.id),
    })
    .from(analyticsEvents)
    .where(where)
    .groupBy(sql`date_trunc('day', ${analyticsEvents.createdAt})`)
    .orderBy(asc(sql`date_trunc('day', ${analyticsEvents.createdAt})`));

  return rows.map((row) => ({
    date: row.date,
    views: Number(row.views),
  }));
}

export async function findRecentActivity(
  since: Date | null,
  limit = 20,
): Promise<
  Array<{
    id: string;
    eventType: string;
    path: string;
    label: string;
    createdAt: Date;
  }>
> {
  const where = buildCreatedAtFilter(since);

  const rows = await getDb()
    .select({
      id: analyticsEvents.id,
      eventType: analyticsEvents.eventType,
      path: analyticsEvents.path,
      metadata: analyticsEvents.metadata,
      entityId: analyticsEvents.entityId,
      createdAt: analyticsEvents.createdAt,
      songTitle: songs.title,
      artistName: artists.name,
    })
    .from(analyticsEvents)
    .leftJoin(
      songs,
      and(
        eq(analyticsEvents.entityType, "SONG"),
        eq(analyticsEvents.entityId, songs.id),
      ),
    )
    .leftJoin(
      artists,
      and(
        eq(analyticsEvents.entityType, "ARTIST"),
        eq(analyticsEvents.entityId, artists.id),
      ),
    )
    .where(where)
    .orderBy(desc(analyticsEvents.createdAt))
    .limit(limit);

  return rows.map((row) => {
    let label = row.path;
    if (row.eventType === "SEARCH") {
      const q = (row.metadata as { query?: string } | null)?.query;
      label = q ? `“${q}”` : "Search";
    } else if (row.eventType === "SONG_VIEW") {
      label = row.songTitle ?? "Song";
    } else if (row.eventType === "ARTIST_VIEW") {
      label = row.artistName ?? "Artist";
    }
    return {
      id: row.id,
      eventType: row.eventType,
      path: row.path,
      label,
      createdAt: row.createdAt,
    };
  });
}

/** Confirm a published song exists before accepting SONG_VIEW. */
export async function publishedSongExists(id: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: songs.id })
    .from(songs)
    .where(and(eq(songs.id, id), eq(songs.isPublished, true)))
    .limit(1);
  return Boolean(row);
}

export async function artistExistsForAnalytics(id: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: artists.id })
    .from(artists)
    .where(eq(artists.id, id))
    .limit(1);
  return Boolean(row);
}
