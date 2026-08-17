import { describe, expect, it } from "vitest";

import { fileFromUpstream, isPayloadUpstream } from "./auth-server";

/**
 * Files must survive the BFF unchanged.
 *
 * Every proxy route funnels the API's answer through one helper, and that
 * helper read the body as **text** and re-serialised it as JSON. For the one
 * binary route behind it - the uploaded claim receipt - that produced
 * `{"message":"PNG\r\n..."}`: the `<img>` showed a broken icon, and
 * opening it full size showed the JSON. Worse, the bytes were already
 * destroyed by the UTF-8 decode, so nothing downstream could have recovered
 * them.
 *
 * There was no error and no failing test anywhere - the request was a clean
 * 200. Claims simply could not be reviewed. That is the shape of bug this file
 * exists to catch.
 */
describe("upstream passthrough", () => {
  // `new Response(string)` sets `text/plain` on its own, so a genuinely
  // header-less response has to be built by deleting it back off.
  const upstream = (contentType: string | null, body: BodyInit = "x") => {
    const response = new Response(body, {
      headers: contentType ? { "content-type": contentType } : {},
    });
    if (!contentType) response.headers.delete("content-type");
    return response;
  };

  it("treats JSON as a payload", () => {
    expect(isPayloadUpstream(upstream("application/json"))).toBe(true);
    expect(isPayloadUpstream(upstream("application/json; charset=utf-8"))).toBe(true);
    // Nest's error responses.
    expect(isPayloadUpstream(upstream("application/problem+json"))).toBe(true);
  });

  it("treats a missing content type as a payload", () => {
    // 204s and empty bodies carry no type; sending them down the file path
    // would strip the JSON handling that callers depend on.
    expect(isPayloadUpstream(upstream(null, ""))).toBe(true);
  });

  it("treats plain text and HTML as payloads, not downloads", () => {
    // What a gateway or a crashing proxy answers with. `readUpstreamBody`
    // wraps these as `{ message }` so the client still shows something; routing
    // them to the file path would replace the message with a blank screen.
    expect(isPayloadUpstream(upstream("text/plain"))).toBe(true);
    expect(isPayloadUpstream(upstream("text/html; charset=utf-8"))).toBe(true);
  });

  it("treats images and documents as files", () => {
    expect(isPayloadUpstream(upstream("image/png"))).toBe(false);
    expect(isPayloadUpstream(upstream("image/jpeg"))).toBe(false);
    expect(isPayloadUpstream(upstream("application/pdf"))).toBe(false);
    // An export, despite being textual.
    expect(isPayloadUpstream(upstream("text/csv"))).toBe(false);
    expect(isPayloadUpstream(upstream("application/octet-stream"))).toBe(false);
  });

  it("passes the bytes through byte-for-byte", async () => {
    // The actual PNG magic number. If this ever round-trips through a string
    // again, these bytes are what changes.
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const response = fileFromUpstream(
      new Response(png, { headers: { "content-type": "image/png" } }),
    );

    const received = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(received)).toEqual(Array.from(png));
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("keeps a receipt out of shared caches", () => {
    // These are one member's documents. The API sends `private, no-store` and
    // it has to survive the hop.
    const response = fileFromUpstream(
      new Response("x", {
        headers: { "content-type": "image/png", "cache-control": "private, no-store" },
      }),
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("defaults to no-store when the API forgot to say", () => {
    const response = fileFromUpstream(
      new Response("x", { headers: { "content-type": "image/png" } }),
    );

    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("refuses to let an uploaded file be sniffed or run", () => {
    // The bytes came from an upload and now render on an authenticated origin,
    // so the declared type is the last word and scripting is off.
    const response = fileFromUpstream(
      new Response("x", { headers: { "content-type": "image/png" } }),
    );

    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
  });

  it("preserves the upstream status", () => {
    const response = fileFromUpstream(
      new Response("nope", { status: 404, headers: { "content-type": "image/png" } }),
    );

    expect(response.status).toBe(404);
  });
});
