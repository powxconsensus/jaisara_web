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
