export type BrowserPayoutChain = "POLYGON" | "ARBITRUM" | "TRC20";

export interface BrowserNetworkEnvironment {
  networkId: string;
  rpcUrls: string[];
  usdtContract: string;
}

export interface BrowserNetworkConfig {
  tronFeeLimitSun: string;
  mainnet: BrowserNetworkEnvironment;
  testnet: BrowserNetworkEnvironment;
}

interface Eip1193Provider {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
}

interface TronMethod<T> {
  call?: () => Promise<T>;
  send?: (options: { feeLimit: number }) => Promise<string>;
}

interface TronContract {
  decimals(): TronMethod<unknown>;
  transfer(recipient: string, amount: bigint): TronMethod<never>;
}

interface BrowserTronWeb {
  defaultAddress?: { base58?: string };
  contract(): { at(address: string): Promise<TronContract> };
}

interface TronLinkProvider {
  request(input: { method: string }): Promise<unknown>;
}

/** Sends exactly one admin-confirmed USDT transfer. The API is updated only by
 * the caller after a transaction id is returned. */
export async function sendWithBrowserWallet(input: {
  chain: BrowserPayoutChain;
  recipient: string;
  amountUsdt: string;
  environment: "MAINNET" | "TESTNET";
  network: BrowserNetworkConfig;
}): Promise<string> {
  const environment = input.environment === "MAINNET" ? input.network.mainnet : input.network.testnet;
  if (!environment.usdtContract) throw new Error(`${input.chain} USDT contract is not configured.`);

  return input.chain === "TRC20"
    ? sendTron(input.recipient, input.amountUsdt, environment.usdtContract, input.network.tronFeeLimitSun)
    : sendEvm(input.recipient, input.amountUsdt, environment.usdtContract, environment.networkId);
}

async function sendEvm(
  recipient: string,
  amountUsdt: string,
  contract: string,
  networkId: string,
): Promise<string> {
  const ethereum = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum) throw new Error("No EVM wallet found. Install or unlock MetaMask or another compatible wallet.");

  const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
  const from = accounts[0];
  if (!from) throw new Error("The wallet did not provide an account.");

  const expectedChain = `0x${BigInt(networkId).toString(16)}`;
  await ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: expectedChain }] });
  const decimalsHex = (await ethereum.request({
    method: "eth_call",
    params: [{ to: contract, data: "0x313ce567" }, "latest"],
  })) as string;
  const decimals = Number(BigInt(decimalsHex));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("The configured USDT contract returned invalid decimals.");
  }

  const amount = parseDecimalUnits(amountUsdt, decimals);
  const addressWord = recipient.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const amountWord = amount.toString(16).padStart(64, "0");
  const transactionHash = await ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from, to: contract, data: `0xa9059cbb${addressWord}${amountWord}` }],
  });
  if (typeof transactionHash !== "string" || !transactionHash) {
    throw new Error("The wallet did not return a transaction hash.");
  }
  return transactionHash;
}

async function sendTron(
  recipient: string,
  amountUsdt: string,
  contractAddress: string,
  feeLimitSun: string,
): Promise<string> {
  const injected = window as unknown as {
    tronLink?: TronLinkProvider;
    tronWeb?: BrowserTronWeb;
  };
  if (!injected.tronLink || !injected.tronWeb) {
    throw new Error("TronLink was not found. Install or unlock TronLink first.");
  }
  await injected.tronLink.request({ method: "tron_requestAccounts" });
  if (!injected.tronWeb.defaultAddress?.base58) throw new Error("TronLink did not provide an account.");

  const contract = await injected.tronWeb.contract().at(contractAddress);
  const decimalsCall = contract.decimals().call;
  if (!decimalsCall) throw new Error("The configured TRC-20 contract has no decimals method.");
  const decimals = Number(String(await decimalsCall()));
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("The configured USDT contract returned invalid decimals.");
  }
  const send = contract.transfer(recipient, parseDecimalUnits(amountUsdt, decimals)).send;
  if (!send) throw new Error("The configured TRC-20 contract has no transfer method.");
  const transactionId = await send({ feeLimit: Number(feeLimitSun) });
  if (!transactionId) throw new Error("TronLink did not return a transaction id.");
  return transactionId;
}

function parseDecimalUnits(value: string, decimals: number): bigint {
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error("The payout amount is invalid.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals) throw new Error("The payout has more precision than the token supports.");
  return (
    BigInt(whole) * BigInt(10) ** BigInt(decimals) +
    BigInt((fraction + "0".repeat(decimals)).slice(0, decimals))
  );
}
