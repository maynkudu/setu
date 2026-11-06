import { notFound } from "next/navigation";
import { Entry } from "@/components/entry";
import { allowedDomains, roleSchema } from "@/lib/domain";
import { authOrigin } from "@/lib/auth-origin";
export const dynamic = "force-dynamic";
export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ error?: string; start?: string }>;
}) {
  const role = roleSchema.safeParse((await params).role);
  if (!role.success) notFound();
  const query = await searchParams;
  let signInOrigin: string | null = null;
  try {
    signInOrigin = authOrigin();
  } catch {
    // Entry remains readable while authentication is being configured.
  }
  return (
    <Entry
      role={role.data}
      domains={role.data === "admin" ? [] : allowedDomains(role.data)}
      initialError={query.error}
      signInOrigin={signInOrigin}
      startGoogle={query.start === "google"}
    />
  );
}
