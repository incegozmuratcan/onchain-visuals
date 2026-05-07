const chainSlugs: Record<string, string> = {
  abstract: "abstract",
  aptos: "aptos",
  arbitrum: "arbitrum",
  avalanche: "avax",
  base: "base",
  bitcoin: "bitcoin",
  bsc: "bsc",
  "bnb chain": "bsc",
  canton: "canton-network",
  cardano: "cardano",
  celo: "celo",
  cosmos: "cosmos",
  cronos: "cronos",
  ethereum: "ethereum",
  fantom: "fantom",
  hyperliquid: "hyperliquid",
  "hyperliquid l1": "hyperliquid",
  ink: "ink",
  kaia: "kaia",
  mantle: "mantle",
  megaeth: "megaeth",
  monad: "monad",
  near: "near",
  optimism: "optimism",
  "op mainnet": "optimism",
  plasma: "plasma",
  "plume mainnet": "plume",
  polygon: "polygon",
  provenance: "provenance",
  saga: "saga",
  sei: "sei",
  solana: "solana",
  starknet: "starknet",
  stellar: "stellar",
  sui: "sui",
  ton: "ton",
  tron: "tron",
  "x layer": "x-layer",
  xlayer: "x-layer",
  xrpl: "ripple",
};

const directLogos: Record<string, string> = {
  bsc: "https://icons.llama.fi/bsc.jpg",
  "bnb chain": "https://icons.llama.fi/bsc.jpg",
  avalanche: "https://icons.llama.fi/avax.jpg",
  "op mainnet": "https://icons.llama.fi/optimism.jpg",
  optimism: "https://icons.llama.fi/optimism.jpg",
  hyperliquid: "https://icons.llama.fi/hyperliquid.jpg",
  "hyperliquid l1": "https://icons.llama.fi/hyperliquid.jpg",
};

function normalizeChainKey(name: string) {
  return name.toLowerCase().trim();
}

function getChainSlug(name: string) {
  return chainSlugs[normalizeChainKey(name)] ?? normalizeChainKey(name).replace(/\s+/g, "-");
}

export function getChainLogo(name: string, logo?: string | null) {
  const key = normalizeChainKey(name);
  if (logo && /^https:\/\//.test(logo)) return logo;
  if (directLogos[key]) return directLogos[key];
  return `https://icons.llama.fi/chains/rsz_${getChainSlug(name)}.jpg`;
}

export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
