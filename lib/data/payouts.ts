/** Payout methods (handoff §4.8). Only USDT and gift cards — bank transfer
 *  and PayPal were removed. */

export interface Chain {
  key: string;
  name: string;
  mark: string;
  note: string;
  placeholder: string;
  /** The value `PayoutAddress.chain` accepts — a fixed enum in the schema. */
  enumValue: "TRC20" | "ERC20" | "BEP20" | "POLYGON" | "SOLANA";
}

/**
 * The supported networks.
 *
 * Legitimately static: `PayoutAddress.chain` is a fixed enum in the schema, so
 * this list is a mirror of it rather than data standing in for an API. The
 * gift-card catalogue and the minimum withdrawal used to live here too — both
 * are now read from the API, because both are things an admin changes.
 */
export const CHAINS: Chain[] = [
  { key: "trc20", name: "TRC-20", mark: "TRX", note: "Tron · no fee", placeholder: "T… Tron address", enumValue: "TRC20" },
  { key: "erc20", name: "ERC-20", mark: "ETH", note: "Ethereum · network fee applies", placeholder: "0x… Ethereum address", enumValue: "ERC20" },
  { key: "bep20", name: "BEP-20", mark: "BNB", note: "BNB Smart Chain · low fee", placeholder: "0x… BSC address", enumValue: "BEP20" },
  { key: "polygon", name: "Polygon", mark: "POL", note: "Low fee", placeholder: "0x… Polygon address", enumValue: "POLYGON" },
  { key: "sol", name: "Solana", mark: "SOL", note: "SPL USDC/USDT · fast", placeholder: "Solana address", enumValue: "SOLANA" },
];

