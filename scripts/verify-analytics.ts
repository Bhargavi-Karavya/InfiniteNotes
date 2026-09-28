import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { eq, sql } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { analyticsEvents, artists, songs } from "../src/db/schema";
import { trackEvent } from "../src/services/analytics";
import { normalizeSearchQuery } from "../src/validations/analytics";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stamp = Date.now();

  const [artist] = await getDb()
    .insert(artists)
    .values({
      name: "Analytics Artist",
      slug: `analytics-artist-${stamp}`,
    })
    .returning();

  const [published] = await getDb()
    .insert(songs)
    .values({
      title: "Analytics Song",
      slug: `analytics-song-${stamp}`,
      artistId: artist.id,
      lyrics: "Line",
      isPublished: true,
    })
    .returning();

  const [draft] = await getDb()
    .insert(songs)
    .values({
      title: "Draft Song",
      slug: `analytics-draft-${stamp}`,
      artistId: artist.id,
      lyrics: "x",
      isPublished: false,
    })
    .returning();

  console.log("=== trackEvent service ===");
  await trackEvent({
    eventType: "SONG_VIEW",
    path: `/songs/${published.slug}`,
    entityId: published.id,
  });
  await trackEvent({
    eventType: "ARTIST_VIEW",
    path: `/artists/${artist.slug}`,
    entityId: artist.id,
  });
  await trackEvent({
    eventType: "SEARCH",
    path: "/search",
    query: "Arijit",
  });
  await trackEvent({
    eventType: "SEARCH",
    path: "/search",
    query: "ARIJIT",
  });

  let rejected = false;
  try {
    await trackEvent({
      eventType: "SONG_VIEW",
      path: `/songs/${draft.slug}`,
      entityId: draft.id,
    });
  } catch {
    rejected = true;
  }
  assert(rejected, "unpublished song view rejected");

  const [searchAgg] = await getDb()
    .select({
      query: sql<string>`lower(trim(${analyticsEvents.metadata}->>'query'))`,
      n: sql<number>`count(*)::int`,
    })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventType, "SEARCH"))
    .groupBy(sql`lower(trim(${analyticsEvents.metadata}->>'query'))`)
    .having(sql`lower(trim(${analyticsEvents.metadata}->>'query')) = ${normalizeSearchQuery("Arijit")}`);

  assert(searchAgg && Number(searchAgg.n) >= 2, "search terms normalized");

  console.log("✓ Service tracking + normalization");

  console.log("\n=== HTTP security ===");
  let analyticsCode = 0;
  try {
    analyticsCode = Number(
      execFileSync(
        "curl",
        [
          "-s",
          "-o",
          "/dev/null",
          "-w",
          "%{http_code}",
          "--max-redirs",
          "0",
          `${base}/admin/analytics`,
        ],
        { encoding: "utf8" },
      ),
    );
  } catch (error) {
    // curl exits non-zero when redirects are refused; stdout still has status.
    const err = error as { stdout?: string };
    analyticsCode = Number(err.stdout ?? 0);
  }
  assert(
    analyticsCode === 307 || analyticsCode === 302 || analyticsCode === 401,
    `unauthenticated analytics blocked (got ${analyticsCode})`,
  );

  const trackRes = execFileSync(
    "curl",
    [
      "-s",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({
        eventType: "SONG_VIEW",
        path: `/songs/${published.slug}`,
        entityId: published.id,
      }),
      `${base}/api/analytics/track`,
    ],
    { encoding: "utf8" },
  );
  assert(trackRes === "202", `track API 202 (got ${trackRes})`);

  const badTrack = execFileSync(
    "curl",
    [
      "-s",
      "-o",
      "/dev/null",
      "-w",
      "%{http_code}",
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({ eventType: "HACK", path: "/" }),
      `${base}/api/analytics/track`,
    ],
    { encoding: "utf8" },
  );
  assert(badTrack === "400", "invalid event rejected");

  console.log("✓ HTTP track + auth gate");

  await getDb().delete(analyticsEvents).where(eq(analyticsEvents.entityId, published.id));
  await getDb().delete(analyticsEvents).where(eq(analyticsEvents.entityId, artist.id));
  await getDb()
    .delete(analyticsEvents)
    .where(eq(analyticsEvents.eventType, "SEARCH"));
  await getDb().delete(songs).where(eq(songs.artistId, artist.id));
  await getDb().delete(artists).where(eq(artists.id, artist.id));

  console.log("\nAll analytics tests passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end({ timeout: 5 });
  });
