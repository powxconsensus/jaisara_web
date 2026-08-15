"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { money } from "@/lib/format";
import { useToast } from "@/components/shell/toast";
import { cn } from "@/lib/cn";
import { apiErrorMessage } from "@/lib/auth-types";
import { apiFetch } from "@/lib/api-fetch";
import {
  ClaimDate,
  ClaimField,
  ClaimSelect,
  EMPTY_CLAIM,
  type ClaimFields as ClaimFieldValues,
} from "./claim-form";

/** A firm the member can claim against, with the id the API needs. */
export interface ClaimPlatform {
  id: string;
  slug: string;
  name: string;
  cashbackPct: number;
  supportsSubId: boolean;
  /** What the firm sells, grouped by its own account type. */
  plans: { name: string; family: string | null; listPrice: string | null }[];
  /** Coupon codes in force for this firm. */
  coupons: string[];
}

type Mode = "auto" | "upload" | "manual";
type Stage = "idle" | "parsing" | "parsed";

/** A receipt attached to a hand-typed claim, and where its upload has got to. */
interface AttachedReceipt {
  state: "uploading" | "done";
  name: string;
  size: number;
}

function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/**
 * How many of the six a receipt could possibly fill.
 *
 * Derived from the empty shape rather than written as `6`, so adding a field
 * to a claim cannot leave this badge quietly reporting a stale denominator.
 */
const FIELD_COUNT = Object.keys(EMPTY_CLAIM).length;

/** The extension shown on the file chip - from the name, not assumed. */
function fileKindOf(name: string): string {
  const extension = /\.([a-z0-9]{1,5})$/i.exec(name)?.[1];
  return extension ? extension.toUpperCase() : "FILE";
}

function clipboardFile(blob: Blob): File {
  const extension =
    blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `receipt-from-clipboard-${Date.now()}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
}

const MODES: { key: Mode; label: string }[] = [
  { key: "auto", label: "Auto-claim" },
  { key: "upload", label: "Upload receipt" },
  { key: "manual", label: "Enter manually" },
];

/** Flat rate used for the on-screen estimate before a firm is resolved. */
const DEFAULT_RATE = 10;

/**
 * The on-screen estimate.
 *
 * Always an estimate, never a promise: the verified reward can differ from
 * the storefront estimate when the final purchase record arrives.
 */
function estimate(
  fields: ClaimFieldValues,
  platforms: ClaimPlatform[],
): { amount: number; rate: number } | null {
  const paid = Number.parseFloat(fields.amount);
  if (!Number.isFinite(paid)) return null;
  const firm = platforms.find(
    (entry) => entry.name.toLowerCase() === fields.firm.trim().toLowerCase(),
  );
  const rate = firm?.cashbackPct || DEFAULT_RATE;
  return { amount: (paid * rate) / 100, rate };
}

/** Shared footer: the estimate well plus the submit actions. */
function EstimateBar({
  fields,
  platforms,
  onSubmit,
  onReset,
  submitLabel,
  busy,
}: {
  fields: ClaimFieldValues;
  platforms: ClaimPlatform[];
  onSubmit: () => void;
  onReset?: () => void;
  submitLabel: string;
  busy?: boolean;
}) {
  const result = estimate(fields, platforms);
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3.5 rounded-[13px] bg-surface-2 p-[18px]">
      <div>
        <p className="mb-1.5 font-mono text-[9px] tracking-[0.14em] text-muted">
          ESTIMATED CASHBACK / {result?.rate ?? DEFAULT_RATE}%
        </p>
        <p data-count className="font-mono text-2xl tracking-[-0.02em] text-primary">
          {result ? money(result.amount) : "$ -"}
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
          disabled={busy}
          onClick={onSubmit}
          className="cursor-pointer rounded-[10px] bg-primary px-[22px] py-[13px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-on-primary transition hover:-translate-y-px hover:brightness-[1.08] disabled:cursor-wait disabled:opacity-50"
        >
          {busy ? "Submitting…" : submitLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Three routes to a claim (handoff §4.6). Manual is a first-class tab, not a
 * fallback link - parsing fails often enough that hiding it punishes the user.
 */
export function ClaimTabs({ platforms = [] }: { platforms?: ClaimPlatform[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("auto");
  const [stage, setStage] = useState<Stage>("idle");
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fields, setFields] = useState<ClaimFieldValues>(EMPTY_CLAIM);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  /** The manual tab's attachment: null, mid-upload, or done. */
  const [attached, setAttached] = useState<AttachedReceipt | null>(null);
  /** Measured, not guessed - see the parsed-file header below. */
  const [parseMs, setParseMs] = useState<number | null>(null);
  const [concerns, setConcerns] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLInputElement>(null);

  const autoFirms = platforms.filter((platform) => platform.supportsSubId);

  /** What the parser actually filled in, counted from the form it produced. */
  const filledCount = Object.values(fields).filter((value) => value.trim().length > 0).length;
  const fileKind = fileKindOf(fileName);

  /**
   * Uploads the receipt and shows what the parser made of it.
   *
   * The parser proposes and the member confirms - every field stays editable,
   * and a failed parse degrades to an empty form rather than blocking the
   * claim. That is why the upload result is used to *prefill*, never to submit.
   */
  const startParse = useCallback(async (file: File) => {
    setFileName(file.name);
    setStage("parsing");
    setDragging(false);
    setError(null);
    setConcerns([]);
    setParseMs(null);

    const startedAt = performance.now();

    try {
      const body = new FormData();
      body.set("file", file);
      const response = await apiFetch("/api/claims/receipt", { method: "POST", body });
      const result = await response.json().catch(() => null);
      setParseMs(performance.now() - startedAt);

      if (!response.ok) {
        setError(apiErrorMessage(result, "That receipt could not be uploaded."));
        setStage("idle");
        return;
      }

      setStorageKey(result.storageKey ?? null);
      const parsed = result.parsed;

      if (parsed) {
        setFields({
          firm: parsed.firmName ?? "",
          plan: parsed.productName ?? "",
          amount: parsed.amount ?? "",
          date: parsed.purchaseDate ?? "",
          order: parsed.orderId ?? "",
          coupon: parsed.couponCode ?? "",
        });
        setConcerns(parsed.concerns ?? []);
      } else if (result.message) {
        setError(result.message);
      }

      setStage("parsed");
    } catch {
      setError("The claims service is unavailable. Please try again.");
      setStage("idle");
    }
  }, []);

  /**
   * Attaches a receipt to a claim being typed by hand.
   *
   * Deliberately *not* `startParse`. That one overwrites every field with what
   * the parser read, which is right when the receipt is the source of the
   * claim and destructive here - it would wipe what somebody had just finished
   * typing. This uploads for the reviewer's benefit and touches nothing else.
   */
  const attachReceipt = useCallback(async (file: File) => {
    setAttached({ state: "uploading", name: file.name, size: file.size });
    setError(null);

    try {
      const body = new FormData();
      body.set("file", file);
      const response = await apiFetch("/api/claims/receipt", { method: "POST", body });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setAttached(null);
        setError(apiErrorMessage(result, "That receipt could not be attached."));
        return;
      }

      setStorageKey(result.storageKey ?? null);
      setAttached({ state: "done", name: file.name, size: file.size });
    } catch {
      setAttached(null);
      setError("The claims service is unavailable. Please try again.");
    }
  }, []);

  const pasteFromClipboard = useCallback(async () => {
    if (!navigator.clipboard?.read) {
      setError(
        "Clipboard image access is unavailable in this browser. Press Ctrl+V or Cmd+V instead.",
      );
      return;
    }

    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const file = clipboardFile(await item.getType(imageType));
        if (mode === "manual") await attachReceipt(file);
        else {
          setMode("upload");
          await startParse(file);
        }
        return;
      }
      setError("The clipboard does not contain an image. Copy a receipt screenshot and try again.");
    } catch {
      setError("Clipboard access was blocked. Allow clipboard permission, or press Ctrl+V / Cmd+V.");
    }
  }, [attachReceipt, mode, startParse]);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.matches("input, textarea") || target.isContentEditable)
      ) {
        return;
      }

      const image = Array.from(event.clipboardData?.items ?? []).find((item) =>
        item.type.startsWith("image/"),
      );
      const blob = image?.getAsFile();
      if (!blob) return;

      event.preventDefault();
      const file = clipboardFile(blob);
      if (mode === "manual") void attachReceipt(file);
      else {
        setMode("upload");
        void startParse(file);
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [attachReceipt, mode, startParse]);

  const detachReceipt = () => {
    // The object stays in the bucket - it counts against the day's uploads
    // either way, and pretending otherwise would need a delete endpoint that
    // exists only to make a number look better.
    setAttached(null);
    setStorageKey(null);
  };

  const reset = () => {
    setStage("idle");
    setFields(EMPTY_CLAIM);
    setFileName("");
    setStorageKey(null);
    setAttached(null);
    setConcerns([]);
    setError(null);
  };

  const submit = async () => {
    const platform = platforms.find(
      (entry) => entry.name.toLowerCase() === fields.firm.trim().toLowerCase(),
    );

    if (!platform) {
      setError("Pick the firm exactly as it is listed, so we know whose report to match.");
      return;
    }
    if (!fields.order.trim()) {
      setError("The order number is what the match is keyed on - it cannot be blank.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/claims", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platformId: platform.id,
          orderId: fields.order.trim(),
          amount: fields.amount.trim() || undefined,
          purchasedAt: fields.date ? new Date(fields.date).toISOString() : undefined,
          productText: fields.plan.trim() || undefined,
          proofStorageKey: storageKey ?? undefined,
          source: storageKey ? "RECEIPT" : "MANUAL",
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(apiErrorMessage(result, "That claim could not be submitted."));
        return;
      }

      toast("Claim submitted - we'll review it once the firm reports the order.", "success");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("The claims service is unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof ClaimFieldValues) => (value: string) =>
    setFields((prev) => ({ ...prev, [key]: value }));

  const notices = (
    <>
      {error && (
        <p role="alert" className="mt-3.5 text-[12.5px] leading-6 text-danger">
          {error}
        </p>
      )}
      {concerns.length > 0 && (
        <div className="mt-3.5 rounded-[12px] border border-warning/40 px-4 py-3">
          <p className="font-mono text-[9px] tracking-[0.14em] text-warning">WORTH CHECKING</p>
          <ul className="mt-2 space-y-1 text-[12px] leading-5 text-muted">
            {concerns.map((concern) => (
              <li key={concern}>{concern}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );

  return (
    <div className="max-w-[660px]">
      {/* Two inputs, because the two paths do different things with the file:
          the dropzone parses it into the form, the manual tab attaches it as
          evidence without touching what was typed. One shared input meant the
          manual attach silently overwrote every field. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void startParse(file);
        }}
      />
      <input
        ref={attachRef}
        type="file"
        accept="image/*,.pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void attachReceipt(file);
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
                Auto-claim covers {autoFirms.length} firm{autoFirms.length === 1 ? "" : "s"}
              </p>
              <p className="text-[12.5px] leading-[1.55] text-muted">
                We match your email or trading account against the firm&rsquo;s daily report.
                Nothing to upload.
              </p>
            </div>
          </div>

          <div className="rounded-card border border-hair bg-surface px-[22px] pb-3.5 pt-1.5">
            {platforms.map((firm) => {
              const on = firm.supportsSubId;
              return (
                <div
                  key={firm.slug}
                  className="flex items-center gap-3.5 border-b border-hair-soft py-[17px]"
                >
                  <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-surface-2 font-mono text-[10px] text-muted">
                    {firm.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{firm.name}</p>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {firm.supportsSubId
                        ? "Matches your tracked link automatically"
                        : "Needs a receipt or manual entry"}
                    </p>
                  </div>
                  {/* Status, not a switch. Whether a firm can auto-match is a
                      property of that firm's reporting - there is no
                      per-member setting behind it, and a toggle that stores
                      nothing is worse than no toggle. */}
                  <span
                    className="flex-none rounded-md px-2.5 py-1.5 font-mono text-[8.5px] tracking-[0.12em]"
                    style={{
                      background: on
                        ? "color-mix(in oklab, var(--success) 16%, transparent)"
                        : "var(--surface-2)",
                      color: on ? "var(--success)" : "var(--text-muted)",
                    }}
                  >
                    {on ? "AUTOMATIC" : "RECEIPT NEEDED"}
                  </span>
                </div>
              );
            })}
            <p className="pt-3.5 text-xs leading-[1.6] text-muted">
              Firms without auto-claim still work - upload the receipt or enter it manually.
            </p>
          </div>
        </div>
      )}

      {mode === "upload" && stage === "idle" && (
        <>
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              const file = event.dataTransfer.files?.[0];
              if (file) void startParse(file);
            }}
            className="rounded-[18px] border-[1.5px] border-dashed px-[30px] py-[clamp(36px,6vw,60px)] text-center transition-all"
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
              PDF / PNG / JPG OF THE ORDER EMAIL - MAX 10MB
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="cursor-pointer rounded-[10px] border border-hair bg-bg px-[18px] py-[11px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] transition hover:border-primary"
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => void pasteFromClipboard()}
                className="cursor-pointer rounded-[10px] border border-primary bg-[color-mix(in_oklab,var(--primary)_8%,transparent)] px-[18px] py-[11px] font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-primary transition hover:bg-[color-mix(in_oklab,var(--primary)_14%,transparent)]"
              >
                Paste from clipboard
              </button>
            </div>
            <p className="mt-3 font-mono text-[9px] tracking-[0.08em] text-muted">
              CTRL+V OR CMD+V ALSO WORKS
            </p>
          </div>

          <div className="mt-3.5 flex items-center gap-[11px] rounded-[12px] border border-hair bg-surface px-[17px] py-3.5">
            <span className="size-1.5 flex-none rounded-[2px] bg-info" />
            <span className="text-[12.5px] leading-[1.5] text-muted">
              Bought without a Jaisara coupon? Cashback can&rsquo;t be tracked - but you can still
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
          {/* Both figures here were once fixed strings - "PARSED IN 1.4S" and
              "5 FIELDS FOUND" - printed whatever actually happened. They are a
              claim about the member's own file, so a wrong one is not a
              cosmetic issue: somebody who saw "5 fields found" above two blank
              boxes would reasonably conclude the form had lost their data. */}
          <div className="mb-[22px] flex items-center gap-[13px] border-b border-hair-soft pb-5">
            <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-surface-2 font-mono text-[9px] uppercase text-muted">
              {fileKind}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-medium">{fileName}</p>
              <p className="mt-[3px] font-mono text-[9.5px] tracking-[0.06em] text-muted">
                {parseMs === null ? "READ" : `READ IN ${(parseMs / 1000).toFixed(1)}S`}
              </p>
            </div>
            <span
              className="flex-none rounded-md px-[9px] py-[5px] font-mono text-[8.5px] tracking-[0.12em]"
              style={
                filledCount > 0
                  ? {
                      background: "color-mix(in oklab, var(--success) 14%, transparent)",
                      color: "var(--success)",
                    }
                  : {
                      background: "color-mix(in oklab, var(--warning) 14%, transparent)",
                      color: "var(--warning)",
                    }
              }
            >
              {filledCount === 0
                ? "NOTHING READ - TYPE IT IN"
                : `${filledCount} OF ${FIELD_COUNT} FIELDS FOUND`}
            </span>
          </div>

          <p className="mb-4 font-mono text-[9.5px] tracking-[0.22em] text-muted">
            CONFIRM THE DETAILS
          </p>
          <ClaimFields
            fields={fields}
            set={set}
            platforms={platforms}
            badges={true}
          />

          {notices}
          <EstimateBar
            fields={fields}
            platforms={platforms}
            busy={busy}
            onSubmit={() => void submit()}
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
          <ClaimFields
            fields={fields}
            set={set}
            platforms={platforms}
            badges={false}
          />

          {/* Three states in one slot, same height throughout, so attaching a
              receipt never shifts the Submit button out from under a cursor.
              Before this there was no state at all: the file uploaded in
              silence and the row still read "attach the receipt", which is
              indistinguishable from nothing having happened. */}
          {attached === null ? (
            <div className="mt-3.5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => attachRef.current?.click()}
                className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed px-4 py-3.5 text-left transition hover:border-primary"
                style={{ borderColor: "color-mix(in oklab, var(--text) 20%, transparent)" }}
              >
                <span className="grid size-7 flex-none place-items-center rounded-lg bg-surface-2 text-primary">
                  ↑
                </span>
                <span className="text-[12.5px] text-muted">Upload receipt (optional)</span>
              </button>
              <button
                type="button"
                onClick={() => void pasteFromClipboard()}
                className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-dashed px-4 py-3.5 text-left transition hover:border-primary"
                style={{ borderColor: "color-mix(in oklab, var(--text) 20%, transparent)" }}
              >
                <span className="grid size-7 flex-none place-items-center rounded-lg bg-surface-2 text-primary">
                  ⌘
                </span>
                <span className="text-[12.5px] text-muted">Paste from clipboard</span>
              </button>
            </div>
          ) : (
            <div
              className="mt-3.5 flex items-center gap-3 rounded-[12px] border border-hair bg-surface-2 px-4 py-3.5"
              aria-live="polite"
            >
              <span className="grid size-7 flex-none place-items-center rounded-lg bg-surface">
                {attached.state === "uploading" ? (
                  <span className="size-[15px] rounded-full border-2 border-hair border-t-primary [animation:jsSpin_.8s_linear_infinite]" />
                ) : (
                  <span className="text-[13px] leading-none text-success">✓</span>
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium">{attached.name}</p>
                {attached.state === "uploading" ? (
                  <span
                    className="mt-[5px] block h-[3px] w-full overflow-hidden rounded-full"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--surface) 0%, var(--primary) 50%, var(--surface) 100%)",
                      backgroundSize: "220px 100%",
                      animation: "jsShim 1.1s linear infinite",
                    }}
                  />
                ) : (
                  <p className="mt-[3px] font-mono text-[9px] tracking-[0.12em] text-muted">
                    ATTACHED · {fileSize(attached.size)}
                  </p>
                )}
              </div>

              {attached.state === "uploading" ? (
                <span className="flex-none font-mono text-[9px] tracking-[0.14em] text-muted">
                  UPLOADING…
                </span>
              ) : (
                <button
                  type="button"
                  onClick={detachReceipt}
                  className="flex-none cursor-pointer font-mono text-[9px] tracking-[0.14em] text-muted transition hover:text-danger"
                >
                  REMOVE
                </button>
              )}
            </div>
          )}

          {notices}
          <EstimateBar
            fields={fields}
            platforms={platforms}
            busy={busy}
            onSubmit={() => void submit()}
            submitLabel="Submit for review"
          />
        </div>
      )}
    </div>
  );
}

/**
 * The six fields, wherever they appear.
 *
 * One component for the parsed-confirm and manual paths because they ask for
 * exactly the same things - the only difference is whether the values arrived
 * from a receipt, which is what `badges` says.
 *
 * Firm, plan and coupon come from the catalogue. That is not a convenience: a
 * mistyped firm cannot be matched against its report and a mistyped coupon
 * cannot be attributed at all, so every field whose answer we already hold is
 * a field nobody should be typing.
 */
function ClaimFields({
  fields,
  set,
  platforms,
  badges,
}: {
  fields: ClaimFieldValues;
  set: (key: keyof ClaimFieldValues) => (value: string) => void;
  platforms: ClaimPlatform[];
  /** True on the confirm-what-we-read path, where the values came from a scan. */
  badges: boolean;
}) {
  const firm = platforms.find(
    (entry) => entry.name.toLowerCase() === fields.firm.trim().toLowerCase(),
  );

  // Plans belong to a firm, so the list is empty until one is chosen - and
  // picking a different firm has to clear a plan that no longer exists.
  const plans = (firm?.plans ?? []).map((plan) => ({
    value: plan.name,
    label: plan.listPrice ? `${plan.name} - $${Math.round(Number(plan.listPrice))}` : plan.name,
    group: plan.family,
  }));

  // Only the codes this firm has actually published. Seeding a house code here
  // put a coupon the firm never issued onto somebody's claim, and made it the
  // default answer for a firm that has none - `allowOther` already covers a
  // code the catalogue has not caught up with.
  const coupons = (firm?.coupons ?? []).map((code) => ({ value: code, label: code }));

  return (
    <div className="grid gap-[13px] md:grid-cols-2">
      <ClaimSelect
        label="FIRM"
        badge={badges ? "AI" : undefined}
        value={fields.firm}
        options={platforms.map((entry) => ({ value: entry.name, label: entry.name }))}
        placeholder="Which firm did you buy from?"
        allowOther
        otherLabel="Another firm - type it in"
        onChange={(value) => {
          set("firm")(value);
          // The old plan belonged to the old firm. Keeping it would submit a
          // plan this firm does not sell.
          if (value !== fields.firm) set("plan")("");
        }}
      />

      <ClaimSelect
        label={firm ? "PLAN / ACCOUNT TYPE" : "PLAN"}
        badge={badges ? "AI" : undefined}
        value={fields.plan}
        options={plans}
        placeholder={firm ? "Which account did you buy?" : "Choose a firm first"}
        allowOther
        otherLabel="Not listed - type it in"
        onChange={set("plan")}
      />

      <ClaimField
        label="AMOUNT PAID (USD)"
        badge={badges ? "AI" : undefined}
        mono
        placeholder="299.00"
        value={fields.amount}
        onChange={set("amount")}
      />

      <ClaimDate
        label="ORDER DATE"
        badge={badges ? "AI" : undefined}
        value={fields.date}
        onChange={set("date")}
      />

      <ClaimField
        label="ORDER ID"
        badge={badges ? "CHECK THIS" : undefined}
        mono
        placeholder="As printed on the receipt"
        value={fields.order}
        onChange={set("order")}
      />

      <ClaimSelect
        label="COUPON USED"
        value={fields.coupon}
        options={coupons}
        allowOther
        otherLabel="A different code - type it in"
        onChange={set("coupon")}
      />
    </div>
  );
}
