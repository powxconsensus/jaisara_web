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
  LoadingRows,
  PageHeader,
  Panel,
  RecordButton,
  RecordList,
  Segmented,
  TableShell,
  Td,
  Textarea,
  Tr,
  type Tone,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource } from "@/lib/console-api";
import { cn } from "@/lib/cn";
import { readingStats, relativeTime, slugify } from "@/lib/console-format";
import { ADMIN_PERMISSIONS as P, type BlogPost, type PostStatus } from "@/lib/admin-types";
import { EditorToolbar } from "./editor-toolbar";
import { ImagePickerButton, useImageUpload } from "./image-upload";

/**
 * The journal writing surface.
 *
 * Two decisions carry this screen. The writing column is capped at a reading
 * measure and set in the same type as the published article, so what an author
 * composes already looks like what a reader gets - the reason a bare textarea
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
  kind: "JOURNAL" as PostKind,
  tags: "",
  seoTitle: "",
  seoDescription: "",
};

type View = "write" | "preview" | "details" | "posts";
type PostKind = "JOURNAL" | "HELP";

/**
 * Where a piece is published to.
 *
 * The same editor writes both because they are the same object: markdown, a
 * title, a publish permission. What differs is only who reads it - a journal
 * post is a page on the marketing site, a help article is an answer inside the
 * support widget. Making that a dropdown rather than a second screen means the
 * help centre gets the toolbar, the preview and the image upload for free.
 */
const KINDS: { value: PostKind; label: string; note: string }[] = [
  { value: "JOURNAL", label: "Journal post", note: "Published to /journal" },
  { value: "HELP", label: "Help article", note: "Shown in the support widget" },
];

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
  /**
   * The form as the server last saw it.
   *
   * Compared against the live form to decide whether there is anything to
   * save. Held as state rather than a ref so the indicator re-renders with the
   * typing, and serialised rather than compared field by field so adding a
   * field to the form cannot quietly leave it out of the check.
   */
  const [saved, setSaved] = useState(() => JSON.stringify(EMPTY));
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const canPublish = can(P.postPublish);
  const stats = readingStats(form.body);
  const dirty = JSON.stringify(form) !== saved;
  // `slot=covers` files this under `journal/covers/` rather than with the
  // illustrations pasted into a body, so a post's card image is findable in the
  // bucket without reading the row that points at it.
  const cover = useImageUpload("/api/journal/images?slot=covers");

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
    const loaded = {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt ?? "",
      body: post.body,
      coverUrl: post.coverUrl ?? "",
      kind: post.kind ?? "JOURNAL",
      tags: post.tags.join(", "),
      seoTitle: post.seoTitle ?? "",
      seoDescription: post.seoDescription ?? "",
    };
    setForm(loaded);
    setSaved(JSON.stringify(loaded));
  };

  const startNew = () => {
    setSelectedId(null);
    setStatus("DRAFT");
    setForm(EMPTY);
    setSaved(JSON.stringify(EMPTY));
    setSlugTouched(false);
    setView("write");
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await mutate<BlogPost>(
      selectedId ? `/api/journal/${selectedId}` : "/api/journal",
      {
        method: selectedId ? "PATCH" : "POST",
        body: {
          title: form.title,
          slug: form.slug || undefined,
          excerpt: form.excerpt || undefined,
          body: form.body,
          coverUrl: form.coverUrl || undefined,
          kind: form.kind,
          tags: form.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
        },
      },
    );
    if (!result) return;

    setSelectedId(result.id);
    setStatus(result.status);
    // The server may have normalised the slug, so the snapshot is taken from
    // what the form becomes - not from what was sent.
    const stored = { ...form, slug: result.slug };
    setForm(stored);
    setSaved(JSON.stringify(stored));
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
    <div className="console-fill flex flex-col">
      <PageHeader
        eyebrow="GROWTH"
        title="Journal & help"
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
                { value: "posts", label: "All posts" },
              ]}
            />
          </div>
        }
      />

      {/* Two panes filling the frame, each scrolling on its own. Before this
          the post list capped at 62vh and the editor pushed the page down, so
          writing a long post scrolled the list, the toolbar and the title out
          of reach - in a tool where the list is how you switch between drafts. */}
      <div className="grid min-h-0 flex-1 gap-2 xl:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col gap-2">
          <Button className="w-full" onClick={startNew}>
            + New post
          </Button>
          <RecordList className="min-h-0 flex-1 max-xl:max-h-[38vh]">
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
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={STATUS_TONE[post.status]}>
                      {post.status.replaceAll("_", " ")}
                    </Badge>
                    {post.kind === "HELP" && <Badge tone="info">HELP</Badge>}
                  </span>
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

        {/* A document editor, not a page that happens to contain a textarea.
            Three fixed regions - a meta strip, the writing surface, and the
            actions - so the Save button is always where you left it and the
            surface takes exactly the height that is left. The previous version
            let the textarea define the panel's height and put the actions
            below it after a rule, which on an empty draft rendered as a title,
            a wall of nothing, and a button floating in the middle of it. */}
        <Panel className="flex min-h-0 min-w-0 flex-col overflow-hidden">
          <form onSubmit={save} className="flex min-h-0 flex-1 flex-col">
            {/* One bar, not two. State on the left, actions on the right -
                the previous version put the save button in its own row along
                the bottom, which cost a second border and 40px on every screen
                to separate two things that are read together: "what is this
                draft" and "what can I do with it".

                Hidden entirely while browsing the list: a Create draft button
                above a table of existing posts is an offer to do something
                else. */}
            <div
              className={cn(
                "flex flex-none flex-wrap items-center gap-x-2.5 gap-y-1.5 border-b border-[var(--console-hair)] px-3 py-1.5",
                view === "posts" && "hidden",
              )}
            >
              <Badge tone={STATUS_TONE[status]}>
                {selectedId ? status.replaceAll("_", " ") : "NEW DRAFT"}
              </Badge>

              {/* Unsaved is the one thing an editor must never be coy about.
                  Shown as a word rather than only a dot, because a dot alone
                  is a decoration until somebody has lost work to it once. */}
              {dirty && (
                <span
                  className="rounded-[5px] px-1.5 py-[3px] font-mono text-[length:var(--ct-label)] tracking-[0.11em] text-warning"
                  style={{ background: "color-mix(in oklab, var(--warning) 15%, transparent)" }}
                >
                  UNSAVED
                </span>
              )}

              <span
                data-count
                data-num
                className="font-mono text-[length:var(--ct-label)] tracking-[0.1em] text-muted"
              >
                {stats.words.toLocaleString("en-US")} WORDS
                {/* No read time on an empty draft: "1 MIN READ" over zero
                    words is a figure the page invented. */}
                {stats.words > 0 && ` · ${stats.minutes} MIN READ`}
              </span>

              {status === "PUBLISHED" && form.slug && form.kind === "JOURNAL" && (
                <Link
                  href={`/journal/${form.slug}`}
                  target="_blank"
                  className="font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-primary hover:underline"
                >
                  /{form.slug} ↗
                </Link>
              )}
              {status === "PUBLISHED" && form.kind === "HELP" && (
                <span className="font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-muted">
                  LIVE IN THE SUPPORT WIDGET
                </span>
              )}

              {error && (
                <span role="alert" className="text-[length:var(--ct-small)] text-danger">
                  {error}
                </span>
              )}

              <span className="ml-auto flex flex-wrap items-center gap-1.5">
                {!canPublish && selectedId && (
                  <span className="mr-1 text-[length:var(--ct-small)] text-muted">
                    An admin publishes your post.
                  </span>
                )}
                {canPublish && selectedId && status !== "PUBLISHED" && (
                  <Button
                    type="button"
                    size="sm"
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
                    size="sm"
                    variant="outline"
                    className="border-warning text-warning"
                    onClick={() => setDialog("unpublish")}
                  >
                    Take down
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={pending || !dirty}>
                  {pending ? "Saving…" : selectedId ? "Save changes" : "Create draft"}
                </Button>
              </span>
            </div>

            {/* The scrolling middle. Padding lives here rather than on the
                panel so the meta strip and the action bar sit flush against
                their own edges. */}
            <div
              className={cn(
                "console-scroll min-h-0 flex-1 overflow-y-auto p-3",
                view === "preview" && "flex justify-center",
              )}
            >
              <div className={view === "preview" ? "w-full max-w-[720px]" : "flex h-full flex-col"}>
              {view !== "details" && view !== "posts" && (
                <input
                  aria-label="Post title"
                  required
                  maxLength={160}
                  placeholder="Post title"
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    setForm((previous) => ({
                      ...previous,
                      title,
                      // Auto-slug only until the author edits it themselves -
                      // a published URL must never move under a typo fix.
                      slug: slugTouched ? previous.slug : slugify(title),
                    }));
                  }}
                  // A field, and visibly one. Set in the display face at a
                  // document size rather than the 32px black uppercase it was:
                  // at that weight an empty input reads as a broken heading
                  // rather than as somewhere to type.
                  className="mb-2 w-full flex-none rounded-[8px] border border-[var(--console-hair)] bg-surface-2 px-3 py-2 font-display text-[19px] font-bold leading-[1.25] tracking-[-0.015em] outline-none transition placeholder:font-sans placeholder:text-[15px] placeholder:font-normal placeholder:tracking-normal placeholder:text-muted focus:border-primary"
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
                  // Fills whatever is left rather than declaring its own
                  // height. A viewport-relative minimum plus a drag handle let
                  // the field outgrow the frame it lives in, which is what put
                  // the save button below the fold on an empty draft.
                  className="mx-auto min-h-[220px] w-full max-w-[720px] flex-1 resize-none text-[14.5px] leading-[1.75]"
                />
              )}

              {view === "posts" && <PostTable posts={posts.data ?? []} onOpen={choose} />}

              {view === "preview" && (
                <div className="flex min-h-full flex-1 flex-col rounded-[8px] border border-[var(--console-hair)] bg-surface-2 p-5">
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
                  {/* First, because it changes what every field below means -
                      a slug that is a URL versus one nobody ever types. */}
                  <div>
                    <FieldLabel htmlFor="post-kind">PUBLISH AS</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {KINDS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setForm({ ...form, kind: option.value })}
                          aria-pressed={form.kind === option.value}
                          className={cn(
                            "cursor-pointer rounded-[11px] border px-3.5 py-2.5 text-left transition",
                            form.kind === option.value
                              ? "border-primary bg-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
                              : "border-hair hover:border-primary",
                          )}
                        >
                          <span className="block text-[12.5px] font-semibold">{option.label}</span>
                          <span className="mt-0.5 block font-mono text-[9px] tracking-[0.1em] text-muted">
                            {option.note.toUpperCase()}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                        {form.kind === "HELP" ? "help/" : "/journal/"}
                        {form.slug || "…"}
                        {status === "PUBLISHED" && (
                          <span className="text-warning">
                            {" "}
                            - changing this breaks every existing link.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div>
                    <FieldLabel htmlFor="post-excerpt">
                      {form.kind === "HELP"
                        ? "EXCERPT - THE ONE-LINE ANSWER SHOWN UNDER THE TITLE"
                        : "EXCERPT - SHOWN ON THE JOURNAL INDEX"}
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

                  <div className="grid gap-3 md:grid-cols-2">
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

                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="post-seo-title">
                        SEO TITLE - DEFAULTS TO THE POST TITLE
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
              becomes publicly readable and indexable. Save any unsaved edits first - publishing
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

/**
 * Every post, with everything it carries.
 *
 * The rail beside the editor shows a title, a status and a timestamp, which is
 * enough to switch drafts and not enough to answer "what have we published",
 * "which of these has no excerpt", or "what is this one's URL". This is that
 * answer - and clicking a row opens it in the editor, so it is a way in rather
 * than a dead end.
 */
function PostTable({ posts, onOpen }: { posts: BlogPost[]; onOpen: (post: BlogPost) => void }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="Nothing written yet"
        message="Drafts and published pieces both appear here."
      />
    );
  }

  const journal = posts.filter((post) => (post.kind ?? "JOURNAL") === "JOURNAL").length;
  const help = posts.length - journal;

  return (
    <div>
      <p className="mb-2 font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted">
        {posts.length} TOTAL · {journal} JOURNAL · {help} HELP
      </p>

      <TableShell
        columns={["TITLE", "WHERE", "STATUS", "URL", "TAGS", "AUTHOR", "UPDATED", ""]}
        minWidth={980}
      >
        {posts.map((post) => {
          const kind = post.kind ?? "JOURNAL";
          return (
            <Tr key={post.id}>
              <Td>
                <span className="block max-w-[280px] truncate font-medium">{post.title}</span>
                {/* An empty excerpt is not an error, but it is what the card on
                    /journal falls back to - worth seeing at a glance. */}
                <span className="mt-0.5 block max-w-[280px] truncate text-[length:var(--ct-label)] text-muted">
                  {post.excerpt?.trim() || "No excerpt"}
                </span>
              </Td>
              <Td>
                <Badge tone={kind === "HELP" ? "info" : "neutral"}>
                  {kind === "HELP" ? "HELP" : "JOURNAL"}
                </Badge>
              </Td>
              <Td>
                <Badge tone={STATUS_TONE[post.status]}>{post.status.replaceAll("_", " ")}</Badge>
              </Td>
              <Td className="font-mono text-[length:var(--ct-label)] text-muted">
                /{post.slug}
              </Td>
              <Td className="text-[length:var(--ct-label)] text-muted">
                {post.tags.length > 0 ? post.tags.join(", ") : "-"}
              </Td>
              <Td className="whitespace-nowrap text-muted">
                {post.author.displayName ?? "Unnamed"}
              </Td>
              <Td className="whitespace-nowrap text-muted">{relativeTime(post.updatedAt)}</Td>
              <Td className="whitespace-nowrap">
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(post)}
                    className="cursor-pointer font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-primary hover:underline"
                  >
                    EDIT
                  </button>
                  {post.status === "PUBLISHED" && kind === "JOURNAL" && (
                    <Link
                      href={`/journal/${post.slug}`}
                      target="_blank"
                      className="font-mono text-[length:var(--ct-label)] tracking-[0.12em] text-muted hover:text-fg"
                    >
                      VIEW ↗
                    </Link>
                  )}
                </span>
              </Td>
            </Tr>
          );
        })}
      </TableShell>
    </div>
  );
}
