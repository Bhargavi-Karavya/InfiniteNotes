import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users, type NewUser, type User } from "@/db/schema";

export async function findUserByEmail(email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);

  return user ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user ?? null;
}

export async function createUser(data: NewUser): Promise<User> {
  const [user] = await getDb().insert(users).values(data).returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/** Public-safe user shape — never includes passwordHash. */
export function toPublicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
