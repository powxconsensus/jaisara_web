/** Navigation model, shared by the navbar, the full-screen menu and the footer. */

export interface NavItem {
  label: string;
  href: string;
  /** Renders a "SOON" tag and mutes the item. */
  soon?: boolean;
}

/** Inline links in the desktop navbar. */
export const PRIMARY_NAV: NavItem[] = [
  { label: "Deals", href: "/deals" },
  { label: "Estimator", href: "/#estimator" },
  { label: "Club", href: "/dashboard/club" },
  { label: "Journal", href: "/journal" },
];

/** The full-screen menu index - numbered 01-07 with no gaps (handoff §6). */
export const MENU_NAV: NavItem[] = [
  { label: "Deals", href: "/deals" },
  { label: "Estimator", href: "/#estimator" },
  { label: "Club", href: "/dashboard/club" },
  { label: "Journal", href: "/journal" },
  { label: "Copytrading", href: "/dashboard/copytrading", soon: true },
  { label: "Dashboard", href: "/dashboard" },
  { label: "About", href: "/about" },
];

/** Footer link columns. */
export const FOOTER_COLUMNS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Product",
    items: [
      { label: "Deals", href: "/deals" },
      { label: "Cashback estimator", href: "/#estimator" },
      { label: "Jaisara Club", href: "/dashboard/club" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Copytrading", href: "/dashboard/copytrading" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "About us", href: "/about" },
      { label: "Journal", href: "/journal" },
    ],
  },
  {
    heading: "Legal",
    items: [
      { label: "Terms & conditions", href: "/terms" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Cashback rules", href: "/terms" },
    ],
  },
];

/** The public coupon shown in the header pill. */
export const HEADER_COUPON = "JAISARA";
