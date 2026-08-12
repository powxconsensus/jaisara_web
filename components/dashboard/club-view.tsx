"use client";

import { useEffect, useState } from "react";
import { CopyInviteLink } from "@/components/dashboard/copy-invite-link";
import { pointsToUsd, shortDate } from "@/lib/console-format";
import { apiFetch } from "@/lib/api-fetch";

/**
 * Jaisara Club (handoff §4.7) - a `--club`-tinted surface.
 *
 * Standing, referrals and earnings are the member's own. Referred people are
 * shown by first name only, which is how the API returns them: who signed up
 * through whom is not something a referrer needs the full identity for.
 */

interface ClubStanding {
  referralCode: string;
  inviteUrl: string;
  tierKey: string;
  tierName: string;
  clubScore: number;
  qualifiedReferrals: number;
  totalReferrals: number;
  clubEarnedPoints: string;
  next: { tierKey: string; name: string; referralsNeeded: number } | null;
  referrals: { name: string; joinedAt: string; hasQualified: boolean }[];
}

const HOW_IT_PAYS = [
  "They buy a challenge with any Jaisara coupon.",
  "They keep their full cashback - nothing is taken from them.",
  "You receive a separate Club reward after their cashback is verified.",
];

export function ClubView() {
  const [club, setClub] = useState<ClubStanding | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void apiFetch("/api/club", { cache: "no-store", signal: controller.signal })
      .then(async (response) => (response.ok ? ((await response.json()) as ClubStanding) : null))
      .then((data) => {
        if (!controller.signal.aborted) setClub(data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const stats = [
    { label: "CODE", value: club?.referralCode ?? "-", tone: "" },
    { label: "REFERRED", value: String(club?.totalReferrals ?? 0), tone: "" },
    { label: "ACTIVE BUYERS", value: String(club?.qualifiedReferrals ?? 0), tone: "" },
    {
      label: "CLUB EARNINGS",
      value: pointsToUsd(club?.clubEarnedPoints ?? "0"),
      tone: "text-club",
    },
  ];

  return (
    <div>
      <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-club">
        [ Jaisara Club ]
      </p>
      <h1 className="mb-7 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
        Your invite,{" "}
        <span className="font-serif font-normal normal-case italic tracking-normal text-club">
          more rewards.
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
        <CopyInviteLink link={club?.inviteUrl ?? ""} />

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
          {(club?.referrals ?? []).map((person) => (
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
                {person.hasQualified
                  ? `Joined ${shortDate(person.joinedAt)} · active`
                  : `Joined ${shortDate(person.joinedAt)} · no purchase yet`}
              </p>
              <span
                data-count
                className="col-start-3 row-start-1 justify-self-end font-mono text-[13.5px]"
                style={{ color: person.hasQualified ? "var(--club)" : "var(--text-muted)" }}
              >
                {person.hasQualified ? "ACTIVE" : "-"}
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
              {club?.next ? `NEXT: ${club.next.name.toUpperCase()}` : `TIER ${club?.tierName ?? "-"}`}
            </p>
            <p className="text-[12.5px] leading-[1.6] text-muted">
              {club?.next
                ? `${club.next.referralsNeeded} more qualified ${
                    club.next.referralsNeeded === 1 ? "referral" : "referrals"
                  } to reach ${club.next.name}.`
                : "You are on the top tier."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
