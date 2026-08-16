"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import clarity from "@microsoft/clarity";

import {
  consentServerSnapshot,
  consentSnapshot,
  subscribeConsent,
} from "@/lib/analytics-consent";
import { isAnalyticsAllowedOn } from "@/lib/analytics-routes";

/**
 * Microsoft Clarity — session replay, heatmaps, rage-click detection.
 *
 * Renders nothing. `clarity.init()` appends a `<script>` to the document, so it
 * has to run in the browser and after mount, which is what makes this a client
 * component rather than a `<script>` in the layout.
 *
 * **It used to initialise unconditionally from the root layout**, which meant
 * it recorded `/dashboard` and `/console` as readily as the landing page: a
 * member's balance, their claim history, the receipts they uploaded, and every
 * member record an administrator opened. The legal text described masking;
 * nothing in the code declined to record, and nobody could opt out.
 *
 * Now two conditions, both required:
 *
 *  - the visitor granted consent, which is undecided-means-no;
 *  - the current route is not authenticated or credential-bearing.
 *
 * **The project id arrives as a prop, not as `NEXT_PUBLIC_CLARITY_PROJECT_ID`.**
 * The id is not a secret — it is in the script URL, visible to anyone with
 * devtools open — so this is about consistency rather than exposure. `web/` has
 * exactly one convention for configuration and it is server-read
 * (`API_BASE_URL`, see `next.config.ts`); a `NEXT_PUBLIC_` variable here would
 * be the only one in the app, and the next person would reasonably read that as
 * permission to add more. The root layout is a server component, so passing it
 * down costs nothing.
 *
 * Init is safe to call twice. React's StrictMode runs effects twice in
 * development, and Clarity's own `injectScript` returns early when
 * `#clarity-script` already exists — checked in the package, not assumed.
 *
 * **This needs the CSP to allow `clarity.ms`**, which `next.config.ts` widens
 * only when `CLARITY_PROJECT_ID` is set. That policy is baked at build time, so
 * the variable has to be present in the *build* environment as well as the
 * runtime one. Set it at runtime only and the script is blocked with a console
 * error and no other symptom.
 */
export function ClarityAnalytics({ projectId }: { projectId: string }) {
  const consent = useSyncExternalStore(
    subscribeConsent,
    consentSnapshot,
    consentServerSnapshot,
  );
  const pathname = usePathname();
  const started = useRef(false);

  const allowed = consent === "granted" && isAnalyticsAllowedOn(pathname);

  useEffect(() => {
    if (allowed) {
      if (!started.current) {
        started.current = true;
        clarity.init(projectId);
      }
      clarity.consent(true);
      return;
    }

    /**
     * Withdrawing consent has to stop collection, not merely stop starting it.
     *
     * The script cannot be unloaded once injected, so `clarity.consent(false)`
     * is what actually matters here — it is the vendor's own signal to stop
     * recording. Calling it only when something was started avoids telling a
     * library that never loaded to do anything.
     *
     * This also fires on navigation *into* an excluded route, which is the
     * common case: a member accepts the banner on the landing page and then
     * signs in.
     */
    if (started.current) clarity.consent(false);
  }, [allowed, projectId]);

  return null;
}
