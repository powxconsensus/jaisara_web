/** Payout methods (handoff §4.8). Only USDT and gift cards — bank transfer
 *  and PayPal were removed. */

export interface Chain {
  key: string;
  name: string;
  mark: string;
  note: string;
  placeholder: string;
}

export const CHAINS: Chain[] = [
  { key: "trc20", name: "TRC-20", mark: "TRX", note: "Tron · no fee", placeholder: "T… Tron address" },
  { key: "erc20", name: "ERC-20", mark: "ETH", note: "Ethereum · network fee applies", placeholder: "0x… Ethereum address" },
  { key: "bep20", name: "BEP-20", mark: "BNB", note: "BNB Smart Chain · low fee", placeholder: "0x… BSC address" },
  { key: "polygon", name: "Polygon", mark: "POL", note: "Low fee", placeholder: "0x… Polygon address" },
  { key: "sol", name: "Solana", mark: "SOL", note: "SPL USDC/USDT · fast", placeholder: "Solana address" },
];

export interface GiftCard {
  key: string;
  name: string;
  mark: string;
  note: string;
}

export const GIFT_CARDS: GiftCard[] = [
  { key: "amazon", name: "Amazon", mark: "AMZ", note: "US, UK, DE, IN" },
  { key: "apple", name: "Apple", mark: "APL", note: "App Store & iTunes" },
  { key: "google", name: "Google Play", mark: "GP", note: "Most regions" },
  { key: "steam", name: "Steam", mark: "STM", note: "Global wallet" },
  { key: "visa", name: "Visa prepaid", mark: "VISA", note: "US only" },
];

/** Minimum withdrawal, USD. */
export const MIN_WITHDRAWAL = 20;
