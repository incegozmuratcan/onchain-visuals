export type ChainLogoEntry = {
  name: string;
  key: string;
  aliases: string[];
  asset: `/logos/chains/${string}.svg`;
  exact?: boolean;
};

const CHAIN_LOGO_PATH = "/logos/chains";
const DEFAULT_CHAIN_LOGO = `${CHAIN_LOGO_PATH}/default.svg` as const;

const chainLogoEntries = [
  { name: "Canton", key: "canton", aliases: ["canton-network", "canton network", "canton"], exact: false },
  { name: "Tron", key: "tron", aliases: ["trx"], exact: false },
  { name: "Ethereum", key: "ethereum", aliases: ["eth"], exact: false },
  { name: "Base", key: "base", aliases: [], exact: false },
  { name: "Polygon", key: "polygon", aliases: ["polygon-pos", "polygon pos", "matic"], exact: false },
  { name: "Solana", key: "solana", aliases: ["sol"], exact: false },
  { name: "BNB Chain", key: "bnb-chain", aliases: ["bnb", "bsc", "binance", "binance-smart-chain", "binance smart chain"], exact: false },
  { name: "Abstract", key: "abstract", aliases: [], exact: false },
  { name: "Arbitrum", key: "arbitrum", aliases: ["arbitrum-one", "arbitrum one"], exact: false },
  { name: "ICP", key: "internet-computer", aliases: ["icp", "internet-computer", "internet computer", "internet-computer-protocol", "internet computer protocol"], exact: false },
  { name: "Injective", key: "injective", aliases: ["inj"], exact: false },
  { name: "Hyperliquid L1", key: "hyperliquid-l1", aliases: ["hyperliquid", "hyperliquid l1"], exact: false },
  { name: "Morph", key: "morph", aliases: [], exact: false },
  { name: "Starknet", key: "starknet", aliases: ["starknet-l2", "starknet l2"], exact: false },
  { name: "Avalanche", key: "avalanche", aliases: ["avax", "avalanche-c-chain", "avalanche c chain"], exact: false },
  { name: "Monad", key: "monad", aliases: [], exact: false },
  { name: "TON", key: "ton", aliases: ["the-open-network", "the open network"], exact: false },
  { name: "Aptos", key: "aptos", aliases: [], exact: false },
  { name: "Filecoin", key: "filecoin", aliases: ["fil"], exact: false },
  { name: "OP Mainnet", key: "op-mainnet", aliases: ["optimism", "op", "optimism-mainnet", "optimism mainnet"], exact: false },
  { name: "PulseChain", key: "pulsechain", aliases: ["pulse-chain", "pulse chain", "pls"], exact: false },
  { name: "Sui", key: "sui", aliases: [], exact: false },
  { name: "Linea", key: "linea", aliases: [], exact: false },
  { name: "Near", key: "near", aliases: ["near-protocol", "near protocol"], exact: false },
  { name: "Mantle", key: "mantle", aliases: [], exact: false },
  { name: "Stellar", key: "stellar", aliases: ["xlm"], exact: false },
  { name: "Tezos", key: "tezos", aliases: ["xtz"], exact: false },
  { name: "XRP Ledger", key: "xrp-ledger", aliases: ["xrp", "xrpl", "ripple"], exact: false },
  { name: "ZKsync Era", key: "zksync-era", aliases: ["zksync", "zk-sync", "zk sync", "zk-sync-era", "zk sync era"], exact: false },
  { name: "Scroll", key: "scroll", aliases: [], exact: false },
  { name: "Bitcoin", key: "bitcoin", aliases: ["btc"], exact: false },
  { name: "Cardano", key: "cardano", aliases: ["ada"], exact: false },
  { name: "Cosmos", key: "cosmos", aliases: ["atom"], exact: false },
  { name: "Cronos", key: "cronos", aliases: [], exact: false },
  { name: "Fantom", key: "fantom", aliases: ["ftm"], exact: false },
  { name: "Sei", key: "sei", aliases: [], exact: false },
  { name: "Celo", key: "celo", aliases: [], exact: false },
  { name: "Hedera", key: "hedera", aliases: ["hbar"], exact: false },
  { name: "Algorand", key: "algorand", aliases: ["algo"], exact: false },
  { name: "Plume", key: "plume", aliases: ["plume-mainnet", "plume mainnet"], exact: false },
  { name: "Ink", key: "ink", aliases: [], exact: false },
  { name: "Kaia", key: "kaia", aliases: [], exact: false },
  { name: "MegaETH", key: "megaeth", aliases: ["mega-eth", "mega eth"], exact: false },
  { name: "Plasma", key: "plasma", aliases: [], exact: false },
  { name: "Provenance", key: "provenance", aliases: [], exact: false },
  { name: "Saga", key: "saga", aliases: [], exact: false },
  { name: "X Layer", key: "x-layer", aliases: ["xlayer", "x layer"], exact: false },
  { name: "Katana", key: "katana", aliases: [], exact: false },
  { name: "Movement", key: "movement", aliases: [], exact: false },
  { name: "Flare", key: "flare", aliases: [], exact: false },
  { name: "Stacks", key: "stacks", aliases: ["stx"], exact: false },
  { name: "Rootstock", key: "rootstock", aliases: ["rsk"], exact: false },
  { name: "Kusama", key: "kusama", aliases: ["ksm"], exact: false },
  { name: "Fogo", key: "fogo", aliases: [], exact: false },
  { name: "BSV Blockchain", key: "bsv-blockchain", aliases: ["bsv", "bitcoin-sv", "bitcoin sv"], exact: false },
] as const;

export const chainLogos: Record<string, ChainLogoEntry> = Object.fromEntries(
  chainLogoEntries.map((entry) => [
    entry.key,
    {
      ...entry,
      aliases: [entry.key, ...entry.aliases],
      asset: `${CHAIN_LOGO_PATH}/${entry.key}.svg` as `/logos/chains/${string}.svg`,
    },
  ]),
);

const aliasMap = new Map<string, string>();
for (const entry of Object.values(chainLogos)) {
  aliasMap.set(entry.key, entry.key);
  aliasMap.set(normalizeRaw(entry.name), entry.key);
  for (const alias of entry.aliases) aliasMap.set(normalizeRaw(alias), entry.key);
}

function normalizeRaw(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeChainKey(name: string) {
  const rawKey = normalizeRaw(name);
  return aliasMap.get(rawKey) ?? rawKey;
}

export function getChainIdentity(name: string): ChainLogoEntry {
  const key = normalizeChainKey(name);
  return chainLogos[key] ?? {
    name: name.trim() || "Unknown Chain",
    key,
    aliases: [key],
    asset: DEFAULT_CHAIN_LOGO,
    exact: false,
  };
}

export function normalizeChainName(name: string) {
  return getChainIdentity(name).name;
}

export function getChainLogoCandidates(name: string, logo?: string | null) {
  const identity = getChainIdentity(name);
  return Array.from(new Set([identity.asset, DEFAULT_CHAIN_LOGO, ...(logo?.startsWith("/logos/chains/") ? [logo] : [])]));
}

export function getChainLogo(name: string, _logo?: string | null) {
  return getChainIdentity(name).asset;
}

export function getInitials(name: string) {
  const normalized = normalizeChainName(name);
  return (
    normalized
      .split(/\s+|-/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "•"
  );
}
