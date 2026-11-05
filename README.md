# SETU

SETU connects degree-level IIT Madras BS students with alumni mentors. IIC reviews eligibility, assigns mentors, and follows up on programme outcomes. The app includes a public introduction and separate student, mentor, and administrator workspaces.

The public introduction uses an interactive Anatomy desk figure, Rune icons, Lenis scrolling, and a bridge-mark preloader. Public policy pages and association information share a footer. The role workspaces keep navigation and programme controls separate from that public layout.

Accounts and programme data live in hosted Supabase PostgreSQL. Google sign-in runs through Better Auth. SETU does not use Supabase Auth, browser database access, or sample accounts in production.

## Set up the app

Use Bun 1.3.14 and Node.js 22 or later. Node.js 24 or later is required for the optional portless local proxy.

```sh
git clone https://github.com/maynkudu/setu.git
cd setu
bun install --frozen-lockfile
cp .env.example .env.local
```

Fill in `.env.local` using your own credentials. Keep it outside version control. The required values are `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`.

### Connect hosted Supabase

1. Create a Supabase project.
2. Open **Connect**, select **Session pooler**, and copy the PostgreSQL URI.
3. Set `DATABASE_URL` to that URI. URL-encode special characters in the database password. Keep TLS enabled.
4. Use a session pooler or a direct connection for migrations. If the runtime connection differs, set `MIGRATION_DATABASE_URL` separately.
5. Run the migration before starting the app.

```sh
bun --env-file=.env.local run db:migrate
```

The runner creates the private `setu` schema, Better Auth tables, and application tables. It records SQL migration checksums, enables RLS, and revokes Supabase `anon` and `authenticated` access. Run it again safely after adding a new migration. Never edit an applied SQL file.

Keep `setu` outside Supabase's exposed Data API schemas. The server connection must have permission to use the private schema and access its tables. The initial setup uses the Supabase database owner connection. No Supabase publishable key or service-role key is needed.

### Configure Google sign-in

1. Configure an OAuth consent screen in Google Cloud.
2. Create an OAuth client with application type **Web application**.
3. Add your app origin as an authorized JavaScript origin.
4. Add `<APP_ORIGIN>/api/auth/callback/google` as an authorized redirect URI.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` separately.
6. Set `BETTER_AUTH_URL` to the same app origin.
7. Generate a stable signing secret with `openssl rand -base64 48` and set `BETTER_AUTH_SECRET`.

For the named local proxy used during development, the origin is `https://setu.localhost:1355`. Its callback is `https://setu.localhost:1355/api/auth/callback/google`. If Google rejects your local origin, use an accepted development origin and set `BETTER_AUTH_URL` to it. Do not change the production callback to a local address.

If your consent screen is in testing mode, add the accounts you intend to test in Google Cloud. Google consent-screen access and SETU eligibility are separate checks.

### Set account access

The default student domains are `ds.study.iitm.ac.in` and `es.study.iitm.ac.in`. The default mentor domain is `alumni.iitm.ac.in`. Update the comma-separated domain environment variables when the institution confirms the final list. Matches are exact. A subdomain or a similar suffix does not qualify.

`ADMIN_EMAILS` is a comma-separated list of explicit Google accounts. It currently lists `maynkudu@gmail.com`. Set this before the administrator's first sign-in. An existing account's role is not automatically migrated when configuration changes.

An administrator can grant external test accounts student or mentor access through **Test access**. Grants never create administrators and never skip IIC eligibility review. Revoking an external grant blocks its next authenticated request. Domain and administrator rules take precedence over test grants.

Students start with an eligibility notice and a profile form. IIC must verify degree-level status against college records before approving them. Mentors also need approval. No college portal integration currently performs this check automatically.

### Start locally

```sh
bun run dev
```

Next.js reads `.env.local`. For a named local URL, use an installed portless proxy.

```sh
portless setu ./node_modules/.bin/next dev
```

Use the URL portless reports as `BETTER_AUTH_URL`. The current workstation uses `https://setu.localhost:1355` because its proxy runs without binding port 443. Production uses your Vercel or custom-domain origin.

## Host on Vercel

1. Import this repository and select the Next.js framework preset.
2. Keep the repository root as the project root. `vercel.json` uses `bun install --frozen-lockfile` and `bun run build`.
3. Add the required environment variables to the production environment. Add `ADMIN_EMAILS`, `PROGRAMME_CONTACT_EMAIL`, and `CRON_SECRET` as well.
4. Set `BETTER_AUTH_URL` to your final production origin. Keep the signing secret stable across deployments.
5. Add the production Google callback `<APP_ORIGIN>/api/auth/callback/google` and the corresponding origin in Google Cloud.
6. Run `db:migrate` from a trusted environment against the hosted database before serving authenticated traffic. Migrations do not run during `next build`.
7. Deploy, sign in with the configured administrator account, and approve test profiles through the app.

Use a region near the Supabase database and keep `DB_POOL_MAX` within the pooler budget. Every active Next.js instance can own its own pool. A default of five connections is a starting configuration, not a tested capacity guarantee.

Preview deployments require their own matching auth origin and registered Google callback. Use a separate database for previews that may change schema or create test data.

### Configure maintenance and optional email

`vercel.json` schedules `/api/cron` daily at 03:00 UTC. Vercel sends `CRON_SECRET` as a bearer token. Without that value, the endpoint returns 401. Scheduled jobs run on production deployments.

Maintenance marks elapsed sessions held, concludes completed mentorships, creates upcoming-session reminders, expires check-ins, and removes shared content and abandoned uploads. The daily schedule is suitable for the initial release. Timing can lag until the next run. For more timely reminders or higher email volume, use a compatible plan or an authenticated external scheduler at a shorter interval.

In-app notifications work without an email provider. To send programme emails, configure `RESEND_API_KEY` and `EMAIL_FROM` with a verified sending domain. Each flush claims up to 20 notifications, sends three concurrently, and retries failed notices up to ten times. Mutation handlers also flush after responding. Actual provider delivery requires configuration and a live delivery check.

## Environment reference

| Variable                  | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL`            | Server-only hosted PostgreSQL URI.                                  |
| `MIGRATION_DATABASE_URL`  | Optional session-pooler or direct migration URI.                    |
| `BETTER_AUTH_SECRET`      | Stable signing secret, at least 32 characters.                      |
| `BETTER_AUTH_URL`         | Exact application origin, including any local proxy port.           |
| `GOOGLE_CLIENT_ID`        | Google web OAuth client ID.                                         |
| `GOOGLE_CLIENT_SECRET`    | Matching Google OAuth client secret.                                |
| `STUDENT_EMAIL_DOMAINS`   | Comma-separated exact student domains.                              |
| `MENTOR_EMAIL_DOMAINS`    | Comma-separated exact alumni domains.                               |
| `ADMIN_EMAILS`            | Explicit administrator Google emails.                               |
| `PROGRAMME_CONTACT_EMAIL` | Public support and privacy contact, currently `maynkudu@gmail.com`. |
| `DB_POOL_MAX`             | Per-instance pool size, 1 to 20, default 5.                         |
| `DB_QUERY_TIMEOUT_MS`     | Statement timeout, 1000 to 60000 ms, default 15000.                 |
| `CRON_SECRET`             | Secret required by the maintenance endpoint.                        |
| `RESEND_API_KEY`          | Optional server-only Resend token.                                  |
| `EMAIL_FROM`              | Verified sender for optional notification emails.                   |
| `LOCAL_EMAIL_CAPTURE`     | Development-only database email inbox. Ignored in production.       |

No credential belongs in a `NEXT_PUBLIC_` variable.

## Verify changes

```sh
bun run format:check
bun run lint
bun run build
bun run typecheck
```

Integration tests refuse to run against a remote database. To run them in isolation, start the optional embedded PostgreSQL helper in another terminal.

```sh
bun run db:local
```

Use a separate ignored environment file, such as `.env.test.local`, with these fixture-only settings.

```dotenv
DATABASE_URL=postgresql://postgres:setu-local-only@127.0.0.1:54329/setu
BETTER_AUTH_SECRET=setu-local-test-signing-secret-at-least-32-characters
BETTER_AUTH_URL=https://setu.localhost:1355
ADMIN_EMAILS=setu-test-admin@iitm.ac.in
LOCAL_EMAIL_CAPTURE=true
```

```sh
bun --env-file=.env.test.local run db:migrate
bun --env-file=.env.test.local test --timeout 20000 tests
```

For browser verification with local accounts, `bun --env-file=.env.test.local scripts/qa-fixtures.ts` writes signed fixture states under ignored `.plannotator/setu-app/fixtures/`. It refuses remote databases and production mode. It creates no public authentication bypass. These fixtures are for isolated development only.

The [GitHub Actions workflow](.github/workflows/ci.yml) runs formatting, lint, migrations twice, the database workflow tests, build, and typecheck against an isolated PostgreSQL service. The latest local workflow suite has 12 passing tests and 59 assertions. It covers permissions, concurrent assignment, scheduling, private content, chunked uploads, feedback, and retention. Build, lint, typecheck, formatting, and Effect diagnostics pass locally.

The personal-admin assertion supplies and restores its own test email configuration. The suite does not require the project owner's email to be an administrator in CI or another developer's environment.

The supplied hosted Supabase connection was migrated and checked. All 21 SETU tables have RLS enabled, with no `anon` or `authenticated` schema/table access. No sample accounts were added to that database. Google sign-in initiation succeeds with the supplied client. Browser checks also cover approval, assignment, sessions, messages, ending, feedback, document form submission, mobile navigation, and figure keyboard controls. The download handler returned matching file bytes.

Vercel deployment, the complete Google callback round trip, real email delivery, and the deployed cron schedule remain unverified. Register the production origin and callback, set Vercel environment values, and verify those integrations after hosting.

## Project documentation

| Document                                   | Read it for                                                     |
| ------------------------------------------ | --------------------------------------------------------------- |
| [Features](docs/FEATURES.md)               | Product capabilities, permissions, and implementation status.   |
| [Walkthrough](docs/WALKTHROUGH.md)         | Student, mentor, and IIC flows with source paths.               |
| [Frontend](docs/FRONTEND.md)               | Components, visual tokens, accessibility, and animation.        |
| [Backend](docs/BACKEND.md)                 | Authentication, API contracts, Effect services, and operations. |
| [Database](docs/DATABASE.md)               | Tables, constraints, indexes, and migration ownership.          |
| [System](docs/SYSTEM.md)                   | Boundaries, data flows, concurrency, and scaling limits.        |
| [Third-party notices](docs/THIRD_PARTY.md) | Rune, Anatomy, and font attribution.                            |

Update this README and the relevant documents when behavior changes. [AGENTS.md](AGENTS.md) records this project rule.

SETU is a student project. The association page describes the intended IITM and IIC context without claiming institutional endorsement. Public policy pages describe the current app behavior. Institutional policy approval, final domain names, and official support contacts remain programme-owner decisions.
