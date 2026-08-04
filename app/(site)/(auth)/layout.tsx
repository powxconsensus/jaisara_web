import { AccessPanel } from "@/components/auth/access-panel";

/**
 * Two equal-height panels, vertically centred, with 28px clearance below the
 * floating navbar (handoff §4.4 — an earlier build had the panel touching it).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-118px)] max-w-[var(--maxw)] items-stretch gap-3.5 px-[var(--pad)] pb-10 pt-7">
      <AccessPanel />
      <div className="grid flex-1 place-items-center py-[clamp(30px,4vw,56px)]">{children}</div>
    </div>
  );
}
