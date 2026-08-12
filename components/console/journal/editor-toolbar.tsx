"use client";

import { useEffect, useRef, type RefObject } from "react";
import { ImagePickerButton, useImageUpload } from "./image-upload";

/**
 * Formatting controls for the markdown surface.
 *
 * Each button wraps or prefixes the current selection and puts the caret back
 * where the writer expects it - after the inserted markup with nothing
 * selected, or *inside* the markup with the placeholder selected when there
 * was no selection to wrap. Getting that wrong is what makes a toolbar
 * something writers stop using after the second try.
 */

interface Command {
  label: string;
  title: string;
  /** Characters placed before and after the selection. */
  wrap?: [string, string];
  /** Prefix applied to the start of each selected line. */
  linePrefix?: string;
  placeholder: string;
  /** Rendered in the display font rather than mono. */
  display?: boolean;
}

const COMMANDS: (Command | "divider")[] = [
  { label: "H2", title: "Section heading", linePrefix: "## ", placeholder: "Section heading" },
  { label: "H3", title: "Sub-heading", linePrefix: "### ", placeholder: "Sub-heading" },
  "divider",
  { label: "B", title: "Bold", wrap: ["**", "**"], placeholder: "bold text", display: true },
  { label: "I", title: "Italic", wrap: ["*", "*"], placeholder: "italic text", display: true },
  { label: "</>", title: "Inline code", wrap: ["`", "`"], placeholder: "code" },
  "divider",
  { label: "❝", title: "Pull quote", linePrefix: "> ", placeholder: "A line worth pulling out" },
  { label: "•", title: "Bulleted list", linePrefix: "- ", placeholder: "List item" },
  { label: "1.", title: "Numbered list", linePrefix: "1. ", placeholder: "List item" },
  "divider",
  { label: "LINK", title: "Link", wrap: ["[", "](https://)"], placeholder: "link text" },
  { label: "CODE", title: "Code block", wrap: ["```\n", "\n```"], placeholder: "code block" },
  { label: "-", title: "Divider", linePrefix: "", placeholder: "\n---\n" },
];

export function EditorToolbar({
  textarea,
  value,
  onChange,
  disabled,
}: {
  textarea: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { upload, uploading, error } = useImageUpload();
  // Where the caret should end up once React has committed the new value.
  // Setting it any earlier is pointless: re-rendering a controlled textarea
  // with a longer value parks the caret at the end and overwrites whatever we
  // set. An effect on `value` is the only point guaranteed to run after that.
  const pendingSelection = useRef<[number, number] | null>(null);

  useEffect(() => {
    const target = pendingSelection.current;
    if (!target || !textarea.current) return;
    pendingSelection.current = null;
    textarea.current.focus();
    textarea.current.setSelectionRange(target[0], target[1]);
  }, [value, textarea]);

  const apply = (command: Command) => {
    const element = textarea.current;
    if (!element) return;

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = value.slice(start, end);

    let insert: string;
    let caretStart: number;
    let caretEnd: number;

    if (command.linePrefix !== undefined && command.linePrefix !== "") {
      // Line commands apply to every line the selection touches, so
      // highlighting three lines and pressing "•" makes a three-item list.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const block = value.slice(lineStart, end) || command.placeholder;
      insert = block
        .split("\n")
        .map((line) => (line.startsWith(command.linePrefix!) ? line : command.linePrefix + line))
        .join("\n");
      onChange(value.slice(0, lineStart) + insert + value.slice(end));
      caretStart = lineStart + insert.length;
      caretEnd = caretStart;
    } else if (command.wrap) {
      const [before, after] = command.wrap;
      const body = selected || command.placeholder;
      insert = before + body + after;
      onChange(value.slice(0, start) + insert + value.slice(end));
      // With nothing selected, leave the placeholder highlighted so the next
      // keystroke replaces it.
      caretStart = selected ? start + insert.length : start + before.length;
      caretEnd = selected ? caretStart : caretStart + body.length;
    } else {
      insert = command.placeholder;
      onChange(value.slice(0, start) + insert + value.slice(end));
      caretStart = start + insert.length;
      caretEnd = caretStart;
    }

    pendingSelection.current = [caretStart, caretEnd];
  };

  /**
   * Uploads a picked file and drops the markdown in at the caret, with the
   * alt text selected so the writer types over it. Writing alt text is the one
   * accessibility step an editor can actually make easy, so it starts
   * highlighted rather than left as a filename nobody edits.
   */
  const insertImage = async (file: File) => {
    const element = textarea.current;
    const uploaded = await upload(file);
    if (!uploaded || !element) return;

    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 80);
    const start = element.selectionStart;
    const end = element.selectionEnd;
    // On its own line: a standalone image renders as a figure, and inline in a
    // paragraph it would not.
    const prefix = start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
    const insert = `${prefix}![${alt}](${uploaded.url})\n`;

    onChange(value.slice(0, start) + insert + value.slice(end));
    const altStart = start + prefix.length + 2;
    pendingSelection.current = [altStart, altStart + alt.length];
  };

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 rounded-[11px] border border-hair bg-surface-2 p-1"
    >
      {COMMANDS.map((command, index) =>
        command === "divider" ? (
          <span key={`divider-${index}`} className="mx-1 h-5 w-px bg-hair" />
        ) : (
          <button
            key={command.label}
            type="button"
            disabled={disabled}
            title={command.title}
            aria-label={command.title}
            onClick={() => apply(command)}
            className={`cursor-pointer rounded-[8px] px-2.5 py-1.5 text-[11px] text-muted transition hover:bg-surface-2 hover:text-fg disabled:cursor-not-allowed disabled:opacity-40 ${
              command.display ? "font-display font-black italic" : "font-mono"
            }`}
          >
            {command.label}
          </button>
        ),
      )}

      <span className="mx-1 h-5 w-px bg-hair" />

      <ImagePickerButton
        disabled={disabled || uploading}
        label={uploading ? "…" : "IMG"}
        onPicked={(file) => void insertImage(file)}
        className="cursor-pointer rounded-[8px] px-2.5 py-1.5 font-mono text-[11px] text-muted transition hover:bg-surface hover:text-fg disabled:cursor-wait disabled:opacity-50"
      />

      {error && (
        <span role="alert" className="px-2 text-[10px] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}
