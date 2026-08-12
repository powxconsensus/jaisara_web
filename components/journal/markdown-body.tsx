import { Fragment, type ReactNode } from "react";

/**
 * The journal's markdown renderer.
 *
 * Shared by the public post page and the console editor's preview so that what
 * an author sees while writing is the same component the reader gets - a
 * preview rendered by a second, near-identical implementation drifts, and the
 * drift only ever shows up after publishing.
 *
 * It builds React nodes rather than an HTML string. That is a deliberate
 * choice: post bodies are written by the `author` role, not by the public, but
 * an editor account should still not be one `<script>` away from every reader.
 */

export function MarkdownBody({ body, className }: { body: string; className?: string }) {
  return <div className={className}>{renderBlocks(body)}</div>;
}

function renderBlocks(body: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");

  let index = 0;
  let key = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code - consumed verbatim, never parsed for inline markup.
    if (line.trimStart().startsWith("```")) {
      const language = line.trim().slice(3).trim();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trimStart().startsWith("```")) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      nodes.push(
        <pre
          key={key++}
          className="mb-6 overflow-x-auto rounded-[13px] border border-hair bg-surface-2 p-4 font-mono text-[12.5px] leading-6"
        >
          <code data-language={language || undefined}>{body.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      nodes.push(renderHeading(heading[1].length, heading[2], key++));
      index += 1;
      continue;
    }

    if (/^\s*(?:[-*_]\s*){3,}$/.test(line)) {
      nodes.push(<hr key={key++} className="my-10 border-0 border-t border-hair" />);
      index += 1;
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) {
        quote.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-8 border-l-2 border-primary pl-5 font-serif text-[clamp(20px,2.6vw,28px)] italic leading-[1.35] text-primary"
        >
          {inline(quote.join(" "))}
        </blockquote>,
      );
      continue;
    }

    const bulleted = /^\s*[-*]\s+/;
    if (bulleted.test(line)) {
      const items: string[] = [];
      while (index < lines.length && bulleted.test(lines[index])) {
        items.push(lines[index].replace(bulleted, ""));
        index += 1;
      }
      nodes.push(
        <ul
          key={key++}
          className="mb-6 list-disc space-y-2 pl-6 text-[16.5px] leading-[1.75] text-muted"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const numbered = /^\s*\d+[.)]\s+/;
    if (numbered.test(line)) {
      const items: string[] = [];
      while (index < lines.length && numbered.test(lines[index])) {
        items.push(lines[index].replace(numbered, ""));
        index += 1;
      }
      nodes.push(
        <ol
          key={key++}
          className="mb-6 list-decimal space-y-2 pl-6 text-[16.5px] leading-[1.75] text-muted"
        >
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{inline(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // A standalone image gets its own figure rather than an inline <img>.
    const image = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(line.trim());
    if (image && isSafeUrl(image[2])) {
      nodes.push(
        // eslint-disable-next-line @next/next/no-img-element -- author-supplied remote URL, no known host to configure
        <img
          key={key++}
          src={image[2]}
          alt={image[1]}
          className="mb-6 w-full rounded-card border border-hair"
        />,
      );
      index += 1;
      continue;
    }

    // Anything else is a paragraph, running until a blank line.
    const paragraph: string[] = [];
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index])) {
      paragraph.push(lines[index]);
      index += 1;
    }
    if (paragraph.length === 0) {
      // Defensive: a block-start line that reached here would otherwise loop.
      paragraph.push(lines[index]);
      index += 1;
    }
    nodes.push(
      <p key={key++} className="mb-5 text-[16.5px] leading-[1.75] text-muted">
        {inline(paragraph.join(" "))}
      </p>,
    );
  }

  return nodes;
}

function isBlockStart(line: string): boolean {
  return (
    /^(#{1,4})\s/.test(line) ||
    line.startsWith(">") ||
    /^\s*[-*]\s+/.test(line) ||
    /^\s*\d+[.)]\s+/.test(line) ||
    line.trimStart().startsWith("```") ||
    /^\s*(?:[-*_]\s*){3,}$/.test(line)
  );
}

function renderHeading(level: number, text: string, key: number): ReactNode {
  const content = inline(text);
  if (level === 1) {
    return (
      <h2 key={key} className="mb-3 mt-10 font-display text-[26px] font-black uppercase leading-tight">
        {content}
      </h2>
    );
  }
  if (level === 2) {
    return (
      <h2 key={key} className="mb-3 mt-9 font-display text-[22px] font-bold leading-tight">
        {content}
      </h2>
    );
  }
  if (level === 3) {
    return (
      <h3 key={key} className="mb-3 mt-8 font-display text-lg font-bold">
        {content}
      </h3>
    );
  }
  return (
    <h4 key={key} className="mb-2 mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
      {content}
    </h4>
  );
}

/**
 * Inline markup: links, bold, italic and code.
 *
 * Ordered longest-delimiter-first so `**bold**` is not mistaken for two
 * italics, and code is matched before everything else so backticks can hold
 * literal asterisks.
 */
const INLINE = /(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)/;

function inline(text: string): ReactNode {
  const parts = text.split(INLINE).filter((part) => part !== undefined && part !== "");

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={index}
              className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.88em] text-fg"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          if (!isSafeUrl(link[2])) return <Fragment key={index}>{link[1]}</Fragment>;
          return (
            <a
              key={index}
              href={link[2]}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-primary underline underline-offset-2"
            >
              {link[1]}
            </a>
          );
        }

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="font-semibold text-fg">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (
          (part.startsWith("*") && part.endsWith("*")) ||
          (part.startsWith("_") && part.endsWith("_"))
        ) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}

/**
 * Only http(s) and site-relative links render as links.
 *
 * `javascript:` is the reason this exists - an author account is trusted to
 * write, not to run script in every reader's session.
 */
function isSafeUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  return /^https?:\/\//i.test(trimmed);
}
