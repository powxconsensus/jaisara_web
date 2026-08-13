import { ADMIN_PERMISSIONS, type AdminPermission } from "@/lib/admin-types";

/**
 * The console's map.
 *
 * A section appears when the signed-in account holds *any* of its permissions,
 * which is why `permissions` is a list rather than a single key: an admin_view
 * account can open the claims queue to read it, and simply finds the approve
 * and reject buttons absent once inside. Hiding the whole section from them
 * would make a support account unable to answer "where is my cashback?".
 *
 * Nothing here is a security boundary. The API re-checks every permission on
 * every request; this only decides what is worth showing.
 */

export interface ConsoleSection {
  href: string;
  label: string;
  /** Shown on the overview card. */
  description: string;
  permissions: AdminPermission[];
  group: ConsoleGroup;
}

export type ConsoleGroup = "Operations" | "Money" | "Growth" | "Administration";

export const CONSOLE_GROUPS: ConsoleGroup[] = [
  "Operations",
  "Money",
  "Growth",
  "Administration",
];

const P = ADMIN_PERMISSIONS;

export const CONSOLE_SECTIONS: ConsoleSection[] = [
  {
    href: "/console/claims",
    label: "Claims",
    description:
      "Review uploaded receipts against the firm's own report, then approve to credit cashback or reject with a reason the member sees.",
    permissions: [P.claimViewAll],
    group: "Operations",
  },
  {
    href: "/console/imports",
    label: "Imports",
    description:
      "Upload a firm's commission report. Parsing is a dry run - nothing is written until the diff is committed.",
    permissions: [P.importView, P.importUpload],
    group: "Operations",
  },
  {
    href: "/console/orders",
    label: "Orders",
    description:
      "Every imported sale, refund and adjustment, normalised into one table across all firms.",
    permissions: [P.orderView],
    group: "Operations",
  },
  {
    href: "/console/support",
    label: "Support",
    description:
      "Tickets the assistant could not resolve. Replying emails the member the text you wrote.",
    permissions: [P.supportView],
    group: "Operations",
  },
  {
    href: "/console/catalog",
    label: "Catalogue",
    description:
      "Prop firms, their challenges and the coupons that map a purchase back to us.",
    permissions: [P.platformView, P.productView, P.couponView],
    group: "Operations",
  },
  {
    href: "/console/payouts",
    label: "Payouts",
    description:
      "The withdrawal queue. Marking one paid is the last irreversible step money takes.",
    permissions: [P.withdrawalView],
    group: "Money",
  },
  {
    href: "/console/settings",
    label: "Splits & config",
    description:
      "The buyer / referrer / platform split, hold periods, club tiers and the audit trail.",
    permissions: [P.configView],
    group: "Money",
  },
  {
    href: "/console/campaigns",
    label: "Email studio",
    description:
      "Campaign sends, the wording of every automated email, and the suppression list.",
    permissions: [P.marketingView],
    group: "Growth",
  },
  {
    href: "/console/proof",
    label: "Homepage proof",
    description:
      "Sponsor logos and the member feedback shown on the homepage. Page content rather than email, which is why it is not in the studio.",
    permissions: [P.marketingView],
    group: "Growth",
  },
  {
    href: "/console/blog",
    label: "Journal & help",
    description:
      "Write and publish journal posts and the help articles the support widget searches. Writing and publishing are separate permissions.",
    permissions: [P.postWrite],
    group: "Growth",
  },
  {
    href: "/console/ai",
    label: "AI providers",
    description:
      "Which model reads receipts and answers support, in what order, and the keys behind them. Editing is owner-only.",
    permissions: [P.aiView],
    group: "Administration",
  },
  {
    href: "/console/people",
    label: "People & roles",
    description:
      "Find a member by email, name or referral code. Only an owner can grant or revoke a role.",
    permissions: [P.userView],
    group: "Administration",
  },
];

/**
 * Two letters per section, for the collapsed rail.
 *
 * Kept here rather than on `ConsoleSection` so they stay visibly unique - the
 * whole value of a code is that `CL` and `CA` cannot be confused, and that is
 * only checkable when they are written in one list.
 */
export const SECTION_CODE: Record<string, string> = {
  "/console/claims": "CL",
  "/console/imports": "IM",
  "/console/orders": "OR",
  "/console/support": "SU",
  "/console/catalog": "CA",
  "/console/payouts": "PO",
  "/console/settings": "SP",
  "/console/campaigns": "GR",
  "/console/proof": "HP",
  "/console/blog": "JR",
  "/console/ai": "AI",
  "/console/people": "PR",
};

/** Sections the holder of `granted` may open. */
export function visibleSections(granted: Iterable<string>): ConsoleSection[] {
  const held = new Set(granted);
  return CONSOLE_SECTIONS.filter((section) =>
    section.permissions.some((permission) => held.has(permission)),
  );
}

/** Whether the console should be reachable at all for this account. */
export function hasConsoleAccess(granted: Iterable<string> | undefined): boolean {
  return granted ? visibleSections(granted).length > 0 : false;
}
