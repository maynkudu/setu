import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { createHash, randomInt, randomUUID } from "node:crypto";
import { z } from "zod";
import { serializeSignedCookie } from "better-call";
import { getAuth, identity } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
import { allowedDomains, emailRole } from "../src/lib/domain";
import { resolveEmailRole } from "../src/lib/access";

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (!["127.0.0.1", "localhost"].includes(url.hostname))
  throw new Error("Auth fixtures require an isolated loopback database.");
const suffix = randomUUID();
const adminId = `auth-admin-${suffix}`;
const mentorId = `auth-mentor-${suffix}`;
const mentorEmail = `auth-${suffix}@example.com`;
const pool = getPool();
const auth = getAuth();
async function sessionHeaders() {
  const context = await auth.$context;
  const session = await context.internalAdapter.createSession(mentorId);
  if (!session) throw new Error("Could not create local auth fixture.");
  const cookie = await serializeSignedCookie(
    context.authCookies.sessionToken.name,
    session.token,
    context.secret,
    context.authCookies.sessionToken.attributes,
  );
  return {
    headers: new Headers({ cookie: cookie.split(";")[0] }),
    session,
    cookie,
  };
}
beforeAll(async () => {
  await pool.query(
    "INSERT INTO setu.\"user\"(id,name,email,\"emailVerified\",\"createdAt\",\"updatedAt\",role) VALUES ($1,'Auth admin',$2,true,now(),now(),'admin'),($3,'Auth mentor',$4,true,now(),now(),'mentor')",
    [adminId, `admin-${suffix}@example.com`, mentorId, mentorEmail],
  );
});
afterAll(async () => {
  await pool.query("DELETE FROM setu.access_grants WHERE granted_by=$1", [
    adminId,
  ]);
  await pool.query('DELETE FROM setu."user" WHERE id=ANY($1::text[])', [
    [adminId, mentorId],
  ]);
});
test("mentor admission requires an active IIC grant, including legacy alumni domains", async () => {
  expect(allowedDomains("mentor")).toEqual([]);
  expect(emailRole("mentor@alumni.iitm.ac.in")).toBeNull();
  expect(await resolveEmailRole(mentorEmail)).toBeNull();
  await pool.query(
    "INSERT INTO setu.access_grants(email,role,reason,granted_by) VALUES ($1,'mentor','Local invitation',$2)",
    [mentorEmail, adminId],
  );
  expect(await resolveEmailRole(mentorEmail)).toBe("mentor");
});
test("an IIC mentor invitation can use a student-domain address", async () => {
  const email = `invited-${suffix}@ds.study.iitm.ac.in`;
  expect(await resolveEmailRole(email)).toBe("student");
  await pool.query(
    "INSERT INTO setu.access_grants(email,role,reason,granted_by) VALUES ($1,'mentor','Local alumni invitation',$2)",
    [email, adminId],
  );
  expect(await resolveEmailRole(email)).toBe("mentor");
  await pool.query(
    "UPDATE setu.access_grants SET revoked_at=now() WHERE email=$1",
    [email],
  );
  expect(await resolveEmailRole(email)).toBe("student");
});
test("a week-long session has a persistent cookie and revocation blocks that existing session", async () => {
  const { headers, session, cookie } = await sessionHeaders();
  expect(new Date(session.expiresAt).getTime() - Date.now()).toBeGreaterThan(
    604790000,
  );
  expect(cookie).toMatch(/Max-Age=604800/i);
  expect((await identity(headers)).id).toBe(mentorId);
  await pool.query(
    "UPDATE setu.access_grants SET revoked_at=now() WHERE email=$1",
    [mentorEmail],
  );
  await expect(identity(headers)).rejects.toMatchObject({ status: 403 });
  await pool.query(
    "UPDATE setu.access_grants SET revoked_at=NULL WHERE email=$1",
    [mentorEmail],
  );
});
test("active use renews an older session and sign-out invalidates it", async () => {
  const { headers, session } = await sessionHeaders();
  await pool.query(
    'UPDATE setu."session" SET "updatedAt"=now()-interval \'2 days\',"expiresAt"=now()+interval \'1 day\' WHERE id=$1',
    [session.id],
  );
  const response = await auth.api.getSession({ headers, asResponse: true });
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toMatch(/Max-Age=604800/i);
  const renewed = await pool.query<{ remaining: number }>(
    'SELECT extract(epoch FROM ("expiresAt"-now()))::float8 AS remaining FROM setu."session" WHERE id=$1',
    [session.id],
  );
  expect(renewed.rows[0].remaining).toBeGreaterThan(604790);
  await auth.api.signOut({ headers });
  await expect(identity(headers)).rejects.toMatchObject({ status: 401 });
});
test("expired sessions cannot authenticate", async () => {
  const { headers, session } = await sessionHeaders();
  await pool.query(
    'UPDATE setu."session" SET "expiresAt"=now()-interval \'1 second\' WHERE id=$1',
    [session.id],
  );
  await expect(identity(headers)).rejects.toMatchObject({ status: 401 });
});

const fixtureSubnet = randomInt(1, 254);
let oauthClients = 0;
async function googleFlow() {
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost")
    .origin;
  const response = await auth.handler(
    new Request(`${origin}/api/auth/sign-in/social`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        origin,
        "x-forwarded-for": `127.0.${fixtureSubnet}.${++oauthClients}`,
      },
      body: JSON.stringify({
        provider: "google",
        callbackURL: "/auth/complete?entry=mentor",
        errorCallbackURL: "/entry/mentor",
        disableRedirect: true,
      }),
    }),
  );
  expect(response.status).toBe(200);
  const data = z.object({ url: z.url() }).parse(await response.json());
  const authorization = new URL(data.url);
  const state = authorization.searchParams.get("state");
  if (!state) throw new Error("Google sign-in did not issue state.");
  const cookies = response.headers.getSetCookie();
  expect(
    cookies.some(
      (cookie) =>
        cookie.includes("oauth_state=") &&
        /Max-Age=600/i.test(cookie) &&
        /HttpOnly/i.test(cookie) &&
        /SameSite=Lax/i.test(cookie),
    ),
  ).toBe(true);
  expect(authorization.searchParams.get("redirect_uri")).toBe(
    `${origin}/api/auth/callback/google`,
  );
  return {
    origin,
    authorization,
    state,
    cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
  };
}

async function googleProvider() {
  const context = await auth.$context;
  const provider = context.socialProviders.find((item) => item.id === "google");
  if (provider) return provider;
  throw new Error(
    "Google provider is not configured for local OAuth verification.",
  );
}

test("Google callback consumes encrypted state, carries PKCE and creates a persistent programme session", async () => {
  const provider = await googleProvider();
  const exchange = spyOn(
    provider,
    "validateAuthorizationCode",
  ).mockResolvedValue({ accessToken: "local-provider-token" });
  const profile = spyOn(provider, "getUserInfo").mockResolvedValue({
    user: { name: "Auth mentor", email: mentorEmail, emailVerified: true },
    data: {
      sub: mentorId,
      name: "Auth mentor",
      email: mentorEmail,
      email_verified: true,
    },
  });
  try {
    const flow = await googleFlow();
    const response = await auth.handler(
      new Request(
        `${flow.origin}/api/auth/callback/google?state=${flow.state}&code=local-code`,
        { headers: { cookie: flow.cookie } },
      ),
    );
    expect(response.status).toBe(302);
    expect(
      new URL(response.headers.get("location") ?? "/", flow.origin).pathname,
    ).toBe("/auth/complete");
    expect(exchange).toHaveBeenCalledTimes(1);
    const verifier = exchange.mock.calls[0]?.[0].codeVerifier;
    if (!verifier) throw new Error("The OAuth exchange did not receive PKCE.");
    const challenge = flow.authorization.searchParams.get("code_challenge");
    if (!challenge)
      throw new Error("Google sign-in did not issue a PKCE challenge.");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(
      challenge,
    );
    const cookies = response.headers.getSetCookie();
    expect(
      cookies.some(
        (cookie) =>
          cookie.includes("session_token=") && /Max-Age=604800/i.test(cookie),
      ),
    ).toBe(true);
    expect(
      cookies.some(
        (cookie) =>
          cookie.includes("oauth_state=") && /Max-Age=0/i.test(cookie),
      ),
    ).toBe(true);
    const headers = new Headers({
      cookie: cookies.map((cookie) => cookie.split(";")[0]).join("; "),
    });
    expect((await identity(headers)).id).toBe(mentorId);
  } finally {
    exchange.mockRestore();
    profile.mockRestore();
  }
});

test("a callback with another tab's state cookie is rejected before exchanging its code", async () => {
  const provider = await googleProvider();
  const exchange = spyOn(provider, "validateAuthorizationCode");
  const log = spyOn((await auth.$context).logger, "error").mockImplementation(
    () => {},
  );
  try {
    const first = await googleFlow();
    const second = await googleFlow();
    expect(first.state).not.toBe(second.state);
    const response = await auth.handler(
      new Request(
        `${first.origin}/api/auth/callback/google?state=${first.state}&code=local-code`,
        { headers: { cookie: second.cookie } },
      ),
    );
    expect(response.status).toBe(302);
    expect(
      new URL(
        response.headers.get("location") ?? "/",
        first.origin,
      ).searchParams.get("error"),
    ).toBe("state_mismatch");
    expect(exchange).not.toHaveBeenCalled();
    expect(
      response.headers
        .getSetCookie()
        .some((cookie) => cookie.includes("session_token=")),
    ).toBe(false);
  } finally {
    exchange.mockRestore();
    log.mockRestore();
  }
});

test("a callback without its browser state cookie cannot authenticate", async () => {
  const provider = await googleProvider();
  const exchange = spyOn(provider, "validateAuthorizationCode");
  const log = spyOn((await auth.$context).logger, "error").mockImplementation(
    () => {},
  );
  try {
    const flow = await googleFlow();
    const response = await auth.handler(
      new Request(
        `${flow.origin}/api/auth/callback/google?state=${flow.state}&code=local-code`,
      ),
    );
    expect(response.status).toBe(302);
    expect(
      new URL(
        response.headers.get("location") ?? "/",
        flow.origin,
      ).searchParams.get("error"),
    ).toBe("state_mismatch");
    expect(exchange).not.toHaveBeenCalled();
    expect(
      response.headers
        .getSetCookie()
        .some((cookie) => cookie.includes("session_token=")),
    ).toBe(false);
  } finally {
    exchange.mockRestore();
    log.mockRestore();
  }
});
