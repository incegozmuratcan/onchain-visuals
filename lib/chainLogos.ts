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
  cosmos: "cosmos",
  ethereum: "ethereum",
  fantom: "fantom",
  hyperliquid: "hyperliquid",
  "hyperliquid l1": "hyperliquid",
  mantle: "mantle",
  near: "near",
  optimism: "optimism",
  "op mainnet": "optimism",
  polygon: "polygon",
  sei: "sei",
  solana: "solana",
  sui: "sui",
  ton: "ton",
  tron: "tron",
  xrpl: "ripple",
};

function normalizeChainKey(name: string) {
  return name.toLowerCase().trim();
}

function getChainSlug(name: string) {
  return chainSlugs[normalizeChainKey(name)] ?? normalizeChainKey(name).replace(/\s+/g, "-");
}

export function getChainLogo(name: string, logo?: string | null) {
  if (logo && /^https:\/\//.test(logo)) return logo;
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
