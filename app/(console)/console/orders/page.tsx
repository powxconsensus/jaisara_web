import type { Metadata } from "next";
import { OrderBrowser } from "@/components/console/orders/order-browser";

export const metadata: Metadata = { title: "Orders" };

export default function ConsoleOrdersPage() {
  return <OrderBrowser />;
}
