import { z } from "zod";
import type { Pool, PoolClient } from "pg";
import { getPool, rows, transaction } from "./db";
import {
  AppError,
  requireCondition,
  profileSchema,
  requestSchema,
  mentorshipSchema,
  sessionSchema,
  feedbackSchema,
  checkinSchema,
  workspaceSchema,
  type Action,
  type Profile,
} from "./domain";
import type { identity } from "./auth";

type Identity = Awaited<ReturnType<typeof identity>>;
const profileColumns = `p.user_id AS "userId", u.email, u.role, p.name, p.roll_number AS "rollNumber", p.bio, p.interests, p.skills, p.path, p.phone, p.social, p.graduation_year AS "graduationYear", p.organization, p.experience, p.consent, p.verification, p.review_reason AS "reviewReason", p.available, p.submitted_at::text AS "submittedAt"`;
const mentorshipColumns = `m.id, m.request_id AS "requestId", m.student_id AS "studentId", m.mentor_id AS "mentorId", sp.name AS "studentName", mp.name AS "mentorName", r.goal, r.uncertainty, m.status, m.created_at::text AS "createdAt", m.ended_at::text AS "endedAt", m.end_reason AS "endReason", (SELECT count(*)::int FROM setu.sessions s WHERE s.mentorship_id=m.id AND s.status IN ('scheduled','held')) AS "sessionCount", (SELECT count(*)::int FROM setu.feedback f WHERE f.mentorship_id=m.id) AS "feedbackCount"`;
const mentorshipJoin = `FROM setu.mentorships m JOIN setu.requests r ON r.id=m.request_id JOIN setu.profiles sp ON sp.user_id=m.student_id JOIN setu.profiles mp ON mp.user_id=m.mentor_id`;
const sessionColumns = `id, mentorship_id AS "mentorshipId", title, starts_at::text AS "startsAt", duration, meeting_url AS "meetingUrl", status`;

export async function currentProfile(
  user: Identity,
  client: Pool | PoolClient = getPool(),
) {
  await client.query(
    `INSERT INTO setu.profiles(user_id,name,verification) SELECT id,name,CASE WHEN role='admin' THEN 'approved' ELSE 'draft' END FROM setu."user" WHERE id=$1 ON CONFLICT DO NOTHING`,
    [user.id],
  );
  const [profile] = await rows(
    profileSchema,
    `SELECT ${profileColumns} FROM setu.profiles p JOIN setu."user" u ON u.id=p.user_id WHERE p.user_id=$1`,
    [user.id],
    client,
  );
  if (!profile) throw new AppError(401, "Your account is unavailable.");
  return profile;
}
async function notify(client: PoolClient, userIds: string[], body: string) {
  await client.query(
    "INSERT INTO setu.notifications(user_id,body) SELECT unnest($1::text[]),$2",
    [userIds, body],
  );
}
export async function lockedMentorship(
  client: PoolClient,
  id: string,
  me: Profile,
  adminAllowed = false,
) {
  await client.query("SELECT id FROM setu.mentorships WHERE id=$1 FOR UPDATE", [
    id,
  ]);
  // Read aggregates after acquiring the lock so a waiting transaction sees newly committed sessions.
  const [m] = await rows(
    mentorshipSchema,
    `SELECT ${mentorshipColumns} ${mentorshipJoin} WHERE m.id=$1`,
    [id],
    client,
  );
  requireCondition(m, "Mentorship not found.", 404);
  requireCondition(
    (me.role !== "admin" && [m.studentId, m.mentorId].includes(me.userId)) ||
      (adminAllowed && me.role === "admin"),
    "This mentorship is private.",
    403,
  );
  return m;
}
async function endMentorship(
  client: PoolClient,
  m: z.infer<typeof mentorshipSchema>,
  userId: string,
  reason: string,
  category: string,
) {
  await client.query(
    "UPDATE setu.mentorships SET status='ended',ended_at=now(),ended_by=$2,end_reason=$3,end_category=$4 WHERE id=$1",
    [m.id, userId, reason, category],
  );
  await client.query(
    "UPDATE setu.sessions SET status='cancelled' WHERE mentorship_id=$1 AND status='scheduled' AND starts_at>now()",
    [m.id],
  );
  await client.query(
    "UPDATE setu.requests SET status='closed',close_reason=$2 WHERE id=$1",
    [m.requestId, reason],
  );
  if (category === "conduct")
    await client.query(
      "INSERT INTO setu.followups(mentorship_id,kind) VALUES ($1,'Conduct concern') ON CONFLICT DO NOTHING",
      [m.id],
    );
  await notify(
    client,
    [m.studentId, m.mentorId],
    "Your mentorship has ended. Please submit your feedback within five days. The shared space is read-only for 30 days.",
  );
}

export async function getWorkspace(user: Identity) {
  const me = await currentProfile(user);
  const admin = me.role === "admin";
  const approved = me.verification === "approved";
  if (!approved)
    return workspaceSchema.parse({
      asOf: new Date().toISOString(),
      me,
      profiles: [],
      requests: [],
      mentorships: [],
      sessions: [],
      messages: [],
      documents: [],
      feedback: [],
      checkins: [],
      notifications: [],
      followups: [],
      accessGrants: [],
    });
  const [
    profiles,
    requests,
    mentorships,
    sessions,
    messages,
    documents,
    feedback,
    checkins,
    notifications,
    followups,
    accessGrants,
  ] = await Promise.all([
    rows(
      profileSchema,
      `SELECT ${profileColumns} FROM setu.profiles p JOIN setu."user" u ON u.id=p.user_id WHERE u.role<>'admin' AND ($2::boolean OR p.user_id IN (SELECT CASE WHEN student_id=$1 THEN mentor_id ELSE student_id END FROM setu.mentorships WHERE status='active' AND $1 IN (student_id,mentor_id))) ORDER BY p.submitted_at DESC NULLS LAST LIMIT 500`,
      [me.userId, admin],
    ),
    rows(
      requestSchema,
      `SELECT r.id,student_id AS "studentId", p.name, goal, uncertainty, areas, timeline, status,created_at::text AS "createdAt",close_reason AS "closeReason" FROM setu.requests r JOIN setu.profiles p ON p.user_id=r.student_id WHERE $2::boolean OR student_id=$1 OR r.id IN (SELECT request_id FROM setu.mentorships WHERE mentor_id=$1) ORDER BY created_at DESC LIMIT 500`,
      [me.userId, admin],
    ),
    rows(
      mentorshipSchema,
      `SELECT ${mentorshipColumns} ${mentorshipJoin} WHERE $2::boolean OR $1 IN (m.student_id,m.mentor_id) ORDER BY m.created_at DESC LIMIT 500`,
      [me.userId, admin],
    ),
    admin
      ? []
      : rows(
          sessionSchema,
          `SELECT ${sessionColumns} FROM setu.sessions WHERE mentorship_id IN (SELECT id FROM setu.mentorships WHERE $1 IN(student_id,mentor_id)) ORDER BY starts_at LIMIT 500`,
          [me.userId],
        ),
    admin
      ? []
      : rows(
          workspaceSchema.shape.messages.element,
          `SELECT id,mentorship_id AS "mentorshipId",sender_id AS "senderId",body,created_at::text AS "createdAt" FROM (SELECT x.* FROM setu.messages x JOIN setu.mentorships m ON m.id=x.mentorship_id WHERE $1 IN(m.student_id,m.mentor_id) AND (m.ended_at IS NULL OR m.ended_at>now()-interval '30 days') ORDER BY x.created_at DESC LIMIT 200) q ORDER BY created_at`,
          [me.userId],
        ),
    admin
      ? []
      : rows(
          workspaceSchema.shape.documents.element,
          `SELECT d.id,mentorship_id AS "mentorshipId",name,size,uploader_id AS "uploaderId" FROM setu.documents d JOIN setu.mentorships m ON m.id=d.mentorship_id WHERE $1 IN(m.student_id,m.mentor_id) AND (m.ended_at IS NULL OR m.ended_at>now()-interval '30 days') ORDER BY d.created_at`,
          [me.userId],
        ),
    rows(
      feedbackSchema,
      `SELECT mentorship_id AS "mentorshipId",user_id AS "userId",rating,goal_status AS "goalStatus",comment,support_needed AS "supportNeeded" FROM setu.feedback WHERE $2::boolean OR user_id=$1`,
      [me.userId, admin],
    ),
    rows(
      checkinSchema,
      `SELECT id,mentorship_id AS "mentorshipId",due_at::text AS "dueAt",status,goal_status AS "goalStatus",comment FROM setu.checkins WHERE $2::boolean OR user_id=$1 ORDER BY due_at`,
      [me.userId, admin],
    ),
    rows(
      workspaceSchema.shape.notifications.element,
      `SELECT id,body,created_at::text AS "createdAt",read FROM setu.notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [me.userId],
    ),
    admin
      ? rows(
          workspaceSchema.shape.followups.element,
          `SELECT id,mentorship_id AS "mentorshipId",kind,note,resolved FROM setu.followups ORDER BY resolved LIMIT 500`,
        )
      : [],
    admin
      ? rows(
          workspaceSchema.shape.accessGrants.element,
          `SELECT email,role,reason,created_at::text AS "createdAt",revoked_at::text AS "revokedAt" FROM setu.access_grants ORDER BY created_at DESC LIMIT 500`,
        )
      : [],
  ]);
  if (admin) {
    for (const p of profiles) {
      const hasRequest = requests.some((r) => r.studentId === p.userId);
      const assigned = mentorships.some((m) => m.mentorId === p.userId);
      if (p.role === "student" && !hasRequest && p.verification !== "pending")
        Object.assign(p, {
          bio: "",
          interests: [],
          skills: "",
          path: "",
          organization: "",
          social: "",
        });
      if (
        (p.role === "student" && !hasRequest) ||
        (p.role === "mentor" && !assigned)
      )
        p.phone = "";
    }
  }
  return workspaceSchema.parse({
    asOf: new Date().toISOString(),
    me,
    profiles,
    requests,
    mentorships,
    sessions,
    messages,
    documents,
    feedback,
    checkins,
    notifications,
    followups,
    accessGrants,
  });
}

export async function performAction(user: Identity, action: Action) {
  const me = await currentProfile(user);
  if (!["profile", "resubmit"].includes(action.action))
    requireCondition(
      me.verification === "approved",
      "IIC must approve your eligibility first.",
      403,
    );
  await transaction(async (client) => {
    await client.query(
      "SELECT user_id FROM setu.profiles WHERE user_id=$1 FOR UPDATE",
      [me.userId],
    );
    switch (action.action) {
      case "profile": {
        requireCondition(
          me.role !== "admin",
          "Staff profiles are managed by the programme.",
          403,
        );
        const active = await client.query(
          "SELECT 1 FROM setu.mentorships WHERE student_id=$1 AND status='active'",
          [me.userId],
        );
        requireCondition(
          !active.rowCount,
          "Student profiles are locked during an active mentorship.",
        );
        requireCondition(
          me.verification !== "not_eligible",
          "This eligibility decision is final.",
          403,
        );
        const p = action.profile;
        if (me.role === "mentor")
          requireCondition(
            p.graduationYear !== null,
            "Add your graduation year.",
            400,
          );
        if (me.verification === "approved" || me.verification === "pending") {
          requireCondition(
            p.name === me.name &&
              p.rollNumber === me.rollNumber &&
              p.graduationYear === me.graduationYear &&
              (me.role !== "mentor" ||
                JSON.stringify(p.interests) === JSON.stringify(me.interests)),
            "Identity and mentoring domains are locked after submission.",
          );
        }
        await client.query(
          `UPDATE setu.profiles SET name=$2,roll_number=$3,bio=$4,interests=$5,skills=$6,path=$7,phone=$8,social=$9,graduation_year=$10,organization=$11,experience=$12,consent=true,verification=CASE WHEN verification='draft' THEN 'pending' ELSE verification END,submitted_at=COALESCE(submitted_at,now()),updated_at=now() WHERE user_id=$1`,
          [
            me.userId,
            p.name,
            p.rollNumber,
            p.bio,
            p.interests,
            p.skills,
            p.path,
            p.phone,
            p.social,
            p.graduationYear,
            p.organization,
            p.experience,
          ],
        );
        break;
      }
      case "resubmit":
        requireCondition(
          ["discrepancy", "not_yet_eligible"].includes(me.verification),
          "There is no review to resubmit.",
        );
        await client.query(
          "UPDATE setu.profiles SET verification='pending',submitted_at=now(),review_reason='' WHERE user_id=$1",
          [me.userId],
        );
        break;
      case "availability":
        requireCondition(
          me.role === "mentor",
          "Only mentors change availability.",
          403,
        );
        await client.query(
          "UPDATE setu.profiles SET available=$2 WHERE user_id=$1",
          [me.userId, action.available],
        );
        break;
      case "request":
        requireCondition(
          me.role === "student",
          "Only students submit requests.",
          403,
        );
        await client.query(
          "INSERT INTO setu.requests(student_id,goal,uncertainty,areas,timeline) VALUES ($1,$2,$3,$4,$5)",
          [
            me.userId,
            action.goal,
            action.uncertainty,
            action.areas,
            action.timeline,
          ],
        );
        await notify(
          client,
          [me.userId],
          "Your mentoring request has been submitted. IIC will review it and assign a suitable alumnus.",
        );
        break;
      case "closeRequest": {
        const [r] = await rows(
          z.object({ studentId: z.string(), status: z.string() }),
          `SELECT student_id AS "studentId",status FROM setu.requests WHERE id=$1 FOR UPDATE`,
          [action.id],
          client,
        );
        requireCondition(r, "Request not found.", 404);
        requireCondition(
          me.role === "admin" || r.studentId === me.userId,
          "This request is private.",
          403,
        );
        requireCondition(
          r.status === "submitted",
          "Only unmatched requests can be closed.",
        );
        await client.query(
          "UPDATE setu.requests SET status='closed',close_reason=$2 WHERE id=$1",
          [action.id, action.reason],
        );
        await notify(
          client,
          [r.studentId],
          `Your request was closed. ${action.reason}`,
        );
        break;
      }
      case "verify": {
        requireCondition(
          me.role === "admin",
          "Only IIC can verify accounts.",
          403,
        );
        const [p] = await rows(
          profileSchema,
          `SELECT ${profileColumns} FROM setu.profiles p JOIN setu."user" u ON u.id=p.user_id WHERE user_id=$1 FOR UPDATE OF p`,
          [action.userId],
          client,
        );
        requireCondition(
          p && p.role !== "admin" && p.verification === "pending",
          "This profile is not awaiting review.",
        );
        requireCondition(
          action.decision === "approved" || action.reason.length > 0,
          "Add a reason for the decision.",
          400,
        );
        await client.query(
          "UPDATE setu.profiles SET verification=$2,review_reason=$3 WHERE user_id=$1",
          [p.userId, action.decision, action.reason],
        );
        await client.query(
          "INSERT INTO setu.reviews(user_id,reviewer_id,decision,reason) VALUES ($1,$2,$3,$4)",
          [p.userId, me.userId, action.decision, action.reason],
        );
        await notify(
          client,
          [p.userId],
          `Your IIC eligibility review is ${action.decision.replaceAll("_", " ")}. ${action.reason}`,
        );
        break;
      }
      case "assign": {
        requireCondition(
          me.role === "admin",
          "Only IIC can assign mentors.",
          403,
        );
        const [r] = await rows(
          z.object({ studentId: z.string(), status: z.string() }),
          `SELECT student_id AS "studentId",status FROM setu.requests WHERE id=$1 FOR UPDATE`,
          [action.requestId],
          client,
        );
        requireCondition(
          r?.status === "submitted",
          "This request is already matched or closed.",
        );
        const participants = await rows(
          profileSchema,
          `SELECT ${profileColumns} FROM setu.profiles p JOIN setu."user" u ON u.id=p.user_id WHERE user_id=ANY($1::text[]) ORDER BY user_id FOR UPDATE OF p`,
          [[r.studentId, action.mentorId]],
          client,
        );
        const mentor = participants.find((p) => p.userId === action.mentorId);
        const student = participants.find((p) => p.userId === r.studentId);
        requireCondition(
          student?.role === "student" && student.verification === "approved",
          "The student is not approved.",
        );
        requireCondition(
          mentor?.role === "mentor" &&
            mentor.verification === "approved" &&
            mentor.available &&
            mentor.consent &&
            mentor.bio &&
            mentor.rollNumber &&
            mentor.graduationYear &&
            mentor.interests.length,
          "Choose an approved, available mentor with a complete profile.",
        );
        await client.query(
          "INSERT INTO setu.mentorships(request_id,student_id,mentor_id) VALUES ($1,$2,$3)",
          [action.requestId, r.studentId, action.mentorId],
        );
        await client.query(
          "UPDATE setu.requests SET status='matched' WHERE id=$1",
          [action.requestId],
        );
        await notify(
          client,
          [r.studentId, action.mentorId],
          "IIC has created your mentorship. Open your workspace and schedule the first session within two days.",
        );
        break;
      }
      case "session": {
        const m = await lockedMentorship(client, action.mentorshipId, me);
        requireCondition(m.status === "active", "This mentorship has ended.");
        requireCondition(
          new Date(action.startsAt).getTime() > Date.now(),
          "Choose a future session time.",
          400,
        );
        if (action.sessionId) {
          const [s] = await rows(
            sessionSchema,
            `SELECT ${sessionColumns} FROM setu.sessions WHERE id=$1 AND mentorship_id=$2 FOR UPDATE`,
            [action.sessionId, m.id],
            client,
          );
          requireCondition(
            s?.status === "scheduled" &&
              new Date(s.startsAt).getTime() > Date.now(),
            "Only upcoming sessions can be rescheduled.",
          );
        } else
          requireCondition(
            m.sessionCount < 10,
            "This mentorship has reached its 10-session limit.",
          );
        const overlap = await client.query(
          "SELECT 1 FROM setu.sessions WHERE mentorship_id=$1 AND status IN ('scheduled','held') AND ($4::uuid IS NULL OR id<>$4) AND starts_at<$2::timestamptz+make_interval(mins=>$3) AND starts_at+make_interval(mins=>duration)>$2::timestamptz",
          [m.id, action.startsAt, action.duration, action.sessionId ?? null],
        );
        requireCondition(
          !overlap.rowCount,
          "This time overlaps another session.",
        );
        if (action.sessionId)
          await client.query(
            "UPDATE setu.sessions SET title=$2,starts_at=$3,duration=$4,meeting_url=$5,reminder_sent=false WHERE id=$1",
            [
              action.sessionId,
              action.title,
              action.startsAt,
              action.duration,
              action.meetingUrl,
            ],
          );
        else
          await client.query(
            "INSERT INTO setu.sessions(mentorship_id,title,starts_at,duration,meeting_url) VALUES ($1,$2,$3,$4,$5)",
            [
              m.id,
              action.title,
              action.startsAt,
              action.duration,
              action.meetingUrl,
            ],
          );
        await notify(
          client,
          [m.studentId, m.mentorId],
          `Your mentorship session was ${action.sessionId ? "rescheduled" : "scheduled"}. Open your workspace for the time and meeting link.`,
        );
        break;
      }
      case "sessionStatus": {
        const [s] = await rows(
          sessionSchema,
          `SELECT ${sessionColumns} FROM setu.sessions WHERE id=$1`,
          [action.id],
          client,
        );
        requireCondition(s, "Session not found.", 404);
        const m = await lockedMentorship(client, s.mentorshipId, me);
        requireCondition(m.status === "active", "This mentorship has ended.");
        const starts = new Date(s.startsAt).getTime();
        if (action.status === "cancelled")
          requireCondition(
            s.status === "scheduled" && starts > Date.now(),
            "Only upcoming sessions can be cancelled.",
          );
        else
          requireCondition(
            ["scheduled", "held"].includes(s.status) &&
              starts <= Date.now() &&
              Date.now() < starts + s.duration * 60000 + 48 * 3600000,
            "A missed session must be marked within 48 hours.",
          );
        await client.query("UPDATE setu.sessions SET status=$2 WHERE id=$1", [
          s.id,
          action.status,
        ]);
        await notify(
          client,
          [m.studentId, m.mentorId],
          `A session was marked ${action.status}.`,
        );
        break;
      }
      case "message": {
        const m = await lockedMentorship(client, action.mentorshipId, me);
        requireCondition(
          m.status === "active",
          "This conversation is read-only.",
        );
        await client.query(
          "INSERT INTO setu.messages(mentorship_id,sender_id,body) VALUES ($1,$2,$3)",
          [m.id, me.userId, action.body],
        );
        await notify(
          client,
          [m.studentId === me.userId ? m.mentorId : m.studentId],
          "You have a new private message in your SETU workspace.",
        );
        break;
      }
      case "deleteDocument": {
        const [d] = await rows(
          z.object({ mentorshipId: z.string(), uploaderId: z.string() }),
          `SELECT mentorship_id AS "mentorshipId",uploader_id AS "uploaderId" FROM setu.documents WHERE id=$1`,
          [action.id],
          client,
        );
        requireCondition(d, "Document not found.", 404);
        const m = await lockedMentorship(client, d.mentorshipId, me);
        requireCondition(
          m.status === "active" && d.uploaderId === me.userId,
          "Only your own documents in an active mentorship can be removed.",
          403,
        );
        await client.query("DELETE FROM setu.documents WHERE id=$1", [
          action.id,
        ]);
        break;
      }
      case "end": {
        const m = await lockedMentorship(client, action.id, me, true);
        requireCondition(
          m.status === "active",
          "This mentorship has already ended.",
        );
        await endMentorship(
          client,
          m,
          me.userId,
          action.reason,
          action.category,
        );
        break;
      }
      case "feedback": {
        const m = await lockedMentorship(client, action.mentorshipId, me);
        requireCondition(
          m.status === "ended" &&
            m.endedAt &&
            Date.now() <= new Date(m.endedAt).getTime() + 5 * 86400000,
          "Feedback is open for five days after the mentorship ends.",
        );
        await client.query(
          "INSERT INTO setu.feedback(mentorship_id,user_id,rating,goal_status,comment,support_needed) VALUES ($1,$2,$3,$4,$5,$6)",
          [
            m.id,
            me.userId,
            action.rating,
            action.goalStatus,
            action.comment,
            action.supportNeeded,
          ],
        );
        if (me.role === "mentor" && action.supportNeeded)
          await client.query(
            "INSERT INTO setu.followups(mentorship_id,kind) VALUES ($1,'Other support needed') ON CONFLICT DO NOTHING",
            [m.id],
          );
        if (me.role === "student" && action.goalStatus !== "yes")
          await client.query(
            `INSERT INTO setu.checkins(mentorship_id,user_id,round,due_at) SELECT $1,$2,1,now()+CASE timeline WHEN '1 month' THEN interval '1 month' WHEN '6 months' THEN interval '6 months' ELSE interval '3 months' END FROM setu.requests WHERE id=$3`,
            [m.id, me.userId, m.requestId],
          );
        break;
      }
      case "checkin": {
        requireCondition(
          me.role === "student",
          "Only students submit check-ins.",
          403,
        );
        const [c] = await rows(
          z.object({
            mentorshipId: z.string(),
            round: z.number(),
            status: z.string(),
            dueAt: z.string(),
          }),
          `SELECT mentorship_id AS "mentorshipId",round,status,due_at::text AS "dueAt" FROM setu.checkins WHERE id=$1 AND user_id=$2 FOR UPDATE`,
          [action.id, me.userId],
          client,
        );
        requireCondition(
          c?.status === "pending" &&
            new Date(c.dueAt).getTime() <= Date.now() &&
            Date.now() <= new Date(c.dueAt).getTime() + 14 * 86400000,
          "This check-in is not open.",
        );
        await client.query(
          "UPDATE setu.checkins SET status='answered',goal_status=$2,comment=$3 WHERE id=$1",
          [action.id, action.goalStatus, action.comment],
        );
        if (c.round === 1 && action.goalStatus === "in_progress")
          await client.query(
            "INSERT INTO setu.checkins(mentorship_id,user_id,round,due_at) SELECT $1,$2,2,GREATEST(ended_at+interval '6 months',now()) FROM setu.mentorships WHERE id=$1 ON CONFLICT DO NOTHING",
            [c.mentorshipId, me.userId],
          );
        break;
      }
      case "resolve":
        requireCondition(
          me.role === "admin",
          "Only IIC resolves follow-ups.",
          403,
        );
        await client.query(
          "UPDATE setu.followups SET resolved=true,note=$2 WHERE id=$1",
          [action.id, action.note],
        );
        break;
      case "readNotifications":
        await client.query(
          "UPDATE setu.notifications SET read=true WHERE user_id=$1",
          [me.userId],
        );
        break;
      case "grantAccess": {
        requireCondition(
          me.role === "admin",
          "Only administrators can whitelist accounts.",
          403,
        );
        for (const email of new Set(action.emails)) {
          const [existing] = await rows(
            z.object({ role: z.string() }),
            'SELECT role FROM setu."user" WHERE lower(email)=$1',
            [email],
            client,
          );
          requireCondition(
            !existing || existing.role === action.role,
            "An existing account has a different role. Its role cannot be changed through a test whitelist.",
          );
          await client.query(
            "INSERT INTO setu.access_grants(email,role,reason,granted_by) VALUES ($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET role=EXCLUDED.role,reason=EXCLUDED.reason,granted_by=EXCLUDED.granted_by,revoked_at=NULL,created_at=now()",
            [email, action.role, action.reason, me.userId],
          );
        }
        break;
      }
      case "revokeAccess":
        requireCondition(
          me.role === "admin",
          "Only administrators can revoke test access.",
          403,
        );
        await client.query(
          "UPDATE setu.access_grants SET revoked_at=now() WHERE email=$1",
          [action.email.toLowerCase()],
        );
        break;
    }
  });
}

export async function storeDocument(
  user: Identity,
  mentorshipId: string,
  file: File,
  existingClient?: PoolClient,
  documentId?: string,
) {
  const me = await currentProfile(user, existingClient ?? getPool());
  requireCondition(
    me.verification === "approved",
    "IIC approval is required.",
    403,
  );
  requireCondition(
    file.size > 0 && file.size <= 5 * 1024 * 1024,
    "Files must be between 1 byte and 5 MB.",
    400,
  );
  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase();
  const signatures = {
    pdf: {
      mime: "application/pdf",
      valid: bytes.subarray(0, 5).toString() === "%PDF-",
    },
    docx: {
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      valid: bytes.subarray(0, 2).toString() === "PK",
    },
    pptx: {
      mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      valid: bytes.subarray(0, 2).toString() === "PK",
    },
    jpg: {
      mime: "image/jpeg",
      valid: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    },
    jpeg: {
      mime: "image/jpeg",
      valid: bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    },
    png: {
      mime: "image/png",
      valid: bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    },
  };
  requireCondition(
    extension && extension in signatures,
    "Use PDF, DOCX, PPTX, JPG, or PNG.",
    400,
  );
  const format = signatures[extension as keyof typeof signatures];
  requireCondition(
    format.valid,
    "The file contents do not match its extension.",
    400,
  );
  const write = async (client: PoolClient) => {
    const m = await lockedMentorship(client, mentorshipId, me);
    requireCondition(
      m.status === "active",
      "Documents are read-only after a mentorship ends.",
    );
    const count = await rows(
      z.object({ count: z.number() }),
      "SELECT count(*)::int AS count FROM setu.documents WHERE mentorship_id=$1",
      [m.id],
      client,
    );
    requireCondition(
      count[0].count < 20,
      "The shared space allows 20 documents.",
    );
    await client.query(
      "INSERT INTO setu.documents(id,mentorship_id,uploader_id,name,mime,size,bytes) VALUES (COALESCE($7::uuid,gen_random_uuid()),$1,$2,$3,$4,$5,$6)",
      [
        m.id,
        me.userId,
        file.name.replace(/[^a-zA-Z0-9._ -]/g, "").slice(0, 160),
        format.mime,
        file.size,
        bytes,
        documentId ?? null,
      ],
    );
    await notify(
      client,
      [m.studentId === me.userId ? m.mentorId : m.studentId],
      "A document was added to your private shared space.",
    );
  };
  if (existingClient) await write(existingClient);
  else await transaction(write);
}
export async function downloadDocument(user: Identity, id: string) {
  const me = await currentProfile(user);
  requireCondition(
    me.verification === "approved" && me.role !== "admin",
    "This document is private.",
    403,
  );
  const [doc] = await rows(
    z.object({
      bytes: z.instanceof(Buffer),
      name: z.string(),
      mime: z.string(),
    }),
    `SELECT bytes,name,mime FROM setu.documents d JOIN setu.mentorships m ON m.id=d.mentorship_id WHERE d.id=$1 AND $2 IN(m.student_id,m.mentor_id) AND (ended_at IS NULL OR ended_at>now()-interval '30 days')`,
    [id, me.userId],
  );
  requireCondition(doc, "Document not found.", 404);
  return doc;
}
export async function calendarSession(user: Identity, id: string) {
  const me = await currentProfile(user);
  requireCondition(
    me.verification === "approved" && me.role !== "admin",
    "Session details are private.",
    403,
  );
  const [s] = await rows(
    sessionSchema,
    `SELECT ${sessionColumns} FROM setu.sessions WHERE id=$1 AND mentorship_id IN (SELECT id FROM setu.mentorships WHERE $2 IN(student_id,mentor_id))`,
    [id, me.userId],
  );
  requireCondition(s, "Session not found.", 404);
  return s;
}
export async function maintenance() {
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(73638813)");
    await client.query(
      "UPDATE setu.sessions SET status='held' WHERE status='scheduled' AND starts_at+make_interval(mins=>duration)<now()",
    );
    const ended = await rows(
      mentorshipSchema,
      `SELECT ${mentorshipColumns} ${mentorshipJoin} WHERE m.status='active' AND (SELECT count(*) FROM setu.sessions s WHERE s.mentorship_id=m.id AND s.status='held')>=10 AND (SELECT max(starts_at+make_interval(mins=>duration)) FROM setu.sessions s WHERE s.mentorship_id=m.id AND s.status='held')<now()-interval '48 hours' FOR UPDATE OF m`,
      [],
      client,
    );
    for (const m of ended)
      await endMentorship(
        client,
        m,
        "system",
        "Ten sessions completed.",
        "goal_met",
      );
    await client.query(
      "DELETE FROM setu.messages WHERE mentorship_id IN (SELECT id FROM setu.mentorships WHERE ended_at<now()-interval '30 days')",
    );
    await client.query(
      "DELETE FROM setu.documents WHERE mentorship_id IN (SELECT id FROM setu.mentorships WHERE ended_at<now()-interval '30 days')",
    );
    await client.query(
      "DELETE FROM setu.uploads WHERE created_at<now()-interval '1 hour' OR mentorship_id IN (SELECT id FROM setu.mentorships WHERE status='ended')",
    );
    await client.query(
      "UPDATE setu.checkins SET status='no_response' WHERE status='pending' AND due_at<now()-interval '14 days'",
    );
    const upcoming = await rows(
      z.object({ id: z.string(), studentId: z.string(), mentorId: z.string() }),
      `SELECT s.id,m.student_id AS "studentId",m.mentor_id AS "mentorId" FROM setu.sessions s JOIN setu.mentorships m ON m.id=s.mentorship_id WHERE s.status='scheduled' AND NOT reminder_sent AND s.starts_at BETWEEN now() AND now()+interval '24 hours' FOR UPDATE OF s`,
      [],
      client,
    );
    for (const s of upcoming) {
      await notify(
        client,
        [s.studentId, s.mentorId],
        "Your SETU session is within 24 hours. Your workspace has the time and meeting link.",
      );
      await client.query(
        "UPDATE setu.sessions SET reminder_sent=true WHERE id=$1",
        [s.id],
      );
    }
    await client.query(
      "DELETE FROM setu.access_log WHERE created_at<now()-interval '90 days'",
    );
  });
}
