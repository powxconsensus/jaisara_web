import type { Metadata } from "next";
import { NotFoundPage } from "@/components/shell/not-found-page";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

/**
 * The root not-found boundary.
 *
 * It renders above the `(site)` route group, so the navbar and footer that
 * every other page inherits are not here - they have to be added explicitly,
 * which `NotFoundPage` does. `ConsoleShell` renders the same component for a
 * visitor with no console permissions, so both 404s are one screen.
 */
export default function NotFound() {
  return <NotFoundPage />;
}
