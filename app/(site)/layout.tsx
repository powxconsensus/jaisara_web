import { Navbar } from "@/components/shell/navbar";
import { Assistant } from "@/components/support/assistant";

/**
 * Shell shared by every screen: floating navbar and support assistant. The
 * footer is NOT here - it belongs to marketing pages only
 * (the prototype gates it on `isMarketing`), so it lives in (marketing).
 */
export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      {/* The navbar is sticky, so it occupies flow: pages start below it.
          Only the hero pulls itself up to sit under the bar. */}
      <main className="flex-1">{children}</main>
      <Assistant />
    </div>
  );
}
