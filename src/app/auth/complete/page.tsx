import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { identity } from "@/lib/auth";
import { roleSchema } from "@/lib/domain";
import { resolveEmailRole } from "@/lib/access";
export default async function Complete({
  searchParams,
}: {
  searchParams: Promise<{ entry?: string }>;
}) {
  const entry = roleSchema.safeParse((await searchParams).entry);
  const role = entry.success ? entry.data : "student";
  let user;
  try {
    user = await identity(await headers());
  } catch {
    redirect(`/entry/${role}?error=account`);
  }
  if ((await resolveEmailRole(user.email)) !== role)
    redirect(`/entry/${role}?error=account`);
  redirect("/workspace/profile");
}
