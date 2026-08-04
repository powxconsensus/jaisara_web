import { DashboardSidebar, DashboardTabBar } from "@/components/dashboard/dashboard-nav";

/** Sidebar on desktop, bottom tab bar on smaller screens (handoff §9). */
export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="mx-auto flex max-w-[var(--maxw)] items-start gap-[clamp(24px,3vw,44px)] px-[var(--pad)]">
      <DashboardSidebar />
      {/* Bottom padding clears the tab bar and the support launcher. */}
      <div className="min-w-0 flex-1 pb-[112px] pt-[clamp(28px,4vw,40px)] lg:pb-24">{children}</div>
      <DashboardTabBar />
    </div>
  );
}
