"use client";

import { useEffect } from "react";
import clarity from "@microsoft/clarity";

/**
 * Microsoft Clarity — session replay, heatmaps, rage-click detection.
 *
 * Renders nothing. `clarity.init()` appends a `<script>` to the document, so it
 * has to run in the browser and after mount, which is what makes this a client
 * component rather than a `<script>` in the layout.
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
  useEffect(() => {
    clarity.init(projectId);
  }, [projectId]);

  return null;
}
