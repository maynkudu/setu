import { identity } from "@/lib/auth";
import { z } from "zod";
import { actionSchema } from "@/lib/domain";
import { errorResponse, noStore, sameOrigin } from "@/lib/http";
import { getWorkspace, performAction, storeDocument } from "@/lib/workspace";
import { after } from "next/server";
import { flushNotifications } from "@/lib/notifications";
import { Effect } from "effect";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    return noStore(await getWorkspace(await identity(request.headers)));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    sameOrigin(request);
    const user = await identity(request.headers);
    userId = user.id;
    if (
      request.headers.get("content-type")?.startsWith("multipart/form-data")
    ) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File))
        return Response.json({ error: "Choose a file." }, { status: 400 });
      await storeDocument(user, z.uuid().parse(form.get("mentorshipId")), file);
    } else await performAction(user, actionSchema.parse(await request.json()));
    after(async () => {
      try {
        await flushNotifications();
      } catch {
        Effect.runSync(
          Effect.logWarning(
            "Notifications remain queued for the next maintenance run.",
          ),
        );
      }
    });
    return noStore({ saved: true });
  } catch (error) {
    return errorResponse(error, userId);
  }
}
