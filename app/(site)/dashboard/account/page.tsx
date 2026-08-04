import type { Metadata } from "next";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { AppearanceCard } from "@/components/theme/appearance-card";

export const metadata: Metadata = { title: "Account settings" };

/** Two independent cards, so removing the palette grid never touches profile. */
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
      <ProfileCard />
      <AppearanceCard />
    </div>
  );
}
