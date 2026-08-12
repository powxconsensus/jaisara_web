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
  PageHeader,
  Panel,
  PanelHeader,
  Select,
  TableShell,
  Td,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { dateTime, relativeTime } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AiConfigOverview,
  type AiProviderView,
  type AiTestResult,
} from "@/lib/admin-types";

/**
 * Which model reads receipts and answers support, and the keys behind them.
 *
 * This page exists because a provider retiring a preview model is a Tuesday,
 * and the fix should not be a redeploy. Everything here is operational data -
 * it changes on the provider's schedule, not ours.
 *
 * Two things it deliberately never shows: a key, and any part of one beyond the
 * last four characters. Keys go in and are encrypted; nothing sends one back.
 * If somebody needs the value again, they get it from the provider's dashboard,
 * which is the only other place it exists.
 */
export function AiConsole() {
  const { can } = useAccess();
  const editable = can(P.aiManage);
  const overview = useResource<AiConfigOverview>("/api/admin/ai");
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="AI providers"
        description="Tried in priority order - the first that answers wins, and one that fails is passed over for a minute. Receipt reading needs a provider that accepts images."
        actions={
          editable ? (
            <Button size="sm" onClick={() => setAdding((open) => !open)}>
              {adding ? "Cancel" : "Add provider"}
            </Button>
          ) : null
        }
      />

      {overview.error && <ErrorNote>{overview.error}</ErrorNote>}
      {overview.loading && <LoadingRows rows={3} />}

      {overview.data && (
        <div className="flex flex-col gap-3">
          <SourceBanner overview={overview.data} editable={editable} onChange={overview.reload} />

          {adding && editable && (
            <ProviderForm
              onDone={() => {
                setAdding(false);
                void overview.reload();
              }}
            />
          )}

          {overview.data.providers.length === 0 && !adding ? (
            <EmptyState
              title="No providers configured here"
              message={
                overview.data.environmentProviders.length > 0
                  ? "The API is running from the AI_* environment block. Import it to manage providers from this page."
                  : "Receipts are entered by hand and the assistant answers from each member's own rows. That is a supported way to run - add a provider to change it."
              }
            />
          ) : (
            overview.data.providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                editable={editable}
                canStoreKeys={overview.data!.canStoreKeys}
                onChange={overview.reload}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Where the running API is reading its providers from.
 *
 * Worth stating outright: a page full of rows that the API is ignoring, because
 * the environment block still wins or every key failed to decrypt, is the most
 * confusing state this feature can be in.
 */
function SourceBanner({
  overview,
  editable,
  onChange,
}: {
  overview: AiConfigOverview;
  editable: boolean;
  onChange: () => void;
}) {
  const { mutate, pending } = useMutation();
  const { toast } = useToast();

  const tone: Tone =
    overview.activeSource === "database"
      ? "success"
      : overview.activeSource === "environment"
        ? "warning"
        : "neutral";

  const summary = {
    database: "Serving the providers below.",
    environment: `Serving the AI_* environment block (${overview.environmentProviders.join(", ") || "none"}). Rows on this page are not in use.`,
    none: "Nothing is configured. Receipts are typed in by hand and the assistant gives guided answers only.",
  }[overview.activeSource];

  async function importEnvironment() {
    const result = await mutate<{ imported: string[]; skipped: string[] }>(
      "/api/admin/ai/import-from-environment",
    );
    if (!result) return;
    toast(
      result.imported.length > 0
        ? `Imported ${result.imported.join(", ")}`
        : `Nothing imported - ${result.skipped.join(", ") || "no providers in the environment"}`,
    );
    onChange();
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
        <Badge tone={tone}>{overview.activeSource.toUpperCase()}</Badge>
        <span className="text-[length:var(--ct-body)] text-[var(--text-muted)]">{summary}</span>

        {editable && overview.activeSource === "environment" && (
          <Button size="sm" variant="outline" className="ml-auto" disabled={pending} onClick={importEnvironment}>
            Import from environment
          </Button>
        )}
      </div>

      {!overview.canStoreKeys && (
        <div className="border-t border-[var(--console-hair)] px-3 py-2 text-[length:var(--ct-small)] text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">AI_KEY_ENCRYPTION_KEY is not set</strong>, so keys
          cannot be stored. Generate one with <code>openssl rand -base64 32</code>, set it on this
          environment and restart. Without it a key would have to sit in the database in plaintext,
          where every backup and read-only grant would carry it.
        </div>
      )}

      {overview.warnings.length > 0 && (
        <ul className="border-t border-[var(--console-hair)] px-3 py-2 text-[length:var(--ct-small)] text-[var(--warning)]">
          {overview.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ProviderCard({
  provider,
  editable,
  canStoreKeys,
  onChange,
}: {
  provider: AiProviderView;
  editable: boolean;
  canStoreKeys: boolean;
  onChange: () => void;
}) {
  const { mutate, pending, error } = useMutation();
  const [editing, setEditing] = useState(false);
  const [test, setTest] = useState<AiTestResult | null>(null);
  const { toast } = useToast();

  async function patch(body: Record<string, unknown>) {
    const result = await mutate(`/api/admin/ai/providers/${provider.id}`, { method: "PATCH", body });
    if (result) onChange();
  }

  async function runTest() {
    const result = await mutate<AiTestResult>(`/api/admin/ai/providers/${provider.id}/test`);
    if (result) {
      setTest(result);
      onChange();
    }
  }

  const activeKeys = provider.keys.filter((key) => key.status === "ACTIVE");

  return (
    <Panel>
      <PanelHeader
        title={
          <span className="flex items-center gap-2">
            {provider.name}
            <Badge tone={provider.enabled ? "success" : "neutral"}>
              {provider.enabled ? "ENABLED" : "OFF"}
            </Badge>
            <span className="text-[length:var(--ct-label)] tracking-wider text-[var(--text-muted)]">
              PRIORITY {provider.priority}
            </span>
          </span>
        }
        description={provider.baseUrl}
        actions={
          editable ? (
            <span className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={pending} onClick={runTest}>
                Test
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing((open) => !open)}>
                {editing ? "Close" : "Edit"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => patch({ enabled: !provider.enabled })}
              >
                {provider.enabled ? "Disable" : "Enable"}
              </Button>
            </span>
          ) : null
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-3 py-2 text-[length:var(--ct-body)] sm:grid-cols-4">
        <Fact label="Chat model" value={provider.chatModel} />
        <Fact
          label="Vision model"
          value={provider.visionModel || `${provider.chatModel} (reused)`}
        />
        <Fact label="Keys" value={`${activeKeys.length} active`} />
        <Fact
          label="Last checked"
          value={
            provider.lastCheckedAt
              ? `${provider.lastCheckOk ? "OK" : "FAILED"} · ${relativeTime(provider.lastCheckedAt)}`
              : "never"
          }
        />
      </dl>

      {provider.lastCheckNote && !editing && (
        <p className="border-t border-[var(--console-hair)] px-3 py-1.5 text-[length:var(--ct-small)] text-[var(--text-muted)]">
          {provider.lastCheckNote}
        </p>
      )}

      {test && (
        <div className="border-t border-[var(--console-hair)] px-3 py-2 text-[length:var(--ct-small)]">
          <TestLine label="Chat" step={test.chat} />
          <TestLine label="Vision" step={test.vision} />
          <p className="mt-1 text-[var(--text-muted)]">
            The receipt is generated, not a member&apos;s - testing a provider never sends a real
            document anywhere.
          </p>
        </div>
      )}

      {editing && editable && (
        <ProviderForm
          provider={provider}
          onDone={() => {
            setEditing(false);
            onChange();
          }}
        />
      )}

      <KeyTable
        provider={provider}
        editable={editable}
        canStoreKeys={canStoreKeys}
        onChange={onChange}
        onNotice={toast}
      />
    </Panel>
  );
}

function TestLine({ label, step }: { label: string; step: AiTestResult["chat"] }) {
  return (
    <p className={step.ok ? "text-[var(--text)]" : "text-[var(--danger)]"}>
      <span className="inline-block w-14 text-[var(--text-muted)]">{label}</span>
      {step.ok ? `ok · ${step.ms}ms · ${step.detail ?? ""}` : step.error}
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[length:var(--ct-label)] tracking-wider text-[var(--text-muted)]">
        {label.toUpperCase()}
      </dt>
      <dd className="truncate font-mono text-[length:var(--ct-small)]">{value}</dd>
    </div>
  );
}

/**
 * The model fields are a picker backed by what the provider actually serves.
 *
 * A free-text box is how `gemini-2.0-flash` survives in a config long after
 * Google stopped serving it: nothing rejects it, and the only symptom is that
 * receipts quietly stop being read. Choosing from the provider's own list makes
 * a retired model visibly absent instead.
 */
function ProviderForm({ provider, onDone }: { provider?: AiProviderView; onDone: () => void }) {
  const { mutate, pending, error } = useMutation();
  const [form, setForm] = useState({
    slug: provider?.slug ?? "",
    name: provider?.name ?? "",
    baseUrl: provider?.baseUrl ?? "",
    chatModel: provider?.chatModel ?? "",
    visionModel: provider?.visionModel ?? "",
    priority: String(provider?.priority ?? 100),
    visionMaxTokens: provider?.visionMaxTokens ? String(provider.visionMaxTokens) : "",
    chatRequestOptions: provider?.chatRequestOptions ? JSON.stringify(provider.chatRequestOptions) : "",
    visionRequestOptions: provider?.visionRequestOptions ? JSON.stringify(provider.visionRequestOptions) : "",
  });

  const models = useResource<{ models: string[]; note: string | null }>(
    provider ? `/api/admin/ai/providers/${provider.id}/models` : null,
  );

  function set(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const parse = (raw: string): Record<string, unknown> | null => {
      if (!raw.trim()) return null;
      return JSON.parse(raw) as Record<string, unknown>;
    };

    let chatRequestOptions: Record<string, unknown> | null;
    let visionRequestOptions: Record<string, unknown> | null;
    try {
      chatRequestOptions = parse(form.chatRequestOptions);
      visionRequestOptions = parse(form.visionRequestOptions);
    } catch {
      return;
    }

    const body = {
      name: form.name,
      baseUrl: form.baseUrl,
      chatModel: form.chatModel,
      visionModel: form.visionModel,
      priority: Number(form.priority),
      visionMaxTokens: form.visionMaxTokens ? Number(form.visionMaxTokens) : null,
      chatRequestOptions,
      visionRequestOptions,
      ...(provider ? {} : { slug: form.slug, enabled: true }),
    };

    const result = provider
      ? await mutate(`/api/admin/ai/providers/${provider.id}`, { method: "PATCH", body })
      : await mutate("/api/admin/ai/providers", { body });

    if (result) onDone();
  }

  const badJson = (raw: string) => {
    if (!raw.trim()) return false;
    try {
      JSON.parse(raw);
      return false;
    } catch {
      return true;
    }
  };

  const optionsInvalid = badJson(form.chatRequestOptions) || badJson(form.visionRequestOptions);

  return (
    <form
      onSubmit={submit}
      className="grid gap-2 border-t border-[var(--console-hair)] px-3 py-2.5 sm:grid-cols-2"
    >
      {error && (
        <div className="sm:col-span-2">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      {!provider && (
        <div>
          <FieldLabel htmlFor="slug">Handle</FieldLabel>
          <TextInput
            id="slug"
            required
            value={form.slug}
            placeholder="groq"
            onChange={(event) => set("slug", event.target.value)}
          />
          <Hint>Appears in logs and the audit trail. It cannot be changed later.</Hint>
        </div>
      )}

      <div>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <TextInput
          id="name"
          required
          value={form.name}
          placeholder="Groq"
          onChange={(event) => set("name", event.target.value)}
        />
      </div>

      <div className="sm:col-span-2">
        <FieldLabel htmlFor="baseUrl">Endpoint</FieldLabel>
        <TextInput
          id="baseUrl"
          required
          value={form.baseUrl}
          placeholder="https://api.groq.com/openai/v1"
          onChange={(event) => set("baseUrl", event.target.value)}
        />
        <Hint>
          Include the version path. Must be https and on the public internet - receipt images are
          posted here.
        </Hint>
      </div>

      <ModelField
        id="chatModel"
        label="Chat model"
        value={form.chatModel}
        models={models.data?.models ?? []}
        onChange={(value) => set("chatModel", value)}
        hint="Answers support questions. Small and fast is right; this is the cheap path."
      />

      <ModelField
        id="visionModel"
        label="Vision model"
        value={form.visionModel}
        models={models.data?.models ?? []}
        onChange={(value) => set("visionModel", value)}
        allowEmpty
        hint="Reads receipts. Leave blank to reuse the chat model, which is right when it accepts images too."
      />

      <div>
        <FieldLabel htmlFor="priority">Priority</FieldLabel>
        <TextInput
          id="priority"
          inputMode="numeric"
          value={form.priority}
          onChange={(event) => set("priority", event.target.value)}
        />
        <Hint>Lower is tried first.</Hint>
      </div>

      <div>
        <FieldLabel htmlFor="visionMaxTokens">Vision token ceiling</FieldLabel>
        <TextInput
          id="visionMaxTokens"
          inputMode="numeric"
          placeholder="default"
          value={form.visionMaxTokens}
          onChange={(event) => set("visionMaxTokens", event.target.value)}
        />
        <Hint>
          A reasoning model spends tokens before its answer. Too low and it returns a truncated
          object that looks like a weak model.
        </Hint>
      </div>

      <div>
        <FieldLabel htmlFor="chatRequestOptions">Chat parameters</FieldLabel>
        <TextInput
          id="chatRequestOptions"
          value={form.chatRequestOptions}
          placeholder="{}"
          onChange={(event) => set("chatRequestOptions", event.target.value)}
          aria-invalid={badJson(form.chatRequestOptions)}
        />
        <Hint>
          {badJson(form.chatRequestOptions) ? "That is not valid JSON." : "Merged into chat requests."}
        </Hint>
      </div>

      <div>
        <FieldLabel htmlFor="visionRequestOptions">Vision parameters</FieldLabel>
        <TextInput
          id="visionRequestOptions"
          value={form.visionRequestOptions}
          placeholder={'{"reasoning_effort":"none"}'}
          onChange={(event) => set("visionRequestOptions", event.target.value)}
          aria-invalid={badJson(form.visionRequestOptions)}
        />
        <Hint>
          {badJson(form.visionRequestOptions)
            ? "That is not valid JSON."
            : "Separate from chat because the two models differ. Groq's Qwen needs reasoning_effort: none, and the same field on that provider's chat model is a 400 - which is exactly why these are two boxes."}
        </Hint>
      </div>

      {models.data?.note && (
        <p className="text-[length:var(--ct-small)] text-[var(--text-muted)] sm:col-span-2">
          {models.data.note}
        </p>
      )}

      <div className="flex justify-end gap-1.5 sm:col-span-2">
        <Button type="button" size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={pending || optionsInvalid}>
          {provider ? "Save changes" : "Add provider"}
        </Button>
      </div>
    </form>
  );
}

/** A picker when the provider's list is known, a text box when it is not. */
function ModelField({
  id,
  label,
  value,
  models,
  onChange,
  hint,
  allowEmpty,
}: {
  id: string;
  label: string;
  value: string;
  models: string[];
  onChange: (value: string) => void;
  hint: string;
  allowEmpty?: boolean;
}) {
  // A provider that is not saved yet, or one with no `/models` endpoint, still
  // has to be configurable - so the list is an aid, never a gate.
  const known = models.length > 0 && (value === "" || models.includes(value));

  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {known ? (
        <Select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
          {allowEmpty && <option value="">- reuse the chat model -</option>}
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </Select>
      ) : (
        <TextInput id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
      <Hint>
        {models.length > 0 && value && !models.includes(value)
          ? `“${value}” is not in this provider's current list - it may have been retired.`
          : hint}
      </Hint>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-0.5 text-[length:var(--ct-small)] text-[var(--text-muted)]">{children}</p>
  );
}

function KeyTable({
  provider,
  editable,
  canStoreKeys,
  onChange,
  onNotice,
}: {
  provider: AiProviderView;
  editable: boolean;
  canStoreKeys: boolean;
  onChange: () => void;
  onNotice: (message: string) => void;
}) {
  const { mutate, pending, error } = useMutation();
  const [form, setForm] = useState({ label: "", apiKey: "" });

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const result = await mutate(`/api/admin/ai/providers/${provider.id}/keys`, { body: form });
    if (result) {
      setForm({ label: "", apiKey: "" });
      onNotice("Key stored. It is encrypted and will not be shown again.");
      onChange();
    }
  }

  async function revoke(keyId: string) {
    const result = await mutate(`/api/admin/ai/providers/${provider.id}/keys/${keyId}`, {
      method: "DELETE",
    });
    if (result) onChange();
  }

  return (
    <div className="border-t border-[var(--console-hair)]">
      <TableShell columns={["LABEL", "KEY", "STATUS", "ADDED", "LAST USED", ""]} minWidth={640}>
        {provider.keys.length === 0 ? (
          <Tr>
            <Td colSpan={6} className="text-[var(--text-muted)]">
              No keys. This provider will be skipped.
            </Td>
          </Tr>
        ) : (
          provider.keys.map((key) => (
            <Tr key={key.id}>
              <Td>{key.label}</Td>
              <Td className="font-mono">{key.tail ? `…${key.tail}` : "-"}</Td>
              <Td>
                <Badge tone={key.status === "ACTIVE" ? "success" : "neutral"}>{key.status}</Badge>
              </Td>
              <Td>{dateTime(key.createdAt)}</Td>
              <Td>{key.lastUsedAt ? relativeTime(key.lastUsedAt) : "never"}</Td>
              <Td>
                {editable && key.status === "ACTIVE" && (
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => revoke(key.id)}>
                    Revoke
                  </Button>
                )}
              </Td>
            </Tr>
          ))
        )}
      </TableShell>

      {error && <ErrorNote>{error}</ErrorNote>}

      {editable && canStoreKeys && (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 px-3 py-2">
          <div className="min-w-40 flex-1">
            <FieldLabel htmlFor={`label-${provider.id}`}>Label</FieldLabel>
            <TextInput
              id={`label-${provider.id}`}
              required
              value={form.label}
              placeholder="team account"
              onChange={(event) => setForm((f) => ({ ...f, label: event.target.value }))}
            />
          </div>
          <div className="min-w-64 flex-[2]">
            <FieldLabel htmlFor={`key-${provider.id}`}>API key</FieldLabel>
            <TextInput
              id={`key-${provider.id}`}
              required
              type="password"
              autoComplete="off"
              value={form.apiKey}
              placeholder="paste the key"
              onChange={(event) => setForm((f) => ({ ...f, apiKey: event.target.value }))}
            />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            Add key
          </Button>
          <p className="w-full text-[length:var(--ct-small)] text-[var(--text-muted)]">
            Encrypted before it is stored and never returned - not here, not by the API. Add a second
            key rather than replacing one: the pool rotates between them when a provider rate-limits.
          </p>
        </form>
      )}
    </div>
  );
}
