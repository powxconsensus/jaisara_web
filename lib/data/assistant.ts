/**
 * Support assistant knowledge. A deterministic keyword matcher stands in for
 * the real support backend - the shape (question in, answer out) is what the
 * UI depends on, so swapping in a real service touches only `botReply`.
 */

export const GREETING =
  "Hi - I can help with cashback, claims, payouts and the Club. What do you need?";

export const QUICK_ASKS = [
  "When does pending clear?",
  "How do payouts work?",
  "My claim was rejected",
];

const RULES: { match: RegExp; answer: string }[] = [
  {
    match: /pending|clear|how long|when/,
    answer:
      "Cashback sits as Pending until the applicable firm refund window closes. It then moves to Available and you can withdraw it.",
  },
  {
    match: /withdraw|payout|paid|money|gift|card|amazon/,
    answer:
      "Your wallet shows the current minimum and enabled payout methods. Before a USDT request, you see the selected network, fee and net amount; available gift-card denominations appear in the same withdrawal screen.",
  },
  {
    match: /coupon|code|discount|checkout/,
    answer:
      "Use the code on the deal page (or the JAISARA pill in the header) at the firm’s checkout. If the code is missing at payment, the purchase can’t be tracked.",
  },
  {
    match: /refer|club|invite|friend/,
    answer:
      "Your Club link is in the dashboard. You earn a separate reward when eligible referrals earn cashback, and they still receive their full advertised amount.",
  },
  {
    match: /claim|receipt|upload|parse|manual|auto/,
    answer:
      "Three ways to claim: auto-tracking for connected firms, uploading the order receipt, or typing the details in manually. Manual claims are reviewed by a human within 48 hours.",
  },
  {
    match: /reject|denied|problem|wrong|missing/,
    answer:
      "Sorry about that. I can pass this to the review team with your last claim attached - want me to?",
  },
];

const FALLBACK =
  "I’m not sure I got that one right. I can hand you to a human on the support desk if that’s easier.";

export function botReply(question: string): string {
  const text = question.toLowerCase();
  return RULES.find((rule) => rule.match.test(text))?.answer ?? FALLBACK;
}

export const HUMAN_GREETING =
  "Meera from support here - I can see your last three claims. What went wrong?";

export const HUMAN_ACK = "Meera here - got it, checking your account now. Give me a moment.";
