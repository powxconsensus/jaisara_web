"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { CLAIMS, type Claim, type ClaimStatus } from "@/lib/data/claims";
import { FilterChip } from "@/components/ui/filter-chip";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/shell/toast";

const FILTERS: (ClaimStatus | "All")[] = ["Pending", "Approved", "Rejected", "All"];

/** Source pill colours — a claim's provenance, distinct from its status. */
const SOURCE_TONE: Record<Claim["source"], string> = {
  Auto: "var(--success)",
  Receipt: "var(--info)",
  Manual: "var(--text-muted)",
};

/**
 * Claim review console (handoff §4.10). The detail view is an inline panel
 * below the queue, not a drawer — reviewers compare it against the list.
 *
 * In production this must sit behind role-gated auth and its own route group.
 */
export function AdminConsole() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>(CLAIMS);
  const [filter, setFilter] = useState<ClaimStatus | "All">("Pending");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = claims.filter((claim) => filter === "All" || claim.status === filter);
  const open = claims.find((claim) => claim.id === openId) ?? null;
  const pendingCount = claims.filter((c) => c.status === "Pending").length;
  const approvedCount = claims.filter((c) => c.status === "Approved").length;

  const decide = (id: string, status: "Approved" | "Rejected") => {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setOpenId(null);
    toast(
      status === "Approved"
        ? "Claim approved — trader's pending balance credited"
        : "Claim rejected — the member has been told why",
      status === "Approved" ? "success" : "warning",
    );
  };

  const stats = [
    { label: "AWAITING REVIEW", value: String(pendingCount), tone: "text-warning" },
    { label: "APPROVED TODAY", value: String(approvedCount), tone: "text-success" },
    { label: "PAYOUT OWED", value: "$2,140", tone: "" },
    { label: "AUTO-MATCHED", value: "68%", tone: "text-info" },
  ];

  return (
    <div className="mx-auto max-w-[var(--maxw)] px-[var(--pad)] pb-[120px] pt-[clamp(32px,4vw,56px)]">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-3.5 flex items-center gap-2.5">
            <span className="font-mono text-[10px] tracking-[0.24em] text-muted">[ ADMIN ]</span>
            <span
              className="rounded-md px-2 py-1 font-mono text-[8.5px] tracking-[0.14em] text-danger"
              style={{ background: "color-mix(in oklab, var(--danger) 14%, transparent)" }}
            >
              INTERNAL
            </span>
          </div>
          <h1 className="m-0 font-display text-[clamp(25px,3.3vw,36px)] font-black uppercase leading-none tracking-[-0.02em]">
            Claims queue
          </h1>
        </div>
        <Link
          href="/dashboard"
          className="rounded-[10px] border border-hair px-[18px] py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary"
        >
          Exit admin
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[14px] border border-hair bg-surface p-5">
            <p className="mb-3 font-mono text-[9px] tracking-[0.16em] text-muted">{stat.label}</p>
            <p data-count className={`font-mono text-[26px] tracking-[-0.02em] ${stat.tone}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-[7px]">
        {FILTERS.map((option) => (
          <FilterChip key={option} active={filter === option} onClick={() => setFilter(option)}>
            {option}
          </FilterChip>
        ))}
      </div>

      <div className="rounded-card border border-hair bg-surface px-5 pb-3 pt-1.5">
        {visible.length === 0 ? (
          <div className="px-2.5 py-12 text-center">
            <p className="mb-2.5 font-mono text-[10px] tracking-[0.16em] text-muted">EMPTY</p>
            <p className="mb-1.5 text-sm font-semibold">Nothing here</p>
            <p className="text-[12.5px] text-muted">No claims with this status right now.</p>
          </div>
        ) : (
          visible.map((claim) => (
            <button
              key={claim.id}
              type="button"
              onClick={() => setOpenId(claim.id === openId ? null : claim.id)}
              aria-expanded={claim.id === openId}
              className="grid w-full cursor-pointer grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-[13px] gap-y-[5px] border-b border-hair-soft py-3.5 text-left md:grid-cols-[36px_minmax(0,1fr)_auto_auto]"
            >
              <span className="col-start-1 row-span-2 row-start-1 grid size-9 place-items-center rounded-[10px] bg-surface-2 font-mono text-[10px] text-muted">
                {claim.initials}
              </span>
              <p className="col-start-2 row-start-1 min-w-0 truncate text-sm font-medium">
                {claim.user}
              </p>
              <p className="col-start-2 row-start-2 min-w-0 truncate font-mono text-[9.5px] tracking-[0.02em] text-muted">
                {claim.firm} / {claim.plan} / {claim.submitted}
              </p>
              <span className="col-start-3 row-start-2 flex items-center gap-1.5 justify-self-end md:row-span-2 md:row-start-1 md:justify-self-start">
                <span
                  className="hidden rounded-md px-2 py-1 font-mono text-[8.5px] uppercase tracking-[0.12em] lg:inline"
                  style={{
                    background: `color-mix(in oklab, ${SOURCE_TONE[claim.source]} 14%, transparent)`,
                    color: SOURCE_TONE[claim.source],
                  }}
                >
                  {claim.source}
                </span>
                <StatusPill status={claim.status} />
              </span>
              <span
                data-count
                className="col-start-3 row-start-1 justify-self-end font-mono text-[13.5px] md:col-start-4 md:row-span-2"
              >
                {money(claim.amount)}
              </span>
            </button>
          ))
        )}
      </div>

      {open && (
        <div
          className="mt-3.5 rounded-card border bg-surface p-[clamp(20px,3vw,28px)] [animation:jsUp_.4s_both]"
          style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
        >
          <div className="mb-[22px] flex items-center justify-between gap-3.5">
            <p className="font-mono text-[9.5px] tracking-[0.22em] text-muted">
              REVIEWING {open.id}
            </p>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              className="cursor-pointer font-mono text-[10px] tracking-[0.12em] text-muted hover:text-fg"
            >
              CLOSE
            </button>
          </div>

          <div className="grid items-start gap-[22px] lg:grid-cols-[1.35fr_.9fr]">
            <div
              className="grid h-[270px] place-items-center rounded-[13px] border border-hair"
              style={{
                background:
                  "repeating-linear-gradient(135deg, var(--surface-2) 0 12px, var(--surface) 12px 24px)",
              }}
            >
              <span className="rounded-lg bg-bg px-[13px] py-[7px] font-mono text-[10px] tracking-[0.12em] text-muted">
                UPLOADED RECEIPT
              </span>
            </div>

            <div>
              <dl className="mb-[18px] flex flex-col">
                {[
                  { label: "Member", value: open.user },
                  { label: "Firm & plan", value: `${open.firm} · ${open.plan}` },
                  { label: "Order id", value: open.order, mono: true },
                  { label: "Coupon match", value: "Verified in firm report", success: true },
                  { label: "Cashback due", value: money(open.amount), amount: true },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-3 border-b border-hair-soft py-[11px] last:border-b-0"
                  >
                    <dt className="text-[12.5px] text-muted">{row.label}</dt>
                    <dd
                      className={
                        row.amount
                          ? "font-mono text-[15px] text-primary"
                          : row.mono
                            ? "font-mono text-[12.5px]"
                            : `text-[13px] font-medium ${row.success ? "text-success" : ""}`
                      }
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>

              <input
                placeholder="Note to the member (optional)"
                aria-label="Note to the member"
                className="mb-[13px] w-full rounded-[10px] border border-hair bg-surface-2 px-3.5 py-3 text-[13.5px] outline-none focus:border-primary"
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => decide(open.id, "Approved")}
                  className="min-w-[130px] flex-1 cursor-pointer rounded-[10px] bg-success px-[18px] py-[13px] text-center font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:brightness-[1.06]"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => decide(open.id, "Rejected")}
                  className="cursor-pointer rounded-[10px] border border-hair px-[18px] py-[13px] font-mono text-[10px] uppercase tracking-[0.14em] text-danger transition hover:border-danger"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => toast("Info requested from the member", "info")}
                  className="cursor-pointer rounded-[10px] border border-hair px-[18px] py-[13px] font-mono text-[10px] uppercase tracking-[0.14em] text-muted transition hover:border-primary"
                >
                  Request info
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
