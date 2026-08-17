"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldLabel, TextInput } from "@/components/ui/field";
import { Badge, ErrorNote, LoadingRows, Panel, PanelHeader } from "@/components/console/ui";
import { useAccess } from "@/components/console/use-permissions";
import { useToast } from "@/components/shell/toast";
import { useMutation, useResource } from "@/lib/resource";
import { ADMIN_PERMISSIONS as P } from "@/lib/admin-types";

type PayoutChain = "POLYGON" | "TRC20" | "ARBITRUM";
type PayoutEnvironment = "TESTNET" | "MAINNET";
type EnvironmentKey = "testnet" | "mainnet";

interface NetworkEnvironment {
  networkId: string;
  rpcUrls: string[];
  usdtContract: string;
}

interface NetworkConfig {
  enabled: boolean;
  feeUsdt: string;
  tronFeeLimitSun: string;
  mainnet: NetworkEnvironment;
  testnet: NetworkEnvironment;
}

interface PayoutConfig {
  environment: PayoutEnvironment;
  autoPayEnabled: boolean;
  autoPayMaxUsdt: string;
  autoPayKycRequired: boolean;
  dailyWithdrawalRequestLimit: number;
  dailyLimitWindow: "ROLLING_24_HOURS" | "UTC_DAY";
  networks: Record<PayoutChain, NetworkConfig>;
}

const CHAINS: PayoutChain[] = ["POLYGON", "TRC20", "ARBITRUM"];

/** Money-moving settings live beside the queue so an operator sees the policy
 * before acting. Treasury keys deliberately have no field here. */
export function PayoutConfiguration() {
  const { can } = useAccess();
  const { toast } = useToast();
  const canView = can(P.configView);
  const canManage = can(P.configManage);
  const config = useResource<PayoutConfig>(canView ? "/api/admin/payouts/config" : null);
  const { mutate, pending, error, setError } = useMutation();
  const [draft, setDraft] = useState<PayoutConfig | null>(null);
  /**
   * Collapsed by default. Signer environment, limits and networks are decided
   * once and then left alone, so the page should open on the queue rather than
   * on a settings panel somebody has already read.
   */
  const [showPolicy, setShowPolicy] = useState(false);
  /** Which chain the editor is showing. Editing is always one chain at a time. */
  const [chainTab, setChainTab] = useState<PayoutChain>("POLYGON");

  if (!canView) return null;

  const current = draft ?? config.data;
  const editing = draft !== null;

  const update = (next: Partial<PayoutConfig>) => {
    setDraft((previous) => (previous ? { ...previous, ...next } : previous));
  };

  const updateNetwork = (chain: PayoutChain, next: Partial<NetworkConfig>) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            networks: {
              ...previous.networks,
              [chain]: { ...previous.networks[chain], ...next },
            },
          }
        : previous,
    );
  };

  const updateEnvironment = (
    chain: PayoutChain,
    environment: EnvironmentKey,
    next: Partial<NetworkEnvironment>,
  ) => {
    setDraft((previous) =>
      previous
        ? {
            ...previous,
            networks: {
              ...previous.networks,
              [chain]: {
                ...previous.networks[chain],
                [environment]: { ...previous.networks[chain][environment], ...next },
              },
            },
          }
        : previous,
    );
  };

  const save = async () => {
    if (!draft) return;
    const saved = await mutate<PayoutConfig>("/api/admin/payouts/config", {
      method: "PATCH",
      body: draft,
    });
    if (!saved) return;
    config.set(saved);
    setDraft(null);
    toast("Payout policy updated.", "success");
  };

  return (
    <Panel className="mb-3 p-[var(--ct-pad)]">
      <PanelHeader
        eyebrow="PAYOUT POLICY"
        title="USDT transfer settings"
        description="Fees are deducted from the gross request. The automatic limit applies to the net USDT sent; larger requests stay in this queue for manual payment. Signer keys remain server-only."
        actions={
          current ? (
            <>
              <Badge tone={current.environment === "MAINNET" ? "warning" : "info"}>
                {current.environment}
              </Badge>
              <Badge tone={current.autoPayEnabled ? "success" : "neutral"}>
                AUTO {current.autoPayEnabled ? "ON" : "OFF"}
              </Badge>
              {canManage && !editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    setDraft(structuredClone(current));
                  }}
                >
                  Edit policy
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {config.loading && !current ? (
        <div className="mt-4"><LoadingRows rows={2} /></div>
      ) : config.error ? (
        <div className="mt-4"><ErrorNote>{config.error}</ErrorNote></div>
      ) : current && !editing ? (
        <button
          type="button"
          onClick={() => setShowPolicy((open) => !open)}
          aria-expanded={showPolicy}
          className="mt-3 w-full cursor-pointer rounded-[11px] border border-hair px-4 py-3 text-left transition hover:border-club/50"
        >
          <span className="flex flex-wrap items-center gap-x-5 gap-y-1.5 font-mono text-[10px] tracking-[0.1em] text-muted">
            <span>
              MAX <span className="text-fg">{current.autoPayMaxUsdt}</span> USDT
            </span>
            <span>
              KYC <span className="text-fg">{current.autoPayKycRequired ? "REQUIRED" : "OFF"}</span>
            </span>
            <span>
              <span className="text-fg">{current.dailyWithdrawalRequestLimit}</span>/
              {current.dailyLimitWindow === "UTC_DAY" ? "UTC DAY" : "24H"}
            </span>
            <span>
              <span className="text-fg">
                {CHAINS.filter((chain) => current.networks[chain].enabled).join(", ") || "NO"}
              </span>{" "}
              NETWORKS
            </span>
            <span className="ml-auto text-club">{showPolicy ? "HIDE −" : "DETAILS +"}</span>
          </span>
        </button>
      ) : null}

      {current && !editing && showPolicy ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          <Summary label="AUTO TRANSFER MAX" value={`${current.autoPayMaxUsdt} USDT net`} />
          <Summary
            label="KYC FOR AUTO"
            value={current.autoPayKycRequired ? "Required" : "Not required"}
          />
          <Summary
            label="DAILY REQUESTS"
            value={`${current.dailyWithdrawalRequestLimit} · ${current.dailyLimitWindow === "UTC_DAY" ? "UTC day" : "rolling 24h"}`}
          />
          <Summary
            label="ENABLED NETWORKS"
            value={CHAINS.filter((chain) => current.networks[chain].enabled).join(", ") || "None"}
          />
        </div>
      ) : null}

      {config.loading || config.error ? null : current && editing ? (
        <div className="mt-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Choice
              label="PAYMENT ENVIRONMENT"
              checked={current.environment === "MAINNET"}
              onChange={(checked) => update({ environment: checked ? "MAINNET" : "TESTNET" })}
              onText="Mainnet"
              offText="Testnet"
            />
            <Choice
              label="AUTOMATIC PAYMENT"
              checked={current.autoPayEnabled}
              onChange={(checked) => update({ autoPayEnabled: checked })}
              onText="Enabled"
              offText="Manual only"
            />
            <Choice
              label="KYC FOR AUTO-PAY"
              checked={current.autoPayKycRequired}
              onChange={(checked) => update({ autoPayKycRequired: checked })}
              onText="Required"
              offText="Not required"
            />
            <div>
              <FieldLabel htmlFor="auto-pay-max">AUTO TRANSFER MAX (NET USDT)</FieldLabel>
              <TextInput
                id="auto-pay-max"
                inputMode="decimal"
                value={current.autoPayMaxUsdt}
                onChange={(event) => update({ autoPayMaxUsdt: event.target.value })}
              />
            </div>
            <div>
              <FieldLabel htmlFor="daily-limit-window">DAILY LIMIT WINDOW</FieldLabel>
              <select
                id="daily-limit-window"
                value={current.dailyLimitWindow}
                onChange={(event) =>
                  update({
                    dailyLimitWindow: event.target.value as PayoutConfig["dailyLimitWindow"],
                  })
                }
                className="w-full rounded-[11px] border border-hair bg-surface-2 px-[15px] py-3.5 text-sm outline-none focus:border-primary"
              >
                <option value="ROLLING_24_HOURS">Rolling 24 hours</option>
                <option value="UTC_DAY">Reset at 00:00 UTC</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="daily-request-limit">REQUESTS PER MEMBER / DAY</FieldLabel>
              <TextInput
                id="daily-request-limit"
                type="number"
                min={1}
                max={100}
                value={current.dailyWithdrawalRequestLimit}
                onChange={(event) =>
                  update({ dailyWithdrawalRequestLimit: Number(event.target.value) })
                }
              />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {/* One chain at a time, picked above, rather than three stacked
                sections. Each chain carries a network id, a contract address
                and a list of RPC URLs, so all three expanded is several
                screens of scroll to change one number — and they are edited
                one at a time anyway. */}
            <div className="flex flex-wrap gap-1.5">
              {CHAINS.map((chain) => (
                <button
                  key={chain}
                  type="button"
                  onClick={() => setChainTab(chain)}
                  className="cursor-pointer rounded-[9px] border px-3.5 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] transition"
                  style={{
                    borderColor:
                      chainTab === chain
                        ? "color-mix(in oklab, var(--club) 46%, var(--hair))"
                        : "var(--hair)",
                    background:
                      chainTab === chain
                        ? "color-mix(in oklab, var(--club) 12%, transparent)"
                        : "transparent",
                    color: chainTab === chain ? "var(--club)" : "var(--muted)",
                  }}
                >
                  {chain}
                  {current.networks[chain].enabled ? " ·" : ""}
                </button>
              ))}
            </div>

            {CHAINS.filter((chain) => chain === chainTab).map((chain) => {
              const network = current.networks[chain];
              return (
                <section key={chain} className="rounded-[12px] border border-hair p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <strong className="font-mono text-[12px]">{chain}</strong>
                      <p className="mt-1 text-[10.5px] text-muted">USDT only · flat fee per request</p>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[11.5px]">
                      <input
                        type="checkbox"
                        checked={network.enabled}
                        onChange={(event) => updateNetwork(chain, { enabled: event.target.checked })}
                        className="size-4 accent-[var(--primary)]"
                      />
                      Enabled for members
                    </label>
                  </div>

                  <div className="mt-3 max-w-[240px]">
                    <FieldLabel htmlFor={`${chain}-fee`}>FLAT FEE (USDT)</FieldLabel>
                    <TextInput
                      id={`${chain}-fee`}
                      inputMode="decimal"
                      value={network.feeUsdt}
                      onChange={(event) => updateNetwork(chain, { feeUsdt: event.target.value })}
                    />
                  </div>
                  {chain === "TRC20" && (
                    <div className="mt-3 max-w-[240px]">
                      <FieldLabel htmlFor="tron-fee-limit">MAX NETWORK FEE (SUN)</FieldLabel>
                      <TextInput
                        id="tron-fee-limit"
                        inputMode="numeric"
                        value={network.tronFeeLimitSun}
                        onChange={(event) =>
                          updateNetwork(chain, { tronFeeLimitSun: event.target.value })
                        }
                      />
                    </div>
                  )}

                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    {(["testnet", "mainnet"] as const).map((environment) => {
                      const value = network[environment];
                      return (
                        <div key={environment} className="rounded-[10px] bg-surface-2 p-3">
                          <p className="mb-3 font-mono text-[9px] tracking-[0.16em] text-muted">
                            {environment.toUpperCase()}
                          </p>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <FieldLabel htmlFor={`${chain}-${environment}-network`}>
                                NETWORK ID
                              </FieldLabel>
                              <TextInput
                                id={`${chain}-${environment}-network`}
                                value={value.networkId}
                                onChange={(event) =>
                                  updateEnvironment(chain, environment, { networkId: event.target.value })
                                }
                              />
                            </div>
                            <div>
                              <FieldLabel htmlFor={`${chain}-${environment}-contract`}>
                                USDT CONTRACT
                              </FieldLabel>
                              <TextInput
                                id={`${chain}-${environment}-contract`}
                                value={value.usdtContract}
                                placeholder={chain === "TRC20" ? "T…" : "0x…"}
                                onChange={(event) =>
                                  updateEnvironment(chain, environment, { usdtContract: event.target.value })
                                }
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <FieldLabel htmlFor={`${chain}-${environment}-rpcs`}>
                              RPC URLS · ONE PER LINE · FAILOVER ORDER
                            </FieldLabel>
                            <textarea
                              id={`${chain}-${environment}-rpcs`}
                              value={value.rpcUrls.join("\n")}
                              onChange={(event) =>
                                updateEnvironment(chain, environment, {
                                  rpcUrls: event.target.value
                                    .split("\n")
                                    .map((entry) => entry.trim())
                                    .filter(Boolean),
                                })
                              }
                              rows={3}
                              className="w-full resize-y rounded-[11px] border border-hair bg-surface px-[15px] py-3 font-mono text-[11px] outline-none transition focus:border-primary"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {error && <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>}
          <div className="mt-4 flex gap-2">
            <Button disabled={pending} onClick={() => void save()}>
              {pending ? "Saving…" : "Save payout policy"}
            </Button>
            <Button variant="outline" disabled={pending} onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-surface-2 p-3">
      <span className="font-mono text-[8.5px] tracking-[0.14em] text-muted">{label}</span>
      <strong className="mt-1.5 block text-[12px] font-semibold">{value}</strong>
    </div>
  );
}

function Choice({
  label,
  checked,
  onChange,
  onText,
  offText,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onText: string;
  offText: string;
}) {
  return (
    <label className="cursor-pointer rounded-[11px] border border-hair bg-surface-2 p-3">
      <span className="block font-mono text-[9px] tracking-[0.14em] text-muted">{label}</span>
      <span className="mt-2 flex items-center gap-2 text-[12px] font-medium">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        {checked ? onText : offText}
      </span>
    </label>
  );
}
