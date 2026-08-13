/** Editorial content: how-it-works steps, FAQ, live feed lines. */

/**
 * Which medallion a step wears. A key rather than a component, so this module
 * stays plain data - `how-it-works.tsx` owns the drawing and is the only place
 * that has to change if the icon set does.
 */
export type HowStepIcon = "tag" | "card" | "receipt" | "wallet" | "share";

export interface HowStep {
  title: string;
  body: string;
  icon: HowStepIcon;
  /** The Club step is accented in gold. */
  club?: boolean;
}

export const HOW_IT_WORKS: HowStep[] = [
  { title: "Pick a deal", body: "Choose your firm and copy the Jaisara coupon code.", icon: "tag" },
  {
    title: "Buy your challenge",
    body: "Apply the code at the firm's checkout and get the discount instantly.",
    icon: "card",
  },
  {
    title: "Upload the receipt",
    body: "Drop the order email in. We read the details - no forms.",
    icon: "receipt",
  },
  {
    title: "Get paid",
    body: "Cashback lands in your wallet. Withdraw after reaching the current minimum shown there.",
    icon: "wallet",
  },
  {
    title: "Invite the desk",
    body: "Share your link and keep 20% of everything your referrals earn.",
    icon: "share",
    club: true,
  },
];

export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQS: FaqEntry[] = [
  {
    question: "When does my cashback become withdrawable?",
    answer:
      "It sits as Pending until the firm’s applicable refund window closes, then moves to Available. Your wallet shows the current withdrawal minimum.",
  },
  {
    question: "What if the coupon did not apply at checkout?",
    answer:
      "Then the purchase cannot be tracked and cashback is not payable. Copy the code from the deal page (or the JAISARA pill in the header) and make sure the discount shows before you pay.",
  },
  {
    question: "The parser read my receipt wrong. Now what?",
    answer:
      "Every parsed field is editable before you submit, and there is a fully manual option on the claim screen. Manual claims are reviewed by a person within 48 hours.",
  },
  {
    question: "Which firms support auto-claim?",
    answer:
      "FundingPips and FTMO match automatically from your order email. Others need a receipt or a manual entry - the claim screen shows the status per firm.",
  },
  {
    question: "How do gift card payouts work?",
    answer:
      "Pick an available brand and denomination at withdrawal. Delivery timing is shown with the reward, and codes cannot be refunded once issued.",
  },
  {
    question: "Does inviting someone reduce their cashback?",
    answer:
      "No. The person you invite receives the full advertised cashback. Your Club reward is calculated separately and never deducted from theirs.",
  },
];
