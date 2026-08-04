import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import localFont from "next/font/local";

/**
 * Four type families, self-hosted via `next/font` (handoff §1.4, §8).
 * Each exposes a CSS variable that `globals.css` maps into Tailwind's theme
 * (`font-display`, `font-mono`, `font-serif`, `font-sans`).
 */

// Display headings — Satoshi (Fontshare). Always uppercase, weight 900.
export const satoshi = localFont({
  src: [
    { path: "./Satoshi-Regular.woff2", weight: "400", style: "normal" },
    { path: "./Satoshi-Medium.woff2", weight: "500", style: "normal" },
    { path: "./Satoshi-Bold.woff2", weight: "700", style: "normal" },
    { path: "./Satoshi-Black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

// Labels, eyebrows, figures, codes, buttons — JetBrains Mono.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

// One accent word per section — Instrument Serif, italic, lowercase.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument",
  display: "swap",
});

// Body paragraphs — Inter.
export const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
  display: "swap",
});

/** All font CSS-variable classes, for the <html> element. */
export const fontVariables = [
  satoshi.variable,
  jetbrainsMono.variable,
  instrumentSerif.variable,
  inter.variable,
].join(" ");
