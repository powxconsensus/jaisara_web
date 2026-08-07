"use client";

import { useState } from "react";
import { PageHeader, Segmented } from "@/components/console/ui";
import { useResource } from "@/lib/console-api";
import type { Platform } from "@/lib/admin-types";
import { CouponPanel } from "./coupon-panel";
import { PlatformPanel } from "./platform-panel";
import { ProductPanel } from "./product-panel";

/**
 * Firms, their challenges and their coupons.
 *
 * One page rather than three routes because the three are read together: a
 * challenge belongs to a firm, and a coupon only means anything in the context
 * of the firm that honours it. The platform list is fetched once here and
 * handed down, so switching tabs does not refetch it.
 */

type Tab = "platforms" | "products" | "coupons";

export function CatalogConsole() {
  const [tab, setTab] = useState<Tab>("platforms");
  const platforms = useResource<Platform[]>("/api/admin/catalog/platforms");

  return (
    <div>
      <PageHeader
        eyebrow="OPERATIONS"
        title="Catalogue"
        description="The firms we track, the challenges they sell and the coupons that tie a purchase back to us."
        actions={
          <Segmented
            label="Catalogue section"
            value={tab}
            onChange={setTab}
            options={[
              { value: "platforms", label: "Firms" },
              { value: "products", label: "Challenges" },
              { value: "coupons", label: "Coupons" },
            ]}
          />
        }
      />

      {tab === "platforms" && <PlatformPanel platforms={platforms} />}
      {tab === "products" && <ProductPanel platforms={platforms} />}
      {tab === "coupons" && <CouponPanel platforms={platforms} />}
    </div>
  );
}
