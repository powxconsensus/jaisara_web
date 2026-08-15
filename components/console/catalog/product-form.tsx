"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import {
  ErrorNote,
  Panel,
  PanelHeader,
  Select,
} from "@/components/console/ui";
import type { Coupon, Platform, Product, ProductStatus } from "@/lib/admin-types";

/**
 * Create or edit a challenge.
 *
 * One form for both, rendered *above* the table rather than after it. That
 * placement is the whole point: the previous version put the editor below a
 * 200-row table, so pressing "Edit" opened a panel far below the fold and read
 * as a dead button. It also scrolls itself into view, because even above the
 * table it can be off-screen once you have scrolled down the list.
 */

const KINDS = ["EVALUATION", "INSTANT_FUNDING", "RESET", "ADDON", "SUBSCRIPTION", "OTHER"];

export interface ProductDraft {
  name: string;
  family: string;
  kind: string;
  status: ProductStatus;
  accountSize: string;
  listPrice: string;
  currency: string;
  estCommissionRate: string;
  tradingPlatform: string;
  /** `""` means "use the firm's default code". */
  couponId: string;
  isListed: boolean;
}

export function emptyDraft(): ProductDraft {
  return {
    name: "",
    family: "",
    kind: "EVALUATION",
    status: "ACTIVE",
    accountSize: "",
    listPrice: "",
    currency: "USD",
    estCommissionRate: "",
    tradingPlatform: "",
    couponId: "",
    isListed: false,
  };
}

export function draftFrom(product: Product): ProductDraft {
  return {
    name: product.name,
    family: product.family ?? "",
    kind: product.kind,
    status: product.status,
    accountSize: product.accountSize ? String(product.accountSize) : "",
    listPrice: product.listPrice ?? "",
    currency: product.currency ?? "USD",
    estCommissionRate: product.estCommissionRate ?? "",
    tradingPlatform: product.tradingPlatform ?? "",
    couponId: product.couponId ?? "",
    isListed: product.isListed,
  };
}

/**
 * Whether the typed rate is just the firm's default, unchanged.
 *
 * Compared numerically, so "20", "20.0" and " 20 " all count as untouched -
 * otherwise re-saving a form without touching the field would turn an
 * inherited rate into a frozen override through nothing but whitespace.
 */
function inheritsFirmRate(typed: string, firmRate: string): boolean {
  const own = typed.trim();
  const firm = firmRate.trim();
  if (!own || !firm) return false;

  return Number.isFinite(Number(own)) && Number(own) === Number(firm);
}

/**
 * Strips blanks so the API's partial-update schema sees absent, not empty.
 *
 * @param firmRate The firm's `defaultCommissionRate` as a percentage string,
 *   so a rate the admin never touched can be stored as inheritance rather than
 *   as a copy of today's value.
 */
export function draftToBody(draft: ProductDraft, firmRate = "") {
  const text = (value: string) => (value.trim() ? value.trim() : undefined);
  return {
    name: draft.name.trim(),
    family: text(draft.family),
    kind: draft.kind,
    status: draft.status,
    // An empty number field must be omitted - `accountSize` is validated as a
    // positive int, and sending 0 or "" is a 400.
    accountSize: draft.accountSize.trim() ? Number(draft.accountSize) : undefined,
    listPrice: text(draft.listPrice),
    currency: draft.currency.trim().toUpperCase() || "USD",
    // `null`, not `undefined`. Emptying this box means "this challenge has no
    // rate of its own, inherit the firm's" - and a partial update reads
    // `undefined` as "leave it alone", so sending that made the field
    // impossible to clear once it had a value.
    //
    // A value left exactly as prefilled is also stored as `null`, because the
    // admin agreeing with the firm's default is not the same statement as this
    // challenge having its own rate. Saved as a copy, it was frozen: changing
    // the firm's default later moved nothing, and every challenge quietly kept
    // the number that happened to be current on the day it was created - which
    // is the opposite of what a field called "default" implies.
    estCommissionRate: inheritsFirmRate(draft.estCommissionRate, firmRate)
      ? null
      : draft.estCommissionRate.trim() || null,
    // `null`, not `undefined`, for the same reason as the rate above: clearing
    // the picker means "go back to the firm's code", and a partial update reads
    // an absent field as "leave it alone".
    couponId: draft.couponId || null,
    tradingPlatform: text(draft.tradingPlatform),
    isListed: draft.isListed,
  };
}

export function ProductForm({
  mode,
  draft,
  platforms,
  platformId,
  firmDefaultRate,
  coupons,
  firmDefaultCoupon,
  pending,
  error,
  onDraftChange,
  onPlatformChange,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  draft: ProductDraft;
  platforms: Platform[];
  platformId: string;
  /** The selected firm's own rate, as a percentage string. `""` when unset. */
  firmDefaultRate: string;
  /** The selected firm's coupons, for the per-challenge override. */
  coupons: Coupon[];
  /** The firm's default code, shown as the inherited option. */
  firmDefaultCoupon: string;
  pending: boolean;
  error: string | null;
  onDraftChange: (next: ProductDraft) => void;
  onPlatformChange: (id: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);

  // Scrolls itself into view on mount. The parent keys this component by the
  // record being edited, so picking a different row remounts it and it scrolls
  // again rather than silently updating a panel you cannot see.
  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const set = (patch: Partial<ProductDraft>) => onDraftChange({ ...draft, ...patch });

  /**
   * The commission in money, paired with the rate.
   *
   * Affiliate dashboards quote a figure per sale - "$44.85 on this plan" - and
   * the catalogue stores a rate, so somebody was doing the division by hand on
   * every row. Either box fills the other through the list price.
   *
   * Only the rate is persisted; this is a second way of writing it, not a
   * second field. It is held as an override rather than as its own state so
   * that editing the rate or the price recomputes it instead of leaving a
   * stale figure sitting next to the number it disagrees with.
   */
  const [typedAmount, setTypedAmount] = useState<string | null>(null);

  const price = Number(draft.listPrice);
  const rate = Number(draft.estCommissionRate);
  const hasPrice = draft.listPrice.trim() !== "" && Number.isFinite(price) && price > 0;
  const hasRate = draft.estCommissionRate.trim() !== "" && Number.isFinite(rate);

  const amount = typedAmount ?? (hasPrice && hasRate ? ((price * rate) / 100).toFixed(2) : "");

  // The column is `Decimal(6,4)` and the API validates two integer digits, so a
  // commission at or above the list price cannot be stored as a rate. Saying so
  // here beats submitting and getting "enter a percentage like 15" back for an
  // amount the admin never expressed as a percentage.
  const overRate = hasRate && rate >= 100;

  // Four decimals is what the column holds; `Number` then drops the zeros a
  // fixed-width string would leave behind, so 15% reads "15" and not "15.0000".
  const asRate = (value: number) => String(Number(value.toFixed(4)));

  const setRate = (value: string) => {
    setTypedAmount(null);
    set({ estCommissionRate: value });
  };

  const setPrice = (value: string) => {
    setTypedAmount(null);
    set({ listPrice: value });
  };

  const setAmount = (value: string) => {
    setTypedAmount(value);

    if (value.trim() === "") {
      set({ estCommissionRate: "" });
      return;
    }

    const paid = Number(value);
    if (hasPrice && Number.isFinite(paid)) set({ estCommissionRate: asRate((paid / price) * 100) });
  };

  return (
    <div ref={panel}>
      <Panel
        className="p-[var(--ct-pad)]"
        style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
      >
        <PanelHeader
          eyebrow={mode === "create" ? "NEW CHALLENGE" : "EDIT CHALLENGE"}
          title={draft.name || "Untitled challenge"}
          description={
            mode === "create"
              ? "Add a plan by hand. Most challenges arrive on their own from an import - use this for one that has not been sold yet, or that the firm reports under a name you would rather set yourself."
              : "Renaming an unmapped challenge and setting it active is how it stops being a hole in the catalogue."
          }
        />

        <form
          className="mt-3 grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="product-platform">FIRM</FieldLabel>
              <Select
                id="product-platform"
                required
                disabled={mode === "edit"}
                value={platformId}
                onChange={(event) => onPlatformChange(event.target.value)}
              >
                <option value="">Select a firm…</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </Select>
              {mode === "edit" && (
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  A challenge cannot move between firms - its orders belong to this one.
                </p>
              )}
            </div>
            <div>
              <FieldLabel htmlFor="product-name">NAME</FieldLabel>
              <TextInput
                id="product-name"
                required
                maxLength={120}
                autoFocus
                placeholder="Select 50K"
                value={draft.name}
                onChange={(event) => set({ name: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FieldLabel htmlFor="product-kind">KIND</FieldLabel>
              <Select
                id="product-kind"
                value={draft.kind}
                onChange={(event) => set({ kind: event.target.value })}
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="product-status">STATUS</FieldLabel>
              <Select
                id="product-status"
                value={draft.status}
                onChange={(event) => set({ status: event.target.value as ProductStatus })}
              >
                <option value="ACTIVE">Active</option>
                <option value="UNMAPPED">Unmapped</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="product-account-size">ACCOUNT SIZE</FieldLabel>
              <TextInput
                id="product-account-size"
                inputMode="numeric"
                placeholder="50000"
                value={draft.accountSize}
                onChange={(event) =>
                  set({ accountSize: event.target.value.replace(/[^\d]/g, "") })
                }
                className="font-mono"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <FieldLabel htmlFor="product-price">LIST PRICE</FieldLabel>
              <TextInput
                id="product-price"
                inputMode="decimal"
                placeholder="299.00"
                value={draft.listPrice}
                onChange={(event) => setPrice(event.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <FieldLabel htmlFor="product-currency">CURRENCY</FieldLabel>
              <TextInput
                id="product-currency"
                maxLength={3}
                value={draft.currency}
                onChange={(event) => set({ currency: event.target.value.toUpperCase() })}
                className="font-mono"
              />
            </div>
            <div>
              <FieldLabel htmlFor="product-rate">EST. COMMISSION %</FieldLabel>
              <TextInput
                id="product-rate"
                inputMode="decimal"
                placeholder="15"
                value={draft.estCommissionRate}
                onChange={(event) => setRate(event.target.value)}
                className="font-mono"
              />
            </div>
            <div>
              <FieldLabel htmlFor="product-commission">
                COMMISSION {draft.currency.trim() || "USD"}
              </FieldLabel>
              <TextInput
                id="product-commission"
                inputMode="decimal"
                /* A commission with no price to divide by cannot become a rate,
                   and the rate is the only half that is stored - so rather than
                   accept a figure it would silently drop, the box says what it
                   is waiting for. */
                disabled={!hasPrice}
                placeholder={hasPrice ? "44.85" : "Set a list price first"}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          {overRate && (
            <p className="text-[11px] leading-5 text-warning">
              A commission of {amount || draft.estCommissionRate} is {rate.toFixed(1)}% of this
              list price. The catalogue stores a rate below 100%, so check the price and the
              amount agree before saving.
            </p>
          )}

          <p className="text-[11px] leading-5 text-muted">
            {firmDefaultRate && (
              <>
                This firm pays{" "}
                <button
                  type="button"
                  onClick={() => setRate(firmDefaultRate)}
                  className="cursor-pointer font-mono text-fg underline decoration-hair underline-offset-4 transition hover:text-primary"
                >
                  {firmDefaultRate}%
                </button>{" "}
                by default. A rate typed here <strong className="text-fg">overrides</strong> it for
                this challenge only -{" "}
                <button
                  type="button"
                  onClick={() => setRate("")}
                  className="cursor-pointer font-mono text-fg underline decoration-hair underline-offset-4 transition hover:text-primary"
                >
                  clear the box
                </button>{" "}
                to go back to inheriting the firm&rsquo;s {firmDefaultRate}%.{" "}
              </>
            )}
            Type whichever the firm quotes - the percentage or the amount per sale - and the other
            fills itself from the list price. Both are storefront estimates only: real cashback is
            always a share of the commission the firm actually reports, never of these numbers.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <FieldLabel htmlFor="product-family">FAMILY</FieldLabel>
              <TextInput
                id="product-family"
                maxLength={60}
                placeholder="Select"
                value={draft.family}
                onChange={(event) => set({ family: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="product-coupon">COUPON</FieldLabel>
              {/* Defaults to inheriting. Most firms run one code across the
                  whole catalogue, and picking per challenge is the exception -
                  so the inherited option is first and selected, and choosing a
                  specific code is a deliberate act. The discount decides what
                  the member pays, and what they pay decides the commission the
                  cashback comes out of, so this is not cosmetic. */}
              <Select
                id="product-coupon"
                value={draft.couponId}
                onChange={(event) => set({ couponId: event.target.value })}
              >
                <option value="">
                  {firmDefaultCoupon
                    ? `Use the firm's code - ${firmDefaultCoupon}`
                    : "Use the firm's code"}
                </option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code}
                    {coupon.discountPct ? ` - ${Number(coupon.discountPct)}% off` : " - no price cut"}
                    {coupon.status !== "ACTIVE" ? ` (${coupon.status.toLowerCase()})` : ""}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="product-trading-platform">TRADING PLATFORM</FieldLabel>
              <TextInput
                id="product-trading-platform"
                maxLength={40}
                placeholder="NinjaTrader"
                value={draft.tradingPlatform}
                onChange={(event) => set({ tradingPlatform: event.target.value })}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-[12px] text-muted">
            <input
              type="checkbox"
              checked={draft.isListed}
              onChange={(event) => set({ isListed: event.target.checked })}
              className="size-4 cursor-pointer accent-[var(--primary)]"
            />
            Show this challenge on the public deals page
          </label>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="lg" disabled={pending || !platformId || !draft.name.trim()}>
              {pending ? "Saving…" : mode === "create" ? "Create challenge" : "Save changes"}
            </Button>
            <Button type="button" size="lg" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
