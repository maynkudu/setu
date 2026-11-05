import { z } from "zod";
import { identity } from "@/lib/auth";
import { calendarSession } from "@/lib/workspace";
import { errorResponse } from "@/lib/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const s = await calendarSession(
      await identity(request.headers),
      z.uuid().parse((await context.params).id),
    );
    const format = (date: Date) =>
      date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const escape = (v: string) =>
      v
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const body = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SETU//Mentorship//EN",
      "BEGIN:VEVENT",
      `UID:${s.id}@setu`,
      `DTSTAMP:${format(new Date())}`,
      `DTSTART:${format(new Date(s.startsAt))}`,
      `DTEND:${format(new Date(new Date(s.startsAt).getTime() + s.duration * 60000))}`,
      `SUMMARY:${escape(s.title)}`,
      `URL:${escape(s.meetingUrl)}`,
      `STATUS:${s.status === "cancelled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="setu-session.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
