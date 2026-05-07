const logoFallbacks: Record<string, string> = {
  ethereum: "https://icons.llama.fi/ethereum.jpg",
  tron: "https://icons.llama.fi/tron.jpg",
  solana: "https://icons.llama.fi/solana.jpg",
  base: "https://icons.llama.fi/base.jpg",
  polygon: "https://icons.llama.fi/polygon.jpg",
  bsc: "https://icons.llama.fi/bsc.jpg",
  "bnb chain": "https://icons.llama.fi/bsc.jpg",
  arbitrum: "https://icons.llama.fi/arbitrum.jpg",
  optimism: "https://icons.llama.fi/optimism.jpg",
  avalanche: "https://icons.llama.fi/avax.jpg",
  bitcoin: "https://icons.llama.fi/bitcoin.jpg",
  sui: "https://icons.llama.fi/sui.jpg",
  aptos: "https://icons.llama.fi/aptos.jpg",
  near: "https://icons.llama.fi/near.jpg",
  ton: "https://icons.llama.fi/ton.jpg",
  cardano: "https://icons.llama.fi/cardano.jpg",
  sei: "https://icons.llama.fi/sei.jpg",
  fantom: "https://icons.llama.fi/fantom.jpg",
};

export function getChainLogo(name: string, logo?: string | null) {
  if (logo) return logo;
  return logoFallbacks[name.toLowerCase()] ?? null;
}

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "?";
}
