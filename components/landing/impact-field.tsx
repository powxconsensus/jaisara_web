/**
 * The patch of ledger directly under the receipt — everything that reacts to a
 * landing. Pure markup at rest; `ground-impact.ts` drives it.
 *
 * The whole group is positioned and sized from the card's live rect
 * (`--impx`, `--impy`, `--impw` on the ground) and laid flat with the same
 * `rotateX` as the plane, so the fracture lies *on* the floor rather than
 * floating above it. That locality is the point: one continuous surface that
 * lights up only where it is hit.
 */

import { CHIPS, CHIP_ASPECT, FRACTURES } from "./fracture-geometry";
import { FX, REST } from "./ground-impact";

/** The bright seam, shared by a fracture and its branch. */
const SEAM_FILL =
  "linear-gradient(90deg, #fff, color-mix(in oklab, var(--primary) 96%, #fff) 14%, color-mix(in oklab, var(--primary) 72%, transparent) 44%, color-mix(in oklab, var(--primary) 26%, transparent) 74%, transparent 96%)";
const SEAM_GLOW =
  "drop-shadow(0 0 5px color-mix(in oklab, var(--primary) 62%, transparent)) drop-shadow(0 0 14px color-mix(in oklab, var(--primary) 30%, transparent))";

export function ImpactField() {
  return (
    <div
      data-imp=""
      className="absolute left-[var(--impx,72%)] top-[var(--impy,52%)] h-[var(--impw,560px)] w-[var(--impw,560px)] [transform-style:preserve-3d] [transform:translate(-50%,-50%)_rotateX(var(--groundrot))]"
    >
      {/* Contact shadow — the receipt's own weight on the floor. */}
      <div
        className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[22px]"
        style={{ background: "radial-gradient(circle, rgba(0,0,0,.6), transparent 70%)" }}
      />

      {/* Glow pool: always faintly lit, brightening on each landing. */}
      <div
        data-fx={FX.glow}
        className="absolute left-1/2 top-1/2 size-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[26px] transition-opacity duration-[900ms] ease-out"
        style={{
          opacity: REST.glow,
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--primary) 70%, transparent), transparent 66%)",
        }}
      />

      {/* Conic rays — light escaping the seams. */}
      <div
        data-fx={FX.ray}
        className="absolute left-1/2 top-1/2 size-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-1000 ease-out"
        style={{
          opacity: REST.ray,
          background:
            "repeating-conic-gradient(from 0deg at 50% 50%, color-mix(in oklab, var(--primary) 55%, transparent) 0deg 1deg, transparent 1deg 17deg)",
          maskImage: "radial-gradient(circle, transparent 24%, #000 44%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 24%, #000 44%, transparent 80%)",
        }}
      />

      {FRACTURES.map((fracture, i) => (
        <div
          key={i}
          data-fx={FX.crack}
          data-angle={fracture.angle}
          className="pointer-events-none absolute left-1/2 top-1/2 opacity-0 [transform-origin:0_50%]"
          style={{
            width: `${fracture.width}%`,
            height: `${fracture.height}px`,
            marginTop: `${-fracture.height / 2}px`,
            transform: `rotate(${fracture.angle}deg) scaleX(.02)`,
          }}
        >
          {/* Darkness around the seam, not in it — that is what gives it depth. */}
          <div
            className="absolute inset-y-[-70%] left-0 right-[-1%] blur-[7px]"
            style={{
              background: "radial-gradient(72% 100% at 6% 50%, rgba(0,0,0,.62), transparent 76%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: SEAM_FILL, clipPath: fracture.polygon, filter: SEAM_GLOW }}
          />
          <div
            data-fx={FX.crackHot}
            className="absolute inset-0 opacity-0"
            style={{
              background:
                "linear-gradient(90deg, #fff, color-mix(in oklab, #fff 62%, var(--primary)) 26%, transparent 72%)",
              clipPath: fracture.hotPolygon,
              filter: "drop-shadow(0 0 8px color-mix(in oklab, var(--primary) 70%, #fff))",
            }}
          />
          {fracture.branch && (
            <div
              className="absolute top-1/2 opacity-[0.72] [transform-origin:0_50%]"
              style={{
                left: `${fracture.branch.left}%`,
                width: `${fracture.branch.width}%`,
                height: `${fracture.branch.height}px`,
                marginTop: `${-fracture.branch.height / 2}px`,
                transform: `rotate(${fracture.branch.angle}deg)`,
                background: SEAM_FILL,
                clipPath: fracture.branch.polygon,
                filter: SEAM_GLOW,
              }}
            />
          )}
        </div>
      ))}

      {CHIPS.map((chip, i) => (
        <div
          key={i}
          data-fx={FX.chip}
          data-angle={chip.angle}
          data-distance={chip.distance}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-[1px] opacity-0"
          style={{
            width: `${chip.width}px`,
            height: `${(chip.width * CHIP_ASPECT).toFixed(1)}px`,
            margin: `${(-chip.width * CHIP_ASPECT) / 2}px 0 0 ${-chip.width / 2}px`,
            background: "color-mix(in oklab, var(--primary) 62%, var(--text))",
            boxShadow: "0 0 6px color-mix(in oklab, var(--primary) 34%, transparent)",
          }}
        />
      ))}

      <div
        data-fx={FX.dust}
        className="absolute left-1/2 top-1/2 size-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-[15px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklab, var(--text) 24%, transparent), transparent 62%)",
        }}
      />
      <div
        data-fx={FX.core}
        className="absolute left-1/2 top-1/2 size-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[5px]"
        style={{
          opacity: REST.core,
          background:
            "radial-gradient(circle, #fff, color-mix(in oklab, var(--primary) 90%, #fff) 34%, transparent 70%)",
        }}
      />

      {[
        "1.5px solid color-mix(in oklab, var(--primary) 78%, transparent)",
        "1px solid color-mix(in oklab, var(--primary) 55%, transparent)",
        "1px solid color-mix(in oklab, var(--text) 30%, transparent)",
      ].map((border, i) => (
        <div
          key={i}
          data-fx={FX.ring}
          className="absolute left-1/2 top-1/2 size-[44%] rounded-full opacity-0"
          style={{ border, transform: "translate(-50%,-50%) scale(1.5)" }}
        />
      ))}
    </div>
  );
}
