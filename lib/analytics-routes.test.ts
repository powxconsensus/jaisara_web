import { describe, expect, it } from "vitest";

import { isAnalyticsAllowedOn } from "@/lib/analytics-routes";

/**
 * Consent and route are separate questions, and this is the second one.
 *
 * Clarity was initialised from the root layout, so session replay recorded
 * `/dashboard` and `/console` as readily as the landing page - a member's
 * balance, their claim history, the receipts they uploaded, and every member
 * record an administrator opened. Agreeing to be measured on a marketing page
 * is not agreeing to any of that, and on the console the person who accepted
 * the banner is not even the person being recorded.
 */
describe("isAnalyticsAllowedOn", () => {
  it.each([
    ["the dashboard", "/dashboard"],
    ["a wallet page", "/dashboard/wallet"],
    ["account settings", "/dashboard/account"],
    ["the admin console", "/console"],
    ["a member record in the console", "/console/users/abc-123"],
  ])("never records %s", (_label, path) => {
    expect(isAnalyticsAllowedOn(path)).toBe(false);
  });

  it.each([
    ["sign in", "/login"],
    ["sign up", "/signup"],
    ["password reset", "/reset-password"],
    ["forgotten password", "/forgot-password"],
    ["email verification", "/verify-email"],
    ["the OAuth callback", "/auth/callback"],
  ])("never records %s, where a credential is on the page", (_label, path) => {
    /**
     * Clarity masks input values by default. That is a setting in somebody
     * else's console, not a property of this codebase - and a password field is
     * the wrong thing to be wrong about.
     */
    expect(isAnalyticsAllowedOn(path)).toBe(false);
  });

  it.each([
    ["the landing page", "/"],
    ["deals", "/deals"],
    ["one firm", "/deals/fundingpips"],
    ["the journal", "/journal/how-cashback-works"],
    ["the club page", "/club"],
    ["terms", "/terms"],
  ])("allows %s, which is what the analytics are for", (_label, path) => {
    expect(isAnalyticsAllowedOn(path)).toBe(true);
  });

  it("matches on segment boundaries rather than raw prefixes", () => {
    // `/loginhelp` is a public page and a bare `startsWith` would exclude it —
    // wrong, and not obviously wrong, which is the worse half.
    expect(isAnalyticsAllowedOn("/loginhelp")).toBe(true);
    expect(isAnalyticsAllowedOn("/dashboards-explained")).toBe(true);
  });

  it("is case-insensitive, since a URL path can arrive either way", () => {
    expect(isAnalyticsAllowedOn("/Dashboard/Wallet")).toBe(false);
    expect(isAnalyticsAllowedOn("/CONSOLE")).toBe(false);
  });
});
