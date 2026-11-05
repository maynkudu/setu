"use client";
import { useState } from "react";
import type { Mentorship, MentoringSession, Workspace } from "@/lib/domain";
import type { Save } from "./profile";
import { Empty, Icon, Tag } from "./ui";
import Link from "next/link";
export const date = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
export const time = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
function SessionForm({
  m,
  session,
  save,
  busy,
  close,
}: {
  m: Mentorship;
  session?: MentoringSession;
  save: Save;
  busy: boolean;
  close: () => void;
}) {
  const local = session
    ? new Date(
        new Date(session.startsAt).getTime() -
          new Date(session.startsAt).getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 16)
    : "";
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const duration = Number(data.get("duration"));
        if (
          duration !== 30 &&
          duration !== 45 &&
          duration !== 60 &&
          duration !== 90
        )
          return;
        void save({
          action: "session",
          mentorshipId: m.id,
          sessionId: session?.id,
          title: String(data.get("title")),
          startsAt: new Date(String(data.get("startsAt"))).toISOString(),
          duration,
          meetingUrl: String(data.get("meetingUrl")),
        }).then((ok) => {
          if (ok) close();
        });
      }}
    >
      <div className="row between">
        <h2>{session ? "Reschedule session" : "Schedule a session"}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close session form"
          onClick={close}
        >
          <Icon name="x" />
        </button>
      </div>
      <label>
        Session agenda
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={session?.title}
          placeholder="What would you like to work through?"
        />
      </label>
      <div className="form-grid">
        <label>
          Date and time
          <input
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={local}
          />
        </label>
        <label>
          Duration
          <select name="duration" defaultValue={session?.duration ?? 45}>
            {[30, 45, 60, 90].map((v) => (
              <option key={v} value={v}>
                {v} minutes
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted">
        Enter the time in your device&apos;s timezone. Session times in SETU are
        displayed in India Standard Time.
      </p>
      <label>
        Meeting link
        <input
          name="meetingUrl"
          type="url"
          required
          defaultValue={session?.meetingUrl}
          placeholder="https://meet.google.com/..."
        />
      </label>
      <button className="btn primary" disabled={busy}>
        {busy ? "Saving..." : "Save session"}
      </button>
    </form>
  );
}
export function Sessions({
  data,
  m,
  save,
  busy,
}: {
  data: Workspace;
  m: Mentorship;
  save: Save;
  busy: boolean;
}) {
  const [form, setForm] = useState<{ session?: MentoringSession } | null>(null);
  const sessions = data.sessions.filter((s) => s.mentorshipId === m.id);
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted">{m.sessionCount} of 10 counted sessions</span>
        {m.status === "active" && (
          <button
            className="btn primary"
            disabled={busy || m.sessionCount >= 10}
            onClick={() => setForm({})}
          >
            <Icon name="calendar" />
            Schedule session
          </button>
        )}
      </div>
      {form && (
        <SessionForm
          key={form.session?.id ?? "new"}
          m={m}
          session={form.session}
          save={save}
          busy={busy}
          close={() => setForm(null)}
        />
      )}
      <div className="panel">
        <h2>Your session timeline</h2>
        {!sessions.length ? (
          <Empty title="Your first conversation starts here" icon="calendar">
            <p>Agree on a time with your partner, then schedule it above.</p>
          </Empty>
        ) : (
          <div className="session-list">
            {sessions.map((s) => (
              <div className="session-item" key={s.id}>
                <div className="row between">
                  <div>
                    <h3>{s.title}</h3>
                    <p>
                      {time(s.startsAt)} · {s.duration} minutes
                    </p>
                  </div>
                  <Tag color={s.status === "held" ? "green" : ""}>
                    {s.status}
                  </Tag>
                </div>
                <div className="row wrap session-actions">
                  {s.status === "scheduled" && (
                    <>
                      <a
                        className="btn secondary"
                        href={s.meetingUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open meeting
                      </a>
                      <a
                        className="btn secondary"
                        href={`/api/sessions/${s.id}`}
                      >
                        Add to calendar
                      </a>
                    </>
                  )}
                  {m.status === "active" &&
                    new Date(s.startsAt).getTime() >
                      new Date(data.asOf).getTime() &&
                    s.status === "scheduled" && (
                      <>
                        <button
                          className="btn ghost"
                          onClick={() => setForm({ session: s })}
                        >
                          Reschedule
                        </button>
                        <button
                          className="btn ghost"
                          disabled={busy}
                          onClick={() =>
                            void save({
                              action: "sessionStatus",
                              id: s.id,
                              status: "cancelled",
                            })
                          }
                        >
                          Cancel session
                        </button>
                      </>
                    )}
                  {m.status === "active" &&
                    ["held", "scheduled"].includes(s.status) &&
                    new Date(s.startsAt).getTime() <=
                      new Date(data.asOf).getTime() &&
                    new Date(data.asOf).getTime() <
                      new Date(s.startsAt).getTime() +
                        s.duration * 60000 +
                        48 * 3600000 && (
                      <button
                        className="btn ghost"
                        disabled={busy}
                        onClick={() =>
                          void save({
                            action: "sessionStatus",
                            id: s.id,
                            status: "missed",
                          })
                        }
                      >
                        Mark as did not happen
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
export function Messages({
  data,
  m,
  save,
  busy,
}: {
  data: Workspace;
  m: Mentorship;
  save: Save;
  busy: boolean;
}) {
  const [body, setBody] = useState("");
  const messages = data.messages.filter((x) => x.mentorshipId === m.id);
  return (
    <div className="panel stack">
      <div className="section-heading">
        <h2>Your private conversation</h2>
        <Icon name="shield" />
      </div>
      <p className="muted">
        Only you and your matched partner can read this conversation.
      </p>
      <div
        className="messages"
        data-lenis-prevent
        role="log"
        aria-label="Private messages"
      >
        {messages.length ? (
          messages.map((x) => (
            <div
              className={`message ${x.senderId === data.me.userId ? "self" : ""}`}
              key={x.id}
            >
              <p>{x.body}</p>
              <small>
                {x.senderId === data.me.userId ? "You" : "Your partner"} ·{" "}
                {time(x.createdAt)}
              </small>
            </div>
          ))
        ) : (
          <Empty title="Say hello to your partner" icon="message" />
        )}
      </div>
      {m.status === "active" ? (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            void save({ action: "message", mentorshipId: m.id, body }).then(
              (ok) => {
                if (ok) setBody("");
              },
            );
          }}
        >
          <label>
            Your message
            <textarea
              maxLength={2000}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <div className="row between">
            <small className="muted">{body.length}/2,000 characters</small>
            <button className="btn primary" disabled={busy || !body.trim()}>
              Send message
            </button>
          </div>
        </form>
      ) : (
        <p className="notice">
          This conversation is read-only. Messages and documents are deleted 30
          days after the mentorship ends.
        </p>
      )}
    </div>
  );
}
export function Documents({
  data,
  m,
  save,
  busy,
}: {
  data: Workspace;
  m: Mentorship;
  save: Save;
  busy: boolean;
}) {
  const documents = data.documents.filter((x) => x.mentorshipId === m.id);
  return (
    <div className="panel stack">
      <h2>Shared documents</h2>
      <p className="muted">
        PDF, DOCX, PPTX, JPG, or PNG. Up to 5 MB each and 20 documents per
        mentorship.
      </p>
      {m.status === "active" && (
        <form
          className="upload-form"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = new FormData(form);
            data.set("mentorshipId", m.id);
            void save(data).then((ok) => {
              if (ok) form.reset();
            });
          }}
        >
          <label>
            Choose a document
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png"
            />
          </label>
          <button
            className="btn primary"
            disabled={busy || documents.length >= 20}
          >
            Upload document
          </button>
        </form>
      )}
      {documents.length ? (
        documents.map((d) => (
          <div key={d.id} className="document-row row">
            <Icon name="file" />
            <div>
              <a href={`/api/documents/${d.id}`}>{d.name}</a>
              <small>{(d.size / 1024).toFixed(1)} KB</small>
            </div>
            <a className="btn secondary" href={`/api/documents/${d.id}`}>
              Download
            </a>
            {m.status === "active" && d.uploaderId === data.me.userId && (
              <button
                className="btn ghost"
                disabled={busy}
                onClick={() =>
                  void save({ action: "deleteDocument", id: d.id })
                }
              >
                Remove
              </button>
            )}
          </div>
        ))
      ) : (
        <Empty title="Keep your work in one place" icon="file">
          <p>
            Share a resume, reading material, or a project for your sessions.
          </p>
        </Empty>
      )}
    </div>
  );
}
export function Feedback({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  const ended = data.mentorships.filter((m) => m.status === "ended");
  return (
    <div className="stack">
      {!ended.length && (
        <div className="panel">
          <Empty title="Feedback opens when your mentorship ends">
            <p>
              You and your partner each have five days to share your assessment.
            </p>
          </Empty>
        </div>
      )}
      {ended.map((m) => {
        const f = data.feedback.find(
          (f) => f.mentorshipId === m.id && f.userId === data.me.userId,
        );
        return (
          <div className="panel stack" key={m.id}>
            <h2>
              Mentorship with{" "}
              {data.me.role === "student" ? m.mentorName : m.studentName}
            </h2>
            <p>
              <strong>Your original goal</strong>
              <br />
              {m.goal}
            </p>
            <p>
              <strong>Your uncertainty</strong>
              <br />
              {m.uncertainty}
            </p>
            {f ? (
              <div className="notice">
                <Tag color="green">Feedback submitted</Tag>
                <p>{f.comment}</p>
              </div>
            ) : m.endedAt &&
              new Date(data.asOf).getTime() >
                new Date(m.endedAt).getTime() + 5 * 86400000 ? (
              <p className="muted">The five-day feedback period has closed.</p>
            ) : (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = new FormData(e.currentTarget);
                  const goalStatus = String(v.get("goalStatus"));
                  if (
                    goalStatus !== "yes" &&
                    goalStatus !== "partly" &&
                    goalStatus !== "in_progress"
                  )
                    return;
                  void save({
                    action: "feedback",
                    mentorshipId: m.id,
                    rating: Number(v.get("rating")),
                    goalStatus,
                    comment: String(v.get("comment")),
                    supportNeeded: v.get("supportNeeded") === "on",
                  });
                }}
              >
                <div className="form-grid">
                  <label>
                    How helpful was the mentorship?
                    <select name="rating">
                      {[5, 4, 3, 2, 1].map((v) => (
                        <option value={v} key={v}>
                          {v} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Was the original goal achieved?
                    <select name="goalStatus">
                      <option value="yes">Yes</option>
                      <option value="partly">Partly</option>
                      <option value="in_progress">Still in progress</option>
                    </select>
                  </label>
                </div>
                <label>
                  What changed, and what would you improve?
                  <textarea name="comment" required maxLength={2000} />
                </label>
                {data.me.role === "mentor" && (
                  <label className="check-label">
                    <input type="checkbox" name="supportNeeded" />I recommend
                    further IIC support for this student.
                  </label>
                )}
                <p className="muted">
                  Your assessment is visible to IIC. Your partner cannot read
                  it.
                </p>
                <button className="btn primary" disabled={busy}>
                  Submit feedback
                </button>
              </form>
            )}
          </div>
        );
      })}
      {data.checkins.map((c) => (
        <div className="panel stack" key={c.id}>
          <h2>Career follow-up</h2>
          <p className="muted">
            Due {date(c.dueAt)} · {c.status}
          </p>
          {c.status === "pending" &&
            new Date(c.dueAt).getTime() <= new Date(data.asOf).getTime() && (
              <form
                className="stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = new FormData(e.currentTarget);
                  const goalStatus = String(v.get("goalStatus"));
                  if (
                    goalStatus !== "yes" &&
                    goalStatus !== "partly" &&
                    goalStatus !== "in_progress"
                  )
                    return;
                  void save({
                    action: "checkin",
                    id: c.id,
                    goalStatus,
                    comment: String(v.get("comment")),
                  });
                }}
              >
                <label>
                  Your goal now
                  <select name="goalStatus">
                    <option value="yes">Achieved</option>
                    <option value="partly">Partly achieved</option>
                    <option value="in_progress">Still in progress</option>
                  </select>
                </label>
                <label>
                  What has happened since your mentorship?
                  <textarea name="comment" required maxLength={2000} />
                </label>
                <button className="btn primary" disabled={busy}>
                  Submit check-in
                </button>
              </form>
            )}
        </div>
      ))}
    </div>
  );
}
export function MentorshipOverview({
  data,
  m,
  save,
  busy,
}: {
  data: Workspace;
  m: Mentorship;
  save: Save;
  busy: boolean;
}) {
  const [ending, setEnding] = useState(false);
  const partner = data.profiles.find(
    (p) => p.userId === (data.me.role === "student" ? m.mentorId : m.studentId),
  );
  const next = data.sessions.find(
    (s) =>
      s.mentorshipId === m.id &&
      s.status === "scheduled" &&
      new Date(s.startsAt).getTime() > new Date(data.asOf).getTime(),
  );
  return (
    <div className="overview-grid">
      <div className="stack">
        <section className="session-banner">
          <div className="overline">
            <Icon name="calendar" />
            {next ? "YOUR NEXT SESSION" : "YOUR MENTORSHIP"}
          </div>
          <h2>{next?.title ?? "Make time for your first conversation"}</h2>
          <p>
            {next
              ? `${time(next.startsAt)} · ${next.duration} minutes`
              : "Agree on a time and schedule it together."}
          </p>
          <div className="row">
            {next && (
              <a
                className="btn light"
                href={next.meetingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open meeting
              </a>
            )}
            <Link className="btn light" href="/workspace/sessions">
              {next ? "View sessions" : "Schedule a session"}
            </Link>
            <span className="session-info">
              {m.sessionCount} of 10 sessions
            </span>
          </div>
        </section>
        <section className="panel stack">
          <div className="row between">
            <h2>
              {data.me.role === "student"
                ? "Your alumni mentor"
                : "Your mentee"}
            </h2>
            <Tag color="green">IIC approved</Tag>
          </div>
          <h3>{partner?.name}</h3>
          <p className="muted">{partner?.organization || partner?.path}</p>
          <p>{partner?.bio}</p>
          <div className="row wrap">
            {partner?.interests.map((v) => (
              <Tag key={v}>{v}</Tag>
            ))}
          </div>
          <div className="partner-contact">
            {partner && (
              <>
                <a href={`mailto:${partner.email}`}>{partner.email}</a>
                {partner.phone && (
                  <a href={`tel:${partner.phone}`}>{partner.phone}</a>
                )}
                {partner.social && (
                  <a href={partner.social} target="_blank" rel="noreferrer">
                    Professional profile
                  </a>
                )}
              </>
            )}
          </div>
          <div className="row wrap">
            <Link className="btn secondary" href="/workspace/messages">
              <Icon name="message" />
              Message
            </Link>
            <Link className="btn secondary" href="/workspace/documents">
              <Icon name="file" />
              Shared documents
            </Link>
          </div>
        </section>
      </div>
      <div className="stack">
        <section className="panel goal-panel">
          <div className="goal-icon">
            <Icon name="target" />
          </div>
          <Tag color="gold">Your original goal</Tag>
          <h3>{m.goal}</h3>
          <p>{m.uncertainty}</p>
          <div className="goal-meta">
            <span>Matched {date(m.createdAt)}</span>
            <Tag color="green">Active</Tag>
          </div>
        </section>
        <section className="panel stack">
          <h2>First-session checklist</h2>
          {[
            "Introduce yourself and your background",
            "Talk through the goal and uncertainty",
            "Agree on the next step and session cadence",
          ].map((v) => (
            <label className="check-label" key={v}>
              <input type="checkbox" />
              {v}
            </label>
          ))}
        </section>
        <section className="panel">
          <button className="btn ghost" onClick={() => setEnding(!ending)}>
            End mentorship
          </button>
          {ending && (
            <form
              className="stack end-form"
              onSubmit={(e) => {
                e.preventDefault();
                const v = new FormData(e.currentTarget);
                const category = String(v.get("category"));
                if (
                  category !== "goal_met" &&
                  category !== "personal" &&
                  category !== "conduct" &&
                  category !== "other"
                )
                  return;
                void save({
                  action: "end",
                  id: m.id,
                  reason: String(v.get("reason")),
                  category,
                });
              }}
            >
              <p>
                Future sessions will be cancelled. Your shared space becomes
                read-only and feedback opens for five days.
              </p>
              <label>
                Reason
                <select name="category">
                  <option value="goal_met">Goal achieved</option>
                  <option value="personal">Personal circumstances</option>
                  <option value="conduct">Conduct concern</option>
                  <option value="other">Other</option>
                </select>
              </label>
              <label>
                Details
                <textarea name="reason" required maxLength={500} />
              </label>
              <button className="btn primary" disabled={busy}>
                Confirm end of mentorship
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
