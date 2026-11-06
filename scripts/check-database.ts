import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";

// Read-only checks. Never print the connection string or raw provider errors.
const pool = getPool();
function failureCode(error: unknown) {
  return error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z0-9_]+$/.test(error.code)
    ? error.code
    : "unknown";
}
try {
  await pool.query("SELECT 1");
  console.log(JSON.stringify({ connection: "passed" }));
  const result = await pool.query<{ name: string; present: boolean }>(
    "SELECT name,to_regclass('setu.' || quote_ident(name)) IS NOT NULL AS present FROM unnest($1::text[]) AS name",
    [
      [
        "user",
        "session",
        "account",
        "verification",
        "rateLimit",
        "profiles",
        "requests",
        "mentorships",
        "access_grants",
      ],
    ],
  );
  const missing = result.rows
    .filter((row) => !row.present)
    .map((row) => row.name);
  console.log(
    JSON.stringify({
      requiredTables: missing.length ? "failed" : "passed",
      missing,
    }),
  );
  const context = await getAuth().$context;
  await context.checkSchema?.();
  console.log(
    JSON.stringify({
      authSchema: "passed",
      sessionDays: context.sessionConfig.expiresIn / 86400,
    }),
  );
  if (missing.length) process.exitCode = 1;
} catch (error) {
  console.error(
    JSON.stringify({
      databaseCheck: "failed",
      code: failureCode(error),
      next: "Check database availability, TLS and pooler limits. If required tables are missing, use db:migrate with a session/direct connection.",
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
