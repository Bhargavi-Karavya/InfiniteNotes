import {
  artistExistsForAnalytics,
  countAllEvents,
  countEventsByType,
  findRecentActivity,
  findTopArtistsByViews,
  findTopSearches,
  findTopSongsByViews,
  findViewsOverTime,
  insertAnalyticsEvent,
  publishedSongExists,
} from "@/repositories/analytics";
import { assertAdmin } from "@/services/auth";
import {
  normalizeSearchQuery,
  type AnalyticsRange,
  type TrackEventInput,
} from "@/validations/analytics";

export class AnalyticsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsValidationError";
  }
}

export function rangeToSince(range: AnalyticsRange): Date | null {
  if (range === "all") return null;

  const now = new Date();
  const start = new Date(now);

  if (range === "today") {
    start.setHours(0, 0, 0, 0);
    return start;
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Public tracking entrypoint — anonymous only.
 * Validates known types and that referenced entities exist.
 * Never stores IP, email, passwords, or other PII.
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  if (input.eventType === "SONG_VIEW") {
    if (!(await publishedSongExists(input.entityId))) {
      throw new AnalyticsValidationError("Unknown or unpublished song.");
    }
    await insertAnalyticsEvent({
      eventType: "SONG_VIEW",
      path: input.path.slice(0, 512),
      entityType: "SONG",
      entityId: input.entityId,
    });
    return;
  }

  if (input.eventType === "ARTIST_VIEW") {
    if (!(await artistExistsForAnalytics(input.entityId))) {
      throw new AnalyticsValidationError("Unknown artist.");
    }
    await insertAnalyticsEvent({
      eventType: "ARTIST_VIEW",
      path: input.path.slice(0, 512),
      entityType: "ARTIST",
      entityId: input.entityId,
    });
    return;
  }

  if (input.eventType === "SEARCH") {
    const query = normalizeSearchQuery(input.query);
    if (!query) {
      throw new AnalyticsValidationError("Empty search query.");
    }
    await insertAnalyticsEvent({
      eventType: "SEARCH",
      path: input.path.slice(0, 512),
      entityType: "SEARCH",
      metadata: { query },
    });
    return;
  }

  await insertAnalyticsEvent({
    eventType: "PAGE_VIEW",
    path: input.path.slice(0, 512),
    entityType: "PAGE",
  });
}

export async function getAnalyticsOverview(range: AnalyticsRange) {
  await assertAdmin();
  const since = rangeToSince(range);

  const [totalEvents, songViews, artistViews, searches, pageViews] =
    await Promise.all([
      countAllEvents(since),
      countEventsByType("SONG_VIEW", since),
      countEventsByType("ARTIST_VIEW", since),
      countEventsByType("SEARCH", since),
      countEventsByType("PAGE_VIEW", since),
    ]);

  return {
    range,
    totalEvents,
    totalViews: pageViews + songViews + artistViews,
    songViews,
    artistViews,
    searches,
    pageViews,
  };
}

export async function getTopSongs(range: AnalyticsRange, limit = 10) {
  await assertAdmin();
  return findTopSongsByViews(rangeToSince(range), limit);
}

export async function getTopArtists(range: AnalyticsRange, limit = 10) {
  await assertAdmin();
  return findTopArtistsByViews(rangeToSince(range), limit);
}

export async function getTopSearches(range: AnalyticsRange, limit = 10) {
  await assertAdmin();
  return findTopSearches(rangeToSince(range), limit);
}

export async function getViewsOverTime(range: AnalyticsRange) {
  await assertAdmin();
  return findViewsOverTime(rangeToSince(range));
}

export async function getRecentActivity(range: AnalyticsRange, limit = 20) {
  await assertAdmin();
  return findRecentActivity(rangeToSince(range), limit);
}

export async function getAnalyticsDashboard(range: AnalyticsRange) {
  await assertAdmin();
  const since = rangeToSince(range);

  const [
    totalEvents,
    songViews,
    artistViews,
    searches,
    pageViews,
    topSongs,
    topArtists,
    topSearches,
    viewsOverTime,
    recent,
  ] = await Promise.all([
    countAllEvents(since),
    countEventsByType("SONG_VIEW", since),
    countEventsByType("ARTIST_VIEW", since),
    countEventsByType("SEARCH", since),
    countEventsByType("PAGE_VIEW", since),
    findTopSongsByViews(since, 10),
    findTopArtistsByViews(since, 10),
    findTopSearches(since, 10),
    findViewsOverTime(since),
    findRecentActivity(since, 15),
  ]);

  return {
    overview: {
      range,
      totalEvents,
      totalViews: pageViews + songViews + artistViews,
      songViews,
      artistViews,
      searches,
      pageViews,
    },
    topSongs,
    topArtists,
    topSearches,
    viewsOverTime,
    recent,
  };
}

