"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Shared plumbing for the hero's two canvases: DPR-correct sizing, a single
 * rAF, and a watchdog for environments that throttle rAF (background tabs,
 * embedded previews) so the canvas never freezes mid-frame.
 *
 * The painter owns its own particle state - pass one built by a factory and
 * memoised per component, never a module-level singleton, or two mounts share
 * one set of particles.
 */

export type Painter = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/** How long the canvas may go unpainted before the watchdog forces a frame. */
const STALL_MS = 700;
const WATCHDOG_MS = 260;

export function useCanvasLoop(paint: Painter): RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paintRef = useRef(paint);

  useEffect(() => {
    paintRef.current = paint;
  }, [paint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let last = 0;

    const draw = () => {
      const ctx = canvas.getContext("2d");
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      if (!ctx || !width || !height) return;

      const pixelWidth = Math.round(width * dpr);
      const pixelHeight = Math.round(height * dpr);
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      last = Date.now();
      paintRef.current(ctx, width, height);
    };

    let frame = requestAnimationFrame(function step() {
      frame = requestAnimationFrame(step);
      draw();
    });
    const watchdog = setInterval(() => {
      if (Date.now() - last > STALL_MS) draw();
    }, WATCHDOG_MS);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(watchdog);
    };
  }, []);

  return canvasRef;
}

/** Deep Teal's accent - the seed value, replaced on the first painted frame. */
export const DEFAULT_ACCENT_RGB = "153,225,217";

/**
 * `--primary` as an `r,g,b` string for canvas fills. Re-read periodically
 * rather than cached once, so a palette or mode switch reaches the canvases too.
 *
 * Only ever call this from inside a paint: painters are built during render,
 * which also happens on the server where there is no `getComputedStyle`.
 */
export function readAccentRgb(): string {
  const hex = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  if (hex[0] !== "#" || hex.length < 7) return DEFAULT_ACCENT_RGB;
  const n = Number.parseInt(hex.slice(1, 7), 16);
  if (Number.isNaN(n)) return DEFAULT_ACCENT_RGB;
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
