"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  Panel,
  PanelHeader,
  RecordButton,
  RecordList,
  Select,
  TableShell,
  Td,
  Textarea,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { ImagePickerButton, useImageUpload } from "@/components/console/journal/image-upload";
import { FirmMark } from "@/components/ui/firm-mark";
import { useMutation, useResource, type Resource } from "@/lib/console-api";
import { orNone, slugify } from "@/lib/console-format";
import {
  PLATFORM_CATEGORIES,
  CATEGORY_LABELS,
  type PlatformCategory,
} from "@/lib/platform-categories";
import {
  ADMIN_PERMISSIONS as P,
  type ImportAdapter,
  type Platform,
  type PlatformStatus,
  type StatusMapping,
} from "@/lib/admin-types";

/**
 * Prop firms.
 *
 * Two fields here have consequences beyond the row. `adapterKey` decides which
 * parser reads that firm's reports, so a wrong value fails the next import
 * rather than this form. And the status map is what turns a firm's own wording
 * ("Charged back", "Refund issued") into a state the ledger acts on - an
 * unmapped word lands as PENDING and silently holds up cashback.
 */

const STATUS_TONE: Record<PlatformStatus, Tone> = {
  DRAFT: "neutral",
  ACTIVE: "success",
  PAUSED: "warning",
  ARCHIVED: "neutral",
};

const EMPTY = {
  slug: "",
  name: "",
  websiteUrl: "",
  logoUrl: "",
  description: "",
  adapterKey: "",
  fulfillment: "REDIRECT" as Platform["fulfillment"],
  status: "DRAFT" as PlatformStatus,
  supportsSubId: false,
  subIdParam: "",
  trackedLinkTemplate: "",
  exposesCustomerId: false,
  defaultCouponCode: "",
  profitSplit: "",
  payoutCadence: "",
  categories: [] as PlatformCategory[],
};

export function PlatformPanel({ platforms }: { platforms: Resource<Platform[]> }) {
  const { can } = useAccess();
  const { toast } = useToast();
  const adapters = useResource<ImportAdapter[]>("/api/admin/imports/adapters");
  const { mutate, pending, error, setError } = useMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [slugTouched, setSlugTouched] = useState(false);

  const canManage = can(P.platformManage);
  const rows = platforms.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  /**
   * The logo belongs to a firm that already exists.
   *
   * It is stored at `firms/<slug>/logos/…`, and that slug is read from the row
   * rather than from this form - so there is nowhere to put the bytes until the
   * firm has been saved once. The endpoint also writes `logoUrl` onto the row
   * itself, which is why the reload below is not optional.
   */
  const logo = useImageUpload(
    selectedId ? `/api/admin/catalog/platforms/${selectedId}/logo` : "",
  );
  const uploadLogo = async (file: File) => {
    const uploaded = await logo.upload(file);
    if (!uploaded) return;

    setForm((previous) => ({ ...previous, logoUrl: uploaded.url }));
    await platforms.reload();
  };

  const choose = (platform: Platform) => {
    setSelectedId(platform.id);
    setSlugTouched(true);
    setError(null);
    setForm({
      slug: platform.slug,
      name: platform.name,
      websiteUrl: platform.websiteUrl ?? "",
      logoUrl: platform.logoUrl ?? "",
      description: platform.description ?? "",
      adapterKey: platform.adapterKey ?? "",
      fulfillment: platform.fulfillment,
      status: platform.status,
      supportsSubId: platform.supportsSubId,
      subIdParam: platform.subIdParam ?? "",
      trackedLinkTemplate: platform.trackedLinkTemplate ?? "",
      categories: platform.categories ?? [],
      exposesCustomerId: platform.exposesCustomerId,
      defaultCouponCode: platform.defaultCouponCode ?? "",
      profitSplit: platform.profitSplit ?? "",
      payoutCadence: platform.payoutCadence ?? "",
    });
  };

  const startNew = () => {
    setSelectedId(null);
    setSlugTouched(false);
    setForm(EMPTY);
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const optional = (value: string) => (value.trim() ? value.trim() : undefined);
    const body = {
      ...(selectedId ? {} : { slug: form.slug }),
      name: form.name,
      websiteUrl: optional(form.websiteUrl),
      logoUrl: optional(form.logoUrl),
      description: optional(form.description),
      adapterKey: form.adapterKey,
      fulfillment: form.fulfillment,
      status: form.status,
      supportsSubId: form.supportsSubId,
      subIdParam: optional(form.subIdParam),
      trackedLinkTemplate: optional(form.trackedLinkTemplate),
      exposesCustomerId: form.exposesCustomerId,
      defaultCouponCode: optional(form.defaultCouponCode),
      profitSplit: optional(form.profitSplit),
      payoutCadence: optional(form.payoutCadence),
      categories: form.categories,
    };

    const saved = await mutate<Platform>(
      selectedId ? `/api/admin/catalog/platforms/${selectedId}` : "/api/admin/catalog/platforms",
      { method: selectedId ? "PATCH" : "POST", body },
    );
    if (!saved) return;

    toast(selectedId ? "Firm updated." : "Firm created.", "success");
    setSelectedId(saved.id);
    await platforms.reload();
  };

  return (
    <div className="grid gap-2 xl:grid-cols-[248px_minmax(0,1fr)] xl:items-start">
      <aside className="flex min-h-0 flex-col gap-2 xl:sticky xl:top-0">
        {canManage && (
          <div className="flex items-center justify-between gap-2 px-0.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
              Firms
            </span>
            <button
              type="button"
              onClick={startNew}
              className="cursor-pointer rounded-[8px] border border-hair px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-muted transition hover:border-club hover:text-club"
            >
              New +
            </button>
          </div>
        )}
        <RecordList className="max-h-[62vh] xl:max-h-[calc(100dvh-var(--topbar-h)-140px)]">
          {platforms.loading && rows.length === 0 ? (
            <LoadingRows rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState title="No firms yet" message="Add the first prop firm to track." />
          ) : (
            rows.map((platform) => (
              <RecordButton
                key={platform.id}
                active={selectedId === platform.id}
                onClick={() => choose(platform)}
              >
                <span className="flex items-center justify-between gap-2">
                  <Badge tone={STATUS_TONE[platform.status]}>{platform.status}</Badge>
                  {!platform.adapterKey && <Badge tone="warning">NO PARSER</Badge>}
                </span>
                <strong className="mt-2 block truncate text-[12.5px]">{platform.name}</strong>
                <span className="mt-1 block font-mono text-[10px] text-muted">
                  /{platform.slug}
                </span>
              </RecordButton>
            ))
          )}
        </RecordList>
      </aside>

      <div className="min-w-0 space-y-2">
        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow={selectedId ? "EDIT FIRM" : "NEW FIRM"}
            title={selectedId ? form.name || "Untitled firm" : "Add a prop firm"}
            actions={!canManage ? <Badge tone="neutral">READ ONLY</Badge> : undefined}
          />

          <form onSubmit={save} className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="platform-name">NAME</FieldLabel>
                <TextInput
                  id="platform-name"
                  required
                  disabled={!canManage}
                  maxLength={80}
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    setForm((previous) => ({
                      ...previous,
                      name,
                      slug: slugTouched ? previous.slug : slugify(name),
                    }));
                  }}
                />
              </div>
              <div>
                <FieldLabel htmlFor="platform-slug">SLUG</FieldLabel>
                <TextInput
                  id="platform-slug"
                  required
                  maxLength={60}
                  disabled={!canManage || Boolean(selectedId)}
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: slugify(event.target.value) });
                  }}
                />
                <p className="mt-2 text-[11px] text-muted">
                  {selectedId
                    ? "Fixed once created - it is in every public deal URL."
                    : "Lowercase words separated by hyphens."}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="platform-adapter">REPORT PARSER</FieldLabel>
                <Select
                  id="platform-adapter"
                  required
                  disabled={!canManage}
                  value={form.adapterKey}
                  onChange={(event) => setForm({ ...form, adapterKey: event.target.value })}
                >
                  <option value="">Select a parser…</option>
                  {(adapters.data ?? []).map((adapter) => (
                    <option key={adapter.key} value={adapter.key}>
                      {adapter.displayName} (v{adapter.version})
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  Which parser reads this firm&rsquo;s CSV exports.
                </p>
              </div>
              <div>
                <FieldLabel htmlFor="platform-status">STATUS</FieldLabel>
                <Select
                  id="platform-status"
                  disabled={!canManage}
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value as PlatformStatus })
                  }
                >
                  <option value="DRAFT">Draft - hidden from the public site</option>
                  <option value="ACTIVE">Active - listed on /deals</option>
                  <option value="PAUSED">Paused - listed but not promoted</option>
                  <option value="ARCHIVED">Archived</option>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="platform-website">WEBSITE URL</FieldLabel>
                <TextInput
                  id="platform-website"
                  type="url"
                  disabled={!canManage}
                  placeholder="https://…"
                  value={form.websiteUrl}
                  onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })}
                />
              </div>
              <div>
                <FieldLabel htmlFor="platform-coupon">DEFAULT COUPON</FieldLabel>
                <TextInput
                  id="platform-coupon"
                  disabled={!canManage}
                  maxLength={40}
                  placeholder="JAISARA"
                  value={form.defaultCouponCode}
                  onChange={(event) =>
                    setForm({ ...form, defaultCouponCode: event.target.value.toUpperCase() })
                  }
                />
              </div>
            </div>

            {/* Toggles rather than a multi-select: there are four options and
                they are not exclusive, so a row of chips shows the whole
                answer at a glance and takes one click to change. A firm with
                none selected is unclassified, which is allowed. */}
            <div>
              <FieldLabel htmlFor="platform-categories">MARKETS</FieldLabel>
              <div id="platform-categories" className="flex flex-wrap gap-2">
                {PLATFORM_CATEGORIES.map((category) => {
                  const on = form.categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      disabled={!canManage}
                      aria-pressed={on}
                      onClick={() =>
                        setForm({
                          ...form,
                          categories: on
                            ? form.categories.filter((value) => value !== category)
                            : [...form.categories, category],
                        })
                      }
                      className="cursor-pointer rounded-[9px] border px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        borderColor: on
                          ? "color-mix(in oklab, var(--club) 46%, var(--hair))"
                          : "var(--hair)",
                        background: on
                          ? "color-mix(in oklab, var(--club) 12%, transparent)"
                          : "transparent",
                        color: on ? "var(--club)" : "var(--muted)",
                      }}
                    >
                      {CATEGORY_LABELS[category]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* The logo is what the storefront leads every row with, so it is
                worth a real control rather than a URL field somebody has to
                find a host for. Uploading writes to our own storage and fills
                the URL in; pasting a URL the firm already hosts also works. */}
            <div>
              <FieldLabel htmlFor="platform-logo">LOGO</FieldLabel>
              <div className="flex flex-wrap items-center gap-3">
                <FirmMark
                  name={form.name || "This firm"}
                  mark={(form.name || "??").slice(0, 2).toUpperCase()}
                  logoUrl={form.logoUrl || null}
                  size={44}
                  className="rounded-[12px]"
                />
                <TextInput
                  id="platform-logo"
                  type="url"
                  disabled={!canManage}
                  placeholder="https://… or upload"
                  className="min-w-[180px] flex-1"
                  value={form.logoUrl}
                  onChange={(event) => setForm({ ...form, logoUrl: event.target.value })}
                />
                <ImagePickerButton
                  disabled={!canManage || !selectedId || logo.uploading}
                  label={logo.uploading ? "UPLOADING…" : "UPLOAD"}
                  onPicked={(file) => void uploadLogo(file)}
                />
                {form.logoUrl && canManage && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: "" })}
                    className="cursor-pointer font-mono text-[9px] tracking-[0.14em] text-muted hover:text-danger"
                  >
                    REMOVE
                  </button>
                )}
              </div>
              {logo.error && (
                <p role="alert" className="mt-2 text-[11.5px] text-danger">
                  {logo.error}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted">
                {selectedId
                  ? "PNG, JPEG, WebP or GIF, under 5MB. A square mark reads best - the storefront shows it at 40px. Firms without one fall back to a monogram. Uploading saves it to the firm straight away."
                  : "Save the firm first - its logo is filed under the firm's own slug, so there is nowhere to put it until the firm exists. Firms without one fall back to a monogram."}
              </p>
            </div>

            <div>
              <FieldLabel htmlFor="platform-link">TRACKED LINK TEMPLATE</FieldLabel>
              <TextInput
                id="platform-link"
                disabled={!canManage}
                placeholder="https://firm.example/?ref=jaisara&sub_id={subId}"
                value={form.trackedLinkTemplate}
                onChange={(event) =>
                  setForm({ ...form, trackedLinkTemplate: event.target.value })
                }
              />
              <p className="mt-2 text-[11px] leading-5 text-muted">
                Must start with http:// or https:// - this is rendered into a redirect, so a
                javascript: URL here would be an XSS vector on every deal link.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-[11px] border border-hair p-4">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={form.supportsSubId}
                  onChange={(event) =>
                    setForm({ ...form, supportsSubId: event.target.checked })
                  }
                  className="mt-0.5 size-4 cursor-pointer accent-[var(--primary)]"
                />
                <span className="text-[12px] leading-5 text-muted">
                  <strong className="text-fg">Supports sub-id.</strong> The firm echoes a
                  per-member token back in its report, which matches a purchase without a receipt.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-[11px] border border-hair p-4">
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={form.exposesCustomerId}
                  onChange={(event) =>
                    setForm({ ...form, exposesCustomerId: event.target.checked })
                  }
                  className="mt-0.5 size-4 cursor-pointer accent-[var(--primary)]"
                />
                <span className="text-[12px] leading-5 text-muted">
                  <strong className="text-fg">Exposes a customer id.</strong> A stable buyer
                  reference in the export, usable as a secondary match.
                </span>
              </label>
            </div>

            {form.supportsSubId && (
              <div className="md:w-1/2">
                <FieldLabel htmlFor="platform-subid">SUB-ID QUERY PARAMETER</FieldLabel>
                <TextInput
                  id="platform-subid"
                  disabled={!canManage}
                  placeholder="sub_id"
                  value={form.subIdParam}
                  onChange={(event) => setForm({ ...form, subIdParam: event.target.value })}
                />
              </div>
            )}

            <div>
              <FieldLabel htmlFor="platform-description">DESCRIPTION</FieldLabel>
              <Textarea
                id="platform-description"
                rows={3}
                maxLength={500}
                disabled={!canManage}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                className="min-h-[88px]"
              />
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            {canManage && (
              <div>
                <Button type="submit" size="lg" disabled={pending}>
                  {pending ? "Saving…" : selectedId ? "Save changes" : "Create firm"}
                </Button>
              </div>
            )}
          </form>
        </Panel>

        {selected && (
          <StatusMapEditor
            platform={selected}
            canManage={canManage}
            onSaved={() => void platforms.reload()}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Maps a firm's own status wording onto the four states the ledger understands.
 * Anything unmapped falls through as PENDING, which is safe but stalls cashback
 * until somebody notices - so unmapped words surface in the import preview.
 */
function StatusMapEditor({
  platform,
  canManage,
  onSaved,
}: {
  platform: Platform;
  canManage: boolean;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const { mutate, pending, error } = useMutation();
  const [rawStatus, setRawStatus] = useState("");
  const [status, setStatus] = useState<StatusMapping["status"]>("CONFIRMED");
  const [isTerminal, setIsTerminal] = useState(false);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await mutate(`/api/admin/catalog/platforms/${platform.id}/status-map`, {
      body: { rawStatus: rawStatus.trim(), status, isTerminal },
    });
    if (!result) return;
    toast(`"${rawStatus.trim()}" now maps to ${status}.`, "success");
    setRawStatus("");
    onSaved();
  };

  const mappings = platform.statusMappings ?? [];

  return (
    <Panel className="p-[var(--ct-pad)]">
      <PanelHeader
        eyebrow="STATUS MAP"
        title={`How ${platform.name} words its statuses`}
        description="The firm writes its own vocabulary in the export. Each word has to map onto one of our four states before a row can affect a wallet."
      />

      <div className="mt-3">
        {mappings.length === 0 ? (
          <EmptyState
            title="No mappings yet"
            message="Until a word is mapped, rows carrying it import as PENDING and never release cashback."
          />
        ) : (
          <TableShell columns={["THEIR WORD", "OUR STATE", "TERMINAL", "NOTE"]} minWidth={620}>
            {mappings.map((mapping) => (
              <Tr key={mapping.rawStatus}>
                <Td className="font-mono text-[11.5px]">{mapping.rawStatus}</Td>
                <Td>
                  <Badge
                    tone={
                      mapping.status === "CONFIRMED" || mapping.status === "PAID"
                        ? "success"
                        : mapping.status === "REJECTED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {mapping.status}
                  </Badge>
                </Td>
                <Td className="text-muted">{mapping.isTerminal ? "Yes" : "No"}</Td>
                <Td className="text-muted">{orNone(mapping.note)}</Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </div>

      {canManage && (
        <form onSubmit={add} className="mt-5 flex flex-wrap items-end gap-3 border-t border-hair pt-5">
          <div className="min-w-[200px] flex-1">
            <FieldLabel htmlFor="map-raw">THEIR WORD, VERBATIM</FieldLabel>
            <TextInput
              id="map-raw"
              required
              maxLength={60}
              placeholder="Charged back"
              value={rawStatus}
              onChange={(event) => setRawStatus(event.target.value)}
            />
          </div>
          <div className="min-w-[170px]">
            <FieldLabel htmlFor="map-status">MAPS TO</FieldLabel>
            <Select
              id="map-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusMapping["status"])}
            >
              <option value="PENDING">PENDING</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="PAID">PAID</option>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2 pb-3 text-[11.5px] text-muted">
            <input
              type="checkbox"
              checked={isTerminal}
              onChange={(event) => setIsTerminal(event.target.checked)}
              className="size-4 cursor-pointer accent-[var(--primary)]"
            />
            Final - cannot change again
          </label>
          <Button type="submit" size="lg" disabled={pending || !rawStatus.trim()}>
            Add mapping
          </Button>
          {error && (
            <div className="w-full">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}
        </form>
      )}
    </Panel>
  );
}
