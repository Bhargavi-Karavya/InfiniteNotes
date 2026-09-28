import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { getDb, getSqlClient } from "../src/db";
import { artists, songs, users } from "../src/db/schema";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { authenticateUser, AuthError } from "../src/services/auth";
import { loginSchema } from "../src/validations/auth";

config({ path: ".env" });
config({ path: ".env.local", override: true });

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function testDatabaseConstraints() {
  console.log("\n=== Database constraints ===");

  const [artist] = await getDb()
    .insert(artists)
    .values({
      name: "Test Artist",
      slug: `test-artist-${Date.now()}`,
      biography: "Bio",
    })
    .returning();

  assert(artist, "artist inserted");

  const [song] = await getDb()
    .insert(songs)
    .values({
      title: "Test Song",
      slug: `test-song-${Date.now()}`,
      artistId: artist.id,
      lyrics: "la la la",
      isPublished: true,
    })
    .returning();

  assert(song?.artistId === artist.id, "song linked to artist");
  console.log("✓ Artist → Song FK works");

  let slugConflict = false;
  try {
    await getDb().insert(artists).values({
      name: "Another",
      slug: artist.slug,
    });
  } catch {
    slugConflict = true;
  }
  assert(slugConflict, "duplicate artist slug rejected");
  console.log("✓ Unique artist slug enforced");

  let songSlugConflict = false;
  try {
    await getDb().insert(songs).values({
      title: "Dup",
      slug: song.slug,
      artistId: artist.id,
    });
  } catch {
    songSlugConflict = true;
  }
  assert(songSlugConflict, "duplicate song slug rejected");
  console.log("✓ Unique song slug enforced");

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  assert(adminEmail, "ADMIN_EMAIL set");

  let emailConflict = false;
  try {
    await getDb().insert(users).values({
      name: "Dup",
      email: adminEmail,
      passwordHash: await hashPassword("AnotherPass123!"),
      role: "USER",
    });
  } catch {
    emailConflict = true;
  }
  assert(emailConflict, "duplicate email rejected");
  console.log("✓ Unique email enforced");

  // cleanup songs/artists created here
  await getDb().delete(songs).where(eq(songs.id, song.id));
  await getDb().delete(artists).where(eq(artists.id, artist.id));
}

async function testAuthentication() {
  console.log("\n=== Authentication ===");

  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  const admin = await authenticateUser({ email, password });
  assert(admin.role === "ADMIN", "admin authenticates");
  assert(!("passwordHash" in admin), "session user has no passwordHash");
  console.log("✓ Admin can log in");

  let wrongPassword = false;
  try {
    await authenticateUser({ email, password: "definitely-wrong-password" });
  } catch (error) {
    wrongPassword = error instanceof AuthError;
  }
  assert(wrongPassword, "wrong password fails");
  console.log("✓ Wrong password fails");

  let unknownEmail = false;
  try {
    await authenticateUser({
      email: "nobody@example.com",
      password: "whatever123",
    });
  } catch (error) {
    unknownEmail =
      error instanceof AuthError &&
      error.message === "Invalid email or password";
  }
  assert(unknownEmail, "unknown email fails generically");
  console.log("✓ Unknown email fails with generic error");

  const emptyEmail = loginSchema.safeParse({ email: "", password: "x" });
  assert(!emptyEmail.success, "empty email fails validation");
  console.log("✓ Empty email fails validation");

  const invalidEmail = loginSchema.safeParse({
    email: "not-an-email",
    password: "x",
  });
  assert(!invalidEmail.success, "invalid email fails validation");
  console.log("✓ Invalid email fails validation");

  const emptyPassword = loginSchema.safeParse({
    email: "a@b.com",
    password: "",
  });
  assert(!emptyPassword.success, "empty password fails validation");
  console.log("✓ Empty password fails validation");

  // Create a normal USER and ensure authenticate works but role is USER
  const userEmail = `user-${Date.now()}@example.com`;
  const userPassword = "UserPass123!";
  const [createdUser] = await getDb()
    .insert(users)
    .values({
      name: "Normal User",
      email: userEmail,
      passwordHash: await hashPassword(userPassword),
      role: "USER",
    })
    .returning();

  assert(createdUser, "user created");
  const hashedOk = await verifyPassword(userPassword, createdUser.passwordHash);
  assert(hashedOk, "user password hashed");

  const sessionUser = await authenticateUser({
    email: userEmail,
    password: userPassword,
  });
  assert(sessionUser.role === "USER", "normal user authenticates as USER");
  console.log("✓ Normal USER account can authenticate (role USER)");

  await getDb().delete(users).where(eq(users.id, createdUser.id));
}

async function main() {
  try {
    await testDatabaseConstraints();
    await testAuthentication();
    console.log("\nAll scripted tests passed.");
  } finally {
    await getSqlClient().end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
