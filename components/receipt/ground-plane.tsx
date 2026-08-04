import type { Ref } from "react";

/**
 * The pad the receipt lands on: a contact shadow, a radial glow, light rays,
 * a dust puff and three shockwave rings, laid flat with `rotateX(78deg)`.
 *
 * Entirely decorative — hidden from assistive tech, and skipped under reduced
 * motion. `playImpact` finds these nodes by their `data-ground-*` attributes.
 */
export function GroundPlane({ ref }: { ref?: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-[calc(100%+34px)] hidden h-[250px] w-[172%] -translate-x-1/2 [transform:translateX(-50%)_rotateX(78deg)] md:block"
    >
      {/* Contact shadow — always present, not animated. */}
      <div
        className="absolute left-1/2 top-1/2 h-[34%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] blur-[20px]"
        style={{ background: "radial-gradient(circle, rgba(0,0,0,.55), transparent 70%)" }}
      />
      <div
        data-ground-fx
        data-ground-glow
        className="absolute left-1/2 top-1/2 h-[76%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-50 blur-[30px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 62%, transparent), transparent 68%)",
        }}
      />
      <div
        data-ground-fx
        data-ground-ray
        className="absolute left-1/2 top-1/2 h-[96%] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-[.32]"
        style={{
          background:
            "repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in oklab, var(--primary) 60%, transparent) 0deg 1.2deg, transparent 1.2deg 13deg)",
          maskImage: "radial-gradient(circle, transparent 26%, #000 46%, transparent 82%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 26%, #000 46%, transparent 82%)",
        }}
      />
      <div
        data-ground-fx
        data-ground-dust
        className="absolute left-1/2 top-1/2 h-[66%] w-[66%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] opacity-0 blur-[14px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--text) 22%, transparent), transparent 62%)",
        }}
      />
      {[
        "1.5px solid color-mix(in oklab, var(--primary) 75%, transparent)",
        "1px solid color-mix(in oklab, var(--primary) 55%, transparent)",
        "1px solid color-mix(in oklab, var(--text) 34%, transparent)",
      ].map((border, i) => (
        <div
          key={i}
          data-ground-fx
          data-ground-ring
          className="absolute left-1/2 top-1/2 h-[52%] w-[52%] rounded-[50%] opacity-0"
          style={{ border, transform: "translate(-50%,-50%) scale(1.5)" }}
        />
      ))}
    </div>
  );
}
