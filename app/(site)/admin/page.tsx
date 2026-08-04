import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";

export const metadata: Metadata = {
  title: "Admin · claims",
  // Never index the review console.
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
