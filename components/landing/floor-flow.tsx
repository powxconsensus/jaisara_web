"use client";

import { useMemo } from "react";
import { DEFAULT_ACCENT_RGB, readAccentRgb, useCanvasLoop, type Painter } from "./canvas-loop";

/**
 * The ledger in motion: depth rungs advancing toward the viewer, and payouts
 * running its lanes back to the trader.
 *
 * Projected with the *same* maths as the CSS lanes on the plane beneath it -
 * `sx = cx + x·p/(p − y·sin)`, `sy = y·cos·p/(p − y·sin)` - reading
 * `--groundrot`, `--groundpersp` and `--groundgrid` at paint time. That is what
 * makes a trace ride a lane exactly instead of drifting across it, and why the
 * two stay aligned when the tokens change at a breakpoint.
 *
 * Composited `lighter`, so traces add light to the floor rather than covering it.
 */

interface Flow {
  /** Which lane, in grid columns either side of centre. */
  lane: number;
  /** Depth along the plane, 0 at the horizon to 1 at the viewer. */
  y: number;
  sp: number;
  len: number;
  a: number;
}

const FLOW_COUNT = 15;
const LANES = 15;
/** Rungs are drawn from the horizon forward until they pass the near edge. */
const RUNG_COUNT = 24;
const RUNG_SPEED = 0.0021;
const ACCENT_EVERY = 50;

function resetFlow(f: Flow): Flow {
  f.lane = ((Math.random() * LANES) | 0) - (LANES - 1) / 2;
  f.y = -0.08 - Math.random() * 0.6;
  f.sp = 0.0017 + Math.random() * 0.0037;
  f.len = 0.09 + Math.random() * 0.18;
  f.a = 0.3 + Math.random() * 0.66;
  return f;
}

function readGround() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: number) =>
    Number.parseFloat(style.getPropertyValue(name)) || fallback;
  return {
    theta: (read("--groundrot", 79) * Math.PI) / 180,
    perspective: read("--groundpersp", 1000),
    gap: read("--groundgrid", 132),
  };
}

function createPainter(): Painter {
  const flows: Flow[] = Array.from({ length: FLOW_COUNT }, () => resetFlow({} as Flow));
  let accent = DEFAULT_ACCENT_RGB;
  let phase = 0;
  let tick = 0;

  return (ctx, width, height) => {
    if (tick++ % ACCENT_EVERY === 0) accent = readAccentRgb();

    const { theta, perspective, gap } = readGround();
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cx = width / 2;
    // The plane depth at which the projection reaches the near edge.
    const yMax = (height * perspective) / (cos * perspective + height * sin);
    const scale = (y: number) => perspective / (perspective - y * sin);
    const projectX = (x: number, y: number) => cx + x * scale(y);
    const projectY = (y: number) => y * cos * scale(y);

    ctx.globalCompositeOperation = "lighter";

    phase = (phase + RUNG_SPEED) % 1;
    const half = width * 1.1;
    for (let k = 1; k < RUNG_COUNT; k++) {
      const y = (k - phase) * gap;
      if (y <= 0 || y > yMax) continue;
      const d = y / yMax;
      // Fade in off the horizon, then out again as the rung nears the viewer.
      const alpha = 0.44 * Math.min(1, d * 6) * (1 - d * 0.72);
      if (alpha <= 0.005) continue;
      const py = projectY(y);
      ctx.strokeStyle = `rgba(${accent},${alpha.toFixed(3)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(projectX(-half, y), py);
      ctx.lineTo(projectX(half, y), py);
      ctx.stroke();
    }

    ctx.lineCap = "round";
    for (const f of flows) {
      f.y += f.sp;
      if (f.y > 1.06) resetFlow(f);
      const head = f.y * yMax;
      if (head <= 3) continue;
      const y1 = Math.min(head, yMax);
      const y0 = Math.max(3, (f.y - f.len) * yMax);
      if (y1 <= y0) continue;

      const fade = Math.min(1, f.y / 0.1) * (1 - Math.max(0, (f.y - 0.78) / 0.26));
      const alpha = f.a * Math.max(0, fade);
      if (alpha <= 0.012) continue;

      const x = f.lane * gap;
      const ax = projectX(x, y0);
      const ay = projectY(y0);
      const bx = projectX(x, y1);
      const by = projectY(y1);

      const gradient = ctx.createLinearGradient(ax, ay, bx, by);
      gradient.addColorStop(0, `rgba(${accent},0)`);
      gradient.addColorStop(0.72, `rgba(${accent},${(alpha * 0.45).toFixed(3)})`);
      gradient.addColorStop(1, `rgba(${accent},${alpha.toFixed(3)})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.min(3.4, 0.7 * scale(y1));
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();

      ctx.fillStyle = `rgba(${accent},${(alpha * 0.8).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(bx, by, Math.min(3.2, 0.9 + 0.5 * scale(y1)), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
  };
}

const MASK =
  "radial-gradient(78% 98% at 50% 0%, #000 0, #000 48%, rgba(0,0,0,.62) 76%, transparent 98%)";

export function FloorFlow() {
  const ref = useCanvasLoop(useMemo(() => createPainter(), []));

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full"
      style={{ maskImage: MASK, WebkitMaskImage: MASK }}
    />
  );
}
