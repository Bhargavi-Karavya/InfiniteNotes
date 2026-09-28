import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

type SqlClient = ReturnType<typeof postgres>;
type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  infinitenotesSql?: SqlClient;
  infinitenotesDb?: Database;
};

function createConnection(): { sql: SqlClient; db: Database } {
  if (globalForDb.infinitenotesDb && globalForDb.infinitenotesSql) {
    return {
      sql: globalForDb.infinitenotesSql,
      db: globalForDb.infinitenotesDb,
    };
  }

  const { DATABASE_URL } = getEnv();
  const sql = postgres(DATABASE_URL, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const db = drizzle(sql, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.infinitenotesSql = sql;
    globalForDb.infinitenotesDb = db;
  }

  return { sql, db };
}

/** Shared Drizzle database instance (lazy). */
export function getDb(): Database {
  return createConnection().db;
}

/** Underlying postgres.js client for health checks. */
export function getSqlClient(): SqlClient {
  return createConnection().sql;
}

/**
 * Convenience export for services that import `{ db }`.
 * Prefer `getDb()` in new code when deferring connection is important.
 */
export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
