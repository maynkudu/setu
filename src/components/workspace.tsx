"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { WorkspaceNavigation } from "./blank/switch-on-hover-tabs";
import { z } from "zod";
import { areas, workspaceSchema, type Workspace } from "@/lib/domain";
import { Avatar, Brand, Empty, Icon, Tag, type IconName } from "./ui";
import { ProfileForm, type Save } from "./profile";
import {
  Documents,
  Feedback,
  MentorshipOverview,
  Messages,
  Sessions,
  date,
  time,
} from "./mentorship";
import {
  AccessManagement,
  AdminMentorships,
  AdminOverview,
  Analytics,
  Followups,
  Requests,
  Verification,
} from "./admin";
const studentNav: { path: string; label: string; icon: IconName }[] = [
  { path: "overview", label: "Overview", icon: "home" },
  { path: "request", label: "Mentoring request", icon: "target" },
  { path: "sessions", label: "Sessions", icon: "calendar" },
  { path: "messages", label: "Messages", icon: "message" },
  { path: "documents", label: "Documents", icon: "file" },
  { path: "feedback", label: "Feedback", icon: "book" },
];
const adminNav: { path: string; label: string; icon: IconName }[] = [
  { path: "overview", label: "Overview", icon: "home" },
  { path: "requests", label: "Requests", icon: "file" },
  { path: "verification", label: "Verification", icon: "shield" },
  { path: "mentors", label: "Alumni mentors", icon: "users" },
  { path: "students", label: "Students", icon: "user" },
  { path: "mentorships", label: "Mentorships", icon: "book" },
  { path: "followups", label: "Follow-ups", icon: "bell" },
  { path: "analytics", label: "Analytics", icon: "chart" },
  { path: "access", label: "Account access", icon: "shield" },
];
const commonNav: { path: string; label: string; icon: IconName }[] = [
  { path: "profile", label: "My profile", icon: "user" },
  { path: "notifications", label: "Notifications", icon: "bell" },
];
function RequestForm({
  data,
  save,
  busy,
}: {
  data: Workspace;
  save: Save;
  busy: boolean;
}) {
  const request = data.requests.find((r) => r.status !== "closed");
  if (request)
    return (
      <div className="panel stack">
        <div className="row between">
          <h2>Your mentoring request</h2>
          <Tag color={request.status === "matched" ? "green" : "gold"}>
            {request.status === "submitted"
              ? "Awaiting IIC assignment"
              : "Matched"}
          </Tag>
        </div>
        <h3>{request.goal}</h3>
        <p>{request.uncertainty}</p>
        <div className="row wrap">
          {request.areas.map((v) => (
            <Tag key={v}>{v}</Tag>
          ))}
        </div>
        <p className="muted">
          Timeline · {request.timeline} · Submitted {date(request.createdAt)}
        </p>
        {request.status === "submitted" && (
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void save({
                action: "closeRequest",
                id: request.id,
                reason: String(new FormData(e.currentTarget).get("reason")),
              });
            }}
          >
            <p className="notice">
              IIC will review your request and assign an eligible alumnus. Your
              mentor will appear here once assigned.
            </p>
            <label>
              Reason to withdraw, if needed
              <input name="reason" required maxLength={500} />
            </label>
            <button className="btn secondary" disabled={busy}>
              Withdraw unmatched request
            </button>
          </form>
        )}
      </div>
    );
  return (
    <form
      className="panel stack"
      onSubmit={(e) => {
        e.preventDefault();
        const v = new FormData(e.currentTarget);
        const timeline = String(v.get("timeline"));
        if (
          timeline !== "1 month" &&
          timeline !== "3 months" &&
          timeline !== "6 months" &&
          timeline !== "Not sure"
        )
          return;
        void save({
          action: "request",
          goal: String(v.get("goal")),
          uncertainty: String(v.get("uncertainty")),
          areas: v.getAll("areas").map(String),
          timeline,
          consent: true,
        });
      }}
    >
      <h2>What would you like guidance on?</h2>
      <label>
        Your career goal
        <textarea
          name="goal"
          required
          maxLength={1000}
          placeholder="The decision or next step you want to work towards"
        />
      </label>
      <label>
        What are you uncertain about?
        <textarea
          name="uncertainty"
          required
          maxLength={1000}
          placeholder="The questions you would like to discuss with your mentor"
        />
      </label>
      <fieldset>
        <legend>Guidance areas</legend>
        <div className="topic-options">
          {areas.map((v) => (
            <label key={v}>
              <input name="areas" type="checkbox" value={v} />
              {v}
            </label>
          ))}
        </div>
      </fieldset>
      <label>
        When do you want to reach your goal?
        <select name="timeline">
          <option>1 month</option>
          <option>3 months</option>
          <option>6 months</option>
          <option>Not sure</option>
        </select>
      </label>
      <label className="check-label">
        <input type="checkbox" required />I consent to sharing this request and
        my profile with IIC and my assigned mentor.
      </label>
      <button className="btn primary" disabled={busy}>
        Submit mentoring request
      </button>
    </form>
  );
}
const mutationResponse = z.object({
  error: z.string().optional(),
  saved: z.boolean().optional(),
  complete: z.boolean().optional(),
});
export function WorkspaceApp({
  initial,
  section,
  supportEmail,
}: {
  initial: Workspace;
  section: string;
  supportEmail?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const shell = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);
  const menu = useRef<HTMLDialogElement>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch("/api/workspace", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.status === 401) {
        router.push(`/entry/${initial.me.role}`);
        return;
      }
      if (response.status === 403) {
        router.push(`/entry/${initial.me.role}?error=access`);
        return;
      }
      if (!response.ok) throw new Error("Could not refresh your workspace.");
      const next = workspaceSchema.parse(await response.json());
      if (!controller.signal.aborted) {
        setData(next);
        setError("");
      }
    } catch (failure) {
      if (!controller.signal.aborted) throw failure;
    } finally {
      if (request.current === controller) setRefreshing(false);
    }
  }, [router, initial.me.role]);
  const refreshInBackground = useCallback(() => {
    void refresh().catch(() =>
      setError(
        "Could not update your workspace. Your last loaded data is still shown.",
      ),
    );
  }, [refresh]);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      refreshInBackground();
      document.getElementById("workspace-main")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [pathname, refreshInBackground]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refreshInBackground();
    }, 30000);
    const focus = refreshInBackground;
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", focus);
    };
  }, [refreshInBackground]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  const save: Save = async (action) => {
    setBusy(true);
    setError("");
    try {
      if (action instanceof FormData) {
        const file = action.get("file");
        if (
          !(file instanceof File) ||
          file.size > 5 * 1024 * 1024 ||
          !file.size
        )
          throw new Error("Choose a file up to 5 MB.");
        const id = crypto.randomUUID(),
          parts = Math.ceil(file.size / 1048576);
        for (let part = 0; part < parts; part++) {
          const chunk = new FormData();
          chunk.set("id", id);
          chunk.set("mentorshipId", String(action.get("mentorshipId")));
          chunk.set("name", file.name);
          chunk.set("size", String(file.size));
          chunk.set("parts", String(parts));
          chunk.set("part", String(part));
          chunk.set("file", file.slice(part * 1048576, (part + 1) * 1048576));
          const response = await fetch("/api/uploads", {
            method: "POST",
            body: chunk,
          });
          const result = mutationResponse.parse(await response.json());
          if (!response.ok)
            throw new Error(result.error ?? "Upload failed. Please try again.");
          if (part === parts - 1 && !result.complete)
            throw new Error("The upload is incomplete. Please try again.");
        }
      } else {
        const response = await fetch("/api/workspace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(action),
        });
        const result = mutationResponse.parse(await response.json());
        if (!response.ok)
          throw new Error(result.error ?? "Could not save your change.");
      }
      await refresh();
      setNotice("Your change has been saved.");
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok)
        throw new Error("Could not sign out. Please try again.");
      router.push("/");
      router.refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not sign out. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const me = data.me;
  const admin = me.role === "admin";
  const approved = me.verification === "approved";
  const active = data.mentorships.find((m) => m.status === "active");
  const m = active ?? data.mentorships[0];
  const nav: { path: string; label: string; icon: IconName }[] = approved
    ? [
        ...(admin
          ? adminNav
          : studentNav.filter(
              (n) => me.role === "student" || n.path !== "request",
            )),
        ...commonNav.filter((n) => !admin || n.path !== "profile"),
      ]
    : [{ path: "profile", label: "My profile", icon: "user" }];
  const requested = pathname.split("/")[2] ?? section;
  const current = approved
    ? (nav.find((n) => n.path === requested)?.path ?? "overview")
    : "profile";
  useEffect(() => {
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.fromTo(
          ".workspace-content",
          { y: 10, opacity: 0.65 },
          { y: 0, opacity: 1, duration: 0.22, ease: "power2.out" },
        );
      },
      shell,
    );
    return () => media.revert();
  }, [current]);
  const title = nav.find((n) => n.path === current)?.label ?? "Overview";
  let content;
  if (current === "profile")
    content = (
      <ProfileForm
        key={`${me.verification}:${me.submittedAt}`}
        me={me}
        save={save}
        busy={busy}
        active={Boolean(active)}
      />
    );
  else if (current === "notifications")
    content = (
      <div className="panel stack">
        <div className="row between">
          <h2>Your updates</h2>
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => void save({ action: "readNotifications" })}
          >
            Mark all as read
          </button>
        </div>
        {data.notifications.length ? (
          data.notifications.map((n) => (
            <div className="notification" key={n.id}>
              <div className="row">
                <strong>{n.body}</strong>
                {!n.read && <Tag color="red">New</Tag>}
              </div>
              <small>{time(n.createdAt)}</small>
            </div>
          ))
        ) : (
          <Empty title="You're up to date" icon="bell" />
        )}
      </div>
    );
  else if (admin) {
    switch (current) {
      case "requests":
        content = <Requests data={data} save={save} busy={busy} />;
        break;
      case "verification":
        content = <Verification data={data} save={save} busy={busy} />;
        break;
      case "mentors":
      case "students":
        content = (
          <Verification
            data={data}
            save={save}
            busy={busy}
            list={current === "mentors" ? "mentor" : "student"}
          />
        );
        break;
      case "mentorships":
        content = <AdminMentorships data={data} save={save} busy={busy} />;
        break;
      case "followups":
        content = <Followups data={data} save={save} busy={busy} />;
        break;
      case "analytics":
        content = <Analytics data={data} />;
        break;
      case "access":
        content = <AccessManagement data={data} save={save} busy={busy} />;
        break;
      default:
        content = <AdminOverview data={data} />;
    }
  } else if (current === "request" && me.role === "student")
    content = <RequestForm data={data} save={save} busy={busy} />;
  else if (current === "feedback")
    content = <Feedback data={data} save={save} busy={busy} />;
  else if (current === "sessions" && m)
    content = <Sessions data={data} m={m} save={save} busy={busy} />;
  else if (current === "messages" && m)
    content = <Messages data={data} m={m} save={save} busy={busy} />;
  else if (current === "documents" && m)
    content = <Documents data={data} m={m} save={save} busy={busy} />;
  else if (active)
    content = (
      <MentorshipOverview data={data} m={active} save={save} busy={busy} />
    );
  else
    content = (
      <div className="panel">
        <Empty
          title={
            m
              ? "Your mentorship has concluded"
              : me.role === "student"
                ? "Your next step starts here"
                : "Ready to share your experience"
          }
          icon="users"
        >
          <p>
            {m
              ? "Share your feedback and keep track of your next career step."
              : me.role === "student"
                ? data.requests.some((r) => r.status === "submitted")
                  ? "IIC is reviewing your request. Your assigned mentor will appear here."
                  : "Tell IIC about your goal so they can find a suitable alumni mentor."
                : "IIC will assign a student whose needs fit your mentoring domains."}
          </p>
          <Link
            className="btn primary"
            href={
              m
                ? "/workspace/feedback"
                : me.role === "student"
                  ? "/workspace/request"
                  : "/workspace/profile"
            }
          >
            {m
              ? "Share feedback"
              : me.role === "student"
                ? "View mentoring request"
                : "View profile"}
          </Link>
          {m && (
            <Link className="btn secondary" href="/workspace/messages">
              View archived shared space
            </Link>
          )}
        </Empty>
      </div>
    );
  return (
    <div
      ref={shell}
      className="app-shell role-theme"
      data-role={me.role}
      onClickCapture={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        const anchor =
          event.target instanceof Element ? event.target.closest("a") : null;
        if (
          !(anchor instanceof HTMLAnchorElement) ||
          anchor.hasAttribute("download") ||
          (anchor.target && anchor.target !== "_self")
        )
          return;
        const destination = new URL(anchor.href);
        const next = destination.pathname.split("/")[2] ?? "overview";
        if (
          destination.origin !== location.origin ||
          !/^\/workspace(?:\/[^/]+)?\/?$/.test(destination.pathname) ||
          !nav.some((n) => n.path === next)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        menu.current?.close();
        if (destination.pathname !== pathname)
          window.history.pushState(
            null,
            "",
            destination.pathname + destination.search + destination.hash,
          );
      }}
    >
      <a className="skip-link" href="#workspace-main">
        Skip to workspace
      </a>
      <aside className="sidebar">
        <div>
          <Brand />
          <p className="program">
            {admin
              ? "IIC programme office"
              : me.role === "mentor"
                ? "The mentor workspace"
                : "Your student workspace"}
          </p>
        </div>
        <WorkspaceNavigation
          items={nav}
          current={current}
          unread={data.notifications.filter((n) => !n.read).length}
          label="Workspace navigation"
        />
        <div className="support">
          <strong>Need IIC support?</strong>
          <p>Ask about eligibility, assignments or a programme concern.</p>
          {supportEmail ? (
            <a href={`mailto:${supportEmail}`}>Contact the programme</a>
          ) : (
            <Link href="/workspace/notifications">View programme updates</Link>
          )}
        </div>
        <div className="user row">
          <Avatar name={me.name} />
          <div>
            <strong>{me.name || "New account"}</strong>
            <small>
              {admin
                ? "IIC administrator"
                : me.role === "student"
                  ? "BS student"
                  : "Alumni mentor"}
            </small>
          </div>
        </div>
        <button
          className="btn secondary"
          disabled={busy}
          onClick={() => void logout()}
        >
          Sign out
        </button>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <span className="breadcrumb">
            Workspace / <strong>{title}</strong>
          </span>
          <span className="mobile-brand">
            <Brand />
          </span>
          <div className="row">
            <Tag color={approved ? "green" : "gold"}>
              {approved ? "IIC approved" : "Eligibility review"}
            </Tag>
            <Link
              className="icon-button"
              href="/workspace/notifications"
              aria-label="Notifications"
            >
              <Icon name="bell" />
              {data.notifications.some((n) => !n.read) && (
                <span className="notification-dot" />
              )}
            </Link>
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => menu.current?.showModal()}
            >
              <Icon name="menu" />
            </button>
          </div>
        </header>
        <main className="app-body" id="workspace-main" tabIndex={-1}>
          <div className="page-head">
            <div>
              <span className="workspace-eyebrow">
                {admin
                  ? "Programme operations"
                  : me.role === "mentor"
                    ? "Share what you learned"
                    : "IIT Madras BS mentorship"}
              </span>
              <h1>
                {current === "overview"
                  ? `Welcome, ${me.name.split(" ")[0] || "there"}`
                  : title}
              </h1>
              <p>
                {current === "overview"
                  ? admin
                    ? "Requests, eligibility reviews, and the next actions for IIC."
                    : me.role === "mentor"
                      ? "Your mentee, their progress, and your next conversation."
                      : "Your goal, your conversations, and what comes next."
                  : me.email}
              </p>
            </div>
            <div className="workspace-sync" role="status">
              <span>
                {refreshing ? "Updating workspace..." : "Workspace up to date"}
              </span>
              <span className="date-label">{date(data.asOf)}</span>
            </div>
          </div>
          {error && (
            <div className="error error-banner" role="alert">
              {error}
              <button
                className="btn ghost"
                onClick={refreshInBackground}
                disabled={refreshing}
              >
                Retry
              </button>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <Icon name="x" />
              </button>
            </div>
          )}
          {me.role === "mentor" && approved && current === "overview" && (
            <div className="availability">
              <div>
                <strong>
                  {me.available
                    ? "Open to a new mentorship"
                    : "Taking a break from new mentorships"}
                </strong>
                <p>
                  {active
                    ? "Your current mentorship continues. One mentee at a time."
                    : "IIC uses your availability when assigning a student."}
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() =>
                  void save({
                    action: "availability",
                    available: !me.available,
                  })
                }
              >
                {me.available ? "Take a break" : "Open availability"}
              </button>
            </div>
          )}
          <div className="workspace-content" key={current}>
            {content}
          </div>
        </main>
      </div>
      <dialog ref={menu} className="dialog mobile-dialog" data-lenis-prevent>
        <div className="dialog-header">
          <h2>Workspace navigation</h2>
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={() => menu.current?.close()}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="dialog-body">
          <WorkspaceNavigation
            items={nav}
            current={current}
            unread={data.notifications.filter((n) => !n.read).length}
            label="Mobile navigation"
          />
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </dialog>
      <div className="toast" role="status">
        {notice}
      </div>
    </div>
  );
}
