"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { useToast } from "@/components/shell/toast";
import {
  Badge,
  EmptyState,
  ErrorNote,
  LoadingRows,
  Panel,
  PanelHeader,
  Select,
  TableShell,
  Td,
  Tr,
} from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useMutation, useResource, type Resource } from "@/lib/resource";
import { shortDate } from "@/lib/console-format";
import {
  ADMIN_PERMISSIONS as P,
  type AffiliateAccount,
  type Coupon,
  type Platform,
} from "@/lib/admin-types";

/**
 * Coupons.
 *
 * The coupon is the whole attribution model for firms with no sub-id: the
 * buyer types it at the firm's checkout, it appears on their receipt and in
 * the firm's report, and that shared string is what links the two. A coupon
 * that exists here but not at the firm produces claims that can never match.
 */
export function CouponPanel({ platforms }: { platforms: Resource<Platform[]> }) {
  const { can } = useAccess();
  const { toast } = useToast();
  const coupons = useResource<Coupon[]>("/api/admin/catalog/coupons");
  const accounts = useResource<AffiliateAccount[]>("/api/admin/imports/affiliate-accounts");
  const { mutate, pending, error } = useMutation();

  const canManage = can(P.couponManage);
  const [form, setForm] = useState({
    platformId: "",
    affiliateAccountId: "",
    code: "",
    discountPct: "",
    trackedLinkTemplate: "",
  });

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    const saved = await mutate<Coupon>(
      `/api/admin/catalog/platforms/${form.platformId}/coupons`,
      {
        body: {
          affiliateAccountId: form.affiliateAccountId,
          code: form.code.trim().toUpperCase(),
          discountPct: form.discountPct.trim() || undefined,
          trackedLinkTemplate: form.trackedLinkTemplate.trim() || undefined,
          status: "ACTIVE",
        },
      },
    );
    if (!saved) return;
    toast(`${form.code.trim().toUpperCase()} created.`, "success");
    setForm({ ...form, code: "", discountPct: "", trackedLinkTemplate: "" });
    await coupons.reload();
  };

  const rows = coupons.data ?? [];

  return (
    <div className="space-y-2">
      {canManage && (
        <Panel className="p-[var(--ct-pad)]">
          <PanelHeader
            eyebrow="ADD"
            title="New coupon"
            description="Create it at the firm first. This row only records what already exists on their side - it does not make the code work at their checkout."
          />
          <form onSubmit={create} className="mt-3 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="coupon-platform">FIRM</FieldLabel>
                <Select
                  id="coupon-platform"
                  required
                  value={form.platformId}
                  onChange={(event) => setForm({ ...form, platformId: event.target.value })}
                >
                  <option value="">Select a firm…</option>
                  {(platforms.data ?? []).map((platform) => (
                    <option key={platform.id} value={platform.id}>
                      {platform.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="coupon-account">AFFILIATE ACCOUNT</FieldLabel>
                <Select
                  id="coupon-account"
                  required
                  value={form.affiliateAccountId}
                  onChange={(event) =>
                    setForm({ ...form, affiliateAccountId: event.target.value })
                  }
                >
                  <option value="">Select an account…</option>
                  {(accounts.data ?? []).map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="coupon-code">CODE</FieldLabel>
                <TextInput
                  id="coupon-code"
                  required
                  maxLength={40}
                  placeholder="JAISARA"
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                />
              </div>
              <div>
                <FieldLabel htmlFor="coupon-discount">DISCOUNT %</FieldLabel>
                <TextInput
                  id="coupon-discount"
                  inputMode="decimal"
                  placeholder="20"
                  value={form.discountPct}
                  onChange={(event) => setForm({ ...form, discountPct: event.target.value })}
                />
                <p className="mt-2 text-[11px] leading-5 text-muted">
                  What the buyer saves at checkout. Separate from cashback, which is a share of
                  our commission.
                </p>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="coupon-link">TRACKED LINK TEMPLATE (OPTIONAL)</FieldLabel>
              <TextInput
                id="coupon-link"
                placeholder="https://firm.example/?ref=jaisara&coupon=JAISARA"
                value={form.trackedLinkTemplate}
                onChange={(event) =>
                  setForm({ ...form, trackedLinkTemplate: event.target.value })
                }
              />
            </div>

            {error && <ErrorNote>{error}</ErrorNote>}

            <div>
              <Button
                type="submit"
                size="lg"
                disabled={pending || !form.platformId || !form.affiliateAccountId || !form.code}
              >
                {pending ? "Creating…" : "Create coupon"}
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <Panel className="p-2">
        {coupons.loading && rows.length === 0 ? (
          <LoadingRows rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No coupons yet"
            message="Coupons are how a purchase is attributed to us at firms that do not support a sub-id."
          />
        ) : (
          <TableShell columns={["CODE", "FIRM", "DISCOUNT", "WINDOW", "STATUS"]} minWidth={720}>
            {rows.map((coupon) => (
              <Tr key={coupon.id}>
                <Td className="font-mono text-[12.5px]">{coupon.code}</Td>
                <Td className="text-muted">{coupon.platform?.name ?? "-"}</Td>
                <Td data-count className="font-mono">
                  {coupon.discountPct ? `${coupon.discountPct}%` : "-"}
                </Td>
                <Td className="whitespace-nowrap text-muted">
                  {coupon.startsAt || coupon.endsAt
                    ? `${shortDate(coupon.startsAt)} → ${coupon.endsAt ? shortDate(coupon.endsAt) : "open"}`
                    : "Always"}
                </Td>
                <Td>
                  <Badge
                    tone={
                      coupon.status === "ACTIVE"
                        ? "success"
                        : coupon.status === "PAUSED"
                          ? "warning"
                          : "neutral"
                    }
                  >
                    {coupon.status}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </TableShell>
        )}
      </Panel>
    </div>
  );
}
