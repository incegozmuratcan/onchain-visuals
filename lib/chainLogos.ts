type ChainIdentity = {
  name: string;
  aliases: string[];
  slug: string;
  logoCandidates?: string[];
};

function localLogo(slug: string) {
  return `/api/chain-logo/${encodeURIComponent(slug)}`;
}

function llamaChain(slug: string) {
  return `https://icons.llama.fi/chains/rsz_${slug}.jpg`;
}

function llamaIcon(slug: string) {
  return `https://icons.llama.fi/${slug}.jpg`;
}

function coinLogo(id: string) {
  return `https://assets.coingecko.com/coins/images/${id}/large.png`;
}

const identities: ChainIdentity[] = [
  { name: "Ethereum", aliases: ["ethereum", "eth"], slug: "ethereum" },
  { name: "Solana", aliases: ["solana", "sol"], slug: "solana" },
  { name: "Tron", aliases: ["tron", "trx"], slug: "tron" },
  { name: "BNB Chain", aliases: ["bnb chain", "bsc", "binance", "binance smart chain"], slug: "bsc", logoCandidates: [llamaChain("bsc"), llamaIcon("bsc"), coinLogo("825")] },
  { name: "Base", aliases: ["base"], slug: "base", logoCandidates: [llamaChain("base"), llamaIcon("base"), coinLogo("31199")] },
  { name: "Arbitrum", aliases: ["arbitrum", "arbitrum one"], slug: "arbitrum" },
  { name: "Polygon", aliases: ["polygon", "polygon pos", "matic"], slug: "polygon" },
  { name: "Avalanche", aliases: ["avalanche", "avax", "avalanche c-chain", "avalanche c chain"], slug: "avalanche", logoCandidates: [llamaChain("avalanche"), llamaIcon("avax"), coinLogo("12559")] },
  { name: "OP Mainnet", aliases: ["op mainnet", "optimism", "op"], slug: "optimism", logoCandidates: [llamaChain("optimism"), llamaIcon("optimism"), coinLogo("25244")] },
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
  { name: "ZKsync Era", aliases: ["zksync era", "zksync", "zk sync", "zk sync era", "zk syncera", "zk-sync era", "zk-sync"], slug: "zksync-era", logoCandidates: [llamaChain("zksync era"), llamaIcon("zksync era"), coinLogo("24091")] },
  { name: "Hyperliquid L1", aliases: ["hyperliquid", "hyperliquid l1"], slug: "hyperliquid", logoCandidates: [llamaChain("hyperliquid"), llamaIcon("hyperliquid"), coinLogo("50882")] },
  { name: "Canton", aliases: ["canton", "canton network"], slug: "canton-network" },
  { name: "Abstract", aliases: ["abstract"], slug: "abstract" },
  { name: "Bitcoin", aliases: ["bitcoin", "btc"], slug: "bitcoin" },
  { name: "Cardano", aliases: ["cardano", "ada"], slug: "cardano" },
  { name: "Cosmos", aliases: ["cosmos", "atom"], slug: "cosmos" },
  { name: "Cronos", aliases: ["cronos"], slug: "cronos" },
  { name: "Fantom", aliases: ["fantom"], slug: "fantom" },
  { name: "Ink", aliases: ["ink"], slug: "ink" },
  { name: "Kaia", aliases: ["kaia"], slug: "kaia" },
  { name: "MegaETH", aliases: ["megaeth", "mega eth"], slug: "megaeth", logoCandidates: [llamaChain("megaeth"), llamaIcon("megaeth")] },
  { name: "Monad", aliases: ["monad"], slug: "monad" },
  { name: "Near", aliases: ["near", "near protocol"], slug: "near" },
  { name: "Plasma", aliases: ["plasma"], slug: "plasma" },
  { name: "Provenance", aliases: ["provenance"], slug: "provenance", logoCandidates: [llamaChain("provenance"), llamaIcon("provenance")] },
  { name: "Saga", aliases: ["saga"], slug: "saga" },
  { name: "Starknet", aliases: ["starknet"], slug: "starknet" },
  { name: "X Layer", aliases: ["x layer", "xlayer"], slug: "x-layer" },
  { name: "Katana", aliases: ["katana"], slug: "katana" },
  { name: "Movement", aliases: ["movement"], slug: "movement" },
  { name: "Flare", aliases: ["flare"], slug: "flare" },
  { name: "Stacks", aliases: ["stacks", "stx"], slug: "stacks" },
  { name: "Rootstock", aliases: ["rootstock", "rsk"], slug: "rootstock" },
  { name: "ICP", aliases: ["icp", "internet computer", "internet computer protocol"], slug: "internet-computer", logoCandidates: [llamaChain("internet-computer"), llamaIcon("internet-computer"), coinLogo("14495")] },
  { name: "Kusama", aliases: ["kusama", "ksm"], slug: "kusama", logoCandidates: [llamaChain("kusama"), llamaIcon("kusama"), coinLogo("9568")] },
  { name: "Fogo", aliases: ["fogo"], slug: "fogo" },
  { name: "BSV Blockchain", aliases: ["bsv blockchain", "bsv", "bitcoin sv"], slug: "bsv-blockchain" },
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

export function getChainLogoCandidates(name: string, logo?: string | null) {
  const identity = getChainIdentity(name);
  const candidates = [
    localLogo(identity.slug),
    ...(logo && /^https:\/\//.test(logo) ? [logo] : []),
    ...(identity.logoCandidates ?? []),
    llamaChain(identity.slug),
    llamaIcon(identity.slug),
  ];
  return Array.from(new Set(candidates));
}

export function getChainLogo(name: string, logo?: string | null) {
  return getChainLogoCandidates(name, logo)[0] ?? null;
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
