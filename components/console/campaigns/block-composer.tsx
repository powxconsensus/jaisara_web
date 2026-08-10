"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, ErrorNote } from "@/components/console/ui";
import { useImageUpload } from "@/components/console/journal/image-upload";
import { cn } from "@/lib/cn";
import {
  BLOCK_LABELS,
  MERGE_TAGS,
  compileHtml,
  isSafeUrl,
  newBlock,
  withSampleValues,
  type BlockKind,
  type EmailBlock,
  type EmailDesign,
} from "@/lib/email-blocks";

/**
 * Building the email.
 *
 * A list of blocks rather than an HTML textarea. The old studio asked an admin
 * to write inline-styled table HTML — the only kind mail clients render
 * reliably — and then to keep a plain-text copy in sync by hand. In practice
 * that means campaigns do not get written.
 *
 * Each block edits in place and the HTML is compiled on save, so nobody has to
 * know that Outlook ignores `border-radius` or that `<style>` blocks are
 * stripped.
 */

const ADDABLE: BlockKind[] = ["heading", "text", "image", "button", "divider", "spacer"];

export function BlockComposer({
  design,
  disabled,
  onChange,
}: {
  design: EmailDesign;
  disabled?: boolean;
  onChange: (next: EmailDesign) => void;
}) {
  const [preview, setPreview] = useState(false);

  const setBlocks = (blocks: EmailBlock[]) => onChange({ ...design, blocks });

  const update = (id: string, patch: Partial<EmailBlock>) =>
    setBlocks(design.blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)));

  const remove = (id: string) => setBlocks(design.blocks.filter((block) => block.id !== id));

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= design.blocks.length) return;
    const next = [...design.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    setBlocks(next);
  };

  const add = (kind: BlockKind) => setBlocks([...design.blocks, newBlock(kind)]);

  if (preview) {
    return (
      <div>
        <ComposerBar preview onTogglePreview={() => setPreview(false)} />
        {/* The same compiler that produces what is sent, with sample values
            filled in — so this is the message, not an approximation of it. */}
        <div className="rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-white p-5">
          <div
            className="mx-auto max-w-[560px]"
            dangerouslySetInnerHTML={{ __html: withSampleValues(compileHtml(design)) }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <ComposerBar onTogglePreview={() => setPreview(true)} />

      <div className="space-y-1.5">
        {design.blocks.map((block, index) => (
          <BlockRow
            key={block.id}
            block={block}
            disabled={disabled}
            first={index === 0}
            last={index === design.blocks.length - 1}
            onChange={(patch) => update(block.id, patch)}
            onRemove={() => remove(block.id)}
            onMove={(by) => move(index, by)}
          />
        ))}

        {design.blocks.length === 0 && (
          <p className="rounded-[var(--ct-radius)] border border-dashed border-[var(--console-hair)] px-3 py-8 text-center text-[length:var(--ct-small)] text-muted">
            Empty. Add a heading to start.
          </p>
        )}
      </div>

      {!disabled && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-[var(--ct-radius)] border border-dashed border-[var(--console-hair)] p-2">
          <span className="mr-1 font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted">
            ADD
          </span>
          {ADDABLE.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => add(kind)}
              className="cursor-pointer rounded-[7px] border border-[var(--console-hair)] px-2 py-1 text-[length:var(--ct-small)] transition hover:border-primary hover:text-primary"
            >
              {BLOCK_LABELS[kind]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ComposerBar({
  preview,
  onTogglePreview,
}: {
  preview?: boolean;
  onTogglePreview: () => void;
}) {
  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-mono text-[length:var(--ct-label)] tracking-[0.16em] text-muted">
          MERGE TAGS
        </span>
        {MERGE_TAGS.map(({ tag, label }) => (
          <button
            key={tag}
            type="button"
            title={`${label} — click to copy, then paste into any text above`}
            onClick={() => void navigator.clipboard?.writeText(tag)}
            className="cursor-pointer rounded-[6px] bg-surface-2 px-1.5 py-1 font-mono text-[10px] text-primary transition hover:brightness-110"
          >
            {tag}
          </button>
        ))}
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onTogglePreview}>
        {preview ? "Back to editing" : "Preview"}
      </Button>
    </div>
  );
}

function BlockRow({
  block,
  disabled,
  first,
  last,
  onChange,
  onRemove,
  onMove,
}: {
  block: EmailBlock;
  disabled?: boolean;
  first: boolean;
  last: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
}) {
  return (
    <div className="group rounded-[var(--ct-radius)] border border-[var(--console-hair)] bg-surface p-2">
      <div className="mb-1.5 flex items-center gap-2">
        <Badge tone="neutral">{BLOCK_LABELS[block.kind]}</Badge>
        <span className="flex-1" />
        {!disabled && (
          <span className="flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
            <IconButton label="Move up" disabled={first} onClick={() => onMove(-1)}>
              ↑
            </IconButton>
            <IconButton label="Move down" disabled={last} onClick={() => onMove(1)}>
              ↓
            </IconButton>
            <IconButton label="Remove" danger onClick={onRemove}>
              ✕
            </IconButton>
          </span>
        )}
      </div>

      <BlockFields block={block} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function BlockFields({
  block,
  disabled,
  onChange,
}: {
  block: EmailBlock;
  disabled?: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
}) {
  if (block.kind === "divider" || block.kind === "spacer") {
    return (
      <p className="text-[length:var(--ct-small)] text-muted">
        {block.kind === "divider" ? "A hairline rule." : "Twenty pixels of breathing room."}
      </p>
    );
  }

  if (block.kind === "image") {
    return <ImageBlockFields block={block} disabled={disabled} onChange={onChange} />;
  }

  return (
    <div className="grid gap-1.5">
      <textarea
        aria-label={BLOCK_LABELS[block.kind]}
        disabled={disabled}
        // A heading and a button label are one line each; only a paragraph
        // needs room to breathe.
        rows={block.kind === "text" ? 3 : 1}
        value={block.text ?? ""}
        onChange={(event) => onChange({ text: event.target.value })}
        className={cn(
          "w-full rounded-[7px] border border-[var(--console-hair)] bg-surface-2 outline-none focus:border-primary",
          block.kind === "text" ? "resize-y" : "resize-none",
          block.kind === "heading" && "font-semibold",
        )}
      />
      {block.kind === "button" && (
        <UrlField
          value={block.url ?? ""}
          disabled={disabled}
          placeholder="https://jaisara.com/deals"
          onChange={(url) => onChange({ url })}
        />
      )}
    </div>
  );
}

/**
 * An image block.
 *
 * Three ways in, because the one that suits the moment is never the same:
 * choose a file, paste from the clipboard (a cropped screenshot never touches
 * disk), or paste a URL that is already hosted somewhere.
 */
function ImageBlockFields({
  block,
  disabled,
  onChange,
}: {
  block: EmailBlock;
  disabled?: boolean;
  onChange: (patch: Partial<EmailBlock>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { upload, uploading, error, setError } = useImageUpload(
    "/api/admin/marketing/images",
  );

  const send = async (file: File) => {
    const uploaded = await upload(file);
    if (uploaded) onChange({ url: uploaded.url });
  };

  return (
    <div className="grid gap-1.5">
      <div
        // Paste lands here rather than on the document: a global handler would
        // hijack pasting text into whichever field had focus.
        onPaste={(event) => {
          if (disabled) return;
          const file = Array.from(event.clipboardData.files)[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            void send(file);
          }
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          if (disabled) return;
          const file = event.dataTransfer.files?.[0];
          if (file?.type.startsWith("image/")) {
            event.preventDefault();
            void send(file);
          }
        }}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Add an image — click, paste or drop"
        onClick={() => !disabled && input.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") input.current?.click();
        }}
        className="cursor-pointer rounded-[8px] border border-dashed border-[var(--console-hair)] px-3 py-4 text-center transition hover:border-primary focus:border-primary focus:outline-none"
      >
        {uploading ? (
          <span className="font-mono text-[length:var(--ct-label)] tracking-[0.14em] text-muted">
            UPLOADING…
          </span>
        ) : isSafeUrl(block.url ?? "") ? (
          /* The API serves these; next/image would need a remote pattern per
             environment to optimise a 130px thumbnail. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={block.url}
            alt={block.alt ?? ""}
            className="mx-auto max-h-[130px] w-auto rounded-[6px]"
          />
        ) : (
          <span className="text-[length:var(--ct-small)] text-muted">
            Click to choose, paste a screenshot, or drop a file here
          </span>
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void send(file);
        }}
      />

      <UrlField
        value={block.url ?? ""}
        disabled={disabled}
        placeholder="…or paste an image URL"
        onChange={(url) => {
          setError(null);
          onChange({ url });
        }}
      />

      <input
        aria-label="Alt text"
        disabled={disabled}
        value={block.alt ?? ""}
        placeholder="Describe the image — shown when images are blocked"
        onChange={(event) => onChange({ alt: event.target.value })}
        className="w-full rounded-[7px] border border-[var(--console-hair)] bg-surface-2 outline-none focus:border-primary"
      />

      {error && <ErrorNote>{error}</ErrorNote>}
    </div>
  );
}

/** A URL field that says so when the value would be dropped at compile time. */
function UrlField({
  value,
  disabled,
  placeholder,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const bad = value.trim().length > 0 && !isSafeUrl(value);

  return (
    <div>
      <input
        aria-label={placeholder}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          "w-full rounded-[7px] border bg-surface-2 outline-none focus:border-primary",
          bad ? "border-danger" : "border-[var(--console-hair)]",
        )}
      />
      {bad && (
        <p className="mt-1 text-[length:var(--ct-label)] text-danger">
          Must start with http:// or https:// — anything else is dropped from the email.
        </p>
      )}
    </div>
  );
}

function IconButton({
  children,
  label,
  disabled,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-[22px] cursor-pointer place-items-center rounded-[6px] border border-[var(--console-hair)] text-[11px] leading-none transition disabled:opacity-30",
        danger ? "text-muted hover:border-danger hover:text-danger" : "text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}
