import { cn } from "@/lib/cn";

/**
 * The lit band at the top of an interior page.
 *
 * The navbar is a translucent plate - `color-mix(var(--bg) 72%, transparent)`
 * over a backdrop blur - so it is only legible when there is something behind
 * it for it to be 72% of. The landing page supplies that with the hero
 * atmosphere. A page whose top is flat `--bg` gives the bar the page's own
 * colour, and it vanishes: what is left is a hairline rectangle floating in the
 * dark, which reads as a rendering fault rather than as a floating bar.
 *
 * Same vocabulary as the hero - wash, bloom, masked grid - at lower amplitude,
 * so an interior page belongs to the same site without competing with its own
 * content. The wash is `--surface` rather than a hand-picked colour because
 * that token moves the right way in both modes: it lifts off `--bg` in dark and
 * brightens off it in light, so the bar separates either way.
 *
 * It paints behind the navbar, so the page rendering it has to pull itself up
 * under the bar with `-mt-[var(--nav-h)]` and pad the content back down, the
 * same contract `HeroStage` follows.
 */
export function PageAtmosphere({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      /* `inset-0`, so the caller sizes it by wrapping the region it should
         light. A fixed height would have to guess where the content ends, and
         a gradient that fades out mid-card leaves a seam across it; anchored to
         the region, the wash always lands its last stop on the region's own
         edge. */
      className={cn("pointer-events-none absolute inset-0 overflow-x-clip", className)}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, var(--surface) 0%, color-mix(in oklab, var(--surface) 46%, transparent) 34%, transparent 100%)",
        }}
      />

      {/* The hero's back wall, same 88px pitch, faded out before it reaches
          the content so it never sits behind a price. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: "radial-gradient(110% 96% at 50% 0%, #000 0%, transparent 74%)",
          WebkitMaskImage: "radial-gradient(110% 96% at 50% 0%, #000 0%, transparent 74%)",
        }}
      />

      <div className="absolute -left-[12%] -top-[300px] size-[700px] rounded-full bg-primary opacity-[0.2] blur-[150px]" />
      <div className="absolute -right-[8%] -top-[240px] size-[520px] rounded-full bg-primary opacity-[0.1] blur-[140px]" />
    </div>
  );
}
