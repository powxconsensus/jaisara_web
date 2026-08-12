import { HeroField } from "./hero-field";

/**
 * The air above the ledger: everything between the wall behind the copy and the
 * ground it stands on.
 *
 * Four layers, all decorative:
 *  - the mote canvas (see hero-field.tsx),
 *  - a faint square grid on the back wall, which the floor's lanes answer,
 *  - one slow ambient bloom drifting behind the headline,
 *  - a spotlight that follows the pointer, driven by `--mx` / `--my` set on the
 *    hero section - no React state, so tracking the cursor costs no renders.
 */

const WALL_MASK = "radial-gradient(75% 62% at 50% 26%, #000, transparent 80%)";

export function HeroAtmosphere() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <HeroField />

      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: WALL_MASK,
          WebkitMaskImage: WALL_MASK,
        }}
      />

      <div className="absolute -left-[10%] -top-[320px] size-[780px] rounded-full bg-primary opacity-40 blur-[150px] motion-safe:[animation:jsDrift_24s_ease-in-out_infinite]" />

      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(340px circle at var(--mx,50%) var(--my,12%), color-mix(in oklab, var(--primary) 7%, transparent), transparent 64%)",
        }}
      />

      {/* Light pooling on the horizon, just above the ground's far edge. */}
      <div
        className="absolute inset-x-0 bottom-[calc(var(--groundh)-52px)] h-[104px] opacity-[0.42] blur-[38px]"
        style={{
          background: "radial-gradient(40% 100% at 50% 100%, var(--primary), transparent 70%)",
        }}
      />
    </div>
  );
}
