import { Pool, type PoolClient } from "pg";
import { z } from "zod";
import { AppError } from "./domain";
import {
  Cause,
  Config,
  Effect,
  Exit,
  ManagedRuntime,
  Option,
  Redacted,
} from "effect";
import { DatabaseResultInvalid, operationFailure } from "./failures";

const globalDatabase = globalThis as typeof globalThis & { setuPool?: Pool };
export function getPool() {
  if (globalDatabase.setuPool) return globalDatabase.setuPool;
  const configured = Effect.runSync(
    Config.all({
      url: Config.redacted("DATABASE_URL"),
      max: Config.integer("DB_POOL_MAX").pipe(
        Config.withDefault(5),
        Config.validate({
          message: "DB_POOL_MAX must be between 1 and 20",
          validation: (n) => n >= 1 && n <= 20,
        }),
      ),
      timeout: Config.integer("DB_QUERY_TIMEOUT_MS").pipe(
        Config.withDefault(15000),
        Config.validate({
          message: "DB_QUERY_TIMEOUT_MS must be between 1000 and 60000",
          validation: (n) => n >= 1000 && n <= 60000,
        }),
      ),
    }).pipe(Effect.option),
  );
  if (Option.isNone(configured))
    throw new AppError(
      503,
      "SETU is waiting for valid database configuration. Please contact the programme team.",
    );
  const settings = configured.value;
  const pool = new Pool({
    connectionString: Redacted.value(settings.url),
    max: settings.max,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
    statement_timeout: settings.timeout,
    idle_in_transaction_session_timeout: 30000,
    application_name: "setu",
  });
  // An idle client error must not terminate the server process or disclose connection details.
  pool.on("error", () => {
    Effect.runSync(Effect.logError("An idle database connection was closed."));
  });
  return (globalDatabase.setuPool = pool);
}

export class Database extends Effect.Service<Database>()("setu/Database", {
  effect: Effect.gen(function* () {
    const pool = yield* Effect.try({ try: getPool, catch: operationFailure });
    const query = Effect.fn("Database.query")(function* <T extends z.ZodType>(
      schema: T,
      sql: string,
      values: unknown[] = [],
      client: Pool | PoolClient = pool,
    ) {
      const result = yield* Effect.tryPromise({
        try: () => client.query(sql, values),
        catch: operationFailure,
      });
      return yield* Effect.try({
        try: () => z.array(schema).parse(result.rows),
        catch: () =>
          new DatabaseResultInvalid({
            message: "A stored record has an unexpected format.",
          }),
      });
    });
    const transact = Effect.fn("Database.transaction")(function* <T>(
      run: (client: PoolClient) => Promise<T>,
    ) {
      return yield* Effect.acquireUseRelease(
        Effect.tryPromise({
          try: async () => ({ client: await pool.connect(), discard: false }),
          catch: operationFailure,
        }),
        (resource) =>
          Effect.tryPromise({
            try: async () => {
              const { client } = resource;
              await client.query("BEGIN");
              try {
                const value = await run(client);
                await client.query("COMMIT");
                return value;
              } catch (error) {
                // Discard the connection if rollback fails, while preserving the original failure.
                try {
                  await client.query("ROLLBACK");
                } catch {
                  resource.discard = true;
                }
                throw error;
              }
            },
            catch: operationFailure,
          }),
        (resource) =>
          Effect.sync(() => resource.client.release(resource.discard)),
      );
    });
    return { query, transact };
  }),
}) {}

const databaseRuntime = ManagedRuntime.make(Database.Default);

// Promise adapters are only for Next.js, Better Auth and the existing domain functions.
async function execute<A, E>(
  program: Effect.Effect<A, E, Database>,
): Promise<A> {
  const result = await databaseRuntime.runPromiseExit(program);
  if (Exit.isSuccess(result)) return result.value;
  const failure = Cause.failureOption(result.cause);
  if (Option.isSome(failure)) throw failure.value;
  throw operationFailure(undefined);
}
export function rows<T extends z.ZodType>(
  schema: T,
  sql: string,
  values: unknown[] = [],
  client?: Pool | PoolClient,
): Promise<z.infer<T>[]> {
  return execute(
    Effect.flatMap(Database, (db) => db.query(schema, sql, values, client)),
  );
}
export function transaction<T>(run: (client: PoolClient) => Promise<T>) {
  // pg promises cannot be interrupted safely while a transaction is still using its client.
  return execute(
    Effect.flatMap(Database, (db) => db.transact(run)).pipe(
      Effect.uninterruptible,
    ),
  );
}
