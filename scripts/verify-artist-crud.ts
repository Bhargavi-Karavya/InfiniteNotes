import { config } from "dotenv";
import { execSync } from "node:child_process";
import { eq } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { artists, songs, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { createArtistSchema } from "../src/validations/artists";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function curl(args: string): string {
  return execSync(`curl -s ${args}`, { encoding: "utf8" });
}

async function main() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const adminEmail = process.env.ADMIN_EMAIL!;
  const adminPassword = process.env.ADMIN_PASSWORD!;
  const jar = "/tmp/in-artists-admin.jar";
  const userJar = "/tmp/in-artists-user.jar";

  const userEmail = "artist-test-user@example.com";
  const userPassword = "UserPass123!";
  await getDb().delete(users).where(eq(users.email, userEmail));
  await getDb().insert(users).values({
    name: "Artist Tester",
    email: userEmail,
    passwordHash: await hashPassword(userPassword),
    role: "USER",
  });

  console.log("=== Validation ===");
  assert(
    !createArtistSchema.safeParse({ name: "", slug: "ok-slug" }).success,
    "empty name",
  );
  console.log("✓ Empty name fails validation");
  assert(
    !createArtistSchema.safeParse({ name: "Test", slug: "Bad Slug!" }).success,
    "invalid slug",
  );
  console.log("✓ Invalid slug fails validation");

  console.log("\n=== Auth ===");
  execSync(
    `curl -s -c ${jar} -X POST ${base}/api/auth/login -H 'Content-Type: application/json' -d '${JSON.stringify({ email: adminEmail, password: adminPassword })}'`,
  );
  const userLogin = JSON.parse(
    execSync(
      `curl -s -c ${userJar} -X POST ${base}/api/auth/login -H 'Content-Type: application/json' -d '${JSON.stringify({ email: userEmail, password: userPassword })}'`,
      { encoding: "utf8" },
    ),
  );
  // USER should not get an admin session cookie from admin login endpoint
  assert(userLogin.ok === false, "user admin login blocked");
  console.log("✓ USER cannot obtain admin session via login API");

  console.log("\n=== Unauthorized mutations ===");
  const unauth = JSON.parse(
    curl(
      `-X POST ${base}/api/artists -H 'Content-Type: application/json' -d '{"name":"X","slug":"x-${Date.now()}"}'`,
    ),
  );
  assert(unauth.ok === false, "unauth create");
  console.log("✓ Unauthenticated create rejected");

  // USER with no session cookie for admin APIs
  const userCreate = JSON.parse(
    curl(
      `-b ${userJar} -X POST ${base}/api/artists -H 'Content-Type: application/json' -d '{"name":"X","slug":"x-user-${Date.now()}"}'`,
    ),
  );
  assert(userCreate.ok === false, "user create");
  console.log("✓ USER create rejected");

  console.log("\n=== Create / duplicate ===");
  const slug = `arijit-singh-${Date.now()}`;
  const created = JSON.parse(
    curl(
      `-b ${jar} -X POST ${base}/api/artists -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Arijit Singh",
        slug,
        biography: "Playback singer",
      })}'`,
    ),
  );
  assert(created.ok === true, JSON.stringify(created));
  const artistId = created.data.artist.id as string;
  console.log("✓ Create valid artist");

  const dup = JSON.parse(
    curl(
      `-b ${jar} -X POST ${base}/api/artists -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Other",
        slug,
      })}'`,
    ),
  );
  assert(dup.ok === false, "duplicate slug");
  console.log("✓ Duplicate slug rejected");

  console.log("\n=== List / search ===");
  const listed = JSON.parse(curl(`-b ${jar} '${base}/api/artists?q=arijit'`));
  assert(listed.ok && listed.data.items.length >= 1, "search");
  assert(
    typeof listed.data.items[0].songCount === "number",
    "songCount present",
  );
  console.log("✓ Artist list + search + songCount");

  console.log("\n=== Update ===");
  const updated = JSON.parse(
    curl(
      `-b ${jar} -X PATCH ${base}/api/artists/${artistId} -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Arijit Singh Updated",
        slug,
        biography: "Updated bio",
      })}'`,
    ),
  );
  assert(updated.ok === true, "update");
  console.log("✓ Update artist");

  const otherSlug = `other-artist-${Date.now()}`;
  const other = JSON.parse(
    curl(
      `-b ${jar} -X POST ${base}/api/artists -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Other Artist",
        slug: otherSlug,
      })}'`,
    ),
  );
  const otherId = other.data.artist.id as string;

  const dupUpdate = JSON.parse(
    curl(
      `-b ${jar} -X PATCH ${base}/api/artists/${artistId} -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Arijit",
        slug: otherSlug,
      })}'`,
    ),
  );
  assert(dupUpdate.ok === false, "update duplicate slug");
  console.log("✓ Update duplicate slug rejected");

  const missing = JSON.parse(
    curl(
      `-b ${jar} -X PATCH ${base}/api/artists/00000000-0000-4000-8000-000000000000 -H 'Content-Type: application/json' -d '${JSON.stringify({
        name: "Nope",
        slug: "nope-artist",
      })}'`,
    ),
  );
  assert(missing.ok === false, "missing artist");
  console.log("✓ Non-existent artist update fails");

  console.log("\n=== Delete rules ===");
  await getDb().insert(songs).values({
    title: "Test Song",
    slug: `test-song-${Date.now()}`,
    artistId,
    lyrics: "la",
  });

  const blocked = JSON.parse(
    curl(`-b ${jar} -X DELETE ${base}/api/artists/${artistId}`),
  );
  assert(
    blocked.ok === false &&
      String(blocked.error).includes("songs are associated"),
    "blocked delete",
  );
  assert(
    (await getDb().select().from(artists).where(eq(artists.id, artistId)))
      .length === 1,
    "artist remains",
  );
  assert(
    (
      await getDb().select().from(songs).where(eq(songs.artistId, artistId))
    ).length === 1,
    "song remains",
  );
  console.log("✓ Delete with songs prevented; songs preserved");

  await getDb().delete(songs).where(eq(songs.artistId, artistId));
  const deleted = JSON.parse(
    curl(`-b ${jar} -X DELETE ${base}/api/artists/${artistId}`),
  );
  assert(deleted.ok === true, "delete");
  console.log("✓ Delete artist with no songs");

  await getDb().delete(artists).where(eq(artists.id, otherId));
  await getDb().delete(users).where(eq(users.email, userEmail));

  console.log("\nAll artist CRUD tests passed.");
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getSqlClient().end({ timeout: 5 });
  });
