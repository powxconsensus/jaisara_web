"use client";

import { useState } from "react";
import { CLUB_TIERS, type EstimatorFirm } from "@/lib/data/estimator";
import { FIRM_COUNT } from "@/lib/data/firms";
import { useMediaQuery } from "@/lib/use-media-query";
import { Accent, SectionHeading } from "@/components/ui/section-heading";
import { FirmCombobox } from "./firm-combobox";
import { ResultLedger } from "./result-ledger";
import { LockedOptions, OptionChip, StepShell } from "./step-shell";

/** The four dependent steps, in order. */
type Step = 1 | 2 | 3 | 4;

/**
 * [03] RUN YOUR NUMBERS — the cashback estimator (handoff §5).
 *
 * Four dependent steps: firm → challenge type → account size → optional Club
 * tier. Each unlocks the next; choosing a firm resets the answers below it,
 * because prices depend on the firm.
 *
 * At ≥1024px it is two columns with a sticky result, so the figure never
 * leaves the screen while choosing. Below that it becomes a wizard — one step
 * at a time, config and result never stacked. Going back via an EDIT chip
 * preserves every other answer.
 */
export function Estimator() {
  const [firm, setFirm] = useState<EstimatorFirm | null>(null);
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const [sizeIndex, setSizeIndex] = useState<number | null>(null);
  const [tierIndex, setTierIndex] = useState(0);
  const [step, setStep] = useState<Step>(1);
  const [done, setDone] = useState(false);

  const isWide = useMediaQuery("(min-width: 1024px)");

  const planChosen = firm !== null && planIndex !== null;
  const sizeChosen = planChosen && sizeIndex !== null;

  // Choosing a firm invalidates the answers that depend on it.
  const chooseFirm = (next: EstimatorFirm) => {
    setFirm(next);
    setPlanIndex(null);
    setSizeIndex(null);
    setStep(2);
  };

  const choosePlan = (index: number) => {
    setPlanIndex(index);
    setSizeIndex(null);
    setStep(3);
  };

  const chooseSize = (index: number) => {
    setSizeIndex(index);
    setStep(4);
  };

  /** Jump back to a step, keeping every other answer (handoff §5). */
  const editStep = (target: Step) => {
    setDone(false);
    setStep(target);
  };

  const editChips = [
    { step: 1 as Step, key: "FIRM", value: firm?.name },
    { step: 2 as Step, key: "TYPE", value: planChosen ? firm.plans[planIndex] : null },
    { step: 3 as Step, key: "SIZE", value: sizeChosen ? firm.sizes[sizeIndex].label : null },
  ].filter((chip) => chip.value);

  // In wizard mode only the active step renders; on wide screens all of them do.
  const showStep = (n: Step) => isWide || (!done && step === n);
  const showConfig = isWide || !done;
  const showResult = isWide || done;

  const config = (
    <div className="relative rounded-card border border-hair bg-surface p-[clamp(18px,3vw,30px)]">
      {/* Faint grid, fading out from the top-left. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklab, var(--text) 3%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklab, var(--text) 3%, transparent) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(90% 70% at 8% 0%, #000, transparent 76%)",
          WebkitMaskImage: "radial-gradient(90% 70% at 8% 0%, #000, transparent 76%)",
        }}
      />

      <div className="relative">
        {showStep(1) && (
          <StepShell index="01" title="Prop firm" chosen={firm?.name}>
            <div className="mb-3.5 flex items-center justify-between gap-3">
              <span className="font-mono text-[9px] tracking-[0.1em] text-muted">
                {FIRM_COUNT} LISTED — TYPE TO SEARCH
              </span>
            </div>
            <FirmCombobox value={firm} onChange={chooseFirm} />
          </StepShell>
        )}

        {showStep(2) && (
          <StepShell
            index="02"
            title="Challenge type"
            chosen={planChosen ? firm.plans[planIndex] : null}
            lockedHint={firm ? undefined : "CHOOSE A FIRM FIRST"}
            onReopen={planChosen ? () => editStep(2) : undefined}
          >
            {firm ? (
              <div className="mb-4 flex flex-wrap gap-[7px] [animation:jsUp_.3s_both] md:mb-6">
                {firm.plans.map((plan, index) => (
                  <OptionChip
                    key={plan}
                    selected={planIndex === index}
                    onClick={() => choosePlan(index)}
                    className="min-w-[120px] flex-1 truncate"
                  >
                    {plan}
                  </OptionChip>
                ))}
              </div>
            ) : (
              <LockedOptions count={2} />
            )}
          </StepShell>
        )}

        {showStep(3) && (
          <StepShell
            index="03"
            title="Account size"
            chosen={sizeChosen ? firm.sizes[sizeIndex].label : null}
            lockedHint={planChosen ? undefined : "PICK THE CHALLENGE FIRST"}
            onReopen={sizeChosen ? () => editStep(3) : undefined}
          >
            {planChosen ? (
              <div className="mb-4 flex flex-wrap gap-[7px] [animation:jsUp_.3s_both] md:mb-6">
                {firm.sizes.map((size, index) => (
                  <OptionChip
                    key={size.label}
                    selected={sizeIndex === index}
                    onClick={() => chooseSize(index)}
                    className="font-mono"
                  >
                    {size.label}
                  </OptionChip>
                ))}
              </div>
            ) : (
              <LockedOptions count={3} width="w-[76px]" />
            )}
          </StepShell>
        )}

        {showStep(4) && (
          <StepShell
            index="04"
            title="Club tier"
            lockedHint={sizeChosen ? undefined : "UNLOCKS AFTER SIZE"}
          >
            {sizeChosen ? (
              <>
                <div className="flex gap-[7px] [animation:jsUp_.3s_both]">
                  {CLUB_TIERS.map((tier, index) => (
                    <OptionChip
                      key={tier.label}
                      selected={tierIndex === index}
                      onClick={() => setTierIndex(index)}
                      className="flex-1 px-1.5 text-center"
                    >
                      {tier.label}
                    </OptionChip>
                  ))}
                </div>
                {/* Wizard only: collapse the config and expand the result. */}
                {!isWide && (
                  <button
                    type="button"
                    onClick={() => setDone(true)}
                    className="mt-4 w-full cursor-pointer rounded-[11px] bg-primary p-[15px] text-center font-mono text-[11.5px] font-semibold uppercase tracking-[0.16em] text-on-primary"
                  >
                    See my estimate ↓
                  </button>
                )}
              </>
            ) : (
              <LockedOptions count={3} />
            )}
          </StepShell>
        )}
      </div>
    </div>
  );

  return (
    <section
      id="estimator"
      /* Clears the floating navbar when deep-linked. */
      className="mx-auto max-w-[var(--maxw)] scroll-mt-[118px] px-[var(--pad)] pb-[var(--secpb)] pt-[var(--secpt)]"
    >
      <div className="mb-[var(--secpb)] flex flex-wrap items-end justify-between gap-[18px]">
        <SectionHeading index="03" eyebrow="Run your numbers">
          How much
          <br />
          would <Accent>you</Accent> get back?
        </SectionHeading>
        <p className="m-0 max-w-[36ch] text-sm leading-[1.65] text-muted">
          Pick a firm and an account size. Indicative — the final figure is confirmed once the
          purchase is verified.
        </p>
      </div>

      <div className="grid items-stretch gap-3.5 wide:grid-cols-[1.25fr_.95fr]">
        {showConfig && config}

        {showResult && (
          <>
            {/* Wizard recap: tap a chip to change that answer, keeping the rest. */}
            {done && editChips.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-[7px] wide:hidden">
                {editChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => editStep(chip.step)}
                    className="flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[9px] border px-3 py-2"
                    style={{
                      borderColor: "color-mix(in oklab, var(--primary) 40%, transparent)",
                      background: "color-mix(in oklab, var(--primary) 8%, transparent)",
                    }}
                  >
                    <span className="font-mono text-[8.5px] tracking-[0.14em] text-muted">
                      {chip.key}
                    </span>
                    <span className="text-[12.5px] font-semibold">{chip.value}</span>
                    <span className="text-[10px] text-primary">EDIT</span>
                  </button>
                ))}
              </div>
            )}

            <ResultLedger
              firm={firm}
              sizeIndex={sizeIndex}
              tierIndex={tierIndex}
              onEdit={done && !isWide ? () => editStep(1) : undefined}
            />
          </>
        )}
      </div>
    </section>
  );
}
