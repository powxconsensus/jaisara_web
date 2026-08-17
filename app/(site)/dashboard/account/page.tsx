import type { Metadata } from "next";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { AppearanceCard } from "@/components/theme/appearance-card";
import { AnalyticsCard } from "@/components/analytics/analytics-card";
import { DeleteAccountCard } from "@/components/dashboard/delete-account-card";
import { NewsletterCard } from "@/components/dashboard/newsletter-card";

export const metadata: Metadata = { title: "Account settings" };

/**
 * Profile (identity, email and password), appearance, then deletion. The
 * palette grid stays its own card so removing it never touches profile.
 */
export default function AccountPage() {
  return (
    <div className="max-w-[860px]">
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-muted">
        [ Account ]
      </p>
      <h1 className="mb-3 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
        Your settings
      </h1>
      <p className="mb-7 text-[14.5px] leading-[1.65] text-muted">
        Profile details and how Jaisara looks to you.
      </p>
      {/* Username used to be its own card here. It is identity, like the email
          and password it now sits between, and three sections of one thing read
          as one thing rather than a card that happens to be nearby. */}
      <ProfileCard />
      <NewsletterCard />
      <AppearanceCard />
      <AnalyticsCard />
      <DeleteAccountCard />
    </div>
  );
}
