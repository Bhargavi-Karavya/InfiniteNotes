import { config } from "dotenv";
import { execFileSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { artists, songs } from "../src/db/schema";
import { getArtistBySlug, getFeaturedArtists } from "../src/services/artists";
import {
  getArtistSongs,
  getPublishedSongBySlug,
  getPublishedSongs,
} from "../src/services/songs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function httpStatus(url: string): number {
  const out = execFileSync(
    "curl",
    ["-s", "-o", "/dev/null", "-w", "%{http_code}", url],
    { encoding: "utf8" },
  );
  return Number(out);
}

function httpBody(url: string): string {
  return execFileSync("curl", ["-s", url], { encoding: "utf8" });
}

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const stamp = Date.now();

  const [artist] = await getDb()
    .insert(artists)
    .values({
      name: "Public Test Artist",
      slug: `public-test-artist-${stamp}`,
      biography: "A test biography\nwith a second line.",
    })
    .returning();

  const lyrics = "Verse 1\n\nLine one\nLine two\n\nChorus\n\nLine three";

  const [published] = await getDb()
    .insert(songs)
    .values({
      title: "Public Test Song",
      slug: `public-test-song-${stamp}`,
      artistId: artist.id,
      lyrics,
      isPublished: true,
    })
    .returning();

  const [unpublished] = await getDb()
    .insert(songs)
    .values({
      title: "Secret Draft",
      slug: `secret-draft-${stamp}`,
      artistId: artist.id,
      lyrics: "hidden",
      isPublished: false,
    })
    .returning();

  console.log("=== Data helpers ===");
  const bySlug = await getPublishedSongBySlug(published.slug);
  assert(bySlug?.id === published.id, "published by slug");
  assert(bySlug?.lyrics === lyrics, "lyrics intact from helper");
  assert(
    (await getPublishedSongBySlug(unpublished.slug)) === null,
    "unpublished hidden",
  );

  const list = await getPublishedSongs({ q: "Public Test Song" });
  assert(list.items.some((s) => s.id === published.id), "in published list");
  assert(
    !list.items.some((s) => s.id === unpublished.id),
    "draft not in list",
  );

  const artistSongs = await getArtistSongs(artist.id);
  assert(
    artistSongs.items.every((s) => s.isPublished),
    "artist songs published only",
  );
  assert(
    !artistSongs.items.some((s) => s.id === unpublished.id),
    "draft not on artist",
  );

  const featured = await getFeaturedArtists(20);
  assert(
    featured.some((a) => a.id === artist.id),
    "artist featured when published songs exist",
  );
  assert((await getArtistBySlug("no-such-artist-xyz")) === null, "missing artist");
  console.log("✓ Helpers enforce published visibility");

  console.log("\n=== HTTP routes ===");
  assert(httpStatus(`${base}/`) === 200, "home 200");
  assert(httpStatus(`${base}/songs/${published.slug}`) === 200, "song 200");
  assert(httpStatus(`${base}/songs/${unpublished.slug}`) === 404, "draft 404");
  assert(httpStatus(`${base}/songs/does-not-exist-${stamp}`) === 404, "missing song 404");
  assert(httpStatus(`${base}/artists/${artist.slug}`) === 200, "artist 200");
  assert(httpStatus(`${base}/artists/missing-${stamp}`) === 404, "missing artist 404");

  const songHtml = httpBody(`${base}/songs/${published.slug}`);
  assert(songHtml.includes("Public Test Song"), "song title in html");
  assert(songHtml.includes("Public Test Artist"), "artist name in html");
  assert(songHtml.includes(`/artists/${artist.slug}`), "artist link");
  assert(songHtml.includes("Line one"), "lyrics content");
  assert(
    songHtml.includes("lyrics-panel") ||
      songHtml.includes("white-space:pre-wrap") ||
      songHtml.includes("whitespace-pre-wrap") ||
      songHtml.includes("pre-wrap"),
    "lyrics whitespace class present",
  );

  const homeHtml = httpBody(`${base}/`);
  assert(homeHtml.includes(published.slug) || homeHtml.includes("Public Test Song"), "published on home");
  assert(!homeHtml.includes(unpublished.slug), "unpublished slug not on home");

  const metaHtml = httpBody(`${base}/songs/${published.slug}`);
  assert(
    metaHtml.includes("Public Test Song Lyrics - Public Test Artist"),
    "SEO title pattern",
  );
  assert(
    metaHtml.includes('rel="canonical"') || metaHtml.includes("rel=canonical"),
    "song canonical present",
  );
  assert(
    metaHtml.includes("application/ld+json"),
    "song JSON-LD present",
  );
  assert(
    metaHtml.includes("MusicRecording"),
    "MusicRecording schema present",
  );

  const searchHtml = httpBody(`${base}/search?q=Public`);
  assert(
    searchHtml.includes("noindex") || searchHtml.includes("robots"),
    "search robots metadata present",
  );

  const robotsTxt = httpBody(`${base}/robots.txt`);
  assert(robotsTxt.includes("Disallow: /admin"), "robots disallow admin");
  assert(robotsTxt.includes("Disallow: /api"), "robots disallow api");
  assert(robotsTxt.includes("Disallow: /search"), "robots disallow search");
  assert(robotsTxt.includes("Sitemap:"), "robots sitemap pointer");

  const sitemapXml = httpBody(`${base}/sitemap.xml`);
  assert(sitemapXml.includes(`/songs/${published.slug}`), "published in sitemap");
  assert(!sitemapXml.includes(unpublished.slug), "unpublished not in sitemap");
  assert(sitemapXml.includes(`/artists/${artist.slug}`), "artist in sitemap");
  assert(!sitemapXml.includes("/search"), "search not in sitemap");
  assert(!sitemapXml.includes("/admin"), "admin not in sitemap");

  console.log("✓ Public routes, 404s, SEO, sitemap, robots, lyrics rendering");

  await getDb().delete(songs).where(eq(songs.artistId, artist.id));
  await getDb().delete(artists).where(eq(artists.id, artist.id));
  console.log("\nAll public website tests passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end({ timeout: 5 });
  });
