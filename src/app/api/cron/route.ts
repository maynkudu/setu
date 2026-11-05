import { maintenance } from "@/lib/workspace";
import { flushNotifications } from "@/lib/notifications";
import { errorResponse } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await maintenance();
    return Response.json(await flushNotifications());
  } catch (error) {
    return errorResponse(error, undefined, "maintenance");
  }
}
