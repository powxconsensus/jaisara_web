"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import { MarkdownBody } from "@/components/journal/markdown-body";
import { ConfirmDialog } from "@/components/console/confirm-dialog";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  PageHeader,
  Panel,
  RecordButton,
  RecordList,
  Segmented,
  Textarea,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { readingStats, relativeTime, slugify } from "@/lib/console-format";
import { ADMIN_PERMISSIONS as P, type BlogPost, type PostStatus } from "@/lib/admin-types";
import { EditorToolbar } from "./editor-toolbar";
import { ImagePickerButton, useImageUpload } from "./image-upload";

/**
 * The journal writing surface.
 *
 * Two decisions carry this screen. The writing column is capped at a reading
 * measure and set in the same type as the published article, so what an author
 * composes already looks like what a reader gets — the reason a bare textarea
 * produces walls of text is that it gives no sense of the finished page. And
 * the preview reuses the *same* `MarkdownBody` the public post renders with,
 * so there is no second implementation to drift out of sync.
 */

const STATUS_TONE: Record<PostStatus, Tone> = {
  DRAFT: "neutral",
  IN_REVIEW: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  coverUrl: "",
  tags: "",
  seoTitle: "",
  seoDescription: "",
};

type View = "write" | "preview" | "details";

export function JournalStudio() {
  const { can } = useAccess();
  const { toast } = useToast();
  const posts = useResource<BlogPost[]>("/api/journal/admin/all");
  const { mutate, pending, error, setError } = useMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [form, setForm] = useState(EMPTY);
  const [view, setView] = useState<View>("write");
  const [dialog, setDialog] = useState<"publish" | "unpublish" | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const canPublish = can(P.postPublish);
  const stats = readingStats(form.body);
  const cover = useImageUpload();

  const uploadCover = async (file: File) => {
    const uploaded = await cover.upload(file);
    if (uploaded) setForm((previous) => ({ ...previous, coverUrl: uploaded.url }));
  };

  const choose = (post: BlogPost) => {
    setSelectedId(post.id);
    setStatus(post.status);
    setSlugTouched(true);
    setView("write");
    setError(null);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      body: post.body,
      coverUrl: post.coverUrl ?? "",
      tags: post.tags.join(", "),
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
    });
  };

  const startNew = () => {
    setSelectedId(null);
    setStatus("DRAFT");
    setForm(EMPTY);
    setSlugTouched(false);
    setView("write");
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await mutate<BlogPost>(
      selectedId ? `/api/journal/${selectedId}` : "/api/journal",
      {
        method: selectedId ? "PATCH" : "POST",
        body: {
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt || undefined,
          body: form.body,
          coverUrl: form.coverUrl || undefined,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
        },
      },
    );
    if (!saved) return;

    setSelectedId(saved.id);
    setStatus(saved.status);
    setForm((previous) => ({ ...previous, slug: saved.slug }));
    setSlugTouched(true);
    toast(selectedId ? "Saved." : "Draft created.", "success");
    await posts.reload();
  };

  const publishAction = async () => {
    if (!selectedId || !dialog) return;
    const result = await mutate<BlogPost>(`/api/journal/${selectedId}/${dialog}`);
    if (!result) return;

    setStatus(dialog === "publish" ? "PUBLISHED" : "ARCHIVED");
    setDialog(null);
    toast(dialog === "publish" ? "Published to the journal." : "Taken down.", "success");
    await posts.reload();
  };

  return (
    <div>
      <PageHeader
        eyebrow="GROWTH"
        title="Journal"
        description={
          canPublish
            ? "Write, preview and publish. The preview is rendered by the same component the public post uses, so what you see is what ships."
            : "Write and edit your posts. Publishing is a separate permission — an admin or owner takes it live."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Formatting sits beside the view switch, directly above the
                writing surface, rather than as a second bar inside the panel. */}
            {view === "write" && (
              <EditorToolbar
                textarea={bodyRef}
                value={form.body}
                onChange={(body) => setForm((previous) => ({ ...previous, body }))}
              />
            )}
            <Segmented
              label="Editor view"
              value={view}
              onChange={setView}
              options={[
                { value: "write", label: "Write" },
                { value: "preview", label: "Preview" },
                { value: "details", label: "Details & SEO" },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-3 xl:sticky xl:top-[86px]">
          <Button className="w-full" size="lg" onClick={startNew}>
            + New post
          </Button>
          <RecordList className="max-h-[62vh]">
            {posts.loading && !posts.data ? (
              <LoadingRows rows={4} />
            ) : (posts.data ?? []).length === 0 ? (
              <EmptyState title="Nothing written yet" message="Your drafts will appear here." />
            ) : (
              (posts.data ?? []).map((post) => (
                <RecordButton
                  key={post.id}
                  active={selectedId === post.id}
                  onClick={() => choose(post)}
                >
                  <Badge tone={STATUS_TONE[post.status]}>{post.status.replaceAll("_", " ")}</Badge>
                  <strong className="mt-2 block text-[12.5px] leading-5">{post.title}</strong>
                  <span className="mt-1 block text-[10px] text-muted">
                    {post.author.displayName ?? "Unnamed author"} ·{" "}
                    {relativeTime(post.updatedAt)}
                  </span>
                </RecordButton>
              ))
            )}
          </RecordList>
        </aside>

        <Panel className="min-w-0 p-[clamp(14px,1.6vw,22px)]">
          <form onSubmit={save}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Badge tone={STATUS_TONE[status]}>
                  {selectedId ? status.replaceAll("_", " ") : "NEW DRAFT"}
                </Badge>
                <span data-count className="font-mono text-[10px] tracking-[0.1em] text-muted">
                  {stats.words.toLocaleString("en-US")} WORDS · {stats.minutes} MIN READ
                </span>
              </div>
              {status === "PUBLISHED" && form.slug && (
                <Link
                  href={`/journal/${form.slug}`}
                  target="_blank"
                  className="font-mono text-[9.5px] tracking-[0.12em] text-primary hover:underline"
                >
                  VIEW LIVE ↗
                </Link>
              )}
            </div>

            {/* Writing gets the full panel width — you paste into it, and a
                narrow column with wide empty gutters wastes the console's
                space. Preview caps at the published measure instead, so the
                width change itself shows you what a reader gets. */}
            <div className={view === "preview" ? "mx-auto max-w-[760px]" : ""}>
              {view !== "details" && (
                <input
                  aria-label="Post title"
                  required
                  maxLength={160}
                  placeholder="Title"
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setForm((previous) => ({
                      ...previous,
                      title,
                      // Auto-slug only until the author edits it themselves —
                      // a published URL must never move under a typo fix.
                      slug: slugTouched ? previous.slug : slugify(title),
                    }));
                  }}
                  className="mb-6 w-full border-0 bg-transparent font-display text-[clamp(28px,4.4vw,46px)] font-black uppercase leading-[1.02] tracking-[-0.025em] outline-none placeholder:text-muted/40"
                />
              )}

              {view === "write" && (
                <Textarea
                  id="post-body"
                  ref={bodyRef}
                  required
                  value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })}
                  placeholder={
                    "Write here.\n\n## A section heading\n\nMarkdown works: **bold**, *italic*, `code`, [links](https://example.com) and > pull quotes."
                  }
                  className="min-h-[62vh] resize-y border-0 bg-transparent p-0 text-[16.5px] leading-[1.75] focus:border-0 focus:shadow-none"
                />
              )}

              {view === "preview" && (
                <div className="min-h-[58vh] border-t border-hair pt-8">
                  {form.body.trim() ? (
                    <MarkdownBody body={form.body} />
                  ) : (
                    <EmptyState
                      title="Nothing to preview"
                      message="Switch to Write and start the article."
                    />
                  )}
                </div>
              )}

              {view === "details" && (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
                    <div>
                      <FieldLabel htmlFor="post-title">TITLE</FieldLabel>
                      <TextInput
                        id="post-title"
                        required
                        maxLength={160}
                        value={form.title}
                        onChange={(event) => setForm({ ...form, title: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="post-slug">URL SLUG</FieldLabel>
                      <TextInput
                        id="post-slug"
                        maxLength={80}
                        value={form.slug}
                        onChange={(event) => {
                          setSlugTouched(true);
                          setForm({ ...form, slug: slugify(event.target.value) });
                        }}
                      />
                      <p className="mt-2 break-all text-[11px] text-muted">
                        /journal/{form.slug || "…"}
                        {status === "PUBLISHED" && (
                          <span className="text-warning">
                            {" "}
                            — changing this breaks every existing link.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="post-excerpt">
                      EXCERPT — SHOWN ON THE JOURNAL INDEX
                    </FieldLabel>
                    <Textarea
                      id="post-excerpt"
                      maxLength={400}
                      rows={3}
                      value={form.excerpt}
                      onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
                      className="min-h-[92px]"
                    />
                    <p className="mt-2 text-[11px] text-muted">{form.excerpt.length}/400</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="post-cover">COVER IMAGE</FieldLabel>
                      <div className="flex gap-2">
                        <TextInput
                          id="post-cover"
                          value={form.coverUrl}
                          onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
                          placeholder="Upload one, or paste a URL"
                        />
                        <ImagePickerButton
                          disabled={cover.uploading}
                          label={cover.uploading ? "…" : "UPLOAD"}
                          onPicked={(file) => void uploadCover(file)}
                        />
                      </div>
                      {cover.error && (
                        <p role="alert" className="mt-2 text-[11px] text-danger">
                          {cover.error}
                        </p>
                      )}
                    </div>
                    <div>
                      <FieldLabel htmlFor="post-tags">TAGS (COMMA SEPARATED)</FieldLabel>
                      <TextInput
                        id="post-tags"
                        value={form.tags}
                        onChange={(event) => setForm({ ...form, tags: event.target.value })}
                        placeholder="payouts, prop firms"
                      />
                    </div>
                  </div>

                  {form.coverUrl && (
                    <div
                      className="h-[180px] rounded-card border border-hair bg-cover bg-center"
                      style={{
                        backgroundImage: `url("${form.coverUrl.replaceAll('"', "%22")}")`,
                      }}
                    />
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="post-seo-title">
                        SEO TITLE — DEFAULTS TO THE POST TITLE
                      </FieldLabel>
                      <TextInput
                        id="post-seo-title"
                        maxLength={160}
                        value={form.seoTitle}
                        onChange={(event) => setForm({ ...form, seoTitle: event.target.value })}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="post-seo-description">SEO DESCRIPTION</FieldLabel>
                      <TextInput
                        id="post-seo-description"
                        maxLength={300}
                        value={form.seoDescription}
                        onChange={(event) =>
                          setForm({ ...form, seoDescription: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="mt-5">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-hair pt-5">
              <Button type="submit" size="lg" disabled={pending}>
                {pending ? "Saving…" : selectedId ? "Save changes" : "Create draft"}
              </Button>

              {canPublish && selectedId && status !== "PUBLISHED" && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="border-success text-success"
                  onClick={() => setDialog("publish")}
                >
                  Publish
                </Button>
              )}
              {canPublish && selectedId && status === "PUBLISHED" && (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="border-warning text-warning"
                  onClick={() => setDialog("unpublish")}
                >
                  Take down
                </Button>
              )}
              {!canPublish && selectedId && (
                <span className="text-[11.5px] text-muted">
                  An admin or owner publishes your post.
                </span>
              )}
            </div>
          </form>
        </Panel>
      </div>

      <ConfirmDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
          setError(null);
        }}
        title={dialog === "publish" ? "Publish this post?" : "Take this post down?"}
        intent={dialog === "publish" ? "primary" : "danger"}
        confirmLabel={dialog === "publish" ? "Publish now" : "Take it down"}
        pending={pending}
        error={error}
        onConfirm={publishAction}
        summary={
          dialog === "publish" ? (
            <>
              <strong className="text-fg">{form.title || "This post"}</strong> goes live at{" "}
              <span className="font-mono text-[11.5px] text-fg">/journal/{form.slug}</span> and
              becomes publicly readable and indexable. Save any unsaved edits first — publishing
              takes what is stored, not what is on screen.
            </>
          ) : (
            <>
              The post is archived and returns a not-found page. Anyone who has linked to it will
              hit a dead link.
            </>
          )
        }
      />
    </div>
  );
}
