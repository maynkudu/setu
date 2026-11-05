import { writeFile, mkdir } from "node:fs/promises";
import { serializeSignedCookie } from "better-call";
import { getAuth } from "../src/lib/auth";
import { getPool } from "../src/lib/db";
import { currentProfile } from "../src/lib/workspace";
const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (
  !["127.0.0.1", "localhost"].includes(url.hostname) ||
  process.env.NODE_ENV === "production"
)
  throw new Error(
    "QA accounts can only be created in a loopback test database.",
  );
const people = [
  {
    id: "qa-student",
    role: "student",
    name: "Rohan Sharma",
    email: "qa-student@ds.study.iitm.ac.in",
  },
  {
    id: "qa-mentor",
    role: "mentor",
    name: "Aditi Rao",
    email: "qa-mentor@alumni.iitm.ac.in",
  },
  {
    id: "qa-admin",
    role: "admin",
    name: "IIC Test Administrator",
    email: "setu-test-admin@iitm.ac.in",
  },
];
await mkdir(".plannotator/setu-app/fixtures", { recursive: true });
const context = await getAuth().$context;
for (const p of people) {
  await getPool().query(
    'INSERT INTO setu."user"(id,name,email,"emailVerified","createdAt","updatedAt",role) VALUES ($1,$2,$3,true,now(),now(),$4) ON CONFLICT (id) DO NOTHING',
    [p.id, p.name, p.email, p.role],
  );
  await currentProfile(p);
  const session = await context.internalAdapter.createSession(p.id);
  if (!session) throw new Error("Could not create QA session");
  const cookie = await serializeSignedCookie(
    context.authCookies.sessionToken.name,
    session.token,
    context.secret,
    context.authCookies.sessionToken.attributes,
  );
  const pair = cookie.split(";")[0];
  const index = pair.indexOf("=");
  const state = {
    cookies: [
      {
        name: pair.slice(0, index),
        value: pair.slice(index + 1),
        domain: "setu.localhost",
        path: "/",
        expires: -1,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
    ],
    origins: [],
  };
  await writeFile(
    `.plannotator/setu-app/fixtures/${p.role}.json`,
    JSON.stringify(state),
  );
}
console.log(
  "Local QA accounts and signed session fixtures are ready. No authentication bypass route exists.",
);
await getPool().end();
