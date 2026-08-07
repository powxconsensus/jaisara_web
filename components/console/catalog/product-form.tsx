"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import {
  ErrorNote,
  Panel,
  PanelHeader,
  Select,
} from "@/components/console/ui";
import type { Platform, Product, ProductStatus } from "@/lib/admin-types";

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
    isListed: product.isListed,
  };
}

/** Strips blanks so the API's `.partial()` schema sees absent, not empty. */
export function draftToBody(draft: ProductDraft) {
  const text = (value: string) => (value.trim() ? value.trim() : undefined);
  return {
    name: draft.name.trim(),
    family: text(draft.family),
    kind: draft.kind,
    status: draft.status,
    // An empty number field must be omitted — `accountSize` is validated as a
    // positive int, and sending 0 or "" is a 400.
    accountSize: draft.accountSize.trim() ? Number(draft.accountSize) : undefined,
    listPrice: text(draft.listPrice),
    currency: draft.currency.trim().toUpperCase() || "USD",
    estCommissionRate: text(draft.estCommissionRate),
    tradingPlatform: text(draft.tradingPlatform),
    isListed: draft.isListed,
  };
}

export function ProductForm({
  mode,
  draft,
  platforms,
  platformId,
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

  return (
    <div ref={panel}>
      <Panel
        className="p-[clamp(18px,3vw,26px)]"
        style={{ borderColor: "color-mix(in oklab, var(--primary) 45%, transparent)" }}
      >
        <PanelHeader
          eyebrow={mode === "create" ? "NEW CHALLENGE" : "EDIT CHALLENGE"}
          title={draft.name || "Untitled challenge"}
          description={
            mode === "create"
              ? "Add a plan by hand. Most challenges arrive on their own from an import — use this for one that has not been sold yet, or that the firm reports under a name you would rather set yourself."
              : "Renaming an unmapped challenge and setting it active is how it stops being a hole in the catalogue."
          }
        />

        <form
          className="mt-6 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
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
                  A challenge cannot move between firms — its orders belong to this one.
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

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <FieldLabel htmlFor="product-price">LIST PRICE</FieldLabel>
              <TextInput
                id="product-price"
                inputMode="decimal"
                placeholder="299.00"
                value={draft.listPrice}
                onChange={(event) => set({ listPrice: event.target.value })}
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
                onChange={(event) => set({ estCommissionRate: event.target.value })}
                className="font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] leading-5 text-muted">
            Price and commission rate are storefront estimates only. Real cashback is always a
            share of the commission the firm actually reports, never of these numbers.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
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
