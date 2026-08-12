import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * The body of a "not found" screen - no navbar, no footer.
 *
 * Kept chrome-free because it is rendered in two places that supply different
 * chrome: `app/not-found.tsx` sits above the `(site)` layout and has to add the
 * navbar and footer itself, while the console renders it *inside* that layout,
 * where adding them again would produce two navbars.
 */

const DESTINATIONS = [
  {
    href: "/deals",
    eyebrow: "01",
    label: "Deals",
    description: "Every firm we track, with the live discount and cashback rate.",
  },
  {
    href: "/dashboard",
    eyebrow: "02",
    label: "Dashboard",
    description: "Your wallet, claims and referral link.",
  },
  {
    href: "/journal",
    eyebrow: "03",
    label: "Journal",
    description: "Notes on prop firms, payouts and the rules that catch people out.",
  },
];

export function NotFoundView({
  title = "Page not found",
  message = "This link is broken, or whatever lived here has moved on. Nothing has happened to your account or your balance.",
  code = "404",
}: {
  title?: string;
  message?: string;
  code?: string;
}) {
  return (
    <section className="relative overflow-hidden">
      {/* The oversized outlined figure echoes the footer wordmark - the one
          place in the design language reserved for a number this large. */}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute -top-[clamp(10px,4vw,40px)] left-1/2 -translate-x-1/2 select-none font-display text-[clamp(190px,34vw,460px)] font-black leading-[0.8] tracking-[-0.03em] text-transparent"
        style={{ WebkitTextStroke: "1px color-mix(in oklab, var(--text) 11%, transparent)" }}
      >
        {code}
      </p>

      <div className="relative mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[clamp(60px,9vw,120px)] pt-[clamp(70px,12vw,150px)]">
        <div className="max-w-[620px]">
          <p className="mb-4 font-mono text-[10px] tracking-[0.24em] text-primary">
            [ {code} ] DEAD LINK
          </p>
          <h1 className="font-display text-[clamp(38px,7vw,76px)] font-black uppercase leading-[0.92] tracking-[-0.025em]">
            {title}
            <span className="font-serif font-normal normal-case italic text-primary">.</span>
          </h1>
          <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.7] text-muted">{message}</p>

          <div className="mt-9 flex flex-wrap gap-2.5">
            <Button asChild size="lg">
              <Link href="/">
                Back home<span className="text-[13px]">↗</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/deals">Browse deals</Link>
            </Button>
          </div>
        </div>

        <div className="mt-[clamp(44px,7vw,80px)] grid gap-2.5 md:grid-cols-3">
          {DESTINATIONS.map((destination) => (
            <Link
              key={destination.href}
              href={destination.href}
              className="group rounded-card border border-hair bg-surface p-6 transition duration-300 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-1 hover:border-primary"
            >
              <p className="font-mono text-[9px] tracking-[0.2em] text-muted">
                [ {destination.eyebrow} ]
              </p>
              <p className="mt-4 flex items-center justify-between gap-3 font-display text-xl font-black uppercase">
                {destination.label}
                <span className="text-primary transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </p>
              <p className="mt-2.5 text-[12.5px] leading-6 text-muted">
                {destination.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
