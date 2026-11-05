"use client";
import { useState } from "react";
import Link from "next/link";
import { Brand, Icon } from "./ui";
import type { Role } from "@/lib/domain";
import { z } from "zod";
const signInResponse = z.object({
  url: z.url().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});
export function Entry({
  role,
  domains,
  initialError,
}: {
  role: Role;
  domains: string[];
  initialError: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(
    initialError
      ? "That Google account could not sign in here. Please use an eligible account listed below."
      : "",
  );
  const name =
    role === "admin"
      ? "IIC staff"
      : role === "student"
        ? "Student"
        : "Alumni mentor";
  async function login() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const response = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: `/auth/complete?entry=${role}`,
          errorCallbackURL: `/entry/${role}?error=account`,
        }),
      });
      const result = signInResponse.parse(await response.json());
      if (!response.ok || !result.url)
        throw new Error(
          result.error ?? result.message ?? "Google sign-in could not start.",
        );
      window.location.assign(result.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      setBusy(false);
    }
  }
  return (
    <main className="entry-page">
      <div className="entry-story">
        <Brand />
        <div>
          <div className="program-line">IIT Madras BS alumni mentorship</div>
          <h1>A clearer next step starts with a conversation.</h1>
          <p>
            Ask the questions that matter to you. Work through them with someone
            who understands the journey.
          </p>
        </div>
        <small>One student. One alumnus. IIC support.</small>
      </div>
      <div className="entry-content">
        <Link href="/" className="btn ghost">
          Back to SETU
        </Link>
        <div className="entry-card">
          <span className="tag red">{name} entry</span>
          <h2>
            {initialError ? "Choose your IITM account" : "Welcome to SETU"}
          </h2>
          <p>
            {role === "admin"
              ? "Sign in with the Google account on the administrator list."
              : "Use your eligible IITM Google account or a whitelisted test account."}
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn primary google-button"
            disabled={busy}
            onClick={() => void login()}
          >
            <Icon name="shield" />
            {busy ? "Connecting to Google..." : "Continue with Google"}
          </button>
          {role !== "admin" && (
            <div className="eligible-domains">
              <small>
                Eligible {role === "student" ? "student" : "alumni"} email
                domains
              </small>
              {domains.map((d) => (
                <span key={d}>@{d}</span>
              ))}
            </div>
          )}
          <div className="entry-privacy">
            <Icon name="shield" />
            <span>
              Google verifies your email. IIC must approve your{" "}
              {role === "mentor"
                ? "alumni"
                : role === "student"
                  ? "degree-level"
                  : "staff"}{" "}
              eligibility before you can use the mentorship workspace.
            </span>
          </div>
          <div className="role-links">
            <Link href="/entry/student">Student</Link>
            <Link href="/entry/mentor">Alumni mentor</Link>
            <Link href="/entry/admin">IIC staff</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
