"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { FilterChip } from "@/components/ui/filter-chip";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  Panel,
  Select,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource, type Resource } from "@/lib/console-api";
import { usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type Platform,
  type Product,
  type ProductStatus,
} from "@/lib/admin-types";
import {
  ProductForm,
  draftFrom,
  draftToBody,
  emptyDraft,
  type ProductDraft,
} from "./product-form";

/**
 * The challenge catalogue.
 *
 * Opens on UNMAPPED, because that queue is the one with a cost attached: an
 * import writes an order whose product string matched nothing, and until
 * somebody maps it the storefront cannot price that challenge. Mapping is done
 * by adding the firm's exact export string as an alias, so the next import
 * resolves it without a second look.
 */

const STATUS_TONE: Record<ProductStatus, Tone> = {
  ACTIVE: "success",
  UNMAPPED: "warning",
  ARCHIVED: "neutral",
};

export function ProductPanel({ platforms }: { platforms: Resource<Platform[]> }) {
  const { can } = useAccess();
  const { toast } = useToast();
  const [status, setStatus] = useState<ProductStatus | "">("UNMAPPED");
  const [platformId, setPlatformId] = useState("");
  const [aliasFor, setAliasFor] = useState<Product | null>(null);
  const [alias, setAlias] = useState("");
  const [merging, setMerging] = useState<Product | null>(null);
  const [mergeTarget, setMergeTarget] = useState("");

  // One editor, two modes. `editingId` null with `form` set means "creating".
  const [form, setForm] = useState<ProductDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formPlatformId, setFormPlatformId] = useState("");

  const canManage = can(P.productManage);
  const products = useResource<Product[]>("/api/admin/catalog/products", {
    query: { status: status || undefined, platformId: platformId || undefined, take: 200 },
  });
  const { mutate, pending, error, setError } = useMutation();

  const rows = products.data ?? [];

  const openCreate = () => {
    setError(null);
    setEditingId(null);
    setFormPlatformId(platformId);
    setForm(emptyDraft());
  };

  const openEdit = (product: Product) => {
    setError(null);
    setEditingId(product.id);
    setFormPlatformId(product.platformId);
    setForm(draftFrom(product));
  };

  const closeForm = () => {
    setForm(null);
    setEditingId(null);
    setError(null);
  };

  const submitForm = async () => {
    if (!form) return;

    const saved = await mutate<Product>(
      editingId
        ? `/api/admin/catalog/products/${editingId}`
        : `/api/admin/catalog/platforms/${formPlatformId}/products`,
      { method: editingId ? "PATCH" : "POST", body: draftToBody(form) },
    );
    if (!saved) return;

    toast(editingId ? "Challenge updated." : "Challenge created.", "success");
    closeForm();
    await products.reload();
  };

  const addAlias = async () => {
    if (!aliasFor) return;
    const saved = await mutate(`/api/admin/catalog/products/${aliasFor.id}/aliases`, {
      body: { rawKey: alias.trim() },
    });
    if (!saved) return;
    toast(`Future imports of "${alias.trim()}" resolve to ${aliasFor.name}.`, "success");
    setAliasFor(null);
    setAlias("");
    await products.reload();
  };

  const merge = async () => {
    if (!merging || !mergeTarget) return;
    const saved = await mutate(
      `/api/admin/catalog/products/${merging.id}/merge/${mergeTarget}`,
    );
    if (!saved) return;
    toast("Merged. Orders and aliases moved across.", "success");
    setMerging(null);
    setMergeTarget("");
    await products.reload();
  };

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <div className="flex flex-wrap items-center gap-2">
          {(["UNMAPPED", "ACTIVE", "ARCHIVED", ""] as const).map((option) => (
            <FilterChip
              key={option || "all"}
              active={status === option}
              onClick={() => setStatus(option)}
            >
              {option === "" ? "All" : option === "UNMAPPED" ? "Needs mapping" : option}
            </FilterChip>
          ))}
          <Select
            aria-label="Filter by firm"
            value={platformId}
            onChange={(event) => setPlatformId(event.target.value)}
            className="ml-auto w-auto min-w-[180px] py-2.5 text-[12.5px]"
          >
            <option value="">All firms</option>
            {(platforms.data ?? []).map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </Select>

          {canManage && (
            <Button size="lg" onClick={openCreate}>
              + New challenge
            </Button>
          )}
        </div>
        {status === "UNMAPPED" && (
          <p className="mt-3 text-[11.5px] leading-5 text-muted">
            These came in from an import with a product string nothing matched. Rename and
            activate the real challenge, or add the firm&rsquo;s string as an alias on an existing
            one.
          </p>
        )}
      </Panel>

      {products.error && <ErrorNote>{products.error}</ErrorNote>}

      {/* Above the table, never below it: an editor after 200 rows is off the
          bottom of the page, and pressing Edit then looks like nothing happened. */}
      {form && (
        <ProductForm
          key={editingId ?? "new"}
          mode={editingId ? "edit" : "create"}
          draft={form}
          platforms={platforms.data ?? []}
          platformId={formPlatformId}
          pending={pending}
          error={error}
          onDraftChange={setForm}
          onPlatformChange={setFormPlatformId}
          onSubmit={() => void submitForm()}
          onCancel={closeForm}
        />
      )}

      <Panel className="p-2">
        {products.loading && rows.length === 0 ? (
          <LoadingRows rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title={status === "UNMAPPED" ? "Everything is mapped" : "No challenges"}
            message={
              status === "UNMAPPED"
                ? "Every imported product string resolves to a challenge. This is the state you want after an import."
                : "Nothing matches this filter."
            }
          />
        ) : (
          <TableShell
            columns={["CHALLENGE", "FIRM", "KIND", "LIST PRICE", "ORDERS", "STATUS", ""]}
            minWidth={940}
          >
            {rows.map((product) => (
              <Tr key={product.id}>
                <Td>
                  <strong className="block text-[12.5px]">{product.name}</strong>
                  {product.aliases && product.aliases.length > 0 && (
                    <span className="mt-1 block max-w-[280px] truncate font-mono text-[9.5px] text-muted">
                      {product.aliases.map((entry) => entry.rawKey).join(" · ")}
                    </span>
                  )}
                </Td>
                <Td className="text-muted">{product.platform?.name ?? "—"}</Td>
                <Td className="font-mono text-[10.5px] text-muted">{product.kind}</Td>
                <Td data-count className="font-mono">
                  {product.listPrice ? usd(product.listPrice, product.currency) : "—"}
                </Td>
                <Td data-count className="font-mono text-muted">
                  {product._count?.orders ?? 0}
                </Td>
                <Td>
                  <Badge tone={STATUS_TONE[product.status]}>{product.status}</Badge>
                </Td>
                <Td>
                  {canManage && (
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant={editingId === product.id ? "primary" : "outline"}
                        onClick={() => openEdit(product)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setAliasFor(product);
                        }}
                      >
                        Alias
                      </Button>
                      {product.status === "UNMAPPED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setError(null);
                            setMerging(product);
                          }}
                        >
                          Merge
                        </Button>
                      )}
                    </div>
                  )}
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </Panel>

      <ConfirmDialog
        open={aliasFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAliasFor(null);
            setAlias("");
          }
        }}
        title="Add an import alias"
        confirmLabel="Add alias"
        pending={pending}
        error={error}
        onConfirm={addAlias}
        summary={
          aliasFor ? (
            <>
              Every future import row whose product string matches this exactly will resolve to{" "}
              <strong className="text-fg">{aliasFor.name}</strong>. Copy it verbatim from the
              firm&rsquo;s export, including capitalisation and spacing.
              <div className="mt-4">
                <FieldLabel htmlFor="alias-raw">THE FIRM&rsquo;S EXACT STRING</FieldLabel>
                <TextInput
                  id="alias-raw"
                  autoFocus
                  maxLength={200}
                  value={alias}
                  onChange={(event) => setAlias(event.target.value)}
                  placeholder="Select 50K - Standard"
                />
              </div>
            </>
          ) : null
        }
      />

      <ConfirmDialog
        open={merging !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMerging(null);
            setMergeTarget("");
          }
        }}
        title="Merge into another challenge"
        intent="danger"
        confirmLabel="Merge"
        pending={pending}
        error={error}
        onConfirm={merge}
        summary={
          merging ? (
            <>
              Orders and aliases on <strong className="text-fg">{merging.name}</strong> move to the
              challenge you pick, and this row is retired. Use it when an import created a
              duplicate of something already in the catalogue.
              <div className="mt-4">
                <FieldLabel htmlFor="merge-target">MERGE INTO</FieldLabel>
                <Select
                  id="merge-target"
                  value={mergeTarget}
                  onChange={(event) => setMergeTarget(event.target.value)}
                >
                  <option value="">Select the challenge to keep…</option>
                  {rows
                    .filter(
                      (row) =>
                        row.id !== merging.id && row.platformId === merging.platformId,
                    )
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.name}
                      </option>
                    ))}
                </Select>
              </div>
            </>
          ) : null
        }
      />
    </div>
  );
}
