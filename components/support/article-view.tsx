"use client";

import { useCallback, useEffect, useState } from "react";
import { MarkdownBody } from "@/components/journal/markdown-body";
import { supportApi, SupportError, type HelpArticle } from "./support-api";
import { ErrorNote, Scroller, Skeleton } from "./widget-ui";

/**
 * A guide, read inside the panel.
 *
 * Rendered with the same `MarkdownBody` the journal uses — one renderer, so an
 * article cannot look right on the public site and wrong here. The size
 * overrides live on the wrapper rather than in the renderer: this is a narrow
 * panel, not a reading column.
 *
 * It ends by offering the desk, because somebody who read a whole guide and is
 * still here did not find their answer in it.
 */
export function ArticleView({ slug, onAsk }: { slug: string; onAsk: () => void }) {
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setArticle(await supportApi.helpArticle(slug));
    } catch (caught) {
      setError(
        caught instanceof SupportError ? caught.message : "That article could not be loaded.",
      );
    }
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the setStates are inside load, behind an await
    void load();
  }, [load]);

  if (error) {
    return (
      <Scroller>
        <ErrorNote>{error}</ErrorNote>
      </Scroller>
    );
  }

  if (!article) {
    return (
      <Scroller>
        <Skeleton rows={3} />
      </Scroller>
    );
  }

  return (
    <Scroller className="px-[18px] pb-5 pt-[18px]">
      <h2 className="mb-3.5 font-display text-[17px] font-black uppercase leading-[1.15] tracking-[-0.015em]">
        {article.title}
      </h2>

      <MarkdownBody
        body={article.body}
        className={[
          "[&_p]:mb-4 [&_p]:text-[13.8px] [&_p]:leading-[1.75]",
          "[&_li]:text-[13.8px] [&_ul]:mb-4 [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:pl-5",
          "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:font-mono [&_h2]:text-[9.5px] [&_h2]:uppercase [&_h2]:tracking-[0.2em] [&_h2]:text-muted",
          "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-[13.8px]",
          "[&_blockquote]:my-4 [&_blockquote]:pl-4 [&_blockquote]:text-[15px]",
          "[&_pre]:mb-4 [&_pre]:p-3 [&_pre]:text-[11.5px]",
          "[&_hr]:my-6",
        ].join(" ")}
      />

      <div className="mt-2 rounded-[14px] bg-surface-2 p-[18px] text-center">
        <p className="mb-3.5 text-[13.2px] text-muted">Still stuck after that?</p>
        <button
          type="button"
          onClick={onAsk}
          className="inline-flex cursor-pointer items-center gap-2 rounded-[11px] bg-primary px-5 py-3 font-mono text-[10px] tracking-[0.15em] text-on-primary transition hover:brightness-[1.07]"
        >
          ASK THE DESK →
        </button>
      </div>
    </Scroller>
  );
}
