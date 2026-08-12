import type { Metadata } from "next";
import { UnsubscribePanel } from "@/components/marketing/unsubscribe-panel";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Leave the Jaisara newsletter.",
  // Every one of these URLs carries somebody's personal token. Indexing them
  // would put a working opt-out link for a real member into a search engine.
  robots: { index: false, follow: false },
};

/**
 * Where the footer link in a campaign lands.
 *
 * This page did not exist while the link did - every unsubscribe in every
 * campaign pointed at a 404, which is both a compliance failure and the
 * fastest way to earn spam complaints instead of opt-outs.
 *
 * Nothing happens on load. Landing here must not unsubscribe anybody: inboxes
 * and security scanners prefetch links in email, and a GET that changes state
 * would drop people off the list who never clicked anything.
 */
export default async function UnsubscribePage({
  searchParams,
}: PageProps<"/unsubscribe">) {
  const { token } = await searchParams;
  return <UnsubscribePanel token={typeof token === "string" ? token : ""} />;
}
