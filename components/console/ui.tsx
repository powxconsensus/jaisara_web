"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The console's building blocks.
 *
 * Ten screens sharing one set of primitives is what keeps the admin side
 * looking like the rest of the site rather than a bootstrap dashboard bolted
 * onto it. Tone is always carried by a word as well as a colour.
 */

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--text-muted)",
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
};

// ── Layout ───────────────────────────────────────────────────────────────────

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-[18px] border border-hair bg-surface", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="font-mono text-[9px] tracking-[0.2em] text-primary">{eyebrow}</p>
        )}
        <h2 className="mt-2 font-display text-[22px] font-black uppercase leading-none">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-[68ch] text-[12.5px] leading-6 text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Page-level intro, one per console route.
 *
 * Title and actions share a single row, and the explanatory line sits under it
 * at small size. The previous version stacked an eyebrow, a 38px display
 * heading and a three-line paragraph, which cost ~150px on every screen on top
 * of the shell's own header — a console is somewhere people work, and the
 * first thing they should see is the work.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="font-display text-[22px] font-black uppercase leading-none tracking-[-0.02em]">
            {title}
          </h1>
          <span className="font-mono text-[8.5px] tracking-[0.2em] text-muted">{eyebrow}</span>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {description && (
        <p className="mt-2 max-w-[92ch] text-[12px] leading-5 text-muted">{description}</p>
      )}
    </div>
  );
}

// ── Figures ──────────────────────────────────────────────────────────────────

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-[14px] border border-hair bg-surface p-[18px]">
      <p className="font-mono text-[8.5px] tracking-[0.16em] text-muted">{label}</p>
      <p
        data-count
        className="mt-3 font-mono text-[24px] leading-none tracking-[-0.02em]"
        style={{ color: tone === "neutral" ? undefined : TONE_VAR[tone] }}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[11px] leading-5 text-muted">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-md px-2 py-1 font-mono text-[8.5px] font-medium uppercase tracking-[0.12em]",
        className,
      )}
      style={{
        background: `color-mix(in oklab, ${TONE_VAR[tone]} 15%, transparent)`,
        color: TONE_VAR[tone],
      }}
    >
      {children}
    </span>
  );
}

/** Key/value rows — the detail panel's workhorse. */
export function DefinitionList({
  rows,
}: {
  rows: { label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <dl className="flex flex-col">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 border-b border-hair-soft py-[11px] last:border-b-0"
        >
          <dt className="flex-none text-[12px] text-muted">{row.label}</dt>
          <dd
            className={cn(
              "min-w-0 break-words text-right text-[12.5px]",
              row.mono && "font-mono text-[11.5px]",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

// ── Tables ───────────────────────────────────────────────────────────────────

export function TableShell({
  columns,
  children,
  minWidth = 860,
}: {
  columns: string[];
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-hair">
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="whitespace-nowrap px-3 py-3 font-mono text-[8.5px] tracking-[0.14em] text-muted"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-3.5 align-top text-[12.5px]", className)} {...props} />;
}

export function Tr({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-hair-soft last:border-b-0", className)} {...props} />;
}

// ── States ───────────────────────────────────────────────────────────────────

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="mb-3 font-mono text-[9px] tracking-[0.18em] text-muted">NOTHING HERE</p>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <p className="mx-auto max-w-[46ch] text-[12.5px] leading-6 text-muted">{message}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-[11px] px-4 py-3 text-[12.5px] leading-6 text-danger"
      style={{ background: "color-mix(in oklab, var(--danger) 10%, transparent)" }}
    >
      {children}
    </p>
  );
}

/** Neutral placeholder while a resource is in flight. */
export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="space-y-2 p-2">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-[54px] animate-pulse rounded-[11px] bg-surface-2" />
      ))}
    </div>
  );
}

// ── Controls ─────────────────────────────────────────────────────────────────

/**
 * Segmented control. Used wherever two editors would otherwise sit side by side
 * competing for the same width — the email studio's HTML and plain-text bodies
 * being the case that prompted it.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex gap-1 rounded-[11px] border border-hair bg-surface-2 p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-[8px] px-3.5 py-2 font-mono text-[9px] uppercase tracking-[0.13em] transition",
              active ? "bg-primary text-on-primary" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "w-full cursor-pointer rounded-[11px] border border-hair bg-surface-2 px-3.5 py-3 text-[13px] outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "w-full rounded-[11px] border border-hair bg-surface-2 p-4 text-sm leading-7 outline-none transition focus:border-primary",
        className,
      )}
      {...props}
    />
  );
}

/** A left-hand record list — claims, campaigns, posts all share this shape. */
export function RecordList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-y-auto rounded-[15px] border border-hair bg-surface p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RecordButton({
  active,
  className,
  ...props
}: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "mb-1 w-full cursor-pointer rounded-[11px] p-3 text-left transition last:mb-0",
        active ? "bg-surface-2 ring-1 ring-primary/40" : "hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export { TONE_VAR };
