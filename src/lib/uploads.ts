import { z } from "zod";
import { rows, transaction } from "./db";
import { requireCondition } from "./domain";
import { currentProfile, lockedMentorship, storeDocument } from "./workspace";
import type { identity } from "./auth";
export const chunkSchema = z.object({
  id: z.uuid(),
  mentorshipId: z.uuid(),
  name: z.string().min(1).max(160),
  size: z.coerce
    .number()
    .int()
    .min(1)
    .max(5 * 1024 * 1024),
  parts: z.coerce.number().int().min(1).max(5),
  part: z.coerce.number().int().min(0).max(4),
});
export async function uploadChunk(
  user: Awaited<ReturnType<typeof identity>>,
  input: z.infer<typeof chunkSchema>,
  file: File,
) {
  const me = await currentProfile(user);
  requireCondition(
    me.verification === "approved",
    "IIC approval is required.",
    403,
  );
  requireCondition(
    input.parts === Math.ceil(input.size / 1048576) && input.part < input.parts,
    "Invalid upload parts.",
    400,
  );
  const expected =
    input.part === input.parts - 1
      ? input.size - input.part * 1048576
      : 1048576;
  requireCondition(file.size === expected, "Invalid upload part size.", 400);
  const bytes = Buffer.from(await file.arrayBuffer());
  return transaction(async (client) => {
    const m = await lockedMentorship(client, input.mentorshipId, me);
    requireCondition(m.status === "active", "This shared space is read-only.");
    const complete = await client.query(
      "SELECT 1 FROM setu.documents WHERE id=$1 AND mentorship_id=$2 AND uploader_id=$3",
      [input.id, m.id, me.userId],
    );
    if (complete.rowCount) return { complete: true };
    const own = await client.query(
      "SELECT 1 FROM setu.uploads WHERE id=$1 AND user_id=$2",
      [input.id, me.userId],
    );
    if (!own.rowCount) {
      const [count] = await rows(
        z.object({ count: z.number() }),
        "SELECT count(*)::int AS count FROM setu.uploads WHERE user_id=$1",
        [me.userId],
        client,
      );
      requireCondition(
        count.count < 3,
        "Finish the current uploads before starting another.",
      );
    }
    await client.query(
      "INSERT INTO setu.uploads(id,mentorship_id,user_id,name,size,parts) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
      [input.id, m.id, me.userId, input.name, input.size, input.parts],
    );
    const [upload] = await rows(
      z.object({
        userId: z.string(),
        mentorshipId: z.string(),
        name: z.string(),
        size: z.number(),
        parts: z.number(),
      }),
      `SELECT user_id AS "userId",mentorship_id AS "mentorshipId",name,size,parts FROM setu.uploads WHERE id=$1 FOR UPDATE`,
      [input.id],
      client,
    );
    requireCondition(
      upload.userId === me.userId &&
        upload.mentorshipId === m.id &&
        upload.size === input.size &&
        upload.parts === input.parts &&
        upload.name === input.name,
      "This upload is not available.",
      403,
    );
    await client.query(
      "INSERT INTO setu.upload_parts(upload_id,part,bytes) VALUES ($1,$2,$3) ON CONFLICT (upload_id,part) DO UPDATE SET bytes=EXCLUDED.bytes",
      [input.id, input.part, bytes],
    );
    const parts = await rows(
      z.object({ bytes: z.instanceof(Buffer) }),
      "SELECT bytes FROM setu.upload_parts WHERE upload_id=$1 ORDER BY part",
      [input.id],
      client,
    );
    if (parts.length !== input.parts) return { complete: false };
    const content = Buffer.concat(parts.map((p) => p.bytes));
    requireCondition(
      content.length === input.size,
      "The complete upload size is invalid.",
      400,
    );
    await storeDocument(
      user,
      m.id,
      new File([new Uint8Array(content)], input.name),
      client,
      input.id,
    );
    await client.query("DELETE FROM setu.uploads WHERE id=$1", [input.id]);
    return { complete: true };
  });
}
