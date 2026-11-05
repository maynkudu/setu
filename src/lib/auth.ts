import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { PostgresDialect } from "kysely";
import { getPool } from "./db";
import { AppError } from "./domain";
import { resolveEmailRole } from "./access";

function makeAuth() {
  if (
    !process.env.BETTER_AUTH_SECRET ||
    process.env.BETTER_AUTH_SECRET.length < 32
  )
    throw new AppError(
      503,
      "Authentication is not configured. Please contact the programme team.",
    );
  return betterAuth({
    database: {
      dialect: new PostgresDialect({ pool: getPool() }),
      type: "postgres",
      schemaName: "setu",
      transaction: true,
    },
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "mentor", input: false },
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        prompt: "select_account",
        requireEmailVerification: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const role = await resolveEmailRole(user.email);
            if (!role || !user.emailVerified)
              throw new APIError("FORBIDDEN", {
                message: "Use an eligible, verified IITM Google account.",
              });
            return { data: { ...user, role } };
          },
        },
      },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  });
}
let auth: ReturnType<typeof makeAuth> | undefined;
export function getAuth() {
  return (auth ??= makeAuth());
}
export async function identity(headers: Headers) {
  const session = await getAuth().api.getSession({ headers });
  if (!session) throw new AppError(401, "Sign in to continue.");
  if (
    !session.user.emailVerified ||
    (await resolveEmailRole(session.user.email)) !== session.user.role
  )
    throw new AppError(
      403,
      "Use your eligible IITM Google account or an account approved for testing. Contact the programme team if access has changed.",
    );
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
