import { Footer } from "@/components/shell/footer";

/**
 * Marketing pages only — home, deals, firm, about, journal, privacy, terms.
 * These are the routes that carry the closing CTA and the footer; auth, the
 * dashboard and admin deliberately do not.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <Footer />
    </>
  );
}
