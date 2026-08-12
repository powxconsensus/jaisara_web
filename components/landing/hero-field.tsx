"use client";

import { useMemo } from "react";
import { DEFAULT_ACCENT_RGB, readAccentRgb, useCanvasLoop, type Painter } from "./canvas-loop";

/**
 * The air above the ledger: slow rising motes in the accent colour.
 *
 * Deliberately not the connected-dots "network graph" this replaced - that
 * effect is a decade old, and the depth in this hero now comes from the ground
 * plane, so the sky only has to suggest atmosphere.
 *
 * Masked out below 76% so the motes never compete with the floor.
 */

interface Mote {
  x: number;
  y: number;
  /** Rise speed, as a share of canvas height per frame. */
  v: number;
  r: number;
  a: number;
  /** Phase offset, so they do not all breathe together. */
  ph: number;
}

/** One mote per ~21000px² of canvas, clamped so tiny and huge screens agree. */
const DENSITY = 21000;
const MIN_MOTES = 16;
const MAX_MOTES = 54;
/** How often to re-read --primary, in frames. */
const ACCENT_EVERY = 50;

function createPainter(): Painter {
  let motes: Mote[] = [];
  let accent = DEFAULT_ACCENT_RGB;
  let tick = 0;

  const seed = (width: number, height: number) => {
    const want = Math.min(MAX_MOTES, Math.max(MIN_MOTES, Math.round((width * height) / DENSITY)));
    if (motes.length === want) return;
    motes = Array.from({ length: want }, (_, i) => motes[i] ?? {
      x: Math.random(),
      y: Math.random(),
      v: 0.00012 + Math.random() * 0.00036,
      r: 0.7 + Math.random() * 1.5,
      a: 0.14 + Math.random() * 0.44,
      ph: Math.random() * Math.PI * 2,
    });
  };

  return (ctx, width, height) => {
    if (tick++ % ACCENT_EVERY === 0) accent = readAccentRgb();
    seed(width, height);

    const t = tick * 0.016;
    ctx.globalCompositeOperation = "lighter";
    for (const m of motes) {
      m.y -= m.v;
      if (m.y < -0.04) {
        m.y = 1.04;
        m.x = Math.random();
      }
      const wave = Math.sin(t * 0.55 + m.ph);
      const alpha = m.a * (0.28 + 0.72 * wave * wave);
      ctx.fillStyle = `rgba(${accent},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(m.x * width + wave * 15, m.y * height, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  };
}

export function HeroField() {
  const ref = useCanvasLoop(useMemo(() => createPainter(), []));

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full opacity-90"
      style={{
        maskImage:
          "linear-gradient(to bottom, #000 34%, rgba(0,0,0,.35) 62%, transparent 82%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, #000 34%, rgba(0,0,0,.35) 62%, transparent 82%)",
      }}
    />
  );
}
