"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  DefinitionList,
  EmptyState,
  ErrorNote,
  PageHeader,
  Panel,
  PanelHeader,
  Select,
  StatTile,
  TableShell,
  Td,
  Tr,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { consoleApi, errorMessage, useMutation, useResource } from "@/lib/console-api";
import { dateTime, fileSize, shortDate, usd } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AffiliateAccount,
  type ImportAdapter,
  type ImportBatch,
  type ImportCommitResult,
  type ImportPreview,
  type Platform,
} from "@/lib/admin-types";

/**
 * The CSV ingestion screen.
 *
 * Built around the pipeline's central rule: uploading parses and diffs, and
 * writes nothing. The commit button stays disabled until a preview exists, and
 * the confirmation repeats the numbers back, because this is the step where a
 * wrong file turns into cashback we never earned.
 */
export function ImportConsole() {
  const { can } = useAccess();
  const { toast } = useToast();

  const platforms = useResource<Platform[]>("/api/admin/catalog/platforms", {
    enabled: can(P.platformView),
  });
  const accounts = useResource<AffiliateAccount[]>("/api/admin/imports/affiliate-accounts");
  const adapters = useResource<ImportAdapter[]>("/api/admin/imports/adapters");
  const batches = useResource<ImportBatch[]>("/api/admin/imports/batches", {
    query: { take: 20 },
  });

  const [platformId, setPlatformId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [force, setForce] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const commit = useMutation();
  const platform = platforms.data?.find((entry) => entry.id === platformId);
  const adapter = adapters.data?.find((entry) => entry.key === platform?.adapterKey);
  const ready = Boolean(platformId && accountId && file);

  /**
   * Opens the archived report in a new tab.
   *
   * The signed link is fetched on click rather than rendered into the table:
   * these expire in five minutes, so a page left open would otherwise be a
   * column of dead links.
   */
  const openArchive = async (batchId: string) => {
    const result = await commit.mutate<{ url: string }>(
      `/api/admin/imports/${batchId}/file`,
      { method: "GET" },
    );
    if (result?.url) window.open(result.url, "_blank", "noopener,noreferrer");
  };

  const upload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setPreview(null);

    const body = new FormData();
    body.set("file", file);
    body.set("platformId", platformId);
    body.set("affiliateAccountId", accountId);
    if (force) body.set("force", "true");

    try {
      const result = await consoleApi<ImportPreview>("/api/admin/imports", {
        method: "POST",
        body,
      });
      setPreview(result);
      toast("Parsed. Nothing has been written yet.", "info");
      await batches.reload();
    } catch (error) {
      setUploadError(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const runCommit = async () => {
    if (!preview) return;
    const result = await commit.mutate<ImportCommitResult>(
      `/api/admin/imports/${preview.batchId}/commit`,
    );
    if (!result) return;

    setConfirming(false);
    setPreview(null);
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
    toast(
      `Committed - ${result.inserted ?? 0} new order${result.inserted === 1 ? "" : "s"}, ${result.updated ?? 0} updated.`,
      "success",
    );
    await batches.reload();
  };

  const diff = preview?.diff;

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Imports"
        description="Parsing is a dry run: it works out what a commit would change and writes nothing until you approve the diff."
      />

      {!can(P.importUpload) ? (
        <Panel>
          <EmptyState
            title="Read-only access"
            message="You can see past batches here, but uploading a report needs the import:upload permission."
          />
        </Panel>
      ) : (
        <Panel className="mb-4 p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="STEP 1"
            title="Upload a report"
            description="The parser is chosen from the firm's configured adapter, so uploading a Tradeify export against LUCID fails on the columns rather than importing nonsense."
          />

          <form onSubmit={upload} className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="import-platform">FIRM</FieldLabel>
                <Select
                  id="import-platform"
                  required
                  value={platformId}
                  onChange={(event) => setPlatformId(event.target.value)}
                >
                  <option value="">Select a firm…</option>
                  {(platforms.data ?? []).map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                      {entry.adapterKey ? "" : " (no parser configured)"}
                    </option>
                  ))}
                </Select>
                {platform && !platform.adapterKey && (
                  <p className="mt-2 text-[11px] leading-5 text-warning">
                    This firm has no adapter set, so its reports cannot be parsed yet. Set one
                    in the catalogue first.
                  </p>
                )}
                {adapter && (
                  <p className="mt-2 text-[11px] leading-5 text-muted">
                    Parser: <span className="font-mono text-fg">{adapter.displayName}</span> v
                    {adapter.version}. Needs columns{" "}
                    <span className="font-mono">{adapter.requiredColumns.join(", ")}</span>.
                  </p>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="import-account">AFFILIATE ACCOUNT</FieldLabel>
                <Select
                  id="import-account"
                  required
                  value={accountId}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  <option value="">Select an account…</option>
                  {(accounts.data ?? []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  Whose affiliate link earned this commission.
                </p>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="import-file">CSV FILE</FieldLabel>
              <input
                id="import-file"
                ref={fileInput}
                type="file"
                required
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  setPreview(null);
                }}
                className="w-full cursor-pointer rounded-[11px] border border-hair bg-surface-2 px-3.5 py-3 text-[12.5px] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:font-mono file:text-[9.5px] file:uppercase file:tracking-[0.12em] file:text-on-primary"
              />
              {file && (
                <p className="mt-2 font-mono text-[10px] tracking-[0.1em] text-muted">
                  {file.name} · {fileSize(file.size)}
                </p>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-[11px] border border-hair p-4">
              <input
                type="checkbox"
                checked={force}
                onChange={(event) => setForce(event.target.checked)}
                className="mt-0.5 size-4 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-[12px] leading-6 text-muted">
                <strong className="text-fg">Re-run a file already committed.</strong> Uploading
                the same file twice cannot double-count either way - orders are keyed on the
                firm&rsquo;s own reference and unchanged rows are a no-op. This only lifts the
                check that stops you re-uploading a file by mistake.
              </span>
            </label>

            {uploadError && <ErrorNote>{uploadError}</ErrorNote>}

            <div>
              <Button type="submit" size="lg" disabled={!ready || uploading}>
                {uploading ? "Parsing…" : "Parse & preview"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {preview && diff && (
        <Panel className="mb-4 p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="STEP 2 · NOTHING WRITTEN YET"
            title="What committing would do"
            actions={<Badge tone="warning">DRY RUN</Badge>}
          />

          <div className="mt-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <StatTile
              label="NEW ORDERS"
              value={diff.inserts}
              tone={diff.inserts > 0 ? "success" : "neutral"}
            />
            <StatTile label="UPDATED" value={diff.updates} />
            <StatTile label="UNCHANGED" value={diff.unchanged} />
            <StatTile
              label="CLAWBACKS"
              value={diff.clawbacks}
              tone={diff.clawbacks > 0 ? "danger" : "neutral"}
              hint={diff.clawbacks > 0 ? "Refunds that reverse cashback already paid." : undefined}
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[9px] tracking-[0.18em] text-muted">
                WHAT THE FILE CONTAINS
              </p>
              <DefinitionList
                rows={[
                  { label: "Rows parsed", value: preview.summary.totalRows },
                  { label: "Sales", value: preview.summary.sales },
                  { label: "Debits", value: preview.summary.debits },
                  { label: "Adjustments", value: preview.summary.adjustments },
                  {
                    label: "Gross commission",
                    value: usd(preview.summary.grossCommission),
                  },
                  {
                    label: "Date range",
                    value: preview.summary.dateRange
                      ? `${shortDate(preview.summary.dateRange.from)} → ${shortDate(preview.summary.dateRange.to)}`
                      : "-",
                  },
                  {
                    label: "Rows with errors",
                    value:
                      preview.summary.errors > 0 ? (
                        <span className="text-danger">{preview.summary.errors}</span>
                      ) : (
                        0
                      ),
                  },
                ]}
              />
            </div>

            <div className="space-y-2">
              {diff.unmappedProducts.length > 0 && (
                <Warning
                  title={`${diff.unmappedProducts.length} unmapped product${diff.unmappedProducts.length === 1 ? "" : "s"}`}
                  body="These import fine, but until they are mapped to a challenge the catalogue cannot price them."
                  items={diff.unmappedProducts}
                />
              )}
              {diff.unmappedStatuses.length > 0 && (
                <Warning
                  title={`${diff.unmappedStatuses.length} unmapped status word${diff.unmappedStatuses.length === 1 ? "" : "s"}`}
                  body="A status this firm uses that has no rule yet. Map it before committing, or those rows land as PENDING."
                  items={diff.unmappedStatuses}
                  tone="warning"
                />
              )}
              {diff.errors.length > 0 && (
                <Warning
                  title={`${diff.errors.length} row error${diff.errors.length === 1 ? "" : "s"}`}
                  body="These rows will be skipped."
                  items={diff.errors.slice(0, 12)}
                  tone="danger"
                />
              )}
              {diff.statusChanges.length > 0 && (
                <Warning
                  title={`${diff.statusChanges.length} status change${diff.statusChanges.length === 1 ? "" : "s"}`}
                  body="Orders already on file whose status the firm has since revised."
                  items={diff.statusChanges
                    .slice(0, 12)
                    .map((change) => `${change.externalId}: ${change.from} → ${change.to}`)}
                  tone="warning"
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {can(P.importCommit) ? (
              <Button size="lg" onClick={() => setConfirming(true)}>
                Commit this import
              </Button>
            ) : (
              <span className="font-mono text-[10px] tracking-[0.12em] text-muted">
                COMMITTING NEEDS THE IMPORT:COMMIT PERMISSION
              </span>
            )}
            <Button size="lg" variant="outline" onClick={() => setPreview(null)}>
              Discard preview
            </Button>
          </div>
        </Panel>
      )}

      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader eyebrow="HISTORY" title="Recent batches" />
        <div className="mt-3">
          {(batches.data ?? []).length === 0 ? (
            <EmptyState title="No imports yet" message="Uploaded reports appear here." />
          ) : (
            <TableShell columns={["FILE", "FIRM", "PARSER", "ROWS", "STATUS", "UPLOADED", ""]}>
              {(batches.data ?? []).map((batch) => (
                <Tr key={batch.id}>
                  <Td>
                    <span className="block max-w-[240px] truncate font-mono text-[11.5px]">
                      {batch.fileName}
                    </span>
                    <span className="mt-1 block text-[10.5px] text-muted">
                      {fileSize(batch.fileSize)}
                    </span>
                  </Td>
                  <Td>{batch.platform.name}</Td>
                  <Td className="font-mono text-[11px] text-muted">{batch.adapterKey}</Td>
                  <Td data-count className="font-mono">
                    {batch._count?.rows ?? "-"}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        batch.status === "COMMITTED"
                          ? "success"
                          : batch.status === "FAILED"
                            ? "danger"
                            : batch.status === "PREVIEWED" || batch.status === "PARSED"
                              ? "warning"
                              : "neutral"
                      }
                    >
                      {batch.status}
                    </Badge>
                  </Td>
                  <Td className="whitespace-nowrap text-muted">{dateTime(batch.createdAt)}</Td>
                  {/* The original file is the evidence behind every commission
                      this batch created. It has been archived since the import
                      ran; until now there was no way to get it back out. */}
                  <Td className="whitespace-nowrap">
                    {batch.archived ? (
                      <button
                        type="button"
                        onClick={() => void openArchive(batch.id)}
                        className="cursor-pointer font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-primary hover:underline"
                      >
                        DOWNLOAD
                      </button>
                    ) : (
                      <span
                        title="Imported before archiving existed, or the upload to storage failed."
                        className="font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-muted"
                      >
                        NO FILE
                      </span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TableShell>
          )}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Commit this import?"
        confirmLabel="Write these orders"
        pending={commit.pending}
        error={commit.error}
        onConfirm={runCommit}
        summary={
          diff ? (
            <>
              This writes <strong className="text-fg">{diff.inserts}</strong> new order
              {diff.inserts === 1 ? "" : "s"} and updates{" "}
              <strong className="text-fg">{diff.updates}</strong>, from{" "}
              <strong className="text-fg">{file?.name ?? "the uploaded file"}</strong>.
              {diff.clawbacks > 0 && (
                <>
                  {" "}
                  <strong className="text-danger">
                    {diff.clawbacks} refund{diff.clawbacks === 1 ? "" : "s"}
                  </strong>{" "}
                  will reverse cashback that has already been credited.
                </>
              )}
              <br />
              <br />
              Waiting claims are re-matched against these orders straight afterwards.
            </>
          ) : null
        }
      />
    </div>
  );
}

function Warning({
  title,
  body,
  items,
  tone = "info",
}: {
  title: string;
  body: string;
  items: string[];
  tone?: "info" | "warning" | "danger";
}) {
  const color = `var(--${tone === "info" ? "info" : tone})`;
  return (
    <div
      className="rounded-[13px] border p-4"
      style={{ borderColor: `color-mix(in oklab, ${color} 40%, transparent)` }}
    >
      <p className="font-mono text-[9px] tracking-[0.14em]" style={{ color }}>
        {title.toUpperCase()}
      </p>
      <p className="mt-2 text-[11.5px] leading-5 text-muted">{body}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="max-w-full truncate rounded-md bg-surface-2 px-2 py-1 font-mono text-[9.5px] text-muted"
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
