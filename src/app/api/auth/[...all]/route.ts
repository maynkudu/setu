import { getAuth } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { AppError } from "@/lib/domain";
export const runtime = "nodejs";
async function handle(request: Request) {
  const path = new URL(request.url).pathname.replace("/api/auth", "");
  if (
    ![
      "/get-session",
      "/sign-in/social",
      "/callback/google",
      "/sign-out",
    ].includes(path)
  )
    return Response.json(
      { error: "Use the SETU entry page." },
      { status: 404 },
    );
  try {
    if (
      path === "/sign-in/social" &&
      (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    )
      throw new AppError(
        503,
        "Google sign-in is not configured yet. Please contact the programme team.",
      );
    return await getAuth().handler(request);
  } catch (error) {
    return errorResponse(error);
  }
}
export const GET = handle;
export const POST = handle;
