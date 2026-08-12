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
  Select,
  Textarea,
  type Tone,
} from "@/components/console/ui";
import { ImagePickerButton, useImageUpload } from "@/components/console/journal/image-upload";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import {
  ADMIN_PERMISSIONS as P,
  type HomepageContentAdmin,
  type HomepageFeedbackRecord,
  type HomepageFeedbackStatus,
} from "@/lib/admin-types";

const EMPTY = {
  authorName: "",
  authorHandle: "",
  quote: "",
  sourceUrl: "",
  avatarUrl: "",
  imageUrl: "",
  status: "DRAFT" as HomepageFeedbackStatus,
  sortOrder: "100",
};

const STATUS_TONE: Record<HomepageFeedbackStatus, Tone> = {
  DRAFT: "neutral",
  PUBLISHED: "success",
  ARCHIVED: "warning",
};

/** Sponsors and sourced feedback shown on the marketing homepage. */
export function HomepageProofEditor() {
  const { can } = useAccess();
  const { toast } = useToast();
  const content = useResource<HomepageContentAdmin>("/api/admin/marketing/homepage");
  const { mutate, pending, error, setError } = useMutation();
  const image = useImageUpload("/api/admin/marketing/homepage/images");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY);

  const canManage = can(P.marketingManage);
  const data = content.data;

  const setSponsors = async (slug: string, selected: boolean) => {
    if (!data) return;
    const slugs = selected
      ? [...data.sponsorSlugs, slug]
      : data.sponsorSlugs.filter((value) => value !== slug);
    const saved = await mutate<string[]>("/api/admin/marketing/homepage/sponsors", {
      method: "PATCH",
      body: { slugs },
    });
    if (!saved) return;
    toast("Sponsored partners updated.", "success");
    await content.reload();
  };

  const choose = (item: HomepageFeedbackRecord) => {
    setSelectedId(item.id);
    setError(null);
    setForm({
      authorName: item.authorName,
      authorHandle: item.authorHandle ?? "",
      quote: item.quote,
      sourceUrl: item.sourceUrl,
      avatarUrl: item.avatarUrl ?? "",
      imageUrl: item.imageUrl ?? "",
      status: item.status,
      sortOrder: String(item.sortOrder),
    });
  };

  const startNew = () => {
    setSelectedId(null);
    setForm(EMPTY);
    setError(null);
  };

  const upload = async (file: File) => {
    const uploaded = await image.upload(file);
    if (uploaded) setForm((previous) => ({ ...previous, imageUrl: uploaded.url }));
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const body = {
      authorName: form.authorName,
      authorHandle: form.authorHandle.trim() || null,
      quote: form.quote,
      sourceUrl: form.sourceUrl,
      avatarUrl: form.avatarUrl.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      status: form.status,
      sortOrder: Number(form.sortOrder) || 0,
    };
    const saved = await mutate<HomepageFeedbackRecord>(
      selectedId
        ? `/api/admin/marketing/homepage/feedback/${selectedId}`
        : "/api/admin/marketing/homepage/feedback",
      { method: selectedId ? "PATCH" : "POST", body },
    );
    if (!saved) return;
    toast(selectedId ? "Feedback updated." : "Feedback added.", "success");
    setSelectedId(saved.id);
    await content.reload();
  };

  if (content.loading && !data) return <LoadingRows rows={6} />;
  if (content.error) return <ErrorNote>{content.error}</ErrorNote>;
  if (!data) return null;

  return (
    <div className="space-y-2">
      <Panel className="p-[var(--ct-pad)]">
        <PanelHeader
          eyebrow="DISCLOSED PARTNERS"
          title="Sponsored firms"
          description="Only firms selected here appear in the sponsored section. Ordinary catalogue firms are never labelled as sponsors."
        />
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {data.firms.map((firm) => {
            const selected = data.sponsorSlugs.includes(firm.slug);
            return (
              <label
                key={firm.slug}
                className="flex cursor-pointer items-center gap-3 rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-bg p-3"
              >
                <input
                  type="checkbox"
                  disabled={!canManage || pending}
                  checked={selected}
                  onChange={(event) => void setSponsors(firm.slug, event.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1 truncate text-[12px]">{firm.name}</span>
                {selected && <Badge tone="success">SPONSORED</Badge>}
              </label>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-2 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Panel className="p-2">
          {canManage && (
            <Button className="mb-2 w-full" onClick={startNew}>+ Add feedback</Button>
          )}
          {data.feedback.length === 0 ? (
            <EmptyState title="No feedback yet" message="Add a sourced post, then publish it when the wording and link have been checked." />
          ) : (
            <div className="space-y-1.5">
              {data.feedback.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => choose(item)}
                  className="w-full cursor-pointer rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-bg p-3 text-left transition hover:border-primary"
                >
                  <span className="flex items-center justify-between gap-2">
                    <Badge tone={STATUS_TONE[item.status]}>{item.status}</Badge>
                    <span className="font-mono text-[9px] text-muted">#{item.sortOrder}</span>
                  </span>
                  <strong className="mt-2 block truncate text-[12px]">{item.authorName}</strong>
                  <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted">{item.quote}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow={selectedId ? "EDIT FEEDBACK" : "NEW FEEDBACK"}
            title={selectedId ? form.authorName || "Feedback" : "Add sourced feedback"}
            description="Nothing appears publicly until its status is Published. Always link the original post."
          />
          <form onSubmit={save} className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="feedback-name">DISPLAY NAME</FieldLabel>
                <TextInput id="feedback-name" required disabled={!canManage} value={form.authorName} onChange={(event) => setForm({ ...form, authorName: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="feedback-handle">HANDLE</FieldLabel>
                <TextInput id="feedback-handle" disabled={!canManage} placeholder="@trader" value={form.authorHandle} onChange={(event) => setForm({ ...form, authorHandle: event.target.value })} />
              </div>
            </div>
            <div>
              <FieldLabel htmlFor="feedback-quote">QUOTE</FieldLabel>
              <Textarea id="feedback-quote" required rows={5} maxLength={500} disabled={!canManage} value={form.quote} onChange={(event) => setForm({ ...form, quote: event.target.value })} />
            </div>
            <div>
              <FieldLabel htmlFor="feedback-source">ORIGINAL POST URL</FieldLabel>
              <TextInput id="feedback-source" type="url" required disabled={!canManage} placeholder="https://x.com/..." value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="feedback-avatar">AVATAR URL</FieldLabel>
                <TextInput id="feedback-avatar" type="url" disabled={!canManage} value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} />
              </div>
              <div>
                <FieldLabel htmlFor="feedback-image">SCREENSHOT</FieldLabel>
                <div className="flex gap-2">
                  <TextInput id="feedback-image" type="url" disabled={!canManage} value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} />
                  <ImagePickerButton disabled={!canManage || image.uploading} label={image.uploading ? "UPLOADING…" : "UPLOAD"} onPicked={(file) => void upload(file)} />
                </div>
                {image.error && <p className="mt-2 text-[11px] text-danger">{image.error}</p>}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="feedback-status">STATUS</FieldLabel>
                <Select id="feedback-status" disabled={!canManage} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as HomepageFeedbackStatus })}>
                  <option value="DRAFT">Draft, hidden</option>
                  <option value="PUBLISHED">Published on homepage</option>
                  <option value="ARCHIVED">Archived, hidden</option>
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="feedback-order">DISPLAY ORDER</FieldLabel>
                <TextInput id="feedback-order" type="number" min="0" max="10000" disabled={!canManage} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
              </div>
            </div>
            {error && <ErrorNote>{error}</ErrorNote>}
            {canManage && <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : selectedId ? "Save feedback" : "Add feedback"}</Button>}
          </form>
        </Panel>
      </div>
    </div>
  );
}
