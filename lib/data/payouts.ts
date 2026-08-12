/** Payout methods (handoff §4.8). Only USDT and gift cards - bank transfer
 *  and PayPal were removed. */

export interface Chain {
  key: string;
  name: string;
  mark: string;
  note: string;
  placeholder: string;
  /** The value `PayoutAddress.chain` accepts - a fixed enum in the schema. */
  enumValue: "TRC20" | "POLYGON" | "ARBITRUM";
}

/**
 * The supported networks.
 *
 * Legitimately static: `PayoutAddress.chain` is a fixed enum in the schema, so
 * this list is a mirror of it rather than data standing in for an API. The
 * gift-card catalogue and the minimum withdrawal used to live here too - both
 * are now read from the API, because both are things an admin changes.
 */
export const CHAINS: Chain[] = [
  { key: "polygon", name: "Polygon", mark: "POL", note: "USDT · low network fee", placeholder: "0x… Polygon address", enumValue: "POLYGON" },
  { key: "tron", name: "Tron", mark: "TRX", note: "USDT · TRC-20", placeholder: "T… Tron address", enumValue: "TRC20" },
  { key: "arbitrum", name: "Arbitrum", mark: "ARB", note: "USDT · EVM network", placeholder: "0x… Arbitrum address", enumValue: "ARBITRUM" },
];
