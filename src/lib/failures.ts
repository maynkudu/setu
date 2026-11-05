import { Schema } from "effect";
import { z } from "zod";
import { AppError } from "./domain";

export class ProgrammeRuleRejected extends Schema.TaggedError<ProgrammeRuleRejected>()(
  "ProgrammeRuleRejected",
  {
    status: Schema.Number,
    message: Schema.String,
  },
) {}
export class FormValidationFailed extends Schema.TaggedError<FormValidationFailed>()(
  "FormValidationFailed",
  {
    message: Schema.String,
  },
) {}
export class DatabaseOperationFailed extends Schema.TaggedError<DatabaseOperationFailed>()(
  "DatabaseOperationFailed",
  {
    code: Schema.String,
    message: Schema.String,
  },
) {}
export class DatabaseResultInvalid extends Schema.TaggedError<DatabaseResultInvalid>()(
  "DatabaseResultInvalid",
  {
    message: Schema.String,
  },
) {}
export class ServerOperationFailed extends Schema.TaggedError<ServerOperationFailed>()(
  "ServerOperationFailed",
  {
    message: Schema.String,
  },
) {}

// Library errors become safe, typed failures at the integration boundary.
export function operationFailure(error: unknown) {
  if (
    error instanceof ProgrammeRuleRejected ||
    error instanceof FormValidationFailed ||
    error instanceof DatabaseOperationFailed ||
    error instanceof DatabaseResultInvalid ||
    error instanceof ServerOperationFailed
  )
    return error;
  if (error instanceof AppError)
    return new ProgrammeRuleRejected({
      status: error.status,
      message: error.message,
    });
  if (error instanceof z.ZodError)
    return new FormValidationFailed({
      message: error.issues[0]?.message ?? "Check the form fields.",
    });
  if (
    error instanceof Error &&
    "code" in error &&
    typeof error.code === "string"
  )
    return new DatabaseOperationFailed({
      code: error.code,
      message: "A database operation failed.",
    });
  if (error instanceof SyntaxError)
    return new FormValidationFailed({
      message: "The request body is invalid.",
    });
  return new ServerOperationFailed({
    message: "The request could not be completed. Please try again.",
  });
}
