# Backend

Next.js route handlers provide SETU's backend. Better Auth owns Google identity and persistent sessions. Application services enforce programme permissions and use hosted Supabase PostgreSQL through `pg`. Effect manages database services, typed failures, configuration, resource cleanup, and notification concurrency.

## Authentication and authorization

[auth.ts](../src/lib/auth.ts) creates and reuses one Better Auth instance per process, including development module reloads. It uses a Kysely PostgreSQL dialect configured for the private `setu` schema. The Google provider requires a verified email and asks the user to select an account. There are no password, email-link, or other social providers.

[auth-origin.ts](../src/lib/auth-origin.ts) validates `BETTER_AUTH_URL` and supplies its HTTP(S) origin. Entry redirects to that origin before initiating Google OAuth, then consumes a one-time `?start=google` marker. `account.storeStateStrategy: "cookie"` stores encrypted OAuth state in a ten-minute HttpOnly, SameSite=Lax cookie. Better Auth validates state, expiry and PKCE before token exchange. Missing or mismatched state cannot create a session. Error callbacks retain their specific codes. Configuration changes require a new server process because the auth instance is cached across development reloads.

The `user.validateUserInfo` hook checks fresh provider identity at creation, linking and OAuth sign-in, following the [BLANK provisioning gate](https://ui.aryank.space/backend/better-auth-provisioning-gate) mechanism. The creation hook assigns a server-controlled role with `input: false`. [domain.ts](../src/lib/domain.ts) checks explicit administrator emails and exact student domains. [access.ts](../src/lib/access.ts) checks active database grants for other accounts. Mentors require active IIC grants; no alumni email-domain admission exists.

Sessions expire after 604800 seconds and refresh during use after 86400 seconds. Cookies persist across browser closure. Cookie caching remains disabled. `identity()` revalidates the session, verified email and current role on every protected request, so revoked mentor grants block existing sessions. Grants never change an existing account's role or create administrators. Login pages preserve a current session; explicit account switching signs out before starting Google selection.

[workspace.ts](../src/lib/workspace.ts) creates the application profile on first access. Admin profiles start approved. Student and mentor profiles start draft. All actions except profile editing and resubmission require approved programme eligibility. Pair membership checks protect private content independently of role.

Better Auth uses database-backed rate limiting with a 60-second window and maximum 30 requests. This configuration applies to authentication endpoints. Application mutations do not currently have a separate general rate limiter.

## API contracts

| Endpoint              | Method    | Contract                                                                                                       |
| --------------------- | --------- | -------------------------------------------------------------------------------------------------------------- |
| `/api/auth/[...all]`  | GET, POST | Better Auth handlers, including Google callback and sign-out.                                                  |
| `/api/workspace`      | GET       | Private, no-store `Workspace` snapshot.                                                                        |
| `/api/workspace`      | POST      | A JSON action from `actionSchema`; returns `{ saved: true }`. Also accepts the legacy multipart document path. |
| `/api/uploads`        | POST      | Multipart upload metadata plus one file chunk; returns `{ complete: boolean }`.                                |
| `/api/documents/[id]` | GET       | Authenticated attachment stream, 64 KiB chunks.                                                                |
| `/api/sessions/[id]`  | GET       | Authenticated `.ics` calendar download.                                                                        |
| `/api/cron`           | GET       | Bearer-secret maintenance and notification flush.                                                              |

JSON actions are validated with a discriminated Zod union. They include profile submission, resubmission, availability, requests, reviews, assignments, sessions, messages, document removal, ending, feedback, check-ins, follow-up resolution, notification reads, and account grants and revocations. See [domain.ts](../src/lib/domain.ts) for field limits and exact enums.

Browser mutations must have an `Origin` matching `BETTER_AUTH_URL`. The routes authenticate before acting and return private, no-store responses. Files use attachment disposition and `X-Content-Type-Options: nosniff`. Calendar text escapes user-controlled delimiters and newlines.

## Database service and Effect boundaries

[db.ts](../src/lib/db.ts) exports the `Database` Effect service. `Database.Default` owns the shared pool. A global process reference reuses the pool across module reloads. TCP keepalive and a five-minute connection lifetime reduce stale long-lived connections; idle failures log a sanitized error code. Effect `Config` validates connection limits and statement timeout; `Config.redacted` keeps credentials out of ordinary configuration output.

`query()` executes parameterized SQL and validates the result with a Zod row schema. `transact()` acquires a client, begins a transaction, commits on success, rolls back on failure, and releases the client in a finalizer. A failed rollback discards the connection. The Promise adapter marks transactions uninterruptible because an interrupted `pg` Promise could still use the client after release.

Next.js, Better Auth, and existing domain functions consume Promise adapters. Effect programs consume the service directly. [failures.ts](../src/lib/failures.ts) converts library exceptions to tagged errors at the boundary. [http.ts](../src/lib/http.ts) maps those errors with `Effect.catchTags` to safe HTTP messages.

| Failure                                         | Response                                      |
| ----------------------------------------------- | --------------------------------------------- |
| Invalid form or request JSON                    | 400 with a field or body message.             |
| Missing session                                 | 401.                                          |
| Programme permission failure                    | 403, with a security-log entry when possible. |
| Missing owned record                            | 404.                                          |
| Programme conflict or unique violation          | 409.                                          |
| Database availability failure                   | 503 with a retry message.                     |
| Invalid stored result or unknown server failure | 500 with a safe message.                      |

Logs record action names and database codes rather than connection strings or private message bodies.

## Transactions and programme rules

Actions lock the caller's profile before mutation. Assignment also locks the request and participant profiles in stable order. Partial unique indexes enforce one open request and one active mentorship for each participant.

Session mutations and document writes lock the mentorship. Session counts are read after acquiring that lock, so concurrent submissions cannot exceed the ten-session limit. Document counts and upload completion use the same lock. Ending a mentorship closes the request, cancels future sessions, and writes programme notifications in one transaction.

The database has no institution identity API. IIC records manual degree-level and alumni review decisions. Candidate ranking is client-side ordering over the eligible loaded profiles; the server validates the final assignment independently.

## Uploads and privacy

[uploads.ts](../src/lib/uploads.ts) accepts at most five 1 MiB parts and at most three incomplete uploads per user. It validates metadata, expected part length, ownership, and mentorship access. Repeated parts replace their own bytes. A repeated completed upload returns success for the same uploader and mentorship.

Completion assembles the bytes, validates the extension and file signature, writes one `documents` record, and removes temporary parts in the same transaction. Accepted formats are PDF, DOCX, PPTX, JPEG, and PNG. DOCX and PPTX validation checks the ZIP prefix, not the full archive structure. There is no antivirus or malware-scanning integration.

Only the pair can download a document. Both roles can read shared content for 30 days after ending. Administrators cannot read private messages, documents, or detailed sessions. Feedback is visible to its author and IIC, not the partner.

## Notification delivery

[notifications.ts](../src/lib/notifications.ts) defines `NotificationDelivery`, dependent on `Database.Default`. Domain mutations write notifications inside their own transactions. Next.js `after()` flushes them after responding, so provider latency does not delay the saved result.

A flush atomically leases up to 20 rows with `FOR UPDATE SKIP LOCKED`. Three deliveries run concurrently. Each request has a ten-second timeout and a stable provider idempotency key derived from its notice ID. Failed deliveries become eligible again after ten minutes, up to ten attempts. Completed rows receive `emailed_at`.

Without `RESEND_API_KEY` or a sender, delivery is disabled and attempts are not consumed. Notices remain available in-app. `LOCAL_EMAIL_CAPTURE=true` creates a development inbox during migration and captures delivery there in development. Production ignores that option.

## Maintenance and deployment

The [cron route](../src/app/api/cron/route.ts) requires `CRON_SECRET` and allows up to 60 seconds of execution. [vercel.json](../vercel.json) schedules it daily at 03:00 UTC. Maintenance serializes overlapping runs with a transaction advisory lock.

Maintenance marks elapsed sessions held, ends mentorships after ten held sessions and a 48-hour grace period, queues reminders for sessions within 24 hours, expires unanswered check-ins after 14 days, deletes shared content after 30 days, deletes abandoned uploads after one hour, and removes 90-day security logs. It then flushes email notifications.

A scheduled session becoming held is an elapsed-time rule, not proof of attendance. Participants can mark it missed within the permitted window. The daily scheduler means status and physical deletion can lag until its next successful run. Read authorization enforces the 30-day shared-content deadline without waiting for cleanup.

Run migrations separately from builds using a session-pooler or direct connection. See the [README](../README.md) for setup and the [database reference](DATABASE.md) for migration checksums. Place Vercel functions near Supabase and monitor connection pressure, cron errors, and undelivered notifications.

The [CI workflow](../.github/workflows/ci.yml) verifies against an isolated PostgreSQL 17 service. It applies migrations twice to check repeatability, runs the focused programme integration suite, and checks formatting, lint, build, and types. It requires no hosted database or OAuth credentials.

The personal-administrator assertion sets an explicit fixture email and restores the previous environment value afterward. Production administrator configuration is not a test prerequisite.

[auth.test.ts](../tests/auth.test.ts) runs sign-in initiation and callback requests against real cookie generation, state validation, database adapters and session creation. Google exchange and profile responses are mocked. It compares the generated PKCE challenge with the exchange verifier, rejects missing and mismatched browser state before exchange, and verifies persistent cookies. The complete Google provider round trip remains unverified.

## Database diagnostics

`bun --env-file=.env.local run db:check` runs read-only connectivity, table-presence and Better Auth schema checks. Migrations reject transaction-pooler port 6543; their session advisory lock requires a direct/session URL through `MIGRATION_DATABASE_URL`. Runtime parameterized queries use fully qualified schema names and do not require session search paths.

The intermittent generic Better Auth schema-validation error did not reproduce against the hosted database. Schema checks remain enabled. Reusing the auth instance avoids repeated adapter initialization on development reloads, but does not prove the original intermittent connection failure is resolved. Check TLS, database availability and aggregate pool budgets when it recurs.

A separate session-pooler connection reported `EMAXCONNSESSION` with a 15-client limit before any SQL ran. This is observed connection pressure, not an auth-table mismatch. The migration runner rejects mixed loopback-runtime/hosted-migration configuration. Clear `MIGRATION_DATABASE_URL` in local fixture environments.
