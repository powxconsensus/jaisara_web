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
  { slug: "how-prop-firm-affiliate-commission-works", title: "How prop firm affiliate commission actually works", category: "Explainers", readingTime: "6 min", date: "28 Jul 2026", excerpt: "Every firm pays a cut on each challenge sold. Here is where that money comes from, who touches it, and why we hand most of it back.", featured: true },
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
  { type: "p", text: "Every prop firm runs an affiliate programme. When a trader buys a challenge through a partner link or coupon, the firm pays that partner a percentage of the sale — typically between 10% and 30% depending on volume." },
  { type: "h", text: "Where the money comes from" },
  { type: "p", text: "It is not a discount the firm absorbs at a loss. Acquisition cost is budgeted into the price of the challenge in the same way an ad spend would be. Paying an affiliate 15% is cheaper than paying a platform for the same conversion, which is why the rates are as generous as they are." },
  { type: "quote", text: "The commission already exists. The only question is who keeps it." },
  { type: "p", text: "Most comparison sites keep the entire cut. A smaller group pass part of it back as cashback, which is the model we run: you get a share, the person who invited you gets a share, and we keep enough to operate." },
  { type: "h", text: "Why cashback is not instant" },
  { type: "p", text: "Firms only confirm commission once their refund window closes — usually 30 days. Paying you before that would mean clawing money back every time an order is reversed, so the balance sits as pending until the firm settles." },
  { type: "h", text: "What to check before you buy" },
  { type: "p", text: "Confirm the coupon applied at checkout, use the same email you registered with, and keep the order confirmation. Those three things resolve almost every claim dispute we see." },
];
