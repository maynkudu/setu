import { z } from "zod";

export const roleSchema = z.enum(["student", "mentor", "admin"]);
export type Role = z.infer<typeof roleSchema>;
export const areas = [
  "Career planning",
  "Data science",
  "Software engineering",
  "Higher studies",
  "Research",
  "Switching fields",
  "Entrepreneurship",
];
const text = (max: number) => z.string().trim().min(1).max(max);
const id = z.string().uuid();
export const profileInput = z.object({
  name: text(100),
  rollNumber: text(40),
  bio: text(1000),
  interests: z.array(z.enum(areas)).min(1).max(7),
  skills: z.string().trim().max(300),
  path: z.string().trim().max(300),
  phone: z.string().trim().max(30),
  social: z.union([
    z.literal(""),
    z.url().refine((v) => /^https:\/\//.test(v), "Use an HTTPS link"),
  ]),
  graduationYear: z
    .number()
    .int()
    .min(2020)
    .max(new Date().getFullYear())
    .nullable(),
  organization: z.string().trim().max(200),
  experience: z.number().int().min(0).max(60),
  consent: z.literal(true),
});
export const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("profile"), profile: profileInput }),
  z.object({ action: z.literal("resubmit") }),
  z.object({ action: z.literal("availability"), available: z.boolean() }),
  z.object({
    action: z.literal("request"),
    goal: text(1000),
    uncertainty: text(1000),
    areas: z.array(z.enum(areas)).min(1).max(7),
    timeline: z.enum(["1 month", "3 months", "6 months", "Not sure"]),
    consent: z.literal(true),
  }),
  z.object({ action: z.literal("closeRequest"), id, reason: text(500) }),
  z.object({
    action: z.literal("verify"),
    userId: text(100),
    decision: z.enum([
      "approved",
      "discrepancy",
      "not_yet_eligible",
      "not_eligible",
    ]),
    reason: z.string().trim().max(500),
  }),
  z.object({ action: z.literal("assign"), requestId: id, mentorId: text(100) }),
  z.object({
    action: z.literal("session"),
    mentorshipId: id,
    sessionId: id.optional(),
    title: text(200),
    startsAt: z.iso.datetime({ offset: true }),
    duration: z.union([
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
    meetingUrl: z
      .url()
      .refine((v) => /^https:\/\//.test(v), "Use an HTTPS meeting link"),
  }),
  z.object({
    action: z.literal("sessionStatus"),
    id,
    status: z.enum(["cancelled", "missed"]),
  }),
  z.object({
    action: z.literal("message"),
    mentorshipId: id,
    body: text(2000),
  }),
  z.object({ action: z.literal("deleteDocument"), id }),
  z.object({
    action: z.literal("end"),
    id,
    reason: text(500),
    category: z.enum(["goal_met", "personal", "conduct", "other"]),
  }),
  z.object({
    action: z.literal("feedback"),
    mentorshipId: id,
    rating: z.number().int().min(1).max(5),
    goalStatus: z.enum(["yes", "partly", "in_progress"]),
    comment: text(2000),
    supportNeeded: z.boolean(),
  }),
  z.object({
    action: z.literal("checkin"),
    id,
    goalStatus: z.enum(["yes", "partly", "in_progress"]),
    comment: text(2000),
  }),
  z.object({ action: z.literal("resolve"), id, note: text(500) }),
  z.object({ action: z.literal("readNotifications") }),
  z.object({
    action: z.literal("grantAccess"),
    emails: z
      .array(z.email().transform((v) => v.toLowerCase()))
      .min(1)
      .max(50),
    role: z.enum(["student", "mentor"]),
    reason: text(300),
  }),
  z.object({ action: z.literal("revokeAccess"), email: z.email() }),
]);
export type Action = z.infer<typeof actionSchema>;
export const profileSchema = profileInput.omit({ consent: true }).extend({
  name: z.string(),
  rollNumber: z.string(),
  bio: z.string(),
  interests: z.array(z.string()),
  consent: z.boolean(),
  userId: z.string(),
  email: z.email(),
  role: roleSchema,
  verification: z.enum([
    "draft",
    "pending",
    "approved",
    "discrepancy",
    "not_yet_eligible",
    "not_eligible",
  ]),
  reviewReason: z.string(),
  available: z.boolean(),
  submittedAt: z.string().nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
export const requestSchema = z.object({
  id,
  studentId: z.string(),
  name: z.string(),
  goal: z.string(),
  uncertainty: z.string(),
  areas: z.array(z.string()),
  timeline: z.string(),
  status: z.enum(["submitted", "matched", "closed"]),
  createdAt: z.string(),
  closeReason: z.string(),
});
export type MentoringRequest = z.infer<typeof requestSchema>;
export const mentorshipSchema = z.object({
  id,
  requestId: id,
  studentId: z.string(),
  mentorId: z.string(),
  studentName: z.string(),
  mentorName: z.string(),
  goal: z.string(),
  uncertainty: z.string(),
  status: z.enum(["active", "ended"]),
  createdAt: z.string(),
  endedAt: z.string().nullable(),
  endReason: z.string(),
  sessionCount: z.number(),
  feedbackCount: z.number(),
});
export type Mentorship = z.infer<typeof mentorshipSchema>;
export const sessionSchema = z.object({
  id,
  mentorshipId: id,
  title: z.string(),
  startsAt: z.string(),
  duration: z.number(),
  meetingUrl: z.string(),
  status: z.enum(["scheduled", "held", "cancelled", "missed"]),
});
export type MentoringSession = z.infer<typeof sessionSchema>;
export const notificationSchema = z.object({
  id,
  body: z.string(),
  createdAt: z.string(),
  read: z.boolean(),
});
export const feedbackSchema = z.object({
  mentorshipId: id,
  userId: z.string(),
  rating: z.number(),
  goalStatus: z.string(),
  comment: z.string(),
  supportNeeded: z.boolean(),
});
export const checkinSchema = z.object({
  id,
  mentorshipId: id,
  dueAt: z.string(),
  status: z.string(),
  goalStatus: z.string(),
  comment: z.string(),
});
export const workspaceSchema = z.object({
  asOf: z.string(),
  me: profileSchema,
  profiles: z.array(profileSchema),
  requests: z.array(requestSchema),
  mentorships: z.array(mentorshipSchema),
  sessions: z.array(sessionSchema),
  messages: z.array(
    z.object({
      id,
      mentorshipId: id,
      senderId: z.string(),
      body: z.string(),
      createdAt: z.string(),
    }),
  ),
  documents: z.array(
    z.object({
      id,
      mentorshipId: id,
      name: z.string(),
      size: z.number(),
      uploaderId: z.string(),
    }),
  ),
  feedback: z.array(feedbackSchema),
  checkins: z.array(checkinSchema),
  notifications: z.array(notificationSchema),
  followups: z.array(
    z.object({
      id,
      mentorshipId: id,
      kind: z.string(),
      note: z.string(),
      resolved: z.boolean(),
    }),
  ),
  accessGrants: z.array(
    z.object({
      email: z.email(),
      role: z.enum(["student", "mentor"]),
      reason: z.string(),
      createdAt: z.string(),
      revokedAt: z.string().nullable(),
    }),
  ),
});
export type Workspace = z.infer<typeof workspaceSchema>;

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function requireCondition(
  condition: unknown,
  message: string,
  status = 409,
): asserts condition {
  if (!condition) throw new AppError(status, message);
}
export function allowedDomains(role: "student" | "mentor") {
  if (role === "mentor") return [];
  return [
    ...new Set(
      (
        process.env.STUDENT_EMAIL_DOMAINS ??
        "ds.study.iitm.ac.in,es.study.iitm.ac.in"
      )
        .split(",")
        .map((v) => v.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean),
    ),
  ];
}
export function emailRole(email: string): Role | null {
  const normalized = email.trim().toLowerCase();
  const staff = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  if (staff.includes(normalized)) return "admin";
  const domain = normalized.split("@")[1];
  if (allowedDomains("student").includes(domain)) return "student";
  return null;
}
