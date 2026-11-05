"use client";
import { useState } from "react";
import type { MentoringRequest, Profile, Workspace } from "@/lib/domain";
import type { Save } from "./profile";
import { Avatar, Empty, Icon, Tag } from "./ui";
import { date } from "./mentorship";
import Link from "next/link";
function ProfileDetails({ p }: { p: Profile }) {
  return (
    <div className="profile-details">
      <div className="row">
        <Avatar name={p.name} />
        <div>
          <h3>{p.name}</h3>
          <p className="muted">
            {p.rollNumber} · {p.email}
          </p>
        </div>
      </div>
      <p>{p.bio}</p>
      <div className="row wrap">
        {p.interests.map((v) => (
          <Tag key={v}>{v}</Tag>
        ))}
      </div>
      {p.organization && (
        <p>
          {p.organization} · {p.experience} years of experience
        </p>
      )}
      {p.graduationYear && <p>Graduated {p.graduationYear}</p>}
      {p.path && <p>Career direction · {p.path}</p>}
      {p.skills && <p>Skills · {p.skills}</p>}
      {p.phone && <p>Phone · {p.phone}</p>}
      {p.social && (
        <a href={p.social} target="_blank" rel="noreferrer">
          Professional profile
        </a>
      )}
    </div>
  );
}
export function Verification({
  data,
  save,
  busy,
  list,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
  list?: "mentor" | "student";
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState("");
  const profiles = data.profiles.filter(
    (p) =>
      (list ? p.role === list : p.verification === "pending") &&
      `${p.name} ${p.email} ${p.rollNumber}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="panel stack">
      <div className="search-field">
        <Icon name="search" />
        <input
          aria-label="Search profiles"
          placeholder="Search name, email, or roll number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {!profiles.length && (
        <Empty
          title={
            list ? "No profiles to show" : "The verification queue is clear"
          }
          icon="shield"
        />
      )}
      {profiles.map((p) => (
        <div className="admin-record" key={p.userId}>
          <div className="row between">
            <div className="row">
              <Avatar name={p.name} />
              <div>
                <h3>{p.name || p.email}</h3>
                <p>
                  {p.rollNumber || "Profile incomplete"} · {p.role}
                </p>
              </div>
            </div>
            <Tag color={p.verification === "approved" ? "green" : "gold"}>
              {p.verification.replaceAll("_", " ")}
            </Tag>
            <button
              className="btn secondary"
              onClick={() => setOpen(open === p.userId ? "" : p.userId)}
            >
              {open === p.userId ? "Close" : "Review profile"}
            </button>
          </div>
          {open === p.userId && (
            <div className="review-details stack">
              <ProfileDetails p={p} />
              {p.verification === "pending" && (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = new FormData(e.currentTarget);
                    const decision = String(v.get("decision"));
                    if (
                      decision !== "approved" &&
                      decision !== "discrepancy" &&
                      decision !== "not_yet_eligible" &&
                      decision !== "not_eligible"
                    )
                      return;
                    void save({
                      action: "verify",
                      userId: p.userId,
                      decision,
                      reason: String(v.get("reason")),
                    });
                  }}
                >
                  <p className="notice">
                    Check the student&apos;s degree-level status or the
                    mentor&apos;s alumni credentials against official IITM BS
                    records before approving.
                  </p>
                  <label>
                    Eligibility decision
                    <select name="decision">
                      <option value="approved">Approve eligibility</option>
                      <option value="discrepancy">
                        Discrepancy, allow resubmission
                      </option>
                      {p.role === "student" && (
                        <option value="not_yet_eligible">
                          Not yet at degree level
                        </option>
                      )}
                      <option value="not_eligible">
                        Not eligible, final decision
                      </option>
                    </select>
                  </label>
                  <label>
                    Review comment
                    <textarea
                      name="reason"
                      maxLength={500}
                      placeholder="Required when rejecting eligibility"
                    />
                  </label>
                  <button className="btn primary" disabled={busy}>
                    Save eligibility decision
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
function RequestReview({
  data,
  r,
  save,
  busy,
}: {
  data: Workspace;
  r: MentoringRequest;
  save: Save;
  busy: boolean;
}) {
  const [mentorId, setMentorId] = useState("");
  const [closing, setClosing] = useState(false);
  const student = data.profiles.find((p) => p.userId === r.studentId);
  const eligible = data.profiles.filter(
    (p) =>
      p.role === "mentor" &&
      p.verification === "approved" &&
      p.available &&
      p.consent &&
      p.bio &&
      p.graduationYear &&
      p.interests.length &&
      !data.mentorships.some(
        (m) => m.mentorId === p.userId && m.status === "active",
      ),
  );
  const ranked = eligible
    .map((p) => ({ p, shared: r.areas.filter((a) => p.interests.includes(a)) }))
    .sort(
      (a, b) =>
        b.shared.length - a.shared.length || b.p.experience - a.p.experience,
    );
  return (
    <div className="review-details stack">
      <div className="goal-summary">
        <h3>Goal</h3>
        <p>{r.goal}</p>
        <h3>Uncertainty</h3>
        <p>{r.uncertainty}</p>
        <p className="muted">Timeline · {r.timeline}</p>
        <div className="row wrap">
          {r.areas.map((v) => (
            <Tag key={v}>{v}</Tag>
          ))}
        </div>
      </div>
      {student && <ProfileDetails p={student} />}
      {r.status === "submitted" && (
        <>
          <h3>Suggested mentors</h3>
          <p className="muted">
            Ranked by shared guidance areas, then experience. IIC makes the
            final assignment.
          </p>
          {!ranked.length && (
            <Empty title="No eligible mentors are available" icon="users">
              <p>
                Approve a mentor with a complete profile and open availability
                to continue.
              </p>
            </Empty>
          )}
          {ranked.slice(0, 3).map(({ p, shared }) => (
            <div className="suggestion" key={p.userId}>
              <Avatar name={p.name} />
              <div>
                <h3>{p.name}</h3>
                <p>{p.organization || p.path}</p>
                <p>
                  {shared.length
                    ? `Shared guidance · ${shared.join(", ")}`
                    : "No shared guidance areas. Review suitability before assigning."}
                </p>
              </div>
              <button
                className={`btn ${mentorId === p.userId ? "primary" : "secondary"}`}
                aria-pressed={mentorId === p.userId}
                onClick={() => setMentorId(p.userId)}
              >
                {mentorId === p.userId ? "Selected" : "Select"}
              </button>
            </div>
          ))}
          {eligible.length > 3 && (
            <label>
              All eligible mentors
              <select
                value={mentorId}
                onChange={(e) => setMentorId(e.target.value)}
              >
                <option value="">Choose a mentor</option>
                {ranked.map(({ p }) => (
                  <option key={p.userId} value={p.userId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mentorId && (
            <button
              className="btn primary"
              disabled={busy}
              onClick={() =>
                void save({ action: "assign", requestId: r.id, mentorId })
              }
            >
              Confirm mentor assignment
            </button>
          )}
          <button className="btn ghost" onClick={() => setClosing(!closing)}>
            Close unmatched request
          </button>
          {closing && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void save({
                  action: "closeRequest",
                  id: r.id,
                  reason: String(new FormData(e.currentTarget).get("reason")),
                });
              }}
            >
              <label>
                Reason
                <textarea name="reason" required maxLength={500} />
              </label>
              <button className="btn secondary" disabled={busy}>
                Confirm request closure
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
export function Requests({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("submitted");
  const [open, setOpen] = useState("");
  const requests = data.requests.filter(
    (r) =>
      (!filter || r.status === filter) &&
      `${r.name} ${r.goal}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="panel stack">
      <div className="request-tools">
        <div className="search-field">
          <Icon name="search" />
          <input
            aria-label="Search requests"
            placeholder="Search student or goal"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          aria-label="Request status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="submitted">Unmatched</option>
          <option value="matched">Matched</option>
          <option value="closed">Closed</option>
          <option value="">All requests</option>
        </select>
      </div>
      {!requests.length && <Empty title="No requests in this view" />}
      {requests.map((r) => (
        <div className="admin-record" key={r.id}>
          <div className="row between">
            <div className="row">
              <Avatar name={r.name} />
              <div>
                <h3>{r.name}</h3>
                <p>
                  {r.goal.slice(0, 110)}
                  {r.goal.length > 110 ? "..." : ""}
                </p>
                <small>Submitted {date(r.createdAt)}</small>
              </div>
            </div>
            <button
              className="btn secondary"
              onClick={() => setOpen(open === r.id ? "" : r.id)}
            >
              {open === r.id ? "Close" : "Review request"}
            </button>
          </div>
          {open === r.id && (
            <RequestReview data={data} r={r} save={save} busy={busy} />
          )}
        </div>
      ))}
    </div>
  );
}
function Stats({ data }: { data: Workspace }) {
  const stats = [
    {
      label: "Registered students",
      value: data.profiles.filter((p) => p.role === "student").length,
      icon: "users",
    },
    {
      label: "Alumni mentors",
      value: data.profiles.filter((p) => p.role === "mentor").length,
      icon: "user",
    },
    {
      label: "Unmatched requests",
      value: data.requests.filter((r) => r.status === "submitted").length,
      icon: "file",
    },
    {
      label: "Active mentorships",
      value: data.mentorships.filter((m) => m.status === "active").length,
      icon: "book",
    },
  ] satisfies {
    label: string;
    value: number;
    icon: "users" | "user" | "file" | "book";
  }[];
  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <div className="row">
            <span>{s.label}</span>
            <Icon name={s.icon} />
          </div>
          <strong>{s.value}</strong>
          <small>Current programme data</small>
        </div>
      ))}
    </div>
  );
}
export function AdminOverview({ data }: { data: Workspace }) {
  const pending = data.profiles.filter((p) => p.verification === "pending");
  const requests = data.requests.filter((r) => r.status === "submitted");
  return (
    <>
      <Stats data={data} />
      <div className="admin-grid">
        <div className="panel">
          <div className="section-heading">
            <h2>Requests awaiting a mentor</h2>
            <Link className="btn ghost" href="/workspace/requests">
              View requests
            </Link>
          </div>
          {requests.slice(0, 5).map((r) => (
            <div className="request-row" key={r.id}>
              <Avatar name={r.name} />
              <div>
                <h3>{r.name}</h3>
                <p>{r.goal.slice(0, 100)}</p>
              </div>
              <Link href="/workspace/requests" className="btn secondary">
                Review
              </Link>
            </div>
          ))}
          {!requests.length && <Empty title="The request queue is clear" />}
        </div>
        <div className="stack">
          <div className="panel">
            <div className="section-heading">
              <h2>Eligibility reviews</h2>
              <Tag color="gold">{pending.length} pending</Tag>
            </div>
            {pending.slice(0, 4).map((p) => (
              <div className="followup" key={p.userId}>
                <h3>{p.name || p.email}</h3>
                <p>
                  {p.role} ·{" "}
                  {p.submittedAt ? date(p.submittedAt) : "Profile incomplete"}
                </p>
              </div>
            ))}
            <Link href="/workspace/verification" className="btn secondary">
              Open verification queue
            </Link>
          </div>
          <div className="reminder">
            <Icon name="shield" />
            <div>
              <strong>Private conversations stay with the pair</strong>
              <p>
                IIC sees mentorship status and session counts. Messages,
                documents, and session details stay private.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
export function Analytics({ data }: { data: Workspace }) {
  const ended = data.mentorships.filter((m) => m.status === "ended");
  const studentFeedback = data.feedback.filter((f) =>
    data.profiles.some((p) => p.userId === f.userId && p.role === "student"),
  );
  const goals = studentFeedback.filter((f) => f.goalStatus === "yes").length;
  const helpful = studentFeedback.filter((f) => f.rating >= 4).length;
  const pct = (n: number, d: number) =>
    d ? `${Math.round((n / d) * 100)}%` : "No responses";
  const figures = [
    { label: "Concluded mentorships", value: String(ended.length) },
    {
      label: "Feedback response rate",
      value: pct(data.feedback.length, ended.length * 2),
    },
    {
      label: "Student goals achieved",
      value: pct(goals, studentFeedback.length),
    },
    {
      label: "Students rating guidance 4 or 5",
      value: pct(helpful, studentFeedback.length),
    },
  ];
  const csv =
    "Metric,Value\n" + figures.map((v) => `${v.label},${v.value}`).join("\n");
  const groups = Array.from(new Set(data.profiles.flatMap((p) => p.interests)))
    .map((area) => ({
      area,
      count: data.profiles.filter(
        (p) => p.role === "student" && p.interests.includes(area),
      ).length,
    }))
    .filter((g) => g.count >= 5)
    .sort((a, b) => b.count - a.count);
  return (
    <div className="stack">
      <Stats data={data} />
      <div className="stats-grid">
        {figures.map((f) => (
          <div className="stat" key={f.label}>
            <div className="row">{f.label}</div>
            <strong className="metric-text">{f.value}</strong>
          </div>
        ))}
      </div>
      <section className="panel stack">
        <div className="row between">
          <h2>Student career interests</h2>
          <a
            className="btn secondary"
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
            download="setu-programme-report.csv"
          >
            Export programme metrics
          </a>
        </div>
        <p className="muted">
          Groups with fewer than five students are hidden to protect identities.
        </p>
        {groups.length ? (
          groups.map((g) => (
            <div key={g.area}>
              <div className="bar-label">
                <span>{g.area}</span>
                <span>{g.count} students</span>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${(g.count / Math.max(...groups.map((g) => g.count))) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <Empty
            title="More participation is needed for grouped reporting"
            icon="chart"
          />
        )}
      </section>
    </div>
  );
}
export function AdminMentorships({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  const [open, setOpen] = useState("");
  return (
    <div className="panel stack">
      {!data.mentorships.length && (
        <Empty title="No mentorships have been assigned yet" icon="users" />
      )}
      {data.mentorships.map((m) => (
        <div className="admin-record" key={m.id}>
          <div className="row between">
            <div>
              <h3>
                {m.studentName} &amp; {m.mentorName}
              </h3>
              <p>
                Matched {date(m.createdAt)} · {m.sessionCount} counted sessions
                · {m.feedbackCount}/2 feedback responses
              </p>
            </div>
            <Tag color={m.status === "active" ? "green" : ""}>{m.status}</Tag>
            <button
              className="btn secondary"
              onClick={() => setOpen(open === m.id ? "" : m.id)}
            >
              {open === m.id ? "Close" : "View status"}
            </button>
          </div>
          {open === m.id && (
            <div className="stack review-details">
              <p>{m.goal}</p>
              {m.endReason && <p>End reason · {m.endReason}</p>}
              {data.feedback
                .filter((f) => f.mentorshipId === m.id)
                .map((f) => (
                  <div className="notice" key={f.userId}>
                    <h3>
                      {f.userId === m.studentId ? "Student" : "Mentor"} feedback
                    </h3>
                    <p>
                      {f.rating}/5 · Goal {f.goalStatus.replaceAll("_", " ")}
                    </p>
                    <p>{f.comment}</p>
                  </div>
                ))}
              {m.status === "active" && (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save({
                      action: "end",
                      id: m.id,
                      category: "other",
                      reason: String(
                        new FormData(e.currentTarget).get("reason"),
                      ),
                    });
                  }}
                >
                  <label>
                    Reason to end this mentorship
                    <textarea name="reason" required maxLength={500} />
                  </label>
                  <button className="btn primary" disabled={busy}>
                    End mentorship
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
export function Followups({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  const automatic = [
    ...data.profiles
      .filter(
        (p) =>
          p.verification === "pending" &&
          p.submittedAt &&
          new Date(data.asOf).getTime() - new Date(p.submittedAt).getTime() >
            (p.role === "student" ? 2 : 5) * 86400000,
      )
      .map((p) => ({
        key: p.userId,
        title: "Verification overdue",
        body: p.name,
        path: "verification",
      })),
    ...data.requests
      .filter(
        (r) =>
          r.status === "submitted" &&
          new Date(data.asOf).getTime() - new Date(r.createdAt).getTime() >
            7 * 86400000,
      )
      .map((r) => ({
        key: r.id,
        title: "Request unmatched for seven days",
        body: r.name,
        path: "requests",
      })),
    ...data.mentorships
      .filter(
        (m) =>
          m.status === "active" &&
          m.sessionCount === 0 &&
          new Date(data.asOf).getTime() - new Date(m.createdAt).getTime() >
            2 * 86400000,
      )
      .map((m) => ({
        key: m.id,
        title: "First session needs attention",
        body: `${m.studentName} and ${m.mentorName}`,
        path: "mentorships",
      })),
  ];
  const manual = data.followups.filter((f) => !f.resolved);
  return (
    <div className="panel stack">
      {!automatic.length && !manual.length && (
        <Empty title="No follow-ups need attention" icon="check" />
      )}
      {automatic.map((f) => (
        <div className="followup row between" key={f.key}>
          <div>
            <Tag color="gold">{f.title}</Tag>
            <h3>{f.body}</h3>
          </div>
          <Link className="btn secondary" href={`/workspace/${f.path}`}>
            Review
          </Link>
        </div>
      ))}
      {manual.map((f) => (
        <form
          className="stack admin-record"
          key={f.id}
          onSubmit={(e) => {
            e.preventDefault();
            void save({
              action: "resolve",
              id: f.id,
              note: String(new FormData(e.currentTarget).get("note")),
            });
          }}
        >
          <h3>{f.kind}</h3>
          <p className="muted">
            {data.mentorships.find((m) => m.id === f.mentorshipId)?.studentName}
          </p>
          <label>
            How was this resolved?
            <textarea name="note" required maxLength={500} />
          </label>
          <button className="btn secondary" disabled={busy}>
            Resolve follow-up
          </button>
        </form>
      ))}
    </div>
  );
}
export function AccessManagement({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  return (
    <div className="stack">
      <form
        className="panel stack"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const values = new FormData(form);
          const role = String(values.get("role"));
          if (role !== "student" && role !== "mentor") return;
          const emails = String(values.get("emails"))
            .split(/[\s,;]+/)
            .filter(Boolean);
          if (
            await save({
              action: "grantAccess",
              emails,
              role,
              reason: String(values.get("reason")),
            })
          )
            form.reset();
        }}
      >
        <h2>Whitelist test accounts</h2>
        <p className="muted">
          Allow specific Google accounts outside the IITM domains to test a
          student or mentor role. They must still complete a profile and receive
          eligibility approval. Admin access is configured separately by the
          site owner.
        </p>
        <label>
          Email addresses
          <textarea
            name="emails"
            required
            maxLength={5000}
            placeholder="One per line, or separated by commas"
          />
        </label>
        <div className="form-grid">
          <label>
            Account role
            <select name="role">
              <option value="student">Student</option>
              <option value="mentor">Alumni mentor</option>
            </select>
          </label>
          <label>
            Reason
            <input
              name="reason"
              required
              maxLength={300}
              placeholder="For example, project evaluation"
            />
          </label>
        </div>
        <button className="btn primary" disabled={busy}>
          Whitelist accounts
        </button>
      </form>
      <section className="panel stack">
        <h2>Account exceptions</h2>
        {!data.accessGrants.length && (
          <Empty title="No test accounts have been whitelisted" icon="shield" />
        )}
        {data.accessGrants.map((g) => (
          <div className="admin-record row between wrap" key={g.email}>
            <div>
              <h3>{g.email}</h3>
              <p>
                {g.role} · {g.reason}
              </p>
              <small>Added {date(g.createdAt)}</small>
            </div>
            <Tag color={g.revokedAt ? "" : "green"}>
              {g.revokedAt ? "Revoked" : "Allowed"}
            </Tag>
            {!g.revokedAt && (
              <button
                className="btn secondary"
                disabled={busy}
                onClick={() =>
                  void save({ action: "revokeAccess", email: g.email })
                }
              >
                Revoke test access
              </button>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
