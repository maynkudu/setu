"use client";
import { areas, type Action, type Profile } from "@/lib/domain";
import { useState } from "react";
import { Tag } from "./ui";
export type Save = (action: Action | FormData) => Promise<boolean>;
export function ProfileForm({
  me,
  save,
  busy,
  active,
}: {
  me: Profile;
  save: Save;
  busy: boolean;
  active: boolean;
}) {
  const [profile, setProfile] = useState({
    name: me.name,
    rollNumber: me.rollNumber,
    bio: me.bio,
    interests: me.interests,
    skills: me.skills,
    path: me.path,
    phone: me.phone,
    social: me.social,
    graduationYear: me.graduationYear,
    organization: me.organization,
    experience: me.experience,
    consent: me.consent,
  });
  const identityLocked =
    me.verification === "pending" || me.verification === "approved";
  const disabled =
    (me.role === "student" && active) || me.verification === "not_eligible";
  const set = <K extends keyof typeof profile>(
    key: K,
    value: (typeof profile)[K],
  ) => setProfile({ ...profile, [key]: value });
  return (
    <div className="stack">
      <div className="panel review-status">
        <div className="row between">
          <h2>Programme eligibility</h2>
          <Tag color={me.verification === "approved" ? "green" : "gold"}>
            {me.verification.replaceAll("_", " ")}
          </Tag>
        </div>
        <p>
          {me.verification === "draft"
            ? me.role === "student"
              ? "You are signed in. Degree-level eligibility has not been verified yet. Complete your profile so college staff can review your status. Mentorship access opens after approval."
              : "You are signed in. Complete your alumni profile for IIC verification. Mentorship access opens after approval."
            : me.verification === "approved"
              ? "IIC has approved your programme eligibility."
              : me.verification === "pending"
                ? me.role === "student"
                  ? "Your profile has been submitted. College staff must verify that you are at degree level before you can request a mentor. You can return here to check your approval status."
                  : "Your alumni profile is awaiting IIC approval. You can use the mentorship workspace after approval."
                : me.reviewReason ||
                  "Contact IIC for details about your eligibility decision."}
        </p>
        {["discrepancy", "not_yet_eligible"].includes(me.verification) && (
          <button
            className="btn secondary"
            disabled={busy}
            onClick={() => void save({ action: "resubmit" })}
          >
            Resubmit for review
          </button>
        )}
      </div>
      <form
        className="panel stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (profile.consent)
            void save({
              action: "profile",
              profile: { ...profile, consent: true },
            });
        }}
      >
        <h2>Your profile</h2>
        {disabled && (
          <p className="muted">
            {active
              ? "Your profile is locked while your mentorship is active."
              : "This eligibility decision is final."}
          </p>
        )}
        <fieldset disabled={disabled || busy}>
          <div className="form-grid">
            <label>
              Full name
              <input
                required
                maxLength={100}
                disabled={identityLocked}
                value={profile.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </label>
            <label>
              IITM BS roll number
              <input
                required
                maxLength={40}
                disabled={identityLocked}
                value={profile.rollNumber}
                onChange={(e) => set("rollNumber", e.target.value)}
              />
            </label>
            {me.role === "mentor" && (
              <>
                <label>
                  Graduation year
                  <input
                    type="number"
                    required
                    min={2020}
                    max={new Date().getFullYear()}
                    disabled={identityLocked}
                    value={profile.graduationYear ?? ""}
                    onChange={(e) =>
                      set("graduationYear", Number(e.target.value))
                    }
                  />
                </label>
                <label>
                  Years of experience
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={profile.experience}
                    onChange={(e) => set("experience", Number(e.target.value))}
                  />
                </label>
                <label>
                  Organization
                  <input
                    maxLength={200}
                    value={profile.organization}
                    onChange={(e) => set("organization", e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              Phone number, optional
              <input
                type="tel"
                maxLength={30}
                value={profile.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </label>
            <label>
              LinkedIn or website, optional
              <input
                type="url"
                placeholder="https://"
                value={profile.social}
                onChange={(e) => set("social", e.target.value)}
              />
            </label>
            <label>
              Skills
              <input
                maxLength={300}
                value={profile.skills}
                onChange={(e) => set("skills", e.target.value)}
              />
            </label>
            <label>
              {me.role === "student"
                ? "Intended career path"
                : "Professional background"}
              <input
                maxLength={300}
                value={profile.path}
                onChange={(e) => set("path", e.target.value)}
              />
            </label>
          </div>
          <label>
            About you
            <textarea
              required
              maxLength={1000}
              value={profile.bio}
              onChange={(e) => set("bio", e.target.value)}
            />
          </label>
          <fieldset disabled={identityLocked && me.role === "mentor"}>
            <legend>
              {me.role === "mentor" ? "Mentoring domains" : "Career interests"}
            </legend>
            <div className="topic-options">
              {areas.map((area) => (
                <label key={area}>
                  <input
                    type="checkbox"
                    checked={profile.interests.includes(area)}
                    onChange={(e) =>
                      set(
                        "interests",
                        e.target.checked
                          ? [...profile.interests, area]
                          : profile.interests.filter((v) => v !== area),
                      )
                    }
                  />
                  {area}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="check-label">
            <input
              type="checkbox"
              required
              checked={profile.consent}
              onChange={(e) => set("consent", e.target.checked)}
            />
            I consent to IIC reviewing my profile and sharing it with my matched
            partner.
          </label>
          <div className="row">
            <button className="btn primary">
              {busy
                ? "Saving..."
                : me.verification === "draft"
                  ? "Submit for IIC review"
                  : "Save profile"}
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
