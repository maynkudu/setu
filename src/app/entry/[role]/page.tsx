import { notFound } from "next/navigation";
import { Entry } from "@/components/entry";
import { allowedDomains, roleSchema } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default async function EntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const role = roleSchema.safeParse((await params).role);
  if (!role.success) notFound();
  return (
    <Entry
      role={role.data}
      domains={role.data === "admin" ? [] : allowedDomains(role.data)}
      initialError={Boolean((await searchParams).error)}
    />
  );
}
