/** Editorial content: how-it-works steps, FAQ, live feed lines. */

export interface HowStep {
  title: string;
  body: string;
  /** The Club step is accented in gold. */
  club?: boolean;
}

export const HOW_IT_WORKS: HowStep[] = [
  { title: "Pick a deal", body: "Choose your firm and copy the Jaisara coupon code." },
  {
    title: "Buy your challenge",
    body: "Apply the code at the firm's checkout and get the discount instantly.",
  },
  { title: "Upload the receipt", body: "Drop the order email in. We read the details — no forms." },
  { title: "Get paid", body: "Cashback lands in your wallet. Withdraw any time above $20." },
  {
    title: "Invite the desk",
    body: "Share your link and keep 20% of everything your referrals earn.",
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
      "It sits as Pending until the firm’s refund window closes — normally 30 days from the order date — then moves to Available. You can withdraw any Available balance above $20.",
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
      "FundingPips and FTMO match automatically from your order email. Others need a receipt or a manual entry — the claim screen shows the status per firm.",
  },
  {
    question: "How do gift card payouts work?",
    answer:
      "Pick a brand and a denomination at withdrawal. Codes are emailed within 24 hours and carry a 5% bonus over the cash value. They cannot be refunded once issued.",
  },
  {
    question: "Does inviting someone reduce their cashback?",
    answer:
      "No. Your 20% Club share comes out of the platform’s cut. The person you invited still receives the full advertised rate.",
  },
];

/** Rotating one-liners for the LIVE ticker. Initials only, never full names. */
export const LIVE_FEED: string[] = [
  "DK just got $41.20 back from FTMO",
  "AM claimed $19.60 on FundingPips",
  "SR cashed out $50 to an Amazon gift card",
  "OF earned $12.40 in Club share this week",
  "PN withdrew $96.40 in USDT on TRC-20",
  "NB activated JSR-ALPHA for 16% back",
];
