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
  /**
   * The list, not the form.
   *
   * `/dashboard/claim` submits one and is reached from the prominent button on
   * both the wallet and this page - the standard shape, where the destination
   * is what you have and the action sits on it. Listing both would have put six
   * items in a phone tab bar to say "claim" twice.
   */
  { label: "Your claims", short: "Claims", href: "/dashboard/claims" },
  { label: "Jaisara Club", short: "Club", href: "/dashboard/club", club: true },
  { label: "Withdraw", short: "Payout", href: "/dashboard/withdraw" },
  { label: "Copytrading", short: "Copy", href: "/dashboard/copytrading", soon: true },
  { label: "Account", short: "Account", href: "/dashboard/account" },
];
