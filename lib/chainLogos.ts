type ChainIdentity = {
  name: string;
  aliases: string[];
  slug: string;
};

const identities: ChainIdentity[] = [
  { name: "Ethereum", aliases: ["ethereum", "eth"], slug: "ethereum" },
  { name: "Solana", aliases: ["solana", "sol"], slug: "solana" },
  { name: "Tron", aliases: ["tron", "trx"], slug: "tron" },
  { name: "BSC", aliases: ["bsc", "bnb chain", "binance", "binance smart chain"], slug: "bsc" },
  { name: "Base", aliases: ["base"], slug: "base" },
  { name: "Arbitrum", aliases: ["arbitrum", "arbitrum one"], slug: "arbitrum" },
  { name: "Polygon", aliases: ["polygon", "polygon pos", "matic"], slug: "polygon" },
  { name: "Avalanche", aliases: ["avalanche", "avax", "avalanche c-chain", "avalanche c chain"], slug: "avalanche" },
  { name: "OP Mainnet", aliases: ["op mainnet", "optimism", "op"], slug: "optimism" },
  { name: "Aptos", aliases: ["aptos"], slug: "aptos" },
  { name: "Stellar", aliases: ["stellar", "xlm"], slug: "stellar" },
  { name: "XRP Ledger", aliases: ["xrp ledger", "xrpl", "ripple"], slug: "ripple" },
  { name: "Sui", aliases: ["sui"], slug: "sui" },
  { name: "Mantle", aliases: ["mantle"], slug: "mantle" },
  { name: "TON", aliases: ["ton", "the open network"], slug: "ton" },
  { name: "Sei", aliases: ["sei"], slug: "sei" },
  { name: "Celo", aliases: ["celo"], slug: "celo" },
  { name: "Hedera", aliases: ["hedera", "hbar"], slug: "hedera" },
  { name: "Algorand", aliases: ["algorand", "algo"], slug: "algorand" },
  { name: "Plume", aliases: ["plume", "plume mainnet"], slug: "plume" },
  { name: "ZKsync Era", aliases: ["zksync era", "zksync", "zk sync", "zk sync era"], slug: "zksync era" },
  { name: "Hyperliquid L1", aliases: ["hyperliquid", "hyperliquid l1"], slug: "hyperliquid" },
  { name: "Canton", aliases: ["canton", "canton network"], slug: "canton-network" },
  { name: "Abstract", aliases: ["abstract"], slug: "abstract" },
  { name: "Bitcoin", aliases: ["bitcoin", "btc"], slug: "bitcoin" },
  { name: "Cardano", aliases: ["cardano", "ada"], slug: "cardano" },
  { name: "Cosmos", aliases: ["cosmos", "atom"], slug: "cosmos" },
  { name: "Cronos", aliases: ["cronos"], slug: "cronos" },
  { name: "Fantom", aliases: ["fantom"], slug: "fantom" },
  { name: "Ink", aliases: ["ink"], slug: "ink" },
  { name: "Kaia", aliases: ["kaia"], slug: "kaia" },
  { name: "MegaETH", aliases: ["megaeth", "mega eth"], slug: "megaeth" },
  { name: "Monad", aliases: ["monad"], slug: "monad" },
  { name: "Near", aliases: ["near"], slug: "near" },
  { name: "Plasma", aliases: ["plasma"], slug: "plasma" },
  { name: "Provenance", aliases: ["provenance"], slug: "provenance" },
  { name: "Saga", aliases: ["saga"], slug: "saga" },
  { name: "Starknet", aliases: ["starknet", "starknet"], slug: "starknet" },
  { name: "X Layer", aliases: ["x layer", "xlayer"], slug: "x-layer" },
];

const aliasMap = new Map<string, ChainIdentity>();
for (const identity of identities) {
  for (const alias of identity.aliases) aliasMap.set(alias.toLowerCase().trim(), identity);
}

function normalizeKey(name: string) {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function fallbackSlug(name: string) {
  return normalizeKey(name).replace(/\s+/g, "-");
}

export function getChainIdentity(name: string) {
  const key = normalizeKey(name);
  const identity = aliasMap.get(key);
  if (identity) return identity;
  return { name: name.trim(), aliases: [key], slug: fallbackSlug(name) };
}

export function normalizeChainName(name: string) {
  return getChainIdentity(name).name;
}

export function getChainLogo(name: string, logo?: string | null) {
  if (logo && /^https:\/\//.test(logo)) return logo;
  const identity = getChainIdentity(name);
  return `https://icons.llama.fi/chains/rsz_${identity.slug}.jpg`;
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
