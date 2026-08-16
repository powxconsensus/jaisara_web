import { NextResponse, type NextRequest } from "next/server";
import {
  applySessionResult,
  authenticatedRequest,
  responseFromUpstream,
} from "@/lib/auth-server";

async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await context.params;
    const suffix = path.map(encodeURIComponent).join("/");
    const query = request.nextUrl.search;
    const method = request.method;
    const hasBody = !["GET", "HEAD"].includes(method);
    const contentType = request.headers.get("content-type");
    const result = await authenticatedRequest(
      request,
      `/admin/${suffix}${query}`,
      {
        method,
        headers: contentType ? { "content-type": contentType } : undefined,
        // Read as bytes, not text: a multipart CSV upload carries its own
        // boundary and encoding, and decoding it to a string on the way
        // through would corrupt anything that is not valid UTF-8.
        body: hasBody ? await request.arrayBuffer() : undefined,
      },
    );
    /**
     * Through the shared helper, which streams files and serialises payloads.
     *
     * This inlined the JSON path, so the one binary route behind this proxy -
     * the uploaded receipt - came back as a JSON document full of PNG bytes
     * decoded as UTF-8. The reviewer saw a broken image and "open full size"
     * showed the JSON. Claims cannot be reviewed without the receipt, so it
     * silently blocked the queue this proxy exists to serve.
     */
    return applySessionResult(await responseFromUpstream(result.upstream), result);
  } catch {
    return NextResponse.json(
      { message: "The admin service is unavailable. Please try again." },
      { status: 503 },
    );
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
