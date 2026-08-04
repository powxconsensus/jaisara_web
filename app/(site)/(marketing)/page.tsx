import { Hero } from "@/components/landing/hero";
import { Split } from "@/components/landing/split";
import { FirmIndex } from "@/components/landing/firm-index";
import { Estimator } from "@/components/estimator/estimator";
import { HowItWorks } from "@/components/landing/how-it-works";
import { ClubBand } from "@/components/landing/club-band";
import { Faq } from "@/components/landing/faq";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <Split />
      <FirmIndex />
      <Estimator />
      <HowItWorks />
      <ClubBand />
      <Faq />
    </>
  );
}
