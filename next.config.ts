import type { NextConfig } from "next";

/**
 * Where the browser is allowed to load images from and talk to.
 *
 * Everything the app itself calls goes through this origin's own `/api/*`
 * proxy routes, which is why `connect-src 'self'` is enough. Images are the
 * exception: firm logos and journal illustrations are served by the API, and
 * an admin may point a logo at a firm's own CDN.
 *
 * `NEXT_PUBLIC_*` is deliberately not used — this value is read on the server
 * only, never shipped into the client bundle.
 *
 * **In production it is not used here at all.** `img-src` falls back to a plain
 * `https:`, which covers the API and any CDN an admin points a logo at, and
 * `connect-src` is `'self'` because the browser never calls the API directly.
 * That is deliberate rather than incidental: it leaves `API_BASE_URL` a pure
 * *runtime* variable, so it can be repointed at a private
 * `*.railway.internal` host — keeping every page render off the public
 * internet, and off the egress meter — without rebuilding the image.
 *
 * Development still needs it, because there the API is plain http on localhost
 * and `https:` does not cover that.
 */
const apiOrigin = (() => {
  try {
    return new URL(process.env.API_BASE_URL ?? "http://localhost:4000/api").origin;
  } catch {
    return "";
  }
})();

/**
 * Content Security Policy.
 *
 * `script-src` carries `'unsafe-inline'`, and that is a deliberate trade rather
 * than an oversight. The App Router streams its RSC payload through inline
 * `<script>self.__next_f.push(…)</script>` tags whose contents differ per
 * render, so they can be neither hashed nor allow-listed. The only alternative
 * is a per-request nonce from middleware, which makes every page dynamic and
 * gives up the static rendering the marketing pages depend on.
 *
 * What this policy still buys, all of which matters here:
 *
 *  - `frame-ancestors 'none'` — nobody can iframe the withdraw or claim pages
 *    and trick somebody into clicking a button they cannot see. On a site that
 *    moves money this is the single most valuable line.
 *  - `script-src` without a wildcard — injected markup cannot pull executable
 *    code from an attacker's host, which is how a stored-XSS foothold is
 *    normally turned into something useful.
 *  - `connect-src 'self'` — script that does run cannot post what it scraped
 *    to somewhere else.
 *  - `form-action 'self'` — a planted form cannot submit credentials offsite.
 *  - `object-src 'none'`, `base-uri 'self'` — closes the plugin and
 *    base-tag-hijack routes.
 *
 * To drop `'unsafe-inline'` later: add middleware that mints a nonce per
 * request and puts it in this header; Next picks the nonce up and stamps its
 * own scripts with it. Budget for the loss of static rendering first.
 */
const isProduction = process.env.NODE_ENV === "production";

/**
 * Microsoft Clarity, and what allowing it actually costs.
 *
 * Clarity cannot work under the policy below. It loads its tag from
 * `https://www.clarity.ms` and uploads recordings to a regional collector on
 * `*.clarity.ms`, and the two lines the comment above calls valuable —
 * `script-src` with no external host, `connect-src 'self'` — are precisely the
 * two that forbid it. So this is not a formality: it is a session recorder,
 * running third-party code with full DOM access, permitted to send what it
 * observes to another company. That is what the product *is*, and it is worth
 * naming rather than discovering later.
 *
 * Narrowed as far as it can be while still working:
 *
 *  - **Only when `CLARITY_PROJECT_ID` is set.** With Clarity off — local work,
 *    previews, any deploy that has not configured it — the policy is byte-for-
 *    byte what it was before.
 *  - **Exact host for `script-src`.** `https://www.clarity.ms`, not a wildcard,
 *    so no other Microsoft subdomain can serve executable code here.
 *  - **Wildcard only where Clarity requires one.** Uploads go to a regional
 *    collector whose subdomain is chosen at runtime, so `connect-src` has to
 *    accept `*.clarity.ms`. `c.bing.com` is the MUID sync; without it the
 *    recording still works and a request fails in the console every session.
 *
 * `img-src` needs nothing added — it already allows `https:`.
 *
 * This is read at **build** time. Next evaluates `headers()` when it generates
 * the routes manifest, so the value is baked into the deployment; setting the
 * variable at runtime only leaves the policy narrow and the tag blocked.
 */
const clarityEnabled = Boolean(process.env.CLARITY_PROJECT_ID?.trim());
const clarityScriptSrc = clarityEnabled ? " https://www.clarity.ms" : "";
const clarityConnectSrc = clarityEnabled ? " https://*.clarity.ms https://c.bing.com" : "";

const csp = [
  "default-src 'self'",
  // `'unsafe-eval'` in development only. React's dev build uses `eval` to
  // reconstruct call stacks across the server/client boundary, and the dev
  // server needs it for hot reload; the production build uses neither, so
  // shipping it would weaken the policy for nobody's benefit.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}${clarityScriptSrc}`,
  // Tailwind and the theme system set custom properties inline on elements.
  "style-src 'self' 'unsafe-inline'",
  // `https:` already covers firm logos and journal illustrations served by the
  // API over TLS, and an admin pointing a logo at a firm's own CDN. Naming the
  // API origin as well adds nothing in production — and naming it *costs*
  // something: it makes the built image depend on `API_BASE_URL`, which is the
  // one variable that should be free to change (to a private `.railway.internal`
  // host, say) without a rebuild. In development the API is plain http on
  // localhost, which `https:` does not cover, so it is still listed there.
  `img-src 'self' data: blob: https:${isProduction || !apiOrigin ? "" : ` ${apiOrigin}`}`,
  "font-src 'self' data:",
  // `'self'` only, and that is not a simplification — the browser genuinely
  // never calls the API. Every request goes through this app's own `/api/*`
  // route handlers, which attach the session cookie server-side; even Google
  // sign-in navigates to `/api/auth/google` on this origin. `API_BASE_URL`
  // appears in exactly one file, `lib/auth-server.ts`, and only on the server.
  `connect-src 'self'${clarityConnectSrc}`,
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  // Production only: in development the API is plain http on localhost, and
  // upgrading those requests would break every image the dev server serves.
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Belt and braces with frame-ancestors, for anything that predates CSP 2.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrers leak paths, and our paths contain ticket and claim ids.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here needs any of these; say so rather than leaving it ambient.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  /**
   * `.next/standalone` — a self-contained server carrying only the modules the
   * app actually imports, rather than the whole `node_modules` tree.
   *
   * **Self-hosting only.** It is what the Docker image runs; without it the
   * runtime stage would have to carry every production dependency, which is
   * most of the image for no benefit.
   *
   * On Vercel it must be off. Vercel runs its own output-file tracing and
   * expects the standard build layout, and `standalone` changes that layout —
   * the build fails with `ENOENT … .next/next-server.js.nft.json`, which is
   * Vercel looking for a trace manifest that standalone does not put there.
   * (`.nft.json` is Node File Trace output, a normal Next build artifact.)
   *
   * `VERCEL` is set to `1` by Vercel's build environment and by nothing else,
   * so this needs no configuration in either place.
   */
  output: process.env.VERCEL ? undefined : "standalone",

  // The version is free reconnaissance for anyone scanning for known issues.
  poweredByHeader: false,

  /**
   * No browser source maps in production.
   *
   * This is already the default; it is written down because turning it on is a
   * one-line change somebody makes while debugging, and it publishes readable
   * source — including comments about how the money paths work — to anyone who
   * opens devtools.
   */
  productionBrowserSourceMaps: false,

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
