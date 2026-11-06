"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Brand, Icon } from "./ui";
import { EntryArtwork } from "./entry-artwork";
import { roleSchema, type Role } from "@/lib/domain";
import { z } from "zod";
const signInResponse = z.object({
  url: z.url().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});
const sessionResponse = z
  .object({
    user: z.object({ name: z.string(), role: roleSchema }),
    session: z.object({ expiresAt: z.string() }),
  })
  .nullable();
const identities = {
  student: {
    name: "Student",
    heading: "Bring your questions. Find your direction.",
    body: "Work through your next career decision with an IIT Madras BS alumnus.",
    entry: "Find your mentor",
    eligibility:
      "Use your IITM student account, or an account granted access by IIC.",
    footer: "Your goal is the starting point.",
  },
  mentor: {
    name: "Alumni mentor",
    heading: "Someone could use your experience.",
    body: "Help one BS student work through the questions you once had. Set your availability and make a plan together.",
    entry: "Make time for a student",
    eligibility:
      "Use the Google account whitelisted by IIC. Contact the programme team if you have not been invited yet.",
    footer: "One mentee at a time. On your schedule.",
  },
  admin: {
    name: "IIC staff",
    heading: "Keep the programme moving.",
    body: "Review eligibility, connect students with mentors, and follow up where support is needed.",
    entry: "Programme office",
    eligibility: "Sign in with the Google account on the administrator list.",
    footer: "IIT Madras BS alumni mentorship",
  },
} satisfies Record<
  Role,
  {
    name: string;
    heading: string;
    body: string;
    entry: string;
    eligibility: string;
    footer: string;
  }
>;

export function Entry({
  role,
  domains,
  initialError,
  signInOrigin,
  startGoogle,
}: {
  role: Role;
  domains: string[];
  initialError?: string;
  signInOrigin: string | null;
  startGoogle: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<z.infer<typeof sessionResponse>>(null);
  const [error, setError] = useState(
    initialError
      ? ["state_mismatch", "state_invalid", "state_not_found"].includes(
          initialError,
        )
        ? "Google sign-in expired or was interrupted. Start again in this tab and allow cookies for SETU."
        : "That account could not sign in here. Check your programme access or choose another Google account."
      : "",
  );
  const automaticStart = useRef(false);
  const identity = identities[role];
  useEffect(() => {
    const controller = new AbortController();
    async function check() {
      try {
        const response = await fetch("/api/auth/get-session", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = sessionResponse.safeParse(await response.json());
        if (result.success && !controller.signal.aborted)
          setSession(result.data);
      } catch {
        /* Sign-in stays available when a session cannot be checked. */
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }
    void check();
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from(".entry-heading-line", {
          yPercent: 110,
          duration: 1,
          stagger: 0.1,
          ease: "power3.out",
        });
        gsap.from(".entry-card > *", {
          y: 18,
          opacity: 0,
          duration: 0.65,
          stagger: 0.035,
          ease: "power3.out",
          clearProps: "transform,opacity",
        });
      },
      root,
    );
    return () => {
      controller.abort();
      media.revert();
    };
  }, [role]);
  const login = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      if (!signInOrigin)
        throw new Error(
          "Google sign-in is not configured yet. Please contact the programme team.",
        );
      if (window.location.origin !== signInOrigin) {
        const entry = new URL(`/entry/${role}`, signInOrigin);
        entry.searchParams.set("start", "google");
        window.location.assign(entry);
        return;
      }
      if (session) {
        const signOut = await fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (!signOut.ok)
          throw new Error("Could not switch accounts. Please try again.");
        setSession(null);
      }
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `/auth/complete?entry=${role}`,
          errorCallbackURL: `/entry/${role}`,
        }),
      });
      const result = signInResponse.parse(await response.json());
      if (!response.ok || !result.url)
        throw new Error(
          result.error ?? result.message ?? "Google sign-in could not start.",
        );
      window.location.assign(result.url);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Please try again.",
      );
      setBusy(false);
    }
  }, [role, session, signInOrigin]);
  useEffect(() => {
    if (!startGoogle || checking || automaticStart.current) return;
    automaticStart.current = true;
    const url = new URL(window.location.href);
    url.searchParams.delete("start");
    window.history.replaceState(window.history.state, "", url);
    void login();
  }, [startGoogle, checking, login]);
  return (
    <main ref={root} className="entry-page role-theme" data-role={role}>
      <section className="entry-story">
        <div className="entry-story-top">
          <Brand />
          <span>IIT Madras BS</span>
        </div>
        <div className="entry-statement">
          <span className="entry-eyebrow">{identity.name} / SETU</span>
          <h1>
            <span className="entry-heading-mask">
              <span className="entry-heading-line">{identity.heading}</span>
            </span>
          </h1>
          <p>{identity.body}</p>
        </div>
        <EntryArtwork role={role} />
        <small>{identity.footer}</small>
      </section>
      <section
        className="entry-content"
        aria-label={`${identity.name} sign in`}
      >
        <div className="entry-top">
          <Link href="/" transitionTypes={["nav-back"]}>
            Back to SETU
          </Link>
          <span>Secure entry</span>
        </div>
        <div className="entry-card">
          <nav className="role-links" aria-label="Choose your role">
            {Object.entries(identities).map(([key, item]) => (
              <Link
                key={key}
                href={`/entry/${key}`}
                transitionTypes={["role-switch"]}
                aria-current={key === role ? "page" : undefined}
              >
                {item.name}
              </Link>
            ))}
          </nav>
          <span className="entry-eyebrow">{identity.name} access</span>
          <h2>{identity.entry}</h2>
          <p>{identity.eligibility}</p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {session?.user.role === role && (
            <div className="session-resume">
              <span>Signed in as {session.user.name}</span>
              <Link className="btn primary" href="/workspace">
                Continue to your workspace
              </Link>
            </div>
          )}
          {session && session.user.role !== role && (
            <p className="session-note">
              You are signed in to the{" "}
              {identities[session.user.role].name.toLowerCase()} workspace.{" "}
              <Link href={`/entry/${session.user.role}`}>Continue there</Link>,
              or switch accounts below.
            </p>
          )}
          <button
            className={`btn ${session?.user.role === role ? "secondary" : "primary"} google-button`}
            disabled={busy || checking}
            onClick={() => void login()}
          >
            <Icon name="shield" />
            {busy
              ? "Connecting to Google..."
              : checking
                ? "Checking your session..."
                : session
                  ? "Use another Google account"
                  : "Continue with Google"}
          </button>
          {role === "student" && (
            <div className="eligible-domains">
              <small>Student email domains</small>
              {domains.map((domain) => (
                <span key={domain}>@{domain}</span>
              ))}
            </div>
          )}
          <div className="entry-privacy">
            <Icon name="shield" />
            <span>
              {role === "admin"
                ? "Access is limited to the administrator list."
                : "Google verifies your email. IIC reviews your profile before mentorship begins."}{" "}
              Your session stays signed in for a week and refreshes while you
              use SETU.
            </span>
          </div>
        </div>
        <div className="entry-bottom">
          <Link href="/policies/privacy">Privacy</Link>
          <Link href="/policies/terms">Programme terms</Link>
          <span>Voluntary and free</span>
        </div>
      </section>
    </main>
  );
}
