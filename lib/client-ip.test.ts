import { describe, expect, it } from "vitest";

import { upstreamHeaders } from "@/lib/auth-server";

/**
 * A forwarded address is evidence, and evidence a caller can write is not.
 *
 * `X-Forwarded-For` grows left to right - every proxy appends the address it
 * received from - so only the final entry was written by our own edge about a
 * connection it terminated. Everything before it is a string somebody sent.
 *
 * The BFF forwarded the header verbatim, so a handmade `X-Forwarded-For` rode
 * through to the API in front of the real address. Everything the API keys on
 * an address inherits that: per-IP throttles are diluted by choosing a new
 * value per request, `signupIp` and the claim-attempt `ipHash` record an
 * attacker-chosen string as evidence, and lockout counters can be aimed at
 * somebody. Nothing fails loudly, because a forged address is a well-formed
 * one.
 */
function headersFor(init: Record<string, string>): Headers {
  return upstreamHeaders(new Request("https://jaisara.com/api/claims", { headers: init }));
}

describe("upstreamHeaders — forwarded client address", () => {
  it("forwards only the entry the edge appended, discarding a spoofed prefix", () => {
    const headers = headersFor({ "x-forwarded-for": "1.2.3.4, 203.0.113.7" });

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("keeps a single genuine address unchanged", () => {
    const headers = headersFor({ "x-forwarded-for": "203.0.113.7" });

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("discards every hop but the last, however many a caller invents", () => {
    // Padding the chain used to be enough to bury the real address in the
    // middle of a list nothing downstream re-read.
    const headers = headersFor({
      "x-forwarded-for": "10.0.0.1, 10.0.0.2, 10.0.0.3, 198.51.100.9",
    });

    expect(headers.get("x-forwarded-for")).toBe("198.51.100.9");
  });

  it("tolerates the spacing and empty entries real proxies produce", () => {
    const headers = headersFor({ "x-forwarded-for": "  1.2.3.4 ,, 203.0.113.7  ," });

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, which is single-valued and has no prefix to strip", () => {
    const headers = headersFor({ "x-real-ip": "203.0.113.7" });

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("prefers the forwarded chain over x-real-ip when both are present", () => {
    const headers = headersFor({
      "x-forwarded-for": "1.2.3.4, 203.0.113.7",
      "x-real-ip": "1.2.3.4",
    });

    expect(headers.get("x-forwarded-for")).toBe("203.0.113.7");
  });

  it("sends no address at all rather than an invented one", () => {
    // Absent is a state the API can reason about. An empty string is not.
    expect(headersFor({}).has("x-forwarded-for")).toBe(false);
    expect(headersFor({ "x-forwarded-for": " , , " }).has("x-forwarded-for")).toBe(false);
  });
});
