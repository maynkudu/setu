import { z } from "zod";
import { rows } from "./db";
import { emailRole } from "./domain";

export async function resolveEmailRole(email: string) {
  const standard = emailRole(email);
  if (standard === "admin") return standard;
  const [grant] = await rows(
    z.object({ role: z.enum(["student", "mentor"]) }),
    "SELECT role FROM setu.access_grants WHERE email=$1 AND revoked_at IS NULL",
    [email.trim().toLowerCase()],
  );
  return grant?.role ?? standard;
}
