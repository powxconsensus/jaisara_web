"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { FIRMS } from "@/lib/data/firms";
import { useToast } from "@/components/shell/toast";
import { cn } from "@/lib/cn";
import { ClaimField, EMPTY_CLAIM, PARSED_CLAIM, type ClaimFields } from "./claim-form";

type Mode = "auto" | "upload" | "manual";
type Stage = "idle" | "parsing" | "parsed";

const MODES: { key: Mode; label: string }[] = [
  { key: "auto", label: "Auto-claim" },
  { key: "upload", label: "Upload receipt" },
  { key: "manual", label: "Enter manually" },
];

const AUTO_FIRMS = FIRMS.slice(0, 4).map((firm, i) => ({
  ...firm,
  supported: i < 2,
  note: i < 2 ? "Matches your order email automatically" : "Needs a receipt or manual entry",
}));

const SAMPLE_FILE = "fundingpips-order-8842190.pdf";
/** Flat rate used for the on-screen estimate before a firm is resolved. */
const DEFAULT_RATE = 10;

function estimate(fields: ClaimFields): { amount: number; rate: number } | null {
  const paid = Number.parseFloat(fields.amount);
  if (!Number.isFinite(paid)) return null;
  const firm = FIRMS.find((f) => f.name.toLowerCase() === fields.firm.trim().toLowerCase());
  const rate = firm?.cashback ?? DEFAULT_RATE;
  return { amount: (paid * rate) / 100, rate };
}

/** Shared footer: the estimate well plus the submit actions. */
function EstimateBar({
  fields,
  onSubmit,
  onReset,
  submitLabel,
}: {
  fields: ClaimFields;
  onSubmit: () => void;
  onReset?: () => void;
  submitLabel: string;
}) {
  const result = estimate(fields);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3.5 rounded-[13px] bg-surface-2 p-[18px]">
      <div>
        <p className="mb-1.5 font-mono text-[9px] tracking-[0.14em] text-muted">
          ESTIMATED CASHBACK / {result?.rate ?? DEFAULT_RATE}%
        </p>
        <p data-count className="font-mono text-2xl tracking-[-0.02em] text-primary">
          {result ? money(result.amount) : "$ —"}
        </p>
      </div>
      <div className="flex gap-2.5">
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="cursor-pointer rounded-[10px] border border-hair px-[18px] py-[13px] font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
          >
            Start over
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-[13px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08]"
        >
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Three routes to a claim (handoff §4.6). Manual is a first-class tab, not a
 * fallback link — parsing fails often enough that hiding it punishes the user.
 */
export function ClaimTabs() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("auto");
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<ClaimFields>(EMPTY_CLAIM);
  const [autoOn, setAutoOn] = useState<Record<string, boolean>>({
    [AUTO_FIRMS[0].slug]: true,
    [AUTO_FIRMS[1].slug]: true,
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const parseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startParse = (name: string) => {
    setFileName(name);
    setStage("parsing");
    setDragging(false);
    if (parseTimer.current) clearTimeout(parseTimer.current);
    parseTimer.current = setTimeout(() => {
      setFields(PARSED_CLAIM);
      setStage("parsed");
    }, 1600);
  };

  const reset = () => {
    setStage("idle");
    setFields(EMPTY_CLAIM);
    setFileName("");
  };

  const submit = () => {
    toast("Claim submitted — we'll review it within 48 hours");
    router.push("/dashboard");
  };

  const set = (key: keyof ClaimFields) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="max-w-[660px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) startParse(file.name);
        }}
      />

      <div className="mb-6 flex gap-[3px] rounded-[12px] bg-surface-2 p-1">
        {MODES.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => {
              setMode(option.key);
              if (option.key === "manual") reset();
              if (option.key === "auto") reset();
            }}
            aria-current={mode === option.key}
            className={cn(
              "flex-1 cursor-pointer truncate rounded-[9px] px-1.5 py-[11px] text-center font-mono text-[10px] font-semibold uppercase tracking-[0.1em] transition-all duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)]",
              mode === option.key ? "bg-surface text-fg" : "text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "auto" && (
        <div className="[animation:jsUp_.35s_both]">
          <div
            className="mb-3.5 flex items-start gap-3 rounded-[14px] border px-[19px] py-[17px]"
            style={{
              background: "color-mix(in oklab, var(--success) 8%, var(--surface))",
              borderColor: "color-mix(in oklab, var(--success) 28%, var(--hair))",
            }}
          >
            <span className="mt-1.5 size-1.5 flex-none rounded-[2px] bg-success" />
            <div>
              <p className="mb-[5px] text-[13.5px] font-semibold">
                Auto-claim is on for {Object.values(autoOn).filter(Boolean).length} firms
              </p>
              <p className="text-[12.5px] leading-[1.55] text-muted">
                We match your email or trading account against the firm&rsquo;s daily report.
                Nothing to upload.
              </p>
            </div>
          </div>

          <div className="rounded-card border border-hair bg-surface px-[22px] pb-3.5 pt-1.5">
            {AUTO_FIRMS.map((firm) => {
              const on = Boolean(autoOn[firm.slug]);
              return (
                <div
                  key={firm.slug}
                  className="flex items-center gap-3.5 border-b border-hair-soft py-[17px]"
                >
                  <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-surface-2 font-mono text-[10px] text-muted">
                    {firm.mark}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{firm.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">{firm.note}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={`Auto-claim for ${firm.name}`}
                    disabled={!firm.supported}
                    onClick={() => setAutoOn((prev) => ({ ...prev, [firm.slug]: !on }))}
                    className="h-6 w-11 flex-none cursor-pointer rounded-full p-[3px] transition-colors duration-[250ms] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ background: on ? "var(--primary)" : "var(--surface-2)" }}
                  >
                    <span
                      className="block size-[18px] rounded-full transition-transform duration-[250ms] ease-[cubic-bezier(.2,.8,.2,1)]"
                      style={{
                        background: on ? "var(--on-primary)" : "var(--text-muted)",
                        transform: on ? "translateX(20px)" : "none",
                      }}
                    />
                  </button>
                </div>
              );
            })}
            <p className="pt-3.5 text-xs leading-[1.6] text-muted">
              Firms without auto-claim still work — upload the receipt or enter it manually.
            </p>
          </div>
        </div>
      )}

      {mode === "upload" && stage === "idle" && (
        <>
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) startParse(file.name);
            }}
            className="cursor-pointer rounded-[18px] border-[1.5px] border-dashed px-[30px] py-[clamp(36px,6vw,60px)] text-center transition-all"
            style={{
              borderColor: dragging ? "var(--primary)" : "var(--hair)",
              background: dragging
                ? "color-mix(in oklab, var(--primary) 6%, transparent)"
                : "transparent",
            }}
          >
            <span className="mx-auto mb-[18px] grid size-12 place-items-center rounded-[13px] bg-surface-2 text-[19px] text-primary">
              ↑
            </span>
            <p className="mb-2 font-display text-[17px] font-bold">Drop the receipt here</p>
            <p className="mb-[18px] font-mono text-[10px] tracking-[0.08em] text-muted">
              PDF / PNG / JPG OF THE ORDER EMAIL — MAX 10MB
            </p>
            <span className="inline-block rounded-[10px] border border-hair bg-bg px-[18px] py-[11px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em]">
              Choose file
            </span>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                startParse(SAMPLE_FILE);
              }}
              className="mt-[15px] block w-full cursor-pointer font-mono text-[10px] tracking-[0.1em] text-primary"
            >
              OR TRY A SAMPLE RECEIPT
            </button>
          </div>

          <div className="mt-3.5 flex items-center gap-[11px] rounded-[12px] border border-hair bg-surface px-[17px] py-3.5">
            <span className="size-1.5 flex-none rounded-[2px] bg-info" />
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Bought without a Jaisara coupon? Cashback can&rsquo;t be tracked — but you can still
              claim the Club bonus.
            </span>
          </div>
        </>
      )}

      {mode === "upload" && stage === "parsing" && (
        <div className="rounded-card border border-hair bg-surface p-7">
          <div className="mb-6 flex items-center gap-3.5">
            <span className="size-[18px] flex-none rounded-full border-2 border-hair border-t-primary [animation:jsSpin_.8s_linear_infinite]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.14em]">
              Reading your receipt…
            </p>
          </div>
          <div className="flex flex-col gap-[11px]">
            {["62%", "88%", "44%"].map((width) => (
              <span
                key={width}
                className="h-[13px] rounded-md"
                style={{
                  width,
                  background:
                    "linear-gradient(90deg, var(--surface-2) 0%, var(--border) 50%, var(--surface-2) 100%)",
                  backgroundSize: "260px 100%",
                  animation: "jsShim 1.2s linear infinite",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {mode === "upload" && stage === "parsed" && (
        <div className="rounded-card border border-hair bg-surface p-[clamp(20px,3vw,28px)] [animation:jsIn_.3s_ease_both]">
          <div className="mb-[22px] flex items-center gap-[13px] border-b border-hair-soft pb-5">
            <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-surface-2 font-mono text-[9px] text-muted">
              PDF
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{fileName}</p>
              <p className="mt-[3px] font-mono text-[9.5px] tracking-[0.06em] text-muted">
                PARSED IN 1.4S
              </p>
            </div>
            <span
              className="flex-none rounded-md px-[9px] py-[5px] font-mono text-[8.5px] tracking-[0.12em] text-success"
              style={{ background: "color-mix(in oklab, var(--success) 14%, transparent)" }}
            >
              5 FIELDS FOUND
            </span>
          </div>

          <p className="mb-4 font-mono text-[9.5px] tracking-[0.22em] text-muted">
            CONFIRM THE DETAILS
          </p>
          <div className="grid gap-[13px] md:grid-cols-2">
            <ClaimField label="FIRM" badge="AI" value={fields.firm} onChange={set("firm")} />
            <ClaimField label="PLAN" badge="AI" value={fields.plan} onChange={set("plan")} />
            <ClaimField
              label="AMOUNT PAID"
              badge="AI"
              mono
              value={fields.amount}
              onChange={set("amount")}
            />
            <ClaimField
              label="ORDER DATE"
              badge="AI"
              mono
              value={fields.date}
              onChange={set("date")}
            />
            <ClaimField
              label="ORDER ID"
              badge="CHECK THIS"
              mono
              full
              value={fields.order}
              onChange={set("order")}
            />
          </div>

          <EstimateBar
            fields={fields}
            onSubmit={submit}
            onReset={reset}
            submitLabel="Confirm & submit"
          />
        </div>
      )}

      {mode === "manual" && (
        <div className="rounded-card border border-hair bg-surface p-[clamp(20px,3vw,28px)] [animation:jsUp_.35s_both]">
          <p className="mb-4 font-mono text-[9.5px] tracking-[0.22em] text-muted">
            ENTER THE ORDER YOURSELF
          </p>
          <div className="grid gap-[13px] md:grid-cols-2">
            <ClaimField label="FIRM" value={fields.firm} onChange={set("firm")} />
            <ClaimField label="PLAN" value={fields.plan} onChange={set("plan")} />
            <ClaimField
              label="AMOUNT PAID (USD)"
              mono
              value={fields.amount}
              onChange={set("amount")}
            />
            <ClaimField label="ORDER DATE" mono value={fields.date} onChange={set("date")} />
            <ClaimField label="ORDER ID" mono full value={fields.order} onChange={set("order")} />
            <ClaimField
              label="COUPON USED"
              mono
              full
              value={fields.coupon}
              onChange={set("coupon")}
            />
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-3.5 flex w-full cursor-pointer items-center gap-3 rounded-[12px] border border-dashed px-4 py-3.5 text-left transition hover:border-primary"
            style={{ borderColor: "color-mix(in oklab, var(--text) 20%, transparent)" }}
          >
            <span className="grid size-7 flex-none place-items-center rounded-lg bg-surface-2 text-primary">
              ↑
            </span>
            <span className="text-[12.5px] text-muted">
              Attach the receipt too (optional, speeds up review)
            </span>
          </button>

          <EstimateBar fields={fields} onSubmit={submit} submitLabel="Submit for review" />
        </div>
      )}
    </div>
  );
}
