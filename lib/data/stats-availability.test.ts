import { afterEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.fn();
vi.mock("@/lib/auth-server", () => ({ apiRequest: (...args: unknown[]) => apiRequest(...args) }));

const { fetchStats } = await import("@/lib/data/deals");

/**
 * "We could not read the figures" and "the figures are zero" are different
 * statements, and the landing page makes one of them to every visitor.
 *
 * The web image builds without a reachable API, so static generation always
 * took the failure path and baked its fallback into the cached HTML. That
 * fallback was `{ firmCount: 0, memberCount: 0, paidToTradersUsd: "0.00" }`,
 * described in the code as "never invented activity" - but a built image then
 * served `$0 PAID TO TRADERS` and `0 FIRMS` as settled fact for the length of a
 * revalidate window. Nothing looked wrong from the outside: the page returned a
 * clean 200 and Next cached it.
 *
 * A visitor cannot tell a young business from a broken one, and neither can we.
 */
describe("fetchStats — unavailable is not zero", () => {
  afterEach(() => {
    apiRequest.mockReset();
  });

  it("returns null when the API answers with an error status", async () => {
    apiRequest.mockResolvedValue({ ok: false, status: 503 });

    expect(await fetchStats()).toBeNull();
  });

  it("returns null when the API cannot be reached at all", async () => {
    // The build case: no API on the network, the fetch throws, and the old
    // code turned that into three zeros.
    apiRequest.mockRejectedValue(new Error("ECONNREFUSED"));

    expect(await fetchStats()).toBeNull();
  });

  it("returns null when the request exceeds its deadline", async () => {
    apiRequest.mockRejectedValue(Object.assign(new Error("timeout"), { name: "TimeoutError" }));

    expect(await fetchStats()).toBeNull();
  });

  it("preserves a genuine zero from the API rather than treating it as missing", async () => {
    /**
     * The distinction has to cut both ways. A brand-new deployment that really
     * has paid nobody should say `$0`, because that is true and it is a
     * different sentence from "not available". Collapsing them would trade one
     * wrong answer for another.
     */
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ firmCount: 0, memberCount: 0, paidToTradersUsd: "0.00" }),
    });

    expect(await fetchStats()).toEqual({
      firmCount: 0,
      memberCount: 0,
      paidToTradersUsd: "0.00",
    });
  });

  it("passes real figures through untouched", async () => {
    apiRequest.mockResolvedValue({
      ok: true,
      json: async () => ({ firmCount: 12, memberCount: 3400, paidToTradersUsd: "18250.00" }),
    });

    expect(await fetchStats()).toEqual({
      firmCount: 12,
      memberCount: 3400,
      paidToTradersUsd: "18250.00",
    });
  });
});
