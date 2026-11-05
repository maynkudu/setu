import { identity } from "@/lib/auth";
import { chunkSchema, uploadChunk } from "@/lib/uploads";
import { errorResponse, noStore, sameOrigin } from "@/lib/http";
import { after } from "next/server";
import { flushNotifications } from "@/lib/notifications";
import { Effect } from "effect";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    sameOrigin(request);
    const user = await identity(request.headers);
    userId = user.id;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return Response.json(
        { error: "Choose an upload part." },
        { status: 400 },
      );
    const input = chunkSchema.parse(Object.fromEntries(form.entries()));
    const result = await uploadChunk(user, input, file);
    if (result.complete)
      after(async () => {
        try {
          await flushNotifications();
        } catch {
          Effect.runSync(
            Effect.logWarning("Upload notifications remain queued for retry."),
          );
        }
      });
    return noStore(result);
  } catch (error) {
    return errorResponse(error, userId, "upload");
  }
}
