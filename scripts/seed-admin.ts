import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, getSqlClient } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const seedEnvSchema = z.object({
  ADMIN_NAME: z.string().min(1, "ADMIN_NAME is required"),
  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD: z
    .string()
    .min(8, "ADMIN_PASSWORD must be at least 8 characters"),
});

async function seedAdmin() {
  const parsed = seedEnvSchema.safeParse({
    ADMIN_NAME: process.env.ADMIN_NAME,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid seed environment variables:\n${details}`);
  }

  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = parsed.data;
  const email = ADMIN_EMAIL.trim().toLowerCase();

  const [existing] = await getDb()
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.log(
      `Admin seed skipped: user already exists for ${email} (${existing.role}).`,
    );
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);

  await getDb().insert(users).values({
    name: ADMIN_NAME.trim(),
    email,
    passwordHash,
    role: "ADMIN",
  });

  console.log(`Admin user created: ${email}`);
}

async function main() {
  try {
    await seedAdmin();
  } finally {
    await getSqlClient().end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
