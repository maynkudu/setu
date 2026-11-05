# Features

This document describes the implemented product. Configuration requirements and unverified external integrations are listed separately below.

## Public introduction

- Landing page with student and alumni entry points, programme steps, and an interactive mentorship illustration.
- IITM-inspired red, burgundy, cream, and gold palette. Rune icons and locally hosted fonts.
- Animated bridge-mark preloader, Lenis wheel scrolling, section entrances, and control feedback.
- Anatomy SVG desk illustration with three stages, an idle tour, hover changes, and keyboard selection.
- Footer with privacy, terms, conduct, cookies, accessibility, association, and programme contact links.
- Public association page describes SETU as a student project without claiming institutional endorsement.

The footer appears on the landing page and public information pages. Dashboards use their own navigation and support link.

## Accounts and eligibility

| Capability             | Behavior                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Google sign-in         | Google is the only sign-in provider. Better Auth stores persistent sessions in PostgreSQL.                            |
| Student access         | Exact configured student domains, currently `ds.study.iitm.ac.in` and `es.study.iitm.ac.in`.                          |
| Mentor access          | Exact configured alumni domains, currently `alumni.iitm.ac.in`.                                                       |
| Administrator access   | Explicit accounts in `ADMIN_EMAILS`, currently `maynkudu@gmail.com`.                                                  |
| External test accounts | Administrators can whitelist up to 50 student or mentor emails per submission.                                        |
| Revocation             | Removing an external grant blocks its next identity check. It does not override a valid domain or admin rule.         |
| Degree-level review    | Students see the verification requirement after login. IIC checks college records manually.                           |
| Alumni review          | Mentors submit their identity and mentoring details for IIC approval.                                                 |
| Restricted workspace   | Unapproved accounts see their own profile and review status. They cannot access mentorship data.                      |
| Review decisions       | Approved, discrepancy, not yet eligible, or not eligible. Non-approval decisions require a reason.                    |
| Resubmission           | Discrepancy and not-yet-eligible decisions permit resubmission. Not-eligible decisions are final in the current flow. |

Whitelisting permits account creation. It does not approve programme eligibility. Only environment configuration grants administrator access.

## Student workspace

- Complete a profile, consent to programme use, and track the IIC review.
- Submit a career goal, uncertainty, guidance areas, and target timeline.
- Keep one open request. Withdraw an unmatched request with a reason.
- See the assigned mentor after IIC creates the mentorship.
- Schedule, reschedule, and cancel upcoming sessions. Download an `.ics` calendar entry.
- Message the mentor and exchange private documents.
- End the mentorship with a category and reason.
- Submit private feedback within five days after ending.
- Answer follow-up check-ins when the career goal remains incomplete.

Student profiles are locked during an active mentorship. Submitted identity details remain locked after submission.

## Alumni mentor workspace

- Submit an alumni profile with graduation year, experience, organization, and mentoring domains.
- Pause or open availability for new assignments.
- Mentor one student at a time.
- Use the same private sessions, messages, documents, and ending controls as the student.
- Submit private feedback and request IIC support after ending.

Changing availability does not end an existing mentorship. Submitted mentoring domains stay locked after submission.

## IIC administrator workspace

- Overview of requests, eligibility reviews, assignments, and follow-up actions.
- Review student and alumni profiles with recorded decisions and reasons.
- Assign an approved, available mentor to an approved student's request.
- Candidate ordering uses shared guidance areas, then experience. It is a deterministic suggestion, not AI matching.
- View programme mentorship records and conclude a mentorship when needed.
- Review individual feedback and career check-ins.
- Resolve conduct and support follow-ups with an administrator note.
- Grant and revoke external test access.
- View analytics calculated from the loaded programme snapshot.

Administrators cannot read private messages, download documents, or view detailed session records. Profile visibility depends on eligibility review and programme involvement.

## Programme limits and retention

| Item               | Current rule                                                                          |
| ------------------ | ------------------------------------------------------------------------------------- |
| Active pairing     | One active mentorship per student and per mentor.                                     |
| Sessions           | At most ten scheduled or held sessions per mentorship.                                |
| Duration           | 30, 45, 60, or 90 minutes. Overlapping sessions are rejected.                         |
| Missed session     | Can be marked during the session or within 48 hours after its end.                    |
| Message            | At most 2000 characters. Latest 200 messages appear in the loaded workspace.          |
| Documents          | At most 20 per mentorship, 5 MiB each. PDF, DOCX, PPTX, JPEG, or PNG.                 |
| Upload             | Sequential 1 MiB chunks. Incomplete uploads expire after one hour on maintenance.     |
| Ended shared space | Read-only for 30 days, then inaccessible. Maintenance deletes messages and documents. |
| Feedback           | One submission per participant, within five days. Hidden from the partner.            |
| Check-in           | Fourteen-day response window after its due time.                                      |
| Security logs      | Deleted after 90 days by maintenance.                                                 |

Programme, profile, and feedback records have no automatic deletion deadline. The privacy page directs deletion requests to the programme contact. There is no self-service account deletion flow.

## Configuration and verification status

Local database tests verify access rules, persistence, concurrent assignment, scheduling, private content, uploads, ending, feedback, and retention. Production builds and static checks pass. Focused browser verification covers public layouts, motion, eligibility, approval, assignment, sessions, messages, ending, feedback, document form submission, mobile navigation, and figure keyboard controls. The document download handler returned matching bytes. Native file-picker automation stalled, so upload form verification populated the browser file input directly before clicking submit.

Hosted Supabase migration and private-schema permissions were verified with the supplied connection. No sample accounts were added. Google OAuth initiation was verified with the supplied client; its full callback requires a registered production origin and a live sign-in check after deployment. Resend email delivery requires a verified sender and API token. The Vercel cron schedule requires a production deployment and `CRON_SECRET`.

College portal integration, automatic degree verification, video calling, calendar synchronization, real-time subscriptions, document malware scanning, global paginated analytics, and load-tested capacity are not implemented. Session meeting links are supplied by participants. Calendar support is a downloadable file.
