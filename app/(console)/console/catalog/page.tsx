import type { Metadata } from "next";
import { CatalogConsole } from "@/components/console/catalog/catalog-console";

export const metadata: Metadata = { title: "Catalogue" };

export default function ConsoleCatalogPage() {
  return <CatalogConsole />;
}
