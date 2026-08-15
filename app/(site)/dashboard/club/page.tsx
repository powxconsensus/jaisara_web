import type { Metadata } from "next";
import { ClubView } from "@/components/dashboard/club-view";
import { ClubComingSoon } from "@/components/dashboard/club-coming-soon";
import { fetchPublicSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Jaisara Club" };

/**
 * Gated on `club_enabled`, which is a presentation switch and nothing more.
 *
 * Turning it off does not stop anybody earning: the referrer's share is set by
 * the commission split, which is versioned and audited precisely because it
 * decides what people are paid. Somebody who shared a link before the switch
 * was flipped keeps accruing exactly what they were promised, and sees it when
 * it is flipped back.
 */
export default async function ClubPage() {
  const { clubEnabled, pointsPerUsd } = await fetchPublicSettings();

  // The rate is read here for the same reason the wallet reads it: club
  // earnings were formatted by a helper with 100 baked in, so the one figure
  // on this page that is money would have been wrong by a factor of ten the
  // moment somebody changed the setting.
  return clubEnabled ? <ClubView pointsPerUsd={pointsPerUsd} /> : <ClubComingSoon />;
}
