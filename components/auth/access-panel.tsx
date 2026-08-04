import { FIRMS } from "@/lib/data/firms";
import { CountUp } from "@/components/ui/count-up";

const MARKS = FIRMS.slice(0, 5).map((firm) => firm.mark);

/**
 * The marketing panel beside the auth form (handoff §4.4). Hidden on phones,
 * where the form alone should fill the screen.
 */
export function AccessPanel() {
  return (
    <div className="relative hidden w-[46%] max-w-[600px] flex-col justify-center gap-[clamp(40px,7vh,76px)] overflow-hidden rounded-[20px] border border-hair p-[clamp(30px,4vw,48px)] lg:flex"
      style={{
        background:
          "linear-gradient(165deg, color-mix(in oklab, var(--primary) 10%, var(--surface)), var(--bg) 64%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[18%] -top-[14%] size-[480px] rounded-full bg-primary opacity-[0.32] blur-[120px] motion-safe:[animation:jsDrift_24s_ease-in-out_infinite]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--text) 3.5%, transparent) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(80% 70% at 40% 40%, #000, transparent 80%)",
          WebkitMaskImage: "radial-gradient(80% 70% at 40% 40%, #000, transparent 80%)",
        }}
      />

      <p className="relative font-mono text-[10px] tracking-[0.24em] text-muted">ACCESS // JAISARA</p>

      <div className="relative max-w-[22ch]">
        <p className="font-display text-[clamp(28px,3.2vw,42px)] font-black uppercase leading-none tracking-[-0.025em] [animation:jsUp_.8s_.1s_both]">
          You already bought the challenge.
        </p>
        <p className="mt-2.5 font-serif text-[clamp(30px,3.4vw,46px)] italic leading-[1.05] text-primary [animation:jsUp_.8s_.2s_both]">
          Get paid for it.
        </p>

        <div
          className="mt-8 inline-flex items-center gap-3.5 rounded-[13px] border border-hair px-[18px] py-3.5 [backdrop-filter:blur(12px)] [animation:jsUp_.8s_.32s_both] motion-safe:[animation:jsUp_.8s_.32s_both,jsFloat_9s_1.2s_ease-in-out_infinite]"
          style={{ background: "color-mix(in oklab, var(--surface) 84%, transparent)" }}
        >
          <span className="grid size-8 place-items-center rounded-[9px] bg-surface-2 font-mono text-[9px] text-muted">
            FP
          </span>
          <span>
            <span className="block whitespace-nowrap text-[12.5px] font-medium">
              Cashback approved
            </span>
            <span className="mt-0.5 block font-mono text-[9px] tracking-[0.08em] text-muted">
              FUNDINGPIPS $10K
            </span>
          </span>
          <span data-count className="font-mono text-[13px] text-success">
            +$19.60
          </span>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <span className="flex" aria-hidden="true">
          {MARKS.map((mark) => (
            <span
              key={mark}
              className="-ml-[7px] grid size-7 place-items-center rounded-lg border border-hair bg-surface-2 font-mono text-[8.5px] text-muted"
            >
              {mark}
            </span>
          ))}
        </span>
        <span className="font-mono text-[10px] tracking-[0.08em] text-muted">
          <CountUp to={1284} className="text-fg" /> EARNING THIS MONTH
        </span>
      </div>
    </div>
  );
}
