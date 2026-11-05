import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getMigrations } from "better-auth/db/migration";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";

if (process.env.MIGRATION_DATABASE_URL)
  process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const pool = getPool();
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock(73638812)");
  await client.query("CREATE SCHEMA IF NOT EXISTS setu");
  await (await getMigrations(getAuth().options)).runMigrations();
  await client.query("BEGIN");
  await client.query("SET LOCAL search_path TO setu");
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const directory = new URL("../database/", import.meta.url);
  const files = (await readdir(directory))
    .filter((name) => /^\d{3}[-\w]+\.sql$/.test(name))
    .sort();
  for (const name of files) {
    const sql = await readFile(new URL(name, directory), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const applied = await client.query<{ checksum: string }>(
      "SELECT checksum FROM schema_migrations WHERE name=$1",
      [name],
    );
    if (applied.rowCount) {
      if (applied.rows[0].checksum !== checksum)
        throw new Error(
          `Applied migration ${name} changed. Add a new migration instead.`,
        );
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(name,checksum) VALUES ($1,$2)",
      [name, checksum],
    );
  }
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.LOCAL_EMAIL_CAPTURE === "true"
  ) {
    await client.query(
      "CREATE TABLE IF NOT EXISTS local_mail (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email text NOT NULL, subject text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())",
    );
  }
  const tables = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname='setu'",
  );
  for (const { tablename } of tables.rows) {
    if (!/^[a-zA-Z_]+$/.test(tablename))
      throw new Error("Unexpected table name");
    await client.query(
      `ALTER TABLE setu."${tablename}" ENABLE ROW LEVEL SECURITY`,
    );
  }
  for (const role of ["anon", "authenticated"]) {
    const exists = await client.query(
      "SELECT 1 FROM pg_roles WHERE rolname=$1",
      [role],
    );
    if (exists.rowCount) {
      await client.query(`REVOKE ALL ON SCHEMA setu FROM ${role}`);
      await client.query(
        `REVOKE ALL ON ALL TABLES IN SCHEMA setu FROM ${role}`,
      );
    }
  }
  await client.query("COMMIT");
  console.log("SETU database and Better Auth schema are ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock(73638812)");
  client.release();
  await pool.end();
}
