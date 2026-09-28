import { jsonError, jsonOk } from "@/lib/api";
import { getEnv } from "@/lib/env";
import { checkDatabaseHealth } from "@/db/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function databaseHostHint(): string | undefined {
  try {
    const url = new URL(getEnv().DATABASE_URL);
    return `${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "")}`;
  } catch {
    return undefined;
  }
}

export async function GET() {
  try {
    const health = await checkDatabaseHealth();

    if (!health.ok) {
      return jsonError(health.message, 503, {
        latencyMs: health.latencyMs,
        database: databaseHostHint(),
      });
    }

    return jsonOk({
      status: "ok",
      database: health,
      target: databaseHostHint(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Health check failed";
    return jsonError(message, 503, { database: databaseHostHint() });
  }
}
