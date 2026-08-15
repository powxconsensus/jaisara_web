import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/shell/toast";
import { AssistantProvider } from "@/components/support/assistant-context";
import { AuthProvider } from "@/components/auth/auth-context";
import { ClarityAnalytics } from "@/components/analytics/clarity";

/**
 * Unset means Clarity is off — no script, and `next.config.ts` leaves the CSP
 * narrow. That is the right default for local work and for previews, where the
 * only thing session replay records is you reloading the same page.
 */
const clarityProjectId = process.env.CLARITY_PROJECT_ID?.trim();

export const metadata: Metadata = {
  title: {
    default: "Jaisara - Prop firm cashback",
    template: "%s · Jaisara",
  },
  description:
    "Use a Jaisara coupon at the firm's checkout: the price drops straight away, then we pay you cashback on top. Tracked to the cent, withdrawable in USDT or gift cards.",
};

/**
 * Deliberately does *not* read the session here.
 *
 * Resolving it in the root layout removes the dashboard's auth waterfall, and
 * costs the entire public site its static rendering: `cookies()` opts every
 * descendant into per-request server rendering, so `/`, `/deals`, `/terms` and
 * every prerendered firm page stop being served from cache. Measured, it took
 * the build from a set of static and SSG routes to zero.
 *
 * That is the wrong trade - it slows the storefront to speed up the account
 * area. The session is read in the layouts that actually need it, which are
 * dynamic anyway, and seeded into this provider from there.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body>
        <ThemeScript />
        <ToastProvider>
          <AuthProvider>
            <AssistantProvider>{children}</AssistantProvider>
          </AuthProvider>
        </ToastProvider>
        {clarityProjectId ? <ClarityAnalytics projectId={clarityProjectId} /> : null}
      </body>
    </html>
  );
}
