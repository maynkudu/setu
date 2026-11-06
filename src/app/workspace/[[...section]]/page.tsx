import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { identity } from "@/lib/auth";
import { AppError } from "@/lib/domain";
import { WorkspaceBoot } from "@/components/workspace-boot";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const parts = (await params).section ?? [];
  const section = parts[0] ?? "overview";
  if (
    parts.length > 1 ||
    ![
      "overview",
      "profile",
      "notifications",
      "request",
      "sessions",
      "messages",
      "documents",
      "feedback",
      "requests",
      "verification",
      "mentors",
      "students",
      "mentorships",
      "followups",
      "analytics",
      "access",
    ].includes(section)
  )
    notFound();
  try {
    await identity(await headers());
  } catch (error) {
    if (error instanceof AppError && error.status === 401)
      redirect("/entry/student");
    return (
      <main className="setup-message role-theme">
        <h1>SETU is getting ready</h1>
        <p>
          {error instanceof AppError
            ? error.message
            : "The workspace is temporarily unavailable. Please try again shortly."}
        </p>
        <Link className="btn primary" href="/">
          Back to SETU
        </Link>
      </main>
    );
  }
  return (
    <WorkspaceBoot
      section={section}
      supportEmail={process.env.PROGRAMME_CONTACT_EMAIL}
    />
  );
}
