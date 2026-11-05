import EmbeddedPostgres from "embedded-postgres";
import { access } from "node:fs/promises";
const database = new EmbeddedPostgres({
  databaseDir: ".data/postgres",
  port: 54329,
  user: "postgres",
  password: "setu-local-only",
  persistent: true,
  autoRehydrateSymlinks: true,
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: () => {},
});
try {
  await access(".data/postgres/PG_VERSION");
} catch {
  await database.initialise();
}
await database.start();
const client = database.getPgClient();
await client.connect();
const existing = await client.query(
  "SELECT 1 FROM pg_database WHERE datname='setu'",
);
await client.end();
if (!existing.rowCount) await database.createDatabase("setu");
console.log(
  "Local SETU PostgreSQL is ready. Run db:migrate in another terminal. Ctrl+C stops it and preserves data.",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await database.stop();
    process.exit(0);
  });
await new Promise(() => {});
