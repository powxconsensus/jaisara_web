import type { Metadata } from "next";
import { money } from "@/lib/format";
import { ACCOUNT, CLUB } from "@/lib/data/wallet";
import { CopyInviteLink } from "@/components/dashboard/copy-invite-link";

export const metadata: Metadata = { title: "Jaisara Club" };

const INVITE_LINK = `jaisara.com/r/${ACCOUNT.referralCode}`;

const HOW_IT_PAYS = [
  "They buy a challenge with any Jaisara coupon.",
  "They keep their full cashback — nothing is taken from them.",
  "You get 20% of their cashback, from our platform cut.",
];

/** Jaisara Club (handoff §4.7) — a `--club`-tinted surface. */
export default function ClubPage() {
  const stats = [
    { label: "CODE", value: ACCOUNT.referralCode, tone: "" },
    { label: "REFERRED", value: String(CLUB.referred), tone: "" },
    { label: "ACTIVE BUYERS", value: String(CLUB.active), tone: "" },
    { label: "CLUB EARNINGS", value: money(CLUB.earnings), tone: "text-club" },
  ];

  return (
    <div>
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-club">
        [ Jaisara Club ]
      </p>
      <h1 className="mb-7 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
        Your invite,{" "}
        <span className="font-serif font-normal normal-case italic tracking-normal text-club">
          your share.
        </span>
      </h1>

      <section
        className="mb-3.5 rounded-[18px] border p-[clamp(22px,3vw,30px)]"
        style={{
          borderColor: "color-mix(in oklab, var(--club) 32%, var(--hair))",
          background:
            "linear-gradient(140deg, color-mix(in oklab, var(--club) 10%, var(--surface)), var(--surface) 58%)",
        }}
      >
        <h2 className="mb-3.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">
          YOUR INVITE LINK
        </h2>
        <CopyInviteLink link={INVITE_LINK} />

        <dl
          className="mt-6 flex flex-wrap gap-[26px] border-t pt-[22px]"
          style={{ borderColor: "color-mix(in oklab, var(--club) 22%, var(--hair))" }}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="mb-[7px] font-mono text-[9px] tracking-[0.16em] text-muted">
                {stat.label}
              </dt>
              <dd
                data-count
                className={`font-mono text-[17px] tracking-[0.08em] ${stat.tone}`}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-3.5 lg:grid-cols-[1.35fr_.9fr]">
        <section className="rounded-card border border-hair bg-surface p-[clamp(20px,3vw,26px)]">
          <h2 className="mb-1.5 font-mono text-[9.5px] tracking-[0.22em] text-muted">
            PEOPLE YOU REFERRED
          </h2>
          {CLUB.referrals.map((person) => (
            <div
              key={person.name}
              className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-x-[13px] border-b border-hair-soft py-3.5"
            >
              <span
                className="row-span-2 grid size-[34px] place-items-center rounded-[10px] font-mono text-[10px] text-club"
                style={{ background: "color-mix(in oklab, var(--club) 16%, var(--surface-2))" }}
              >
                {person.name
                  .split(/[\s.]+/)
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join("")}
              </span>
              <p className="col-start-2 row-start-1 min-w-0 truncate text-sm font-medium">
                {person.name}
              </p>
              <p className="col-start-2 row-start-2 mt-0.5 min-w-0 text-[11.5px] text-muted">
                {person.active
                  ? `Joined ${person.joined} · active`
                  : `Joined ${person.joined} · no purchase yet`}
              </p>
              <span
                data-count
                className="col-start-3 row-start-1 justify-self-end font-mono text-[13.5px]"
                style={{ color: person.earned > 0 ? "var(--club)" : "var(--text-muted)" }}
              >
                {person.earned > 0 ? `+${money(person.earned)}` : "—"}
              </span>
            </div>
          ))}
        </section>

        <div className="flex flex-col gap-3.5">
          <section className="rounded-card border border-hair bg-surface p-6">
            <h2 className="mb-4 font-mono text-[9.5px] tracking-[0.22em] text-muted">
              HOW THE CLUB PAYS
            </h2>
            <ol className="flex flex-col gap-3.5">
              {HOW_IT_PAYS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="pt-0.5 font-mono text-[10px] text-club">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[13px] leading-[1.6] text-muted">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section
            className="rounded-card border border-dashed p-6 text-center"
            style={{ borderColor: "color-mix(in oklab, var(--club) 34%, var(--hair))" }}
          >
            <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-club">
              TIER {CLUB.tier + 1} AT {CLUB.nextTierAt} REFERRALS
            </p>
            <p className="text-[12.5px] leading-[1.6] text-muted">
              {CLUB.nextTierAt - CLUB.referred} more and your share goes to 25%.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
