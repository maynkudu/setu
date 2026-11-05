import { Config, Effect, ManagedRuntime, Redacted, Schema } from "effect";
import { z } from "zod";
import { Database } from "./db";

class NotificationDeliveryFailed extends Schema.TaggedError<NotificationDeliveryFailed>()(
  "NotificationDeliveryFailed",
  { message: Schema.String },
) {}

export class NotificationDelivery extends Effect.Service<NotificationDelivery>()(
  "setu/NotificationDelivery",
  {
    accessors: true,
    dependencies: [Database.Default],
    effect: Effect.gen(function* () {
      const db = yield* Database;
      const config = yield* Config.all({
        apiKey: Config.redacted("RESEND_API_KEY").pipe(Config.option),
        from: Config.string("EMAIL_FROM").pipe(Config.withDefault("")),
        baseURL: Config.string("BETTER_AUTH_URL").pipe(Config.withDefault("")),
        capture: Config.boolean("LOCAL_EMAIL_CAPTURE").pipe(
          Config.withDefault(false),
        ),
        environment: Config.string("NODE_ENV").pipe(
          Config.withDefault("development"),
        ),
      });
      const send = Effect.fn("NotificationDelivery.send")(function* (notice: {
        id: string;
        email: string;
        body: string;
      }) {
        const body = `${notice.body}\n\n${config.baseURL}/workspace`;
        if (config.capture && config.environment !== "production") {
          yield* db.query(
            z.object({ id: z.coerce.string() }),
            "INSERT INTO setu.local_mail(email,subject,body) VALUES ($1,$2,$3) RETURNING id",
            [notice.email, "SETU programme update", body],
          );
          return;
        }
        if (config.apiKey._tag === "None" || !config.from)
          return yield* Effect.fail(
            new NotificationDeliveryFailed({
              message: "Email notifications are not configured.",
            }),
          );
        const apiKey = config.apiKey.value;
        yield* Effect.tryPromise({
          try: async (signal) => {
            const response = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${Redacted.value(apiKey)}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `setu-${notice.id}`,
              },
              body: JSON.stringify({
                from: config.from,
                to: [notice.email],
                subject: "SETU programme update",
                text: body,
              }),
              signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
            });
            if (!response.ok)
              throw new Error("Notification provider rejected delivery");
          },
          catch: () =>
            new NotificationDeliveryFailed({
              message: "Email notification delivery failed.",
            }),
        });
      });
      const flush = Effect.fn("NotificationDelivery.flush")(function* () {
        const localCapture =
          config.capture && config.environment !== "production";
        if (!localCapture && (config.apiKey._tag === "None" || !config.from))
          return { processed: 0, sent: 0, enabled: false };
        const notices = yield* db.query(
          z.object({ id: z.string(), email: z.email(), body: z.string() }),
          `UPDATE setu.notifications SET next_attempt_at=now()+interval '10 minutes',attempts=attempts+1 WHERE id IN (SELECT id FROM setu.notifications WHERE emailed_at IS NULL AND attempts<10 AND next_attempt_at<=now() ORDER BY created_at LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING id,body,(SELECT email FROM setu."user" WHERE id=user_id) AS email`,
        );
        const results = yield* Effect.forEach(
          notices,
          (notice) =>
            send(notice).pipe(
              Effect.flatMap(() =>
                db.query(
                  z.object({ id: z.string() }),
                  "UPDATE setu.notifications SET emailed_at=now() WHERE id=$1 RETURNING id",
                  [notice.id],
                ),
              ),
              Effect.as(true),
              Effect.catchTag("NotificationDeliveryFailed", () =>
                Effect.logWarning(
                  "Notification remains queued for retry.",
                ).pipe(Effect.as(false)),
              ),
            ),
          { concurrency: 3 },
        );
        return {
          processed: notices.length,
          sent: results.filter(Boolean).length,
          enabled: true,
        };
      });
      return { flush };
    }),
  },
) {}

const notificationsRuntime = ManagedRuntime.make(NotificationDelivery.Default);
export function flushNotifications() {
  return notificationsRuntime.runPromise(NotificationDelivery.flush());
}
