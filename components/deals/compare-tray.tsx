import type { Firm } from "@/lib/data/firms";

/** Docked comparison tray. Holds 2–3 firms (handoff §4.2). */
export function CompareTray({
  firms,
  onRemove,
  onClear,
}: {
  firms: Firm[];
  onRemove: (slug: string) => void;
  onClear: () => void;
}) {
  if (firms.length === 0) return null;

  return (
    <div
      className="fixed bottom-3 left-3 right-[74px] z-[130] flex items-stretch gap-2 overflow-x-auto rounded-[14px] border bg-surface p-2.5 shadow-card [animation:jsUp_.3s_both]"
      style={{ borderColor: "color-mix(in oklab, var(--primary) 40%, var(--hair))" }}
    >
      {firms.map((firm) => (
        <div key={firm.slug} className="min-w-[150px] flex-1 rounded-[10px] bg-surface-2 px-3 py-2.5">
          <div className="mb-[7px] flex items-center justify-between gap-2">
            <span className="truncate text-[12.5px] font-semibold">{firm.name}</span>
            <button
              type="button"
              onClick={() => onRemove(firm.slug)}
              aria-label={`Remove ${firm.name}`}
              className="flex-none cursor-pointer text-[13px] text-muted hover:text-fg"
            >
              ×
            </button>
          </div>
          <p className="font-mono text-[10px] leading-[1.8] text-muted">
            CB <span className="text-primary">{firm.cashback}%</span> · OFF {firm.discount}%
            <br />
            {firm.split} SPLIT · {firm.payout.toUpperCase()}
            <br />
            {firm.platform}
          </p>
        </div>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="flex flex-none cursor-pointer items-center rounded-[10px] border border-hair px-3.5 font-mono text-[9.5px] tracking-[0.12em] text-muted"
      >
        CLEAR
      </button>
    </div>
  );
}
