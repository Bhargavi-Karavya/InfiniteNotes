import {
  and,
  count,
  desc,
  eq,
  ilike,
  or,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  artists,
  lyricCorrectionRequests,
  songs,
  users,
  type LyricCorrectionRequest,
  type NewLyricCorrectionRequest,
} from "@/db/schema";
import type { CorrectionListQuery } from "@/validations/lyric-corrections";

export type CorrectionWithSong = LyricCorrectionRequest & {
  songTitle: string;
  songSlug: string;
  artistName: string;
  artistSlug: string;
  reviewerName: string | null;
  currentLyrics: string | null;
};

export async function insertCorrectionRequest(
  data: NewLyricCorrectionRequest,
): Promise<LyricCorrectionRequest> {
  const [row] = await getDb()
    .insert(lyricCorrectionRequests)
    .values(data)
    .returning();
  if (!row) throw new Error("Failed to create correction request");
  return row;
}

export async function findCorrectionById(
  id: string,
): Promise<CorrectionWithSong | null> {
  const [row] = await getDb()
    .select({
      id: lyricCorrectionRequests.id,
      songId: lyricCorrectionRequests.songId,
      suggestedLyrics: lyricCorrectionRequests.suggestedLyrics,
      reason: lyricCorrectionRequests.reason,
      status: lyricCorrectionRequests.status,
      createdAt: lyricCorrectionRequests.createdAt,
      reviewedAt: lyricCorrectionRequests.reviewedAt,
      reviewedBy: lyricCorrectionRequests.reviewedBy,
      adminNote: lyricCorrectionRequests.adminNote,
      songTitle: songs.title,
      songSlug: songs.slug,
      artistName: artists.name,
      artistSlug: artists.slug,
      currentLyrics: songs.lyrics,
      reviewerName: users.name,
    })
    .from(lyricCorrectionRequests)
    .innerJoin(songs, eq(lyricCorrectionRequests.songId, songs.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .leftJoin(users, eq(lyricCorrectionRequests.reviewedBy, users.id))
    .where(eq(lyricCorrectionRequests.id, id))
    .limit(1);

  return row ?? null;
}

function buildListWhere(query: CorrectionListQuery): SQL | undefined {
  const conditions: SQL[] = [];

  if (query.status !== "all") {
    conditions.push(eq(lyricCorrectionRequests.status, query.status));
  }

  const term = query.q.trim();
  if (term) {
    const pattern = `%${term}%`;
    conditions.push(
      or(ilike(songs.title, pattern), ilike(artists.name, pattern))!,
    );
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export async function findCorrectionRequests(
  query: CorrectionListQuery,
): Promise<{ items: CorrectionWithSong[]; total: number }> {
  const where = buildListWhere(query);
  const offset = (query.page - 1) * query.pageSize;
  const db = getDb();

  const totalQuery = db
    .select({ value: count() })
    .from(lyricCorrectionRequests)
    .innerJoin(songs, eq(lyricCorrectionRequests.songId, songs.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .$dynamic();

  const [totalRow] = where ? await totalQuery.where(where) : await totalQuery;

  const listQuery = db
    .select({
      id: lyricCorrectionRequests.id,
      songId: lyricCorrectionRequests.songId,
      suggestedLyrics: lyricCorrectionRequests.suggestedLyrics,
      reason: lyricCorrectionRequests.reason,
      status: lyricCorrectionRequests.status,
      createdAt: lyricCorrectionRequests.createdAt,
      reviewedAt: lyricCorrectionRequests.reviewedAt,
      reviewedBy: lyricCorrectionRequests.reviewedBy,
      adminNote: lyricCorrectionRequests.adminNote,
      songTitle: songs.title,
      songSlug: songs.slug,
      artistName: artists.name,
      artistSlug: artists.slug,
      currentLyrics: songs.lyrics,
      reviewerName: users.name,
    })
    .from(lyricCorrectionRequests)
    .innerJoin(songs, eq(lyricCorrectionRequests.songId, songs.id))
    .innerJoin(artists, eq(songs.artistId, artists.id))
    .leftJoin(users, eq(lyricCorrectionRequests.reviewedBy, users.id))
    .$dynamic();

  const items = where
    ? await listQuery
        .where(where)
        .orderBy(desc(lyricCorrectionRequests.createdAt))
        .limit(query.pageSize)
        .offset(offset)
    : await listQuery
        .orderBy(desc(lyricCorrectionRequests.createdAt))
        .limit(query.pageSize)
        .offset(offset);

  return {
    items,
    total: Number(totalRow?.value ?? 0),
  };
}

/**
 * Approve in a single transaction: update song lyrics + mark request APPROVED.
 * Returns null if request is missing or no longer PENDING.
 */
export async function approveCorrectionInTransaction(input: {
  requestId: string;
  adminId: string;
}): Promise<{ songSlug: string; artistSlug: string } | null> {
  return getDb().transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(lyricCorrectionRequests)
      .where(eq(lyricCorrectionRequests.id, input.requestId))
      .limit(1);

    if (!request || request.status !== "PENDING") {
      return null;
    }

    const [song] = await tx
      .select({
        id: songs.id,
        slug: songs.slug,
        artistSlug: artists.slug,
      })
      .from(songs)
      .innerJoin(artists, eq(songs.artistId, artists.id))
      .where(eq(songs.id, request.songId))
      .limit(1);

    if (!song) {
      return null;
    }

    const [updated] = await tx
      .update(lyricCorrectionRequests)
      .set({
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: input.adminId,
      })
      .where(
        and(
          eq(lyricCorrectionRequests.id, input.requestId),
          eq(lyricCorrectionRequests.status, "PENDING"),
        ),
      )
      .returning({ id: lyricCorrectionRequests.id });

    if (!updated) {
      // Concurrent review won — abort so lyrics are not changed.
      throw new Error("CORRECTION_ALREADY_REVIEWED");
    }

    await tx
      .update(songs)
      .set({
        lyrics: request.suggestedLyrics,
        updatedAt: new Date(),
      })
      .where(eq(songs.id, request.songId));

    return { songSlug: song.slug, artistSlug: song.artistSlug };
  });
}

export async function rejectCorrectionInTransaction(input: {
  requestId: string;
  adminId: string;
  adminNote?: string;
}): Promise<boolean> {
  return getDb().transaction(async (tx) => {
    const [updated] = await tx
      .update(lyricCorrectionRequests)
      .set({
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy: input.adminId,
        adminNote: input.adminNote,
      })
      .where(
        and(
          eq(lyricCorrectionRequests.id, input.requestId),
          eq(lyricCorrectionRequests.status, "PENDING"),
        ),
      )
      .returning({ id: lyricCorrectionRequests.id });

    return Boolean(updated);
  });
}

export async function countPendingCorrections(): Promise<number> {
  const [row] = await getDb()
    .select({ value: count() })
    .from(lyricCorrectionRequests)
    .where(eq(lyricCorrectionRequests.status, "PENDING"));
  return Number(row?.value ?? 0);
}
