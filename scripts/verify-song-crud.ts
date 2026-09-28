import { config } from "dotenv";
import { execFileSync, execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { artists, songs } from "../src/db/schema";
import {
  createSessionToken,
} from "../src/lib/auth/session";
import { SESSION_COOKIE_NAME } from "../src/lib/auth/constants";
import { hashPassword } from "../src/lib/auth/password";
import { users } from "../src/db/schema";
import {
  getArtistSongs,
  getPublishedSongBySlug,
  getPublishedSongs,
} from "../src/services/songs";
import { createSongSchema } from "../src/validations/songs";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function curlJson(args: string[]): unknown {
  const out = execFileSync("curl", ["-s", ...args], { encoding: "utf8" });
  return JSON.parse(out);
}

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  const jar = "/tmp/in-songs-admin.jar";

  // Ensure artist exists
  const artistSlug = `song-test-artist-${Date.now()}`;
  const [artist] = await getDb()
    .insert(artists)
    .values({ name: "Song Test Artist", slug: artistSlug })
    .returning();

  console.log("=== Validation ===");
  assert(
    !createSongSchema.safeParse({
      title: "",
      slug: "ok",
      artistId: artist.id,
    }).success,
    "missing title",
  );
  console.log("✓ Missing title fails");

  assert(
    !createSongSchema.safeParse({
      title: "Song",
      slug: "ok",
      artistId: "not-a-uuid",
    }).success,
    "invalid artist",
  );
  console.log("✓ Invalid artist ID fails");

  assert(
    !createSongSchema.safeParse({
      title: "Song",
      slug: "ok",
      artistId: artist.id,
      isPublished: true,
      lyrics: "",
    }).success,
    "published without lyrics",
  );
  console.log("✓ Published song without lyrics fails");

  assert(
    createSongSchema.safeParse({
      title: "Draft",
      slug: "draft-ok",
      artistId: artist.id,
      isPublished: false,
      lyrics: "",
    }).success,
    "draft without lyrics",
  );
  console.log("✓ Draft without lyrics allowed");

  const multiline = "Verse 1\n\nLine one\nLine two\n\nChorus\n\nLine three";
  const parsedLyrics = createSongSchema.safeParse({
    title: "Lyrics Song",
    slug: "lyrics-song",
    artistId: artist.id,
    isPublished: true,
    lyrics: multiline,
  });
  assert(parsedLyrics.success, "multiline lyrics parse");
  if (parsedLyrics.success) {
    assert(parsedLyrics.data.lyrics === multiline, "line breaks preserved in zod");
  }
  console.log("✓ Multiline lyrics preserved in validation");

  console.log("\n=== Auth ===");
  execSync(
    `curl -s -c ${jar} -X POST ${base}/api/auth/login -H 'Content-Type: application/json' -d '${JSON.stringify({ email: adminEmail, password: adminPassword })}'`,
  );

  const unauth = curlJson([
    "-X",
    "POST",
    `${base}/api/songs`,
    "-H",
    "Content-Type: application/json",
    "-d",
    JSON.stringify({
      title: "Nope",
      slug: `nope-${Date.now()}`,
      artistId: artist.id,
    }),
  ]) as { ok: boolean };
  assert(!unauth.ok, "unauth create");
  console.log("✓ Unauthenticated create rejected");

  // USER session
  const userEmail = `song-user-${Date.now()}@example.com`;
  const [user] = await getDb()
    .insert(users)
    .values({
      name: "Song User",
      email: userEmail,
      passwordHash: await hashPassword("UserPass123!"),
      role: "USER",
    })
    .returning();
  const userToken = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: "USER",
  });
  const userJar = "/tmp/in-songs-user.jar";
  writeFileSync(
    userJar,
    `# Netscape HTTP Cookie File\nlocalhost\tFALSE\t/\tFALSE\t0\t${SESSION_COOKIE_NAME}\t${userToken}\n`,
  );
  writeFileSync(
    "/tmp/song-unauth-body.json",
    JSON.stringify({
      title: "Nope",
      slug: `nope-user-${Date.now()}`,
      artistId: artist.id,
    }),
  );
  const userCreate = curlJson([
    "-b",
    userJar,
    "-X",
    "POST",
    `${base}/api/songs`,
    "-H",
    "Content-Type: application/json",
    "--data-binary",
    "@/tmp/song-unauth-body.json",
  ]) as { ok: boolean };
  assert(!userCreate.ok, "user create");
  console.log("✓ USER create rejected");

  console.log("\n=== Create ===");
  const slug = `tum-hi-ho-${Date.now()}`;
  writeFileSync(
    "/tmp/song-create.json",
    JSON.stringify({
      title: "Tum Hi Ho",
      slug,
      artistId: artist.id,
      lyrics: multiline,
      isPublished: false,
    }),
  );
  const created = curlJson([
    "-b",
    jar,
    "-X",
    "POST",
    `${base}/api/songs`,
    "-H",
    "Content-Type: application/json",
    "--data-binary",
    "@/tmp/song-create.json",
  ]) as { ok: boolean; data?: { song: { id: string; lyrics: string | null } } };
  assert(created.ok === true, JSON.stringify(created));
  assert(created.data?.song.lyrics === multiline, "lyrics stored intact");
  const songId = created.data!.song.id;
  console.log("✓ Create valid draft song with intact lyrics");

  const badArtist = curlJson([
    "-b",
    jar,
    "-X",
    "POST",
    `${base}/api/songs`,
    "-H",
    "Content-Type: application/json",
    "-d",
    JSON.stringify({
      title: "X",
      slug: `x-${Date.now()}`,
      artistId: "00000000-0000-4000-8000-000000000000",
      isPublished: false,
    }),
  ]) as { ok: boolean };
  assert(!badArtist.ok, "invalid artist id");
  console.log("✓ Invalid/missing artist rejected");

  const dup = curlJson([
    "-b",
    jar,
    "-X",
    "POST",
    `${base}/api/songs`,
    "-H",
    "Content-Type: application/json",
    "-d",
    JSON.stringify({
      title: "Other",
      slug,
      artistId: artist.id,
      isPublished: false,
    }),
  ]) as { ok: boolean };
  assert(!dup.ok, "duplicate slug");
  console.log("✓ Duplicate slug rejected");

  console.log("\n=== Update / publish ===");
  writeFileSync(
    "/tmp/song-update.json",
    JSON.stringify({
      title: "Tum Hi Ho (Edit)",
      slug,
      artistId: artist.id,
      lyrics: `${multiline}\n\nBridge\n\nNew line`,
      isPublished: true,
    }),
  );
  const updated = curlJson([
    "-b",
    jar,
    "-X",
    "PATCH",
    `${base}/api/songs/${songId}`,
    "-H",
    "Content-Type: application/json",
    "--data-binary",
    "@/tmp/song-update.json",
  ]) as {
    ok: boolean;
    data?: { song: { title: string; isPublished: boolean; lyrics: string | null } };
  };
  assert(updated.ok === true, JSON.stringify(updated));
  assert(updated.data?.song.title.includes("Edit"), "title updated");
  assert(updated.data?.song.isPublished === true, "published");
  assert(
    updated.data?.song.lyrics?.includes("\n\nBridge\n\n"),
    "empty lines preserved",
  );
  console.log("✓ Edit title, lyrics, publish");

  console.log("\n=== List / search ===");
  const listed = curlJson([
    "-b",
    jar,
    `${base}/api/songs?q=Tum&published=published`,
  ]) as { ok: boolean; data: { items: Array<{ id: string }> } };
  assert(listed.ok && listed.data.items.some((s) => s.id === songId), "search");
  console.log("✓ Search + published filter");

  console.log("\n=== Public visibility helpers ===");
  const pub = await getPublishedSongBySlug(slug);
  assert(pub?.id === songId, "published by slug");
  const pubList = await getPublishedSongs({ q: "Tum" });
  assert(pubList.items.some((s) => s.id === songId), "published list");
  const artistSongs = await getArtistSongs(artist.id);
  assert(artistSongs.items.some((s) => s.id === songId), "artist songs");

  // unpublish and ensure public helpers hide it
  writeFileSync(
    "/tmp/song-unpublish.json",
    JSON.stringify({
      title: "Tum Hi Ho (Edit)",
      slug,
      artistId: artist.id,
      lyrics: multiline,
      isPublished: false,
    }),
  );
  curlJson([
    "-b",
    jar,
    "-X",
    "PATCH",
    `${base}/api/songs/${songId}`,
    "-H",
    "Content-Type: application/json",
    "--data-binary",
    "@/tmp/song-unpublish.json",
  ]);
  assert((await getPublishedSongBySlug(slug)) === null, "unpublished hidden");
  console.log("✓ Public helpers only return published songs");

  console.log("\n=== Delete ===");
  const deleted = curlJson([
    "-b",
    jar,
    "-X",
    "DELETE",
    `${base}/api/songs/${songId}`,
  ]) as { ok: boolean };
  assert(deleted.ok === true, "delete");
  const artistStill = await getDb()
    .select()
    .from(artists)
    .where(eq(artists.id, artist.id));
  assert(artistStill.length === 1, "artist remains");
  console.log("✓ Delete song; artist remains");

  const missing = curlJson([
    "-b",
    jar,
    "-X",
    "DELETE",
    `${base}/api/songs/00000000-0000-4000-8000-000000000000`,
  ]) as { ok: boolean };
  assert(!missing.ok, "delete missing");
  console.log("✓ Delete non-existent song fails");

  // cleanup
  await getDb().delete(songs).where(eq(songs.artistId, artist.id));
  await getDb().delete(artists).where(eq(artists.id, artist.id));
  await getDb().delete(users).where(eq(users.email, userEmail));

  console.log("\nAll song CRUD tests passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end({ timeout: 5 });
  });
