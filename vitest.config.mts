import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the parts of the web app that are plain TypeScript.
 *
 * Deliberately not a component-testing setup. What is covered here is the
 * logic that has no UI and cannot be checked by looking at the page: the
 * response cache that keeps one account's data off the next account's screen,
 * and the BFF passthrough that decides whether a response is a payload or a
 * file. Both had silent bugs - no error, no failing build, a clean 200 - which
 * is exactly the class a browser test would also have missed.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
