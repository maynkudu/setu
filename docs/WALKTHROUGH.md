# Project walkthrough

This walkthrough follows the public introduction, a student request, the alumni workspace, and IIC administration. Set up the database and Google client using the [README](../README.md) before using live accounts.

For an isolated local walkthrough, use the loopback database and signed fixtures described in the README. Do not seed sample accounts into Supabase production.

## Enter SETU

Open `/`. The introduction explains who can participate and how IIC assigns a mentor. The connecting ribbons introduce the conversation between student and alumnus. Guidance examples support pointer and arrow-key selection, and programme steps expand to explain profile review, assignment and private conversations. The navbar returns after scrolling; Menu exposes programme sections, entry and policies. Escape closes it and restores focus.

Programme steps and FAQs animate in both directions. The process curve stays flat through halfway and turns into an isometric surface by 64% of its scroll progression. Hover or arrow keys raise a peak; leaving or Escape restores the surface. Opening Menu moves a separate header from the normal bar's position. The complete opened menu sits above its transition panels, with the normal navbar underneath both. The floating menu header stays cream during opening and closing, and floating navigation also animates its exit. The landing footer has interactive ASCII hands and a transparent rippling logo, so its background does not cover the hands. Route commits use a clip mask, with distinct return and role-switch motion.

The landing page's student and alumni links lead to `/entry/student` and `/entry/mentor`. IIC entry is `/entry/admin`. Privacy, terms, conduct, cookies, accessibility, and association links appear in the public footer.

The public route is [src/app/page.tsx](../src/app/page.tsx). The shared shell is [public-page.tsx](../src/components/public-page.tsx), navigation is [overlay-menu.tsx](../src/components/public-site/overlay-menu.tsx), and the landing interactions are [landing.tsx](../src/components/public-site/landing.tsx). Policy content lives in [src/content/policies.ts](../src/content/policies.ts).

## Sign in and submit a profile

Choose **Continue with Google**. Google verifies identity. The server checks exact student domains or an explicit access grant before creating an account. Every mentor needs an active IIC grant. The entry route does not let a user choose their own stored role.

If entry is opened on another origin, the clicked sign-in resumes on the configured `BETTER_AUTH_URL` origin before Google opens. Better Auth's encrypted state cookie belongs to that origin and expires after ten minutes. An interrupted or expired callback returns to entry with its error code and asks the user to start again. Protected sessions remain persistent for seven days.

An ineligible Google account returns to the entry page with a prompt to use an eligible account. An eligible student reaches the profile screen with a notice that IIC must confirm degree-level eligibility. An alumnus sees the corresponding alumni review requirement.

Complete the form, select interests or mentoring domains, and consent to programme use. Mentors also provide a graduation year. Submission changes a draft profile to pending. Pending users can see their own status and permitted profile controls, but cannot submit a mentoring request or open shared programme data.

IIC checks degree status and alumni details against college records manually. SETU does not call a college portal API. If a reviewer records a discrepancy, the applicant sees the reason, corrects the permitted fields, and resubmits. A not-yet-eligible decision also permits resubmission; a not-eligible decision is final in this release.

Login pages link to every other role. A current session offers **Continue to your workspace** and stays signed in across browser closure for seven days, refreshed during active use. **Use another Google account** explicitly ends it before Google account selection.

The sign-in button lives in [entry.tsx](../src/components/entry.tsx). [auth.ts](../src/lib/auth.ts) resolves identity and revalidates access. [profile.tsx](../src/components/profile.tsx) renders the review notice and form. The `profile` and `resubmit` actions live in [workspace.ts](../src/lib/workspace.ts).

## Review accounts as IIC

Sign in with an account listed in `ADMIN_EMAILS`. Open **Verification**, inspect a pending applicant, and record approval or a reasoned non-approval decision. Approval unlocks that participant's programme workspace.

The administrator also has **Students**, **Alumni mentors**, **Mentoring requests**, **Mentorships**, **Follow-ups**, **Analytics**, and **Account access** screens. The review interface lives in [admin.tsx](../src/components/admin.tsx). The server checks the administrator role again before any review or assignment.

To invite a mentor or grant a student account exception, open **Account access**, enter one or several emails, choose student or mentor, and supply a reason. A grant permits those accounts to sign in. They still submit profiles and wait for eligibility approval. Revocation blocks a granted external account on its next protected request. It cannot revoke someone who still qualifies through a configured domain or admin rule.

## Request guidance as a student

After approval, open **Mentoring request**. Describe a career goal, the uncertainty you want to discuss, guidance areas, and a timeline. Submit the request with consent.

The student sees **Awaiting IIC assignment**. Only one open request is allowed. An unmatched request can be withdrawn with a reason. The student cannot assign a mentor directly.

The request form is in [workspace.tsx](../src/components/workspace.tsx). Zod defines its contract in [domain.ts](../src/lib/domain.ts). The server writes the request and notification transactionally.

## Assign a mentor as IIC

Open the request, inspect approved and available mentors, and select a suitable alumnus. Candidate ordering counts shared guidance areas and uses experience to break ties. IIC makes the final decision.

The server locks the request and participant profiles, checks eligibility and availability, creates the mentorship, and marks the request matched. Unique indexes prevent concurrent assignments from giving either participant a second active mentorship.

After refresh, both participants see the pairing. The student sees the mentor's details. The mentor sees the student's goal, uncertainty, and shared profile.

Assignment UI is in [admin.tsx](../src/components/admin.tsx). The `assign` action and lock checks are in [workspace.ts](../src/lib/workspace.ts). Database constraints are in [001-core.sql](../database/001-core.sql).

## Use the shared workspace

Open **Sessions** and schedule a future conversation with a title, time, duration, and HTTPS meeting link. The app stores the appointment for both participants. It does not create a video meeting automatically. Download the calendar file to import it into your calendar.

Upcoming sessions can be rescheduled or cancelled. Overlaps are rejected. Scheduled and held sessions together count toward the ten-session limit. Maintenance marks elapsed appointments held; participants can mark a missed session during the permitted 48-hour window.

Open **Messages** to exchange a private message. Open **Documents** to upload a PDF, DOCX, PPTX, JPEG, or PNG of at most 5 MiB. Files travel in sequential 1 MiB chunks, then become one private database document. Both participants can download it. Only the uploader can remove it during an active mentorship.

Selecting a sidebar or in-screen workspace link changes the view immediately, then refreshes. Current data stays visible during refresh; initial loads show a skeleton. Failed refreshes offer **Retry**. Back/forward and deep links restore the selected view. The client also refreshes on focus and every 30 seconds while visible. A saved change persists across refreshes and other authenticated browsers. It is not a real-time chat subscription.

These screens live in [mentorship.tsx](../src/components/mentorship.tsx). The save function lives in [workspace.tsx](../src/components/workspace.tsx). API handlers live in [src/app/api](../src/app/api), with file assembly in [uploads.ts](../src/lib/uploads.ts).

IIC sees programme-level records, not private messages, files, or detailed appointments. The server enforces this even if an administrator requests a download endpoint directly.

## End the mentorship and submit feedback

Open **Overview**, choose **End mentorship**, and provide a category and reason. The confirmation describes cancelled future sessions and the read-only shared space.

Ending closes the request and releases both participants for future pairing. Conduct concerns create an IIC follow-up. Both participants receive a notification. IIC can also conclude a mentorship from its programme screen.

Open **Feedback** within five days. Rate the mentorship, state whether the original goal was achieved, and add a comment. Each participant submits once. The partner cannot read the assessment; IIC can. A mentor can recommend further support.

If the student's goal is partly achieved or still in progress, submission creates a check-in based on the requested timeline. It opens for fourteen days after its due time. A first-round response still in progress creates a second check-in at the later of six months after ending or the current time.

Feedback and check-in forms are in [mentorship.tsx](../src/components/mentorship.tsx). Ending, feedback, and follow-up state transitions are in [workspace.ts](../src/lib/workspace.ts).

## Maintain the programme

Vercel invokes the protected maintenance endpoint daily after production deployment. It creates session reminders, marks elapsed appointments, ends completed ten-session mentorships after the grace period, expires unanswered check-ins, and deletes expired shared content and uploads.

Shared messages and documents remain read-only for 30 days after ending. Access ends at the deadline even if physical cleanup waits for a later successful maintenance run. Programme records have no automatic deletion deadline.

In-app notifications require no email provider. If Resend is configured, mutations and maintenance flush queued notices with bounded concurrency and retry leases. Read [BACKEND.md](BACKEND.md) for delivery semantics and [SYSTEM.md](SYSTEM.md) for timing and capacity limits.

## Understand the verification boundary

The local integration suite exercises persistent multi-user rules and concurrency against real PostgreSQL. Browser verification exercises representative role flows and public layouts. Neither proves that an external Google client, Vercel deployment, or email sender is correctly configured.

After hosting, verify a complete Google round trip, approve a student and mentor, create a pairing, exchange a message and document, and inspect the next maintenance run. Use account grants for authorized evaluation accounts instead of production authentication bypasses.
