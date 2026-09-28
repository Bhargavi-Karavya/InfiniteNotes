import { getSqlClient } from "./index";

export type DatabaseHealth = {
  ok: boolean;
  latencyMs: number;
  message: string;
};

/** Lightweight connectivity check against PostgreSQL. */
export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  const startedAt = Date.now();

  try {
    const rows = await getSqlClient()`select 1::int as ok`;
    if (!rows[0] || rows[0].ok !== 1) {
      throw new Error("Unexpected health check response");
    }

    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
      message: "Database connection healthy",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown database error";
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      message,
    };
  }
}
