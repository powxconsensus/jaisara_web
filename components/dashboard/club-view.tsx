"use client";

import { useSyncExternalStore } from "react";
import { CopyInviteLink } from "@/components/dashboard/copy-invite-link";
import { useAuth } from "@/components/auth/auth-context";
import { RefreshButton } from "@/components/ui/refresh-button";
import { pointsToUsd, shortDate } from "@/lib/console-format";
import { useResource } from "@/lib/resource";
import { buildInviteLink, inviteRef } from "@/lib/invite";

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
  /** `id` is an opaque digest, stable per member and joinable to nothing. */
  referrals: { id: string; name: string; joinedAt: string; hasQualified: boolean }[];
}

const HOW_IT_PAYS = [
  "They buy a challenge with any Jaisara coupon.",
  "They keep their full cashback - nothing is taken from them.",
  "You receive a separate Club reward after their cashback is verified.",
];

/**
 * The page's own origin, empty while rendering on the server.
 *
 * `useSyncExternalStore` rather than an effect that calls `setState`: this is a
 * read of an external value that never changes for the life of the document, so
 * there is no state to synchronise and nothing to subscribe to. Written as an
 * effect it would set state on every mount purely to learn something the
 * browser already knew, and React's own lint rule says so.
 */
const NO_SUBSCRIPTION = () => () => {};

function useOrigin(): string {
  return useSyncExternalStore(
    NO_SUBSCRIPTION,
    () => window.location.origin,
    () => "",
  );
}

export function ClubView({ pointsPerUsd }: { pointsPerUsd: number }) {
  const { user } = useAuth();
  const origin = useOrigin();

  // Standing barely moves - a referral qualifies at most a few times a week -
  // so serving it from cache and refreshing behind the reader costs nothing in
  // accuracy and removes a shimmer from every visit. The invite link itself is
  // composed from the session below and never waits on this at all.
  const resource = useResource<ClubStanding>("/api/club");
  const club = resource.data;

  // Composed from the session, so it is on screen before `/club` answers. The
  // API still returns `inviteUrl`; it is used only as a late fallback for a
  // session that somehow arrived without a referral code.
  const inviteUrl = buildInviteLink(user, origin) || (club?.inviteUrl ?? "");

  /**
   * A dash until the real figure arrives, never a zero.
   *
   * These read as facts about how the member is doing: "REFERRED 0" says
   * nobody signed up, and "CLUB EARNINGS $0.00" says the referrals earned
   * nothing. Both were printed whenever `/club` failed or was still in flight,
   * so an outage looked like a flat result - and the invite link beside them
   * kept working, which made the zeros look all the more real.
   *
   * The link itself is composed from the session and does not wait on this
   * request at all, so it stays populated either way.
   */
  const stat = (value: string | number | null | undefined) =>
    club === null || value === null || value === undefined ? "-" : String(value);

  const stats = [
    { label: "YOUR LINK", value: inviteRef(user) || club?.referralCode || "-", tone: "" },
    { label: "REFERRED", value: stat(club?.totalReferrals), tone: "" },
    { label: "ACTIVE BUYERS", value: stat(club?.qualifiedReferrals), tone: "" },
    {
      label: "CLUB EARNINGS",
      value: club ? pointsToUsd(club.clubEarnedPoints, pointsPerUsd) : "-",
      tone: "text-club",
    },
  ];

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.24em] text-club">
            [ Jaisara Club ]
          </p>
          <h1 className="m-0 font-display text-[clamp(25px,3.3vw,34px)] font-black uppercase leading-none tracking-[-0.02em]">
            Your invite,{" "}
            <span className="font-serif font-normal normal-case italic tracking-normal text-club">
              more rewards.
            </span>
          </h1>
        </div>
        <RefreshButton
          onRefresh={() => void resource.reload()}
          refreshing={resource.refreshing}
          fetchedAt={resource.fetchedAt}
        />
      </div>

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
        <CopyInviteLink link={inviteUrl} />

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
          {!club ? (
            // Silence here read as "nobody has joined", which is a discouraging
            // thing to tell somebody incorrectly on the page whose whole job is
            // to make referring feel worthwhile.
            <p className="py-6 text-center text-[12.5px] leading-6 text-muted">
              {resource.error ? "Could not load your referrals." : "Loading…"}
            </p>
          ) : club.referrals.length === 0 ? (
            <p className="py-6 text-center text-[12.5px] leading-6 text-muted">
              Nobody yet. Share your link above and they will appear here.
            </p>
          ) : null}

          {(club?.referrals ?? []).map((person) => (
            <div
              key={person.id}
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
            {/* "You are on the top tier" was reached by `club?.next` being
                undefined, which is also what a failed or in-flight request
                looks like - so an outage congratulated the member on a tier
                they may not hold. Nothing is claimed here until the standing
                actually arrives. */}
            <p className="mb-2 font-mono text-[10px] tracking-[0.14em] text-club">
              {!club
                ? "TIER"
                : club.next
                  ? `NEXT: ${club.next.name.toUpperCase()}`
                  : `TIER ${club.tierName}`}
            </p>
            <p className="text-[12.5px] leading-[1.6] text-muted">
              {!club
                ? resource.error
                  ? "We could not load your Club standing. Your invite link above still works."
                  : "Loading your standing…"
                : club.next
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
