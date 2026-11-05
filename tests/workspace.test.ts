import { beforeAll, afterAll, describe, test, expect } from "bun:test";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getPool, rows } from "../src/lib/db";
import { actionSchema, emailRole } from "../src/lib/domain";
import {
  currentProfile,
  performAction,
  getWorkspace,
  downloadDocument,
  storeDocument,
  maintenance,
} from "../src/lib/workspace";
import { uploadChunk } from "../src/lib/uploads";
import { resolveEmailRole } from "../src/lib/access";

const connection = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
if (!["127.0.0.1", "localhost"].includes(connection.hostname))
  throw new Error(
    "Integration fixtures require an isolated loopback PostgreSQL database. Never run them against Supabase.",
  );
const suffix = randomUUID().slice(0, 8);
const person = (kind: "student" | "mentor" | "admin", n: number) => ({
  id: `test-${suffix}-${kind}-${n}`,
  email: `test-${suffix}-${n}@${kind === "student" ? "ds.study.iitm.ac.in" : kind === "mentor" ? "alumni.iitm.ac.in" : "iitm.ac.in"}`,
  name: `Test ${kind} ${n}`,
});
const student = person("student", 1),
  otherStudent = person("student", 2),
  mentor = person("mentor", 1),
  otherMentor = person("mentor", 2),
  admin = person("admin", 1),
  pending = person("student", 3);
const people = [student, otherStudent, mentor, otherMentor, admin, pending];
const profile = (name: string) => ({
  name,
  rollNumber: `BS-${suffix}-${name}`,
  bio: "A complete verification profile.",
  interests: ["Software engineering"],
  skills: "TypeScript",
  path: "Software engineering",
  phone: "",
  social: "",
  graduationYear: name.includes("mentor") ? 2025 : null,
  organization: "Test organization",
  experience: 2,
  consent: true as const,
});
let requestId = "",
  otherRequestId = "",
  mentorshipId = "";
const act = (user: typeof student, value: unknown) =>
  performAction(user, actionSchema.parse(value));
async function sql(sql: string, values: unknown[] = []) {
  return getPool().query(sql, values);
}
beforeAll(async () => {
  for (const user of people) {
    const role = user.id.includes("mentor")
      ? "mentor"
      : user === admin
        ? "admin"
        : "student";
    await sql(
      'INSERT INTO setu."user"(id,name,email,"emailVerified","createdAt","updatedAt",role) VALUES ($1,$2,$3,true,now(),now(),$4)',
      [user.id, user.name, user.email, role],
    );
    await currentProfile(user);
    if (user !== admin)
      await act(user, { action: "profile", profile: profile(user.name) });
  }
  for (const user of [student, otherStudent, mentor, otherMentor])
    await act(admin, {
      action: "verify",
      userId: user.id,
      decision: "approved",
      reason: "Verified local test fixture",
    });
});
afterAll(async () => {
  const ids = people.map((p) => p.id);
  await sql("DELETE FROM setu.access_grants WHERE granted_by=ANY($1::text[])", [
    ids,
  ]);
  for (const table of [
    "uploads",
    "checkins",
    "feedback",
    "followups",
    "messages",
    "documents",
    "sessions",
  ]) {
    await sql(
      `DELETE FROM setu.${table} WHERE mentorship_id IN (SELECT id FROM setu.mentorships WHERE student_id=ANY($1::text[]))`,
      [ids],
    );
  }
  await sql("DELETE FROM setu.mentorships WHERE student_id=ANY($1::text[])", [
    ids,
  ]);
  for (const table of ["requests", "notifications", "reviews", "profiles"]) {
    const column = table === "requests" ? "student_id" : "user_id";
    await sql(`DELETE FROM setu.${table} WHERE ${column}=ANY($1::text[])`, [
      ids,
    ]);
  }
  await sql('DELETE FROM setu."user" WHERE id=ANY($1::text[])', [ids]);
});
describe("Hosted-Postgres-compatible mentorship workflow", () => {
  test("email domains are exact and role assignment cannot grant arbitrary staff access", () => {
    expect(emailRole("student@ds.study.iitm.ac.in")).toBe("student");
    expect(emailRole("student@es.study.iitm.ac.in")).toBe("student");
    expect(emailRole("mentor@alumni.iitm.ac.in")).toBe("mentor");
    expect(emailRole("student@ds.study.iitm.ac.in.evil.com")).toBeNull();
    expect(emailRole("user@gmail.com")).toBeNull();
    expect(emailRole("unlisted@iitm.ac.in")).toBeNull();
  });
  test("pending accounts see only their profile and cannot submit a request", async () => {
    const data = await getWorkspace(pending);
    expect(data.requests).toHaveLength(0);
    expect(data.profiles).toHaveLength(0);
    expect(data.me.verification).toBe("pending");
    await expect(
      act(pending, {
        action: "request",
        goal: "Choose a role",
        uncertainty: "Where to start",
        areas: ["Software engineering"],
        timeline: "3 months",
        consent: true,
      }),
    ).rejects.toMatchObject({ status: 403 });
  });
  test("admins can whitelist multiple personal accounts and revoke access without granting staff privileges", async () => {
    const emails = [
      `${suffix}-student@gmail.com`,
      `${suffix}-student2@gmail.com`,
    ];
    await expect(
      act(student, {
        action: "grantAccess",
        emails,
        role: "student",
        reason: "Testing",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await act(admin, {
      action: "grantAccess",
      emails,
      role: "student",
      reason: "Local evaluation",
    });
    expect(await resolveEmailRole(emails[0])).toBe("student");
    expect(await resolveEmailRole(emails[1])).toBe("student");
    expect((await getWorkspace(student)).accessGrants).toHaveLength(0);
    await act(admin, { action: "revokeAccess", email: emails[0] });
    expect(await resolveEmailRole(emails[0])).toBeNull();
    expect(
      actionSchema.safeParse({
        action: "grantAccess",
        emails,
        role: "admin",
        reason: "Escalation",
      }).success,
    ).toBe(false);
    expect(emailRole("maynkudu@gmail.com")).toBe("admin");
  });
  test("a student can submit one unmatched request", async () => {
    const request = {
      action: "request",
      goal: "Prepare for a software engineering role",
      uncertainty: "Which projects should I focus on?",
      areas: ["Software engineering"],
      timeline: "3 months",
      consent: true,
    };
    await act(student, request);
    await act(otherStudent, request);
    requestId = (await getWorkspace(student)).requests[0].id;
    otherRequestId = (await getWorkspace(otherStudent)).requests[0].id;
    await expect(act(student, request)).rejects.toMatchObject({
      code: "23505",
    });
  });
  test("only IIC can assign, and concurrent assignment cannot double-book a mentor", async () => {
    await expect(
      act(student, { action: "assign", requestId, mentorId: mentor.id }),
    ).rejects.toMatchObject({ status: 403 });
    const result = await Promise.allSettled([
      act(admin, { action: "assign", requestId, mentorId: mentor.id }),
      act(admin, {
        action: "assign",
        requestId: otherRequestId,
        mentorId: mentor.id,
      }),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const data = await getWorkspace(mentor);
    mentorshipId = data.mentorships[0].id;
    expect(data.mentorships.filter((m) => m.status === "active")).toHaveLength(
      1,
    );
    if (data.mentorships[0].studentId !== student.id) {
      const m = data.mentorships[0];
      await act(admin, {
        action: "end",
        id: m.id,
        reason: "Reset concurrency fixture",
        category: "other",
      });
      await act(student, {
        action: "closeRequest",
        id: requestId,
        reason: "Reset",
      });
      await act(student, {
        action: "request",
        goal: "Prepare for a software role",
        uncertainty: "Project selection",
        areas: ["Software engineering"],
        timeline: "3 months",
        consent: true,
      });
      requestId = (await getWorkspace(student)).requests[0].id;
      await act(admin, { action: "assign", requestId, mentorId: mentor.id });
      mentorshipId = (await getWorkspace(student)).mentorships.find(
        (m) => m.status === "active",
      )!.id;
    }
  });
  test("private messages and documents are shared with the pair and hidden from IIC and other users", async () => {
    await act(student, {
      action: "message",
      mentorshipId,
      body: "Private preparation note",
    });
    expect(
      (await getWorkspace(mentor)).messages.some(
        (m) => m.body === "Private preparation note",
      ),
    ).toBe(true);
    expect((await getWorkspace(admin)).messages).toHaveLength(0);
    expect((await getWorkspace(otherStudent)).messages).toHaveLength(0);
    await expect(
      act(admin, { action: "message", mentorshipId, body: "Intrusion" }),
    ).rejects.toMatchObject({ status: 403 });
    await storeDocument(
      student,
      mentorshipId,
      new File(["%PDF-1.4\nTest"], "resume.pdf", { type: "application/pdf" }),
    );
    const doc = (await getWorkspace(student)).documents[0];
    expect((await downloadDocument(mentor, doc.id)).name).toBe("resume.pdf");
    await expect(downloadDocument(admin, doc.id)).rejects.toMatchObject({
      status: 403,
    });
    await expect(downloadDocument(otherMentor, doc.id)).rejects.toMatchObject({
      status: 404,
    });
  });
  test("sessions persist, reschedule, cancel, and reject overlaps", async () => {
    const startsAt = new Date(Date.now() + 86400000).toISOString();
    const session = {
      action: "session",
      mentorshipId,
      title: "Review project plan",
      startsAt,
      duration: 45,
      meetingUrl: "https://meet.google.com/test",
    };
    await act(student, session);
    const s = (await getWorkspace(mentor)).sessions.find(
      (s) => s.mentorshipId === mentorshipId,
    )!;
    expect(s.title).toBe("Review project plan");
    await expect(act(student, session)).rejects.toMatchObject({ status: 409 });
    await act(mentor, {
      ...session,
      sessionId: s.id,
      title: "Updated plan",
      duration: 60,
    });
    expect(
      (await getWorkspace(student)).sessions.find((x) => x.id === s.id)
        ?.duration,
    ).toBe(60);
    await act(student, {
      action: "sessionStatus",
      id: s.id,
      status: "cancelled",
    });
    expect(
      (await getWorkspace(mentor)).sessions.find((x) => x.id === s.id)?.status,
    ).toBe("cancelled");
    expect((await getWorkspace(admin)).sessions).toHaveLength(0);
  });
  test("a 5 MB upload assembles once, remains private and removes its temporary parts", async () => {
    const id = randomUUID();
    const bytes = Buffer.alloc(5 * 1024 * 1024, 65);
    bytes.write("%PDF-1.4\n");
    const input = {
      id,
      mentorshipId,
      name: "five-megabyte.pdf",
      size: bytes.length,
      parts: 5,
      part: 0,
    };
    const part = (n: number) =>
      new File(
        [new Uint8Array(bytes.subarray(n * 1048576, (n + 1) * 1048576))],
        "part",
      );
    expect(await uploadChunk(student, input, part(0))).toEqual({
      complete: false,
    });
    await expect(
      uploadChunk(mentor, { ...input, part: 1 }, part(1)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      uploadChunk(otherStudent, { ...input, part: 1 }, part(1)),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      uploadChunk(student, { ...input, part: 1 }, new File(["wrong"], "part")),
    ).rejects.toMatchObject({ status: 400 });
    for (let n = 1; n < 5; n++)
      expect(
        await uploadChunk(student, { ...input, part: n }, part(n)),
      ).toEqual({ complete: n === 4 });
    expect((await downloadDocument(mentor, id)).bytes.equals(bytes)).toBe(true);
    expect(
      (await sql("SELECT 1 FROM setu.uploads WHERE id=$1", [id])).rowCount,
    ).toBe(0);
    expect(
      (await sql("SELECT 1 FROM setu.upload_parts WHERE upload_id=$1", [id]))
        .rowCount,
    ).toBe(0);
    expect(await uploadChunk(student, { ...input, part: 4 }, part(4))).toEqual({
      complete: true,
    });
    expect(
      (await sql("SELECT 1 FROM setu.documents WHERE id=$1", [id])).rowCount,
    ).toBe(1);
  });
  test("maintenance removes abandoned uploads", async () => {
    const id = randomUUID();
    const input = {
      id,
      mentorshipId,
      name: "abandoned.pdf",
      size: 2 * 1048576,
      parts: 2,
      part: 0,
    };
    await uploadChunk(
      student,
      input,
      new File([new Uint8Array(Buffer.alloc(1048576))], "part"),
    );
    await sql(
      "UPDATE setu.uploads SET created_at=now()-interval '2 hours' WHERE id=$1",
      [id],
    );
    await maintenance();
    expect(
      (await sql("SELECT 1 FROM setu.upload_parts WHERE upload_id=$1", [id]))
        .rowCount,
    ).toBe(0);
  });
  test("the 10-session limit is enforced under concurrent scheduling", async () => {
    await sql(
      "INSERT INTO setu.sessions(mentorship_id,title,starts_at,duration,meeting_url) SELECT $1,'Limit fixture',now()+interval '10 days'+n*interval '1 day',30,'https://example.com/meeting' FROM generate_series(1,9) n",
      [mentorshipId],
    );
    const make = (n: number) => ({
      action: "session",
      mentorshipId,
      title: "Last slot",
      startsAt: new Date(Date.now() + n * 86400000).toISOString(),
      duration: 30,
      meetingUrl: "https://example.com/meeting",
    });
    const result = await Promise.allSettled([
      act(student, make(30)),
      act(mentor, make(31)),
    ]);
    expect(result.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(
      (await getWorkspace(student)).mentorships.find(
        (m) => m.id === mentorshipId,
      )?.sessionCount,
    ).toBe(10);
  });
  test("ending releases the pair, cancels future sessions, closes the request, and opens private feedback", async () => {
    await act(student, {
      action: "end",
      id: mentorshipId,
      reason: "Our plan is complete",
      category: "goal_met",
    });
    const data = await getWorkspace(student);
    expect(data.mentorships.find((m) => m.id === mentorshipId)?.status).toBe(
      "ended",
    );
    expect(data.requests.find((r) => r.id === requestId)?.status).toBe(
      "closed",
    );
    expect(
      data.sessions
        .filter((s) => s.mentorshipId === mentorshipId)
        .every((s) => s.status === "cancelled"),
    ).toBe(true);
    await expect(
      act(mentor, { action: "message", mentorshipId, body: "Too late" }),
    ).rejects.toMatchObject({ status: 409 });
    await act(student, {
      action: "feedback",
      mentorshipId,
      rating: 5,
      goalStatus: "partly",
      comment: "A useful plan",
      supportNeeded: false,
    });
    await act(mentor, {
      action: "feedback",
      mentorshipId,
      rating: 4,
      goalStatus: "yes",
      comment: "Private mentor assessment",
      supportNeeded: true,
    });
    expect(
      (await getWorkspace(student)).feedback.some(
        (f) => f.userId === mentor.id,
      ),
    ).toBe(false);
    expect(
      (await getWorkspace(admin)).feedback.filter(
        (f) => f.mentorshipId === mentorshipId,
      ),
    ).toHaveLength(2);
    expect((await getWorkspace(student)).checkins).toHaveLength(1);
  });
  test("retention deletes private content after 30 days and expired feedback is refused", async () => {
    await sql(
      "UPDATE setu.mentorships SET ended_at=now()-interval '31 days' WHERE id=$1",
      [mentorshipId],
    );
    await maintenance();
    expect(
      (
        await rows(
          z.object({ count: z.number() }),
          "SELECT count(*)::int AS count FROM setu.messages WHERE mentorship_id=$1",
          [mentorshipId],
        )
      )[0].count,
    ).toBe(0);
    expect((await getWorkspace(student)).documents).toHaveLength(0);
    await expect(
      act(student, {
        action: "feedback",
        mentorshipId,
        rating: 3,
        goalStatus: "yes",
        comment: "Late response",
        supportNeeded: false,
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
