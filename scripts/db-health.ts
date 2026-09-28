import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

async function main() {
  const { checkDatabaseHealth } = await import("../src/db/health");
  const { getSqlClient } = await import("../src/db");

  try {
    const result = await checkDatabaseHealth();

    if (result.ok) {
      console.log(`✓ ${result.message} (${result.latencyMs}ms)`);
      process.exitCode = 0;
    } else {
      console.error(`✗ Database health check failed: ${result.message}`);
      process.exitCode = 1;
    }
  } finally {
    await getSqlClient().end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
