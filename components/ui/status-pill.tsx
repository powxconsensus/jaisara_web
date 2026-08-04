import { STATUS_TONE, type LedgerStatus } from "@/lib/data/wallet";

/** Tone → colour pair. Always rendered with the label, never colour alone. */
const TONE_STYLE = {
  warning: { background: "color-mix(in oklab, var(--warning) 16%, transparent)", color: "var(--warning)" },
  success: { background: "color-mix(in oklab, var(--success) 16%, transparent)", color: "var(--success)" },
  info: { background: "color-mix(in oklab, var(--info) 16%, transparent)", color: "var(--info)" },
  danger: { background: "color-mix(in oklab, var(--danger) 16%, transparent)", color: "var(--danger)" },
} as const;

export function StatusPill({ status }: { status: LedgerStatus | "Approved" }) {
  const tone = status === "Approved" ? "success" : STATUS_TONE[status];
  return (
    <span
      className="rounded-md px-[9px] py-[5px] font-mono text-[8.5px] font-medium uppercase tracking-[0.12em]"
      style={TONE_STYLE[tone]}
    >
      {status}
    </span>
  );
}
