import { logoSourceManifestByKey } from "./logoSourceManifest";
export type LogoFit = "contain" | "cover";
export type LogoCategory = "chain" | "project" | "asset";
export type LogoSourceType =
  | "official"
  | "official-brand-kit"
  | "official-website"
  | "official-github"
  | "crypto-logos"
  | "simple-icons"
  | "trustwallet-assets"
  | "spothq-cryptocurrency-icons"
  | "defillama"
  | "other-data-provider"
  | "data-provider"
  | "existing-local"
  | "existing-local-reviewed";
export type LogoQuality = "approved" | "needs-review" | "missing" | "rejected";

export type LogoRegistryEntry = {
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  aliases: string[];
  localPath: string;
  sourceType: LogoSourceType;
  sourceUrl?: string;
  sourceNote?: string;
  rightsNote: string;
  quality: LogoQuality;
  fit: LogoFit;
  scale: number;
  padding: number;
  background?: string;
  notes: string;
  requiredActive?: boolean;
};

export type LogoManifestEntry = LogoRegistryEntry;

const RIGHTS_NOTE = "Logos are trademarks of their respective owners and are used for identification purposes; provenance is tracked here for review.";

function entry(input: LogoRegistryEntry): LogoRegistryEntry {
  const sourceRecord = logoSourceManifestByKey.get(`${input.category}:${input.slug}`);
  return {
    ...input,
    localPath: sourceRecord?.localPath ?? input.localPath,
    sourceType: sourceRecord?.sourceProvider ?? input.sourceType,
    sourceUrl: sourceRecord?.sourceUrl ?? input.sourceUrl,
    sourceNote: sourceRecord?.sourceNote ?? input.sourceNote,
  };
}

export function getLogoSourceRecord(entry?: Pick<LogoRegistryEntry, "category" | "slug">) {
  return entry ? logoSourceManifestByKey.get(`${entry.category}:${entry.slug}`) : undefined;
}

export function hasApprovedLogoSource(entry?: Pick<LogoRegistryEntry, "category" | "slug" | "localPath">) {
  const source = getLogoSourceRecord(entry);
  return Boolean(source?.approvalStatus === "approved" && source.localPath && entry?.localPath === source.localPath && source.sha256);
}

const common = {
  rightsNote: RIGHTS_NOTE,
  quality: "approved" as LogoQuality,
  fit: "contain" as LogoFit,
  scale: 1.08,
  padding: 1,
  notes: "Curated local logo for active learnDeFi card outputs; verify official brand guidelines before reuse outside identification.",
  requiredActive: true,
};

function chain(canonicalName: string, slug: string, aliases: string[], sourceType: LogoSourceType, sourceUrl: string, overrides: Partial<LogoRegistryEntry> = {}) {
  return entry({ ...common, canonicalName, slug, category: "chain", aliases, localPath: `/logos/chains/${slug}.svg`, sourceType, sourceUrl, ...overrides });
}

function project(canonicalName: string, slug: string, aliases: string[], sourceType: LogoSourceType, sourceUrl: string, overrides: Partial<LogoRegistryEntry> = {}) {
  return entry({ ...common, canonicalName, slug, category: "project", aliases, localPath: `/logos/projects/${slug}.svg`, sourceType, sourceUrl, ...overrides });
}

function asset(canonicalName: string, slug: string, aliases: string[], sourceType: LogoSourceType, sourceUrl: string, overrides: Partial<LogoRegistryEntry> = {}) {
  return entry({ ...common, canonicalName, slug, category: "asset", aliases, localPath: `/logos/assets/${slug}.svg`, sourceType, sourceUrl, ...overrides });
}

export const logoRegistry: LogoRegistryEntry[] = [
  chain("Canton", "canton-network", ["canton", "canton network"], "official", "https://www.canton.network/", { scale: 0.98 }),
  chain("Tron", "tron", ["tron", "trx"], "crypto-logos", "https://cryptologos.cc/logos/tron-trx-logo.svg"),
  chain("Ethereum", "ethereum", ["ethereum", "eth"], "spothq-cryptocurrency-icons", "https://github.com/spothq/cryptocurrency-icons/blob/master/svg/color/eth.svg", { scale: 1.18, padding: 0 }),
  chain("Polygon", "polygon", ["polygon", "polygon pos", "matic", "matic network", "MATIC"], "simple-icons", "https://simpleicons.org/icons/polygon.svg", { scale: 1.14, padding: 0 }),
  chain("Solana", "solana", ["solana", "sol"], "official-brand-kit", "https://solana.com/branding/", { scale: 1.16, padding: 0, notes: "Official Solana brand logomark, stored locally as the recognizable three-bar identity." }),
  chain("Base", "base", ["base", "base chain"], "simple-icons", "https://simpleicons.org/icons/base.svg"),
  chain("Abstract", "abstract", ["abstract", "abstract chain"], "official", "https://www.abs.xyz/"),
  chain("BNB Chain", "bsc", ["bnb chain", "bsc", "binance smart chain", "bnb", "binance", "BSC"], "official-brand-kit", "https://www.bnbchain.org/en/brand", { background: "#111827", scale: 1.1, padding: 0 }),
  chain("Arbitrum", "arbitrum", ["arbitrum", "arbitrum one"], "simple-icons", "https://simpleicons.org/icons/arbitrum.svg", { scale: 1.12, padding: 0 }),
  chain("Injective", "injective", ["injective", "inj"], "crypto-logos", "https://cryptologos.cc/logos/injective-inj-logo.svg"),
  chain("Starknet", "starknet", ["starknet", "starknet alpha"], "simple-icons", "https://simpleicons.org/icons/starknet.svg", { scale: 1.14, padding: 0 }),
  chain("Aptos", "aptos", ["aptos", "apt"], "simple-icons", "https://simpleicons.org/icons/aptos.svg"),
  chain("Hyperliquid L1", "hyperliquid", ["hyperliquid", "hyperliquid l1", "hl"], "official", "https://hyperliquid.xyz/"),
  chain("Morph", "morph", ["morph", "morph l2"], "official", "https://www.morphl2.io/"),
  chain("Sui", "sui", ["sui"], "simple-icons", "https://simpleicons.org/icons/sui.svg", { scale: 1.14, padding: 0 }),
  chain("Monad", "monad", ["monad"], "official", "https://www.monad.xyz/"),
  chain("ICP", "internet-computer", ["icp", "internet computer", "internet computer protocol"], "crypto-logos", "https://cryptologos.cc/logos/internet-computer-icp-logo.svg"),
  chain("TON", "ton", ["ton", "the open network", "toncoin"], "simple-icons", "https://simpleicons.org/icons/ton.svg"),
  chain("Avalanche", "avalanche", ["avalanche", "avax", "avalanche c-chain", "avalanche c chain"], "crypto-logos", "https://cryptologos.cc/logos/avalanche-avax-logo.svg", { scale: 1.15, padding: 0 }),
  chain("Filecoin", "filecoin", ["filecoin", "filecoin chain", "fil"], "simple-icons", "https://simpleicons.org/icons/filecoin.svg", { scale: 1.2, padding: 0 }),
  chain("PulseChain", "pulsechain", ["pulsechain", "pulse chain", "pls"], "official", "https://pulsechain.com/"),
  chain("Near", "near", ["near", "near protocol"], "simple-icons", "https://simpleicons.org/icons/near.svg", { scale: 1.04 }),
  chain("OP Mainnet", "optimism", ["op mainnet", "optimism", "op", "optimism mainnet"], "simple-icons", "https://simpleicons.org/icons/optimism.svg", { scale: 1.06 }),
  chain("Linea", "linea", ["linea", "linea mainnet"], "official", "https://linea.build/"),
  chain("Mantle", "mantle", ["mantle", "mantle network"], "simple-icons", "https://simpleicons.org/icons/mantle.svg"),
  chain("Stellar", "stellar", ["stellar", "xlm"], "simple-icons", "https://simpleicons.org/icons/stellar.svg", { scale: 1.08 }),
  chain("Ink", "ink", ["ink", "ink chain"], "official", "https://inkonchain.com/"),
  chain("XRP Ledger", "ripple", ["xrp ledger", "xrp", "ripple", "xrpl", "XRP", "XRPL"], "simple-icons", "https://simpleicons.org/icons/xrp.svg", { scale: 1.12 }),
  chain("ZKsync Era", "zksync-era", ["zksync era", "zksync-era", "zksync", "ZKsync", "zkSync", "zkSync Era", "zk sync", "zk sync era", "zk-sync", "zk-sync era"], "simple-icons", "https://simpleicons.org/icons/zksync.svg", { scale: 1.12, padding: 0 }),
  chain("Cardano", "cardano", ["cardano", "ada"], "crypto-logos", "https://cryptologos.cc/logos/cardano-ada-logo.svg"),
  chain("Bitcoin", "bitcoin", ["bitcoin", "btc"], "spothq-cryptocurrency-icons", "https://github.com/spothq/cryptocurrency-icons/blob/master/svg/color/btc.svg"),
  chain("Cosmos", "cosmos", ["cosmos", "atom", "cosmos hub"], "crypto-logos", "https://cryptologos.cc/logos/cosmos-atom-logo.svg"),
  chain("Fantom", "fantom", ["fantom", "ftm"], "crypto-logos", "https://cryptologos.cc/logos/fantom-ftm-logo.svg"),
  chain("Celo", "celo", ["celo"], "simple-icons", "https://simpleicons.org/icons/celo.svg"),
  chain("Sei", "sei", ["sei", "sei network"], "crypto-logos", "https://cryptologos.cc/logos/sei-sei-logo.svg"),
  chain("Cronos", "cronos", ["cronos", "cro"], "crypto-logos", "https://cryptologos.cc/logos/cronos-cro-logo.svg"),
  chain("Hedera", "hedera", ["hedera", "hbar"], "simple-icons", "https://simpleicons.org/icons/hedera.svg"),
  chain("Algorand", "algorand", ["algorand", "algo"], "simple-icons", "https://simpleicons.org/icons/algorand.svg"),
  chain("Rootstock", "rootstock", ["rootstock", "rsk"], "official", "https://rootstock.io/"),
  chain("Fogo", "fogo", ["fogo", "fogo chain"], "official", "https://www.fogo.io/"),
  chain("BSV Blockchain", "bsv-blockchain", ["bsv blockchain", "bsv", "bitcoin sv"], "crypto-logos", "https://cryptologos.cc/logos/bitcoin-sv-bsv-logo.svg"),
  chain("ENI", "eni", ["eni", "eni blockchain", "eni network", "eniac"], "defillama", "https://icons.llama.fi/chains/rsz_eni.jpg", {
    scale: 1.08,
    padding: 0,
  }),
  
  asset("BUIDL", "buidl", ["buidl", "build", "blackrock usd institutional digital liquidity fund", "blackrock"], "official", "https://www.blackrock.com/cash/en-us/products/329365/blackrock-usd-institutional-digital-liquidity-fund", { scale: 0.9 }),
  asset("BENJI", "benji", ["benji", "franklin", "franklin onchain us government money fund", "benjamin"], "official", "https://www.franklintempleton.com/solutions/blockchain/benji", { scale: 0.92 }),

  project("Helium", "helium", ["helium", "hnt"], "simple-icons", "https://simpleicons.org/icons/helium.svg"),
  project("Glow", "glow", ["glow"], "official", "https://glowlabs.org/"),
  project("GEODNET", "geodnet", ["geodnet"], "official", "https://geodnet.com/"),
  project("IO.NET", "io-net", ["io.net", "io net", "ionet"], "official", "https://io.net/"),
  project("Chutes", "chutes", ["chutes"], "official", "https://chutes.ai/"),
  project("Render Network", "render-network", ["render network", "render", "rndr"], "simple-icons", "https://simpleicons.org/icons/render.svg"),
  project("Akash", "akash", ["akash", "akash network", "akt"], "crypto-logos", "https://cryptologos.cc/logos/akash-network-akt-logo.svg"),
  project("DoubleZero", "doublezero", ["doublezero", "double zero", "2z"], "official", "https://doublezero.xyz/"),
  project("Filecoin", "filecoin", ["filecoin", "fil"], "simple-icons", "https://simpleicons.org/icons/filecoin.svg", { scale: 1.2, padding: 0 }),
  project("Livepeer", "livepeer", ["livepeer", "lpt"], "simple-icons", "https://simpleicons.org/icons/livepeer.svg"),
  project("Hivemapper", "hivemapper", ["hivemapper", "honey"], "official", "https://hivemapper.com/"),
  project("DIMO", "dimo", ["dimo"], "official", "https://dimo.org/"),
  project("Grass", "grass", ["grass"], "official", "https://www.getgrass.io/"),
  project("Nosana", "nosana", ["nosana", "nos"], "official", "https://nosana.io/"),
  project("Pocket Network", "pocket-network", ["pocket network", "pocket", "pokt"], "official", "https://www.pokt.network/"),
];

export const logoManifest = logoRegistry;

const aliasOverrides: Record<string, string> = {
  bnb: "bsc",
  bsc: "bsc",
  "binance smart chain": "bsc",
  optimism: "optimism",
  op: "optimism",
  "optimism mainnet": "optimism",
  icp: "internet-computer",
  "internet computer": "internet-computer",
  "internet computer protocol": "internet-computer",
  zksync: "zksync-era",
  "zk sync": "zksync-era",
  "zksync era": "zksync-era",
  "zksync-era": "zksync-era",
  xrp: "ripple",
  ripple: "ripple",
  xrpl: "ripple",
  ton: "ton",
  "the open network": "ton",
  toncoin: "ton",
  "base chain": "base",
  hyperliquid: "hyperliquid",
  "hyperliquid l1": "hyperliquid",
  "filecoin chain": "filecoin",
  fil: "filecoin",
  "arbitrum one": "arbitrum",
  "polygon pos": "polygon",
  matic: "polygon",
  "matic network": "polygon",
  "near protocol": "near",
  sol: "solana",
  xlm: "stellar",
  eni: "eni",
  "eni blockchain": "eni",
  "eni network": "eni",
  eniac: "eni",
};

export function normalizeLogoKey(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[’']/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyLogoKey(name: string) {
  const normalized = normalizeLogoKey(name);
  return aliasOverrides[normalized] ?? normalized.replace(/[.]/g, "").replace(/\s+/g, "-");
}

export const logoManifestBySlug = new Map(logoManifest.map((logo) => [`${logo.category}:${logo.slug}`, logo]));
export const logoAliasMap = new Map<string, LogoRegistryEntry>();

for (const logo of logoManifest) {
  logoAliasMap.set(normalizeLogoKey(logo.canonicalName), logo);
  logoAliasMap.set(normalizeLogoKey(logo.slug), logo);
  logoAliasMap.set(logo.slug, logo);
  for (const alias of logo.aliases) logoAliasMap.set(normalizeLogoKey(alias), logo);
}

for (const [alias, slug] of Object.entries(aliasOverrides)) {
  const entryForAlias = logoManifest.find((logo) => logo.slug === slug);
  if (entryForAlias) logoAliasMap.set(normalizeLogoKey(alias), entryForAlias);
}

export function getLogoRegistryEntry(name: string, preferredCategory?: LogoCategory) {
  const key = normalizeLogoKey(name);
  const direct = logoAliasMap.get(key);
  if (!direct || !preferredCategory || direct.category === preferredCategory) return direct;
  return logoManifest.find((logo) => logo.category === preferredCategory && (logo.slug === direct.slug || logo.aliases.map(normalizeLogoKey).includes(key))) ?? direct;
}

export function isApprovedLocalLogo(entry?: LogoRegistryEntry) {
  return Boolean(entry?.localPath && entry.quality === "approved" && hasApprovedLogoSource(entry));
}
