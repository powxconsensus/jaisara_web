import type { Metadata } from "next";
import { Navbar } from "@/components/shell/navbar";
import { Footer } from "@/components/shell/footer";
import { NotFoundView } from "@/components/shell/not-found-view";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * The root not-found boundary.
 *
 * It renders above the `(site)` route group, so the navbar and footer that
 * every other page inherits are not here — they have to be added explicitly.
 * A 404 without them strands the visitor on a page with no way out except the
 * back button.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />
      <main className="flex-1">
        <NotFoundView />
      </main>
      <Footer />
    </div>
  );
}
