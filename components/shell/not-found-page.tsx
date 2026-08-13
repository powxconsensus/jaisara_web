import { Navbar } from "@/components/shell/navbar";
import { Footer } from "@/components/shell/footer";
import { NotFoundView } from "@/components/shell/not-found-view";

/**
 * A whole 404 screen — the message *and* the chrome around it.
 *
 * `NotFoundView` is only the middle part, and that was the problem: two places
 * rendered it and only one remembered to add a navbar and footer. A visitor who
 * opened `/console` without console permissions got the bare message on an
 * otherwise empty page, with no navigation and no way back except the browser
 * button, while the same 404 from any other URL looked like the rest of the
 * site.
 *
 * So the composition lives here once and both callers use it. Getting the two
 * back in sync is not the point; making them impossible to drift apart is.
 *
 * No state and no server-only APIs, which is what lets both callers use it:
 * the root `not-found.tsx` renders it on the server, and `ConsoleShell` — a
 * `"use client"` module — imports it, which does pull this and the navbar into
 * the client bundle. That is fine and worth being clear about rather than
 * assuming otherwise: `Navbar` is already a client component (it reads auth
 * state), and the console bundle is behind a permission check, not on the
 * marketing critical path.
 */
export function NotFoundPage() {
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
