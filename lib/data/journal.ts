export interface JournalPost {
  slug: string;
  title: string;
  category: string;
  readingTime: string;
  date: string;
  excerpt: string;
  featured?: boolean;
}

export const POSTS: JournalPost[] = [
  { slug: "how-prop-firm-cashback-verification-works", title: "How prop firm cashback verification works", category: "Explainers", readingTime: "6 min", date: "28 Jul 2026", excerpt: "From coupon to receipt, verification, pending balance and payout: every stage of a Jaisara reward explained.", featured: true },
  { slug: "nine-mistakes-that-void-your-cashback", title: "Nine mistakes that void your cashback", category: "Guides", readingTime: "4 min", date: "21 Jul 2026", excerpt: "Missing coupon, wrong email, a refund three weeks later. The short list of things that stop a claim from clearing." },
  { slug: "two-step-vs-instant-funding-2026", title: "Two-step vs instant funding in 2026", category: "Analysis", readingTime: "8 min", date: "14 Jul 2026", excerpt: "Cheaper up front is not cheaper overall. We ran the numbers across 42 firms and the gap is wider than most traders assume." },
  { slug: "what-we-changed-after-4000-claims", title: "What we changed after reading 4,000 claims", category: "Product", readingTime: "5 min", date: "06 Jul 2026", excerpt: "Manual entry, auto-claim, and a parser that stopped guessing. A short post-mortem on the claim flow." },
  { slug: "gift-card-payouts-are-live", title: "Gift card payouts are live", category: "Product", readingTime: "2 min", date: "29 Jun 2026", excerpt: "Amazon, Apple, Google Play and three more, with a 5% bonus over the cash value." },
  { slug: "reading-a-firm-before-you-pay-them", title: "Reading a firm before you pay them", category: "Guides", readingTime: "9 min", date: "18 Jun 2026", excerpt: "Payout proof, drawdown maths, and the three clauses worth reading twice before you buy a challenge." },
];

export function getPost(slug: string): JournalPost | undefined {
  return POSTS.find((post) => post.slug === slug);
}

/** Article body blocks. One sample article stands in for real CMS content. */
export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "quote"; text: string };

export const ARTICLE: ArticleBlock[] = [
  { type: "p", text: "A Jaisara reward starts when you use an eligible coupon at the firm’s checkout. The coupon identifies the deal and gives you the advertised checkout discount." },
  { type: "h", text: "How the purchase is verified" },
  { type: "p", text: "Submit the receipt or use an available sync option. We match the order number and purchase details against the firm’s records before approving cashback." },
  { type: "quote", text: "Keep the coupon, order email and order number together until the reward clears." },
  { type: "p", text: "Once verified, the displayed reward appears as pending in your wallet. The claim timeline shows each state so you can see whether anything needs attention." },
  { type: "h", text: "Why cashback is not instant" },
  { type: "p", text: "Eligible cashback remains pending for the hold period shown for the deal. This allows refunds, reversals and duplicate claims to be resolved before the balance becomes withdrawable." },
  { type: "h", text: "What to check before you buy" },
  { type: "p", text: "Confirm the coupon applied at checkout, use the same email you registered with, and keep the order confirmation. Those three things resolve almost every claim dispute we see." },
];
