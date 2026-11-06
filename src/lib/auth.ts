import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { PostgresDialect } from "kysely";
import { getPool } from "./db";
import { AppError } from "./domain";
import { resolveEmailRole } from "./access";
import { authOrigin } from "./auth-origin";

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
    baseURL: authOrigin(),
    secret: process.env.BETTER_AUTH_SECRET,
    account: { storeStateStrategy: "cookie" },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: false },
    },
    user: {
      validateUserInfo: async ({ user }) => {
        if (
          !user.emailVerified ||
          typeof user.email !== "string" ||
          !(await resolveEmailRole(user.email))
        )
          return {
            error: "programme_access_required",
            errorDescription:
              "Use a verified Google account with programme access.",
          };
      },
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
                message: "Use a verified Google account with programme access.",
              });
            return { data: { ...user, role } };
          },
        },
      },
    },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30 },
  });
}
const globalAuth = globalThis as typeof globalThis & {
  setuAuth?: ReturnType<typeof makeAuth>;
};
export function getAuth() {
  return (globalAuth.setuAuth ??= makeAuth());
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
      "Your account no longer has programme access. Contact IIC to check your access.",
    );
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  };
}
