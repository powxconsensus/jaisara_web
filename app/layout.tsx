import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { ThemeScript } from "@/components/theme/theme-script";
import { ToastProvider } from "@/components/shell/toast";
import { AssistantProvider } from "@/components/support/assistant-context";
import { AuthProvider } from "@/components/auth/auth-context";

export const metadata: Metadata = {
  title: {
    default: "Jaisara — Prop firm cashback",
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
      </body>
    </html>
  );
}
