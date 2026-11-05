import { z } from "zod";
import { identity } from "@/lib/auth";
import { downloadDocument } from "@/lib/workspace";
import { errorResponse } from "@/lib/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const id = z.uuid().parse((await context.params).id);
    const doc = await downloadDocument(await identity(request.headers), id);
    let offset = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= doc.bytes.length) {
          controller.close();
          return;
        }
        controller.enqueue(
          new Uint8Array(doc.bytes.subarray(offset, offset + 65536)),
        );
        offset += 65536;
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": doc.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(doc.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
