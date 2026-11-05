import { Effect } from "effect";
import { AppError } from "./domain";
import { getPool } from "./db";
import { operationFailure } from "./failures";

export function sameOrigin(request: Request) {
  const expected = process.env.BETTER_AUTH_URL;
  const origin = request.headers.get("origin");
  if (!expected || origin !== new URL(expected).origin)
    throw new AppError(403, "Request origin is not allowed.");
}
export function noStore(value: unknown) {
  return Response.json(value, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
export async function errorResponse(
  error: unknown,
  userId?: string,
  action = "api",
) {
  const failure = operationFailure(error);
  const { status, message } = await Effect.runPromise(
    Effect.fail(failure).pipe(
      Effect.catchTags({
        ProgrammeRuleRejected: (e) =>
          Effect.succeed({ status: e.status, message: e.message }),
        FormValidationFailed: (e) =>
          Effect.succeed({ status: 400, message: e.message }),
        DatabaseOperationFailed: (e) =>
          e.code === "23505"
            ? Effect.succeed({
                status: 409,
                message:
                  "This record already exists, or a participant is already matched. Refresh and try again.",
              })
            : Effect.logError("Database request failed", {
                action,
                code: e.code,
              }).pipe(
                Effect.as({
                  status: 503,
                  message: "The database is busy. Please try again shortly.",
                }),
              ),
        DatabaseResultInvalid: () =>
          Effect.logError("Stored record validation failed", { action }).pipe(
            Effect.as({
              status: 500,
              message:
                "The request could not be completed. Please contact the programme team.",
            }),
          ),
        ServerOperationFailed: (e) =>
          Effect.logError("Server operation failed", { action }).pipe(
            Effect.as({ status: 500, message: e.message }),
          ),
      }),
    ),
  );
  if (status === 403 && process.env.DATABASE_URL)
    await getPool()
      .query(
        "INSERT INTO setu.access_log(user_id,action,status) VALUES ($1,$2,$3)",
        [userId ?? null, action, status],
      )
      .catch(() => {});
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
