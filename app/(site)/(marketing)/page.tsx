import { Hero } from "@/components/landing/hero";
import { fetchRecentActivity, toMarquee, toReceipts } from "@/lib/data/activity";
import { fetchEstimatorFirms, fetchFirms, fetchStats } from "@/lib/data/deals";
import { Split } from "@/components/landing/split";
import { FirmIndex } from "@/components/landing/firm-index";
import { Estimator } from "@/components/estimator/estimator";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ClubBand } from "@/components/landing/club-band";
import { Faq } from "@/components/landing/faq";
import { SponsoredFirms } from "@/components/landing/sponsored-firms";
import { FeedbackWall } from "@/components/landing/feedback-wall";
import { fetchHomepageProof } from "@/lib/data/homepage-proof";

/**
 * Server-rendered so the hero's receipt feed is in the cached HTML on first
 * paint. See `lib/data/activity.ts` for why this is revalidated on the server
 * rather than polled from every visitor's browser.
 */
export default async function LandingPage() {
  const [activity, firms, estimatorFirms, stats, proof] = await Promise.all([
    fetchRecentActivity(),
    fetchFirms(),
    fetchEstimatorFirms(),
    fetchStats(),
    fetchHomepageProof(),
  ]);

  const sponsorOrder = new Map(proof.sponsorSlugs.map((slug, index) => [slug, index]));
  const sponsoredFirms = firms
    .filter((firm) => sponsorOrder.has(firm.slug))
    .sort((a, b) => (sponsorOrder.get(a.slug) ?? 0) - (sponsorOrder.get(b.slug) ?? 0));

  return (
    <>
      <Hero receipts={toReceipts(activity)} marquee={toMarquee(activity)} stats={stats} />
      <SponsoredFirms firms={sponsoredFirms} />
      <Split />
      <FirmIndex firms={firms} />
      <Estimator firms={estimatorFirms} />
      <HowItWorks />
      <ClubBand />
      <FeedbackWall feedback={proof.feedback} />
      <Faq />
    </>
  );
}
