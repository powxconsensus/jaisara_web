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

      <div className="relative max-w-[24ch]">
        <p className="font-display text-[clamp(28px,3.2vw,42px)] font-black uppercase leading-none tracking-[-0.025em] [animation:jsUp_.8s_.1s_both]">
          One deal.
        </p>
        <p className="mt-2.5 font-serif text-[clamp(30px,3.4vw,46px)] italic leading-[1.05] text-primary [animation:jsUp_.8s_.2s_both]">
          Two rewards.
        </p>
        <p className="mt-4 max-w-[34ch] text-[14px] leading-[1.65] text-muted">
          Save with the coupon at checkout, then collect cashback after your purchase is verified.
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
              {/* "Example" is not decoration. Without it this card states that
                  a specific payout was approved at a named firm, on a screen
                  where nothing has been approved and no such firm is
                  necessarily a partner. */}
              Cashback approved · example
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

      <div className="relative grid grid-cols-3 gap-2">
        {["USE COUPON", "SUBMIT RECEIPT", "GET REWARDED"].map((label) => (
          <span
            key={label}
            className="rounded-[10px] border border-hair bg-[color-mix(in_oklab,var(--surface)_72%,transparent)] px-2 py-3 text-center font-mono text-[8px] tracking-[0.08em] text-muted"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
