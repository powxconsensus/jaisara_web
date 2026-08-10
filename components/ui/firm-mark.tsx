import { cn } from "@/lib/cn";

/**
 * A firm's logo, or its monogram when there isn't one.
 *
 * One component for every surface that shows a firm — the index, the deals
 * table, the estimator, the claim form — so a logo uploaded once appears
 * everywhere, and a firm without one degrades to the same two-letter tile
 * rather than to a broken image.
 *
 * A plain `<img>`, not `next/image`: the source is an admin-supplied URL that
 * may point at our own API or at the firm's CDN, and there is no fixed set of
 * hosts to configure. These are small square marks — the optimiser would buy
 * very little for the constraint it imposes.
 */
export function FirmMark({
  name,
  mark,
  logoUrl,
  size = 34,
  className,
}: {
  name: string;
  mark: string;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const shared = cn(
    "grid flex-none place-items-center overflow-hidden rounded-[10px] border border-hair bg-surface-2",
    className,
  );

  if (logoUrl) {
    return (
      <span className={shared} style={{ width: size, height: size }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL, no fixed host to configure */}
        <img
          src={logoUrl}
          alt={`${name} logo`}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          className="size-full object-contain"
        />
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(shared, "font-mono text-muted")}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {mark}
    </span>
  );
}
