import type { Metadata } from "next";
import { TicketThread } from "@/components/dashboard/ticket-thread";

export const metadata: Metadata = { title: "Support ticket" };

export default async function SupportTicketPage({
  params,
}: PageProps<"/dashboard/support/[id]">) {
  const { id } = await params;
  return <TicketThread ticketId={id} />;
}
