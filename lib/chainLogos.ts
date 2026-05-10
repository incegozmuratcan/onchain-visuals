export type LogoFit = "contain" | "cover";

export type LogoRenderConfig = {
  src: string;
  fit: LogoFit;
  scale: number;
  padding: number;
};

type ChainIdentity = {
  name: string;
  aliases: string[];
  slug: string;
  logoCandidates?: string[];
};

type LogoRegistryEntry = Partial<Omit<LogoRenderConfig, "src">> & {
  src?: string;
};

const DEFAULT_LOGO_CONFIG = {
  fit: "cover" as LogoFit,
  scale: 1,
  padding: 0,
};

function localAsset(slug: string) {
  return `/logos/${encodeURIComponent(slug)}.svg`;
}

function generatedLogo(slug: string) {
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

const logoRegistry: Record<string, LogoRegistryEntry> = {
  ethereum: { fit: "contain", scale: 1.1, padding: 1 },
  solana: { fit: "cover", scale: 1.08, padding: 0 },
  tron: { fit: "cover", scale: 1.08, padding: 0 },
  bsc: { fit: "cover", scale: 1.06, padding: 0 },
  base: { fit: "cover", scale: 1.03, padding: 0 },
  arbitrum: { fit: "cover", scale: 1.08, padding: 0 },
  polygon: { fit: "cover", scale: 1.08, padding: 0 },
  avalanche: { fit: "cover", scale: 1.14, padding: 0 },
  optimism: { fit: "cover", scale: 1.08, padding: 0 },
  aptos: { fit: "cover", scale: 1.08, padding: 0 },
  stellar: { fit: "contain", scale: 1.08, padding: 1 },
  ripple: { fit: "cover", scale: 1.08, padding: 0 },
  sui: { fit: "cover", scale: 1.05, padding: 0 },
  mantle: { fit: "cover", scale: 1.08, padding: 0 },
  ton: { fit: "cover", scale: 1.12, padding: 0 },
  sei: { fit: "cover", scale: 1.08, padding: 0 },
  celo: { fit: "cover", scale: 1.06, padding: 0 },
  hedera: { fit: "cover", scale: 1.04, padding: 0 },
  algorand: { fit: "contain", scale: 1.12, padding: 1 },
  plume: { fit: "cover", scale: 1.08, padding: 0 },
  "zksync-era": { fit: "cover", scale: 1.08, padding: 0 },
  hyperliquid: { fit: "cover", scale: 1.08, padding: 0 },
  bitcoin: { fit: "cover", scale: 1.08, padding: 0 },
  cardano: { fit: "cover", scale: 1.08, padding: 0 },
  cosmos: { fit: "cover", scale: 1.08, padding: 0 },
  cronos: { fit: "cover", scale: 1.08, padding: 0 },
  fantom: { fit: "cover", scale: 1.08, padding: 0 },
  near: { fit: "cover", scale: 1.06, padding: 0 },
  starknet: { fit: "cover", scale: 1.06, padding: 0 },
  stacks: { fit: "cover", scale: 1.08, padding: 0 },
  rootstock: { fit: "cover", scale: 1.08, padding: 0 },
  "internet-computer": { fit: "cover", scale: 1.06, padding: 0 },
  kusama: { fit: "cover", scale: 1.08, padding: 0 },
  filecoin: { fit: "cover", scale: 1.08, padding: 0 },
  bittensor: { fit: "cover", scale: 1.06, padding: 0 },
  helius: { fit: "cover", scale: 1.08, padding: 0 },
  dawn: { fit: "cover", scale: 1.08, padding: 0 },
  geodnet: { fit: "cover", scale: 1.08, padding: 0 },
  "io-net": { fit: "cover", scale: 1.08, padding: 0 },
  chutes: { fit: "cover", scale: 1.08, padding: 0 },
  "render-network": { fit: "cover", scale: 1.08, padding: 0 },
  akash: { fit: "cover", scale: 1.08, padding: 0 },
  doublezero: { fit: "cover", scale: 1.08, padding: 0 },
  livepeer: { fit: "cover", scale: 1.08, padding: 0 },
  hivemapper: { fit: "cover", scale: 1.08, padding: 0 },
  dimo: { fit: "cover", scale: 1.08, padding: 0 },
  grass: { fit: "cover", scale: 1.08, padding: 0 },
  nosana: { fit: "cover", scale: 1.08, padding: 0 },
  "pocket-network": { fit: "cover", scale: 1.08, padding: 0 },
};

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
  { name: "ZKsync Era", aliases: ["zksync-era", "zksync era", "zksync", "zk sync", "zk sync era", "zk syncera", "zk-sync era", "zk-sync", "zkSync Era", "ZKsync", "zkSync"], slug: "zksync-era", logoCandidates: [llamaChain("zksync-era"), llamaChain("zksync era"), llamaIcon("zksync-era"), llamaIcon("zksync era"), coinLogo("24091")] },
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
  { name: "Filecoin", aliases: ["filecoin", "fil"], slug: "filecoin" },
  { name: "Bittensor", aliases: ["bittensor", "tao"], slug: "bittensor" },
  { name: "Helius", aliases: ["helius"], slug: "helius" },
  { name: "DAWN", aliases: ["dawn"], slug: "dawn" },
  { name: "GEODNET", aliases: ["geodnet"], slug: "geodnet" },
  { name: "IO.NET", aliases: ["io.net", "io net", "ionet"], slug: "io-net" },
  { name: "Chutes", aliases: ["chutes"], slug: "chutes" },
  { name: "Render Network", aliases: ["render network", "render"], slug: "render-network" },
  { name: "Akash", aliases: ["akash"], slug: "akash" },
  { name: "DoubleZero", aliases: ["doublezero", "double zero"], slug: "doublezero" },
  { name: "Livepeer", aliases: ["livepeer"], slug: "livepeer" },
  { name: "Hivemapper", aliases: ["hivemapper"], slug: "hivemapper" },
  { name: "DIMO", aliases: ["dimo"], slug: "dimo" },
  { name: "Grass", aliases: ["grass"], slug: "grass" },
  { name: "Nosana", aliases: ["nosana"], slug: "nosana" },
  { name: "Pocket Network", aliases: ["pocket network", "pocket"], slug: "pocket-network" },
];

const aliasMap = new Map<string, ChainIdentity>();
for (const identity of identities) {
  for (const alias of identity.aliases) aliasMap.set(normalizeKey(alias), identity);
}

function normalizeKey(name: string) {
  return name.toLowerCase().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function fallbackSlug(name: string) {
  return normalizeKey(name).replace(/\s+/g, "-");
}

function uniqueConfigs(configs: LogoRenderConfig[]) {
  const seen = new Set<string>();
  return configs.filter((config) => {
    if (seen.has(config.src)) return false;
    seen.add(config.src);
    return true;
  });
}

function configFor(slug: string, src: string, overrides?: Partial<LogoRenderConfig>): LogoRenderConfig {
  const registry = logoRegistry[slug] ?? {};
  return {
    src,
    fit: overrides?.fit ?? registry.fit ?? DEFAULT_LOGO_CONFIG.fit,
    scale: overrides?.scale ?? registry.scale ?? DEFAULT_LOGO_CONFIG.scale,
    padding: overrides?.padding ?? registry.padding ?? DEFAULT_LOGO_CONFIG.padding,
  };
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

export function getChainLogoCandidates(name: string, logo?: string | null): LogoRenderConfig[] {
  const identity = getChainIdentity(name);
  const registry = logoRegistry[identity.slug];
  const localSrc = registry?.src ?? localAsset(identity.slug);
  const verifiedExternal = [
    ...(logo && /^https:\/\//.test(logo) ? [logo] : []),
    ...(identity.logoCandidates ?? []),
    llamaChain(identity.slug),
    llamaIcon(identity.slug),
  ];

  return uniqueConfigs([
    configFor(identity.slug, localSrc),
    ...verifiedExternal.map((src) => configFor(identity.slug, src, { fit: "contain", padding: 1 })),
    configFor(identity.slug, generatedLogo(identity.slug)),
  ]);
}

export function getChainLogo(name: string, logo?: string | null) {
  return getChainLogoCandidates(name, logo)[0]?.src ?? null;
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
