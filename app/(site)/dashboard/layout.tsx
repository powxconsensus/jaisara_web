import { DashboardSidebar, DashboardTabBar } from "@/components/dashboard/dashboard-nav";
import { fetchPublicSettings } from "@/lib/data/settings";

/**
 * Sidebar on desktop, bottom tab bar on smaller screens (handoff §9).
 *
 * The gutter is *outside* `--maxw`, which is the same nesting the navbar uses
 * (`px-[var(--pad)]` on the sticky wrapper, `max-w-[var(--maxw)]` within it).
 * It used to be inside, so the whole dashboard ran 2 × `--pad` — 112px on
 * desktop — narrower than the bar above it, and every page in the account
 * section sat visibly inset from its own navigation.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  // Read here rather than in each nav component: both the sidebar and the tab
  // bar need it, and one server read beats two client fetches that would each
  // flash the wrong state before settling.
  const { clubEnabled } = await fetchPublicSettings();

  return (
    <div className="px-[var(--pad)]">
      <div className="mx-auto flex max-w-[var(--maxw)] items-start gap-[clamp(24px,3vw,44px)]">
        <DashboardSidebar clubEnabled={clubEnabled} />
        {/* Bottom padding clears the tab bar and the support launcher. */}
        <div className="min-w-0 flex-1 pb-[112px] pt-[clamp(28px,4vw,40px)] lg:pb-24">
          {children}
        </div>
        <DashboardTabBar clubEnabled={clubEnabled} />
      </div>
    </div>
  );
}
