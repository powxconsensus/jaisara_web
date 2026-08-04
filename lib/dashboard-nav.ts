export interface DashboardNavItem {
  label: string;
  /** Short label for the mobile tab bar. */
  short: string;
  href: string;
  /** Club surfaces are accented in gold. */
  club?: boolean;
  soon?: boolean;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { label: "Wallet", short: "Wallet", href: "/dashboard" },
  { label: "Submit a claim", short: "Claim", href: "/dashboard/claim" },
  { label: "Jaisara Club", short: "Club", href: "/dashboard/club", club: true },
  { label: "Withdraw", short: "Payout", href: "/dashboard/withdraw" },
  { label: "Copytrading", short: "Copy", href: "/dashboard/copytrading", soon: true },
  { label: "Account", short: "Account", href: "/dashboard/account" },
];
