export type LogoFit = "contain" | "cover";
export type LogoCategory = "chain" | "project" | "asset";
export type LogoSourceType = "official" | "data-provider" | "existing-local" | "placeholder";
export type LogoQualityStatus = "curated" | "placeholder" | "external-only" | "fallback";

export type LogoManifestEntry = {
  canonicalName: string;
  slug: string;
  category: LogoCategory;
  localPath?: string;
  aliases: string[];
  sourceUrl?: string;
  sourceNote: string;
  sourceType: LogoSourceType;
  addedDate: string;
  fit: LogoFit;
  scale: number;
  padding: number;
  notes?: string;
  qualityStatus: LogoQualityStatus;
  knownActive?: boolean;
};

const ADDED_DATE = "2026-05-10";

function entry(input: Omit<LogoManifestEntry, "addedDate" | "sourceNote" | "sourceType" | "qualityStatus" | "fit" | "scale" | "padding"> & Partial<Pick<LogoManifestEntry, "sourceNote" | "sourceType" | "qualityStatus" | "fit" | "scale" | "padding">>): LogoManifestEntry {
  return {
    addedDate: ADDED_DATE,
    sourceNote: input.sourceNote ?? "Existing learnDeFi local SVG asset; provenance should be upgraded to official brand assets in a future logo pass.",
    sourceType: input.sourceType ?? "existing-local",
    qualityStatus: input.qualityStatus ?? "curated",
    fit: input.fit ?? "cover",
    scale: input.scale ?? 1.08,
    padding: input.padding ?? 0,
    ...input,
  };
}

export const logoManifest: LogoManifestEntry[] = [
  entry({ canonicalName: "Ethereum", slug: "ethereum", category: "chain", localPath: "/logos/chains/ethereum.svg", aliases: ["ethereum", "eth"], fit: "contain", scale: 1.12, padding: 1, knownActive: true }),
  entry({ canonicalName: "Solana", slug: "solana", category: "chain", localPath: "/logos/chains/solana.svg", aliases: ["solana", "sol"], knownActive: true }),
  entry({ canonicalName: "Tron", slug: "tron", category: "chain", localPath: "/logos/chains/tron.svg", aliases: ["tron", "trx"], knownActive: true }),
  entry({ canonicalName: "BNB Chain", slug: "bsc", category: "chain", localPath: "/logos/chains/bsc.svg", aliases: ["bnb chain", "bsc", "binance", "binance smart chain"], sourceUrl: "https://icons.llama.fi/chains/rsz_bsc.jpg", knownActive: true }),
  entry({ canonicalName: "Base", slug: "base", category: "chain", localPath: "/logos/chains/base.svg", aliases: ["base"], sourceUrl: "https://icons.llama.fi/chains/rsz_base.jpg", scale: 1.04, knownActive: true }),
  entry({ canonicalName: "Arbitrum", slug: "arbitrum", category: "chain", localPath: "/logos/chains/arbitrum.svg", aliases: ["arbitrum", "arbitrum one"], knownActive: true }),
  entry({ canonicalName: "Polygon", slug: "polygon", category: "chain", localPath: "/logos/chains/polygon.svg", aliases: ["polygon", "polygon pos", "matic"], knownActive: true }),
  entry({ canonicalName: "Avalanche", slug: "avalanche", category: "chain", localPath: "/logos/chains/avalanche.svg", aliases: ["avalanche", "avax", "avalanche c-chain", "avalanche c chain"], scale: 1.14, knownActive: true }),
  entry({ canonicalName: "OP Mainnet", slug: "optimism", category: "chain", localPath: "/logos/chains/optimism.svg", aliases: ["op mainnet", "optimism", "op"], knownActive: true }),
  entry({ canonicalName: "Aptos", slug: "aptos", category: "chain", localPath: "/logos/chains/aptos.svg", aliases: ["aptos"], knownActive: true }),
  entry({ canonicalName: "Sui", slug: "sui", category: "chain", localPath: "/logos/chains/sui.svg", aliases: ["sui"], scale: 1.05, knownActive: true }),
  entry({ canonicalName: "TON", slug: "ton", category: "chain", localPath: "/logos/chains/ton.svg", aliases: ["ton", "the open network"], scale: 1.12, knownActive: true }),
  entry({ canonicalName: "Near", slug: "near", category: "chain", localPath: "/logos/chains/near.svg", aliases: ["near", "near protocol"], scale: 1.06, knownActive: true }),
  entry({ canonicalName: "Bitcoin", slug: "bitcoin", category: "chain", localPath: "/logos/chains/bitcoin.svg", aliases: ["bitcoin", "btc"], knownActive: true }),
  entry({ canonicalName: "Cardano", slug: "cardano", category: "chain", localPath: "/logos/chains/cardano.svg", aliases: ["cardano", "ada"], knownActive: true }),
  entry({ canonicalName: "Cosmos", slug: "cosmos", category: "chain", localPath: "/logos/chains/cosmos.svg", aliases: ["cosmos", "atom"], knownActive: true }),
  entry({ canonicalName: "Fantom", slug: "fantom", category: "chain", localPath: "/logos/chains/fantom.svg", aliases: ["fantom"], knownActive: true }),
  entry({ canonicalName: "Celo", slug: "celo", category: "chain", localPath: "/logos/chains/celo.svg", aliases: ["celo"], scale: 1.06, knownActive: true }),
  entry({ canonicalName: "Sei", slug: "sei", category: "chain", localPath: "/logos/chains/sei.svg", aliases: ["sei"], knownActive: true }),
  entry({ canonicalName: "Mantle", slug: "mantle", category: "chain", localPath: "/logos/chains/mantle.svg", aliases: ["mantle"], knownActive: true }),
  entry({ canonicalName: "Starknet", slug: "starknet", category: "chain", localPath: "/logos/chains/starknet.svg", aliases: ["starknet"], scale: 1.06, knownActive: true }),
  entry({ canonicalName: "ZKsync Era", slug: "zksync-era", category: "chain", localPath: "/logos/chains/zksync-era.svg", aliases: ["zksync-era", "zksync era", "zksync", "zk sync", "zk sync era", "zk-sync era", "zk-sync", "zkSync Era", "ZKsync", "zkSync"], sourceUrl: "https://icons.llama.fi/chains/rsz_zksync-era.jpg", knownActive: true }),
  entry({ canonicalName: "Stellar", slug: "stellar", category: "chain", localPath: "/logos/chains/stellar.svg", aliases: ["stellar", "xlm"], fit: "contain", padding: 1, knownActive: true }),
  entry({ canonicalName: "Hedera", slug: "hedera", category: "chain", localPath: "/logos/chains/hedera.svg", aliases: ["hedera", "hbar"], scale: 1.04, knownActive: true }),
  entry({ canonicalName: "Algorand", slug: "algorand", category: "chain", localPath: "/logos/chains/algorand.svg", aliases: ["algorand", "algo"], fit: "contain", scale: 1.12, padding: 1, knownActive: true }),
  entry({ canonicalName: "ICP", slug: "internet-computer", category: "chain", localPath: "/logos/chains/internet-computer.svg", aliases: ["icp", "internet computer", "internet computer protocol"], scale: 1.06, knownActive: true }),
  entry({ canonicalName: "Filecoin", slug: "filecoin", category: "chain", localPath: "/logos/chains/filecoin.svg", aliases: ["filecoin", "fil"], knownActive: true }),
  entry({ canonicalName: "Cronos", slug: "cronos", category: "chain", localPath: "/logos/chains/cronos.svg", aliases: ["cronos"], knownActive: true }),
  entry({ canonicalName: "Rootstock", slug: "rootstock", category: "chain", localPath: "/logos/chains/rootstock.svg", aliases: ["rootstock", "rsk"], knownActive: true }),
  entry({ canonicalName: "Fogo", slug: "fogo", category: "chain", localPath: "/logos/chains/fogo.svg", aliases: ["fogo"], knownActive: true }),
  entry({ canonicalName: "BSV Blockchain", slug: "bsv-blockchain", category: "chain", localPath: "/logos/chains/bsv-blockchain.svg", aliases: ["bsv blockchain", "bsv", "bitcoin sv"], knownActive: true }),


  entry({ canonicalName: "XRP Ledger", slug: "ripple", category: "chain", localPath: "/logos/chains/ripple.svg", aliases: ["xrp ledger", "xrpl", "ripple"] }),
  entry({ canonicalName: "Plume", slug: "plume", category: "chain", localPath: "/logos/chains/plume.svg", aliases: ["plume", "plume mainnet"] }),
  entry({ canonicalName: "Hyperliquid L1", slug: "hyperliquid", category: "chain", localPath: "/logos/chains/hyperliquid.svg", aliases: ["hyperliquid", "hyperliquid l1"] }),
  entry({ canonicalName: "Canton", slug: "canton-network", category: "chain", localPath: "/logos/chains/canton-network.svg", aliases: ["canton", "canton network"] }),
  entry({ canonicalName: "Abstract", slug: "abstract", category: "chain", localPath: "/logos/chains/abstract.svg", aliases: ["abstract"] }),
  entry({ canonicalName: "Ink", slug: "ink", category: "chain", localPath: "/logos/chains/ink.svg", aliases: ["ink"] }),
  entry({ canonicalName: "Kaia", slug: "kaia", category: "chain", localPath: "/logos/chains/kaia.svg", aliases: ["kaia"] }),
  entry({ canonicalName: "MegaETH", slug: "megaeth", category: "chain", localPath: "/logos/chains/megaeth.svg", aliases: ["megaeth", "mega eth"] }),
  entry({ canonicalName: "Monad", slug: "monad", category: "chain", localPath: "/logos/chains/monad.svg", aliases: ["monad"] }),
  entry({ canonicalName: "Plasma", slug: "plasma", category: "chain", localPath: "/logos/chains/plasma.svg", aliases: ["plasma"] }),
  entry({ canonicalName: "Provenance", slug: "provenance", category: "chain", localPath: "/logos/chains/provenance.svg", aliases: ["provenance"] }),
  entry({ canonicalName: "Saga", slug: "saga", category: "chain", localPath: "/logos/chains/saga.svg", aliases: ["saga"] }),
  entry({ canonicalName: "X Layer", slug: "x-layer", category: "chain", localPath: "/logos/chains/x-layer.svg", aliases: ["x layer", "xlayer"] }),
  entry({ canonicalName: "Katana", slug: "katana", category: "chain", localPath: "/logos/chains/katana.svg", aliases: ["katana"] }),
  entry({ canonicalName: "Movement", slug: "movement", category: "chain", localPath: "/logos/chains/movement.svg", aliases: ["movement"] }),
  entry({ canonicalName: "Flare", slug: "flare", category: "chain", localPath: "/logos/chains/flare.svg", aliases: ["flare"] }),
  entry({ canonicalName: "Stacks", slug: "stacks", category: "chain", localPath: "/logos/chains/stacks.svg", aliases: ["stacks", "stx"] }),
  entry({ canonicalName: "Kusama", slug: "kusama", category: "chain", localPath: "/logos/chains/kusama.svg", aliases: ["kusama", "ksm"] }),
  entry({ canonicalName: "Bittensor", slug: "bittensor", category: "chain", localPath: "/logos/chains/bittensor.svg", aliases: ["bittensor", "tao"] }),
  entry({ canonicalName: "Helius", slug: "helius", category: "project", localPath: "/logos/projects/helius.svg", aliases: ["helius"] }),
  entry({ canonicalName: "DAWN", slug: "dawn", category: "project", localPath: "/logos/projects/dawn.svg", aliases: ["dawn"] }),

  entry({ canonicalName: "BUIDL", slug: "buidl", category: "asset", localPath: "/logos/assets/buidl.svg", aliases: ["buidl", "build", "blackrock"], sourceNote: "Temporary local placeholder for BUIDL asset coverage.", sourceType: "placeholder", qualityStatus: "placeholder", fit: "contain", scale: 1.02, padding: 1, knownActive: true }),
  entry({ canonicalName: "BENJI", slug: "benji", category: "asset", localPath: "/logos/assets/benji.svg", aliases: ["benji", "franklin", "benjamin"], sourceNote: "Temporary local placeholder for BENJI asset coverage.", sourceType: "placeholder", qualityStatus: "placeholder", fit: "contain", scale: 1.02, padding: 1, knownActive: true }),

  entry({ canonicalName: "Helium", slug: "helium", category: "project", localPath: "/logos/projects/helium.svg", aliases: ["helium"], sourceNote: "Temporary local placeholder; needs official project asset replacement.", sourceType: "placeholder", qualityStatus: "placeholder", fit: "contain", padding: 1, knownActive: true }),
  entry({ canonicalName: "Glow", slug: "glow", category: "project", localPath: "/logos/projects/glow.svg", aliases: ["glow"], sourceNote: "Temporary local placeholder; needs official project asset replacement.", sourceType: "placeholder", qualityStatus: "placeholder", fit: "contain", padding: 1, knownActive: true }),
  entry({ canonicalName: "GEODNET", slug: "geodnet", category: "project", localPath: "/logos/projects/geodnet.svg", aliases: ["geodnet"], knownActive: true }),
  entry({ canonicalName: "IO.NET", slug: "io-net", category: "project", localPath: "/logos/projects/io-net.svg", aliases: ["io.net", "io net", "ionet"], knownActive: true }),
  entry({ canonicalName: "Chutes", slug: "chutes", category: "project", localPath: "/logos/projects/chutes.svg", aliases: ["chutes"], knownActive: true }),
  entry({ canonicalName: "Render Network", slug: "render-network", category: "project", localPath: "/logos/projects/render-network.svg", aliases: ["render network", "render"], knownActive: true }),
  entry({ canonicalName: "Akash", slug: "akash", category: "project", localPath: "/logos/projects/akash.svg", aliases: ["akash"], knownActive: true }),
  entry({ canonicalName: "DoubleZero", slug: "doublezero", category: "project", localPath: "/logos/projects/doublezero.svg", aliases: ["doublezero", "double zero"], knownActive: true }),
  entry({ canonicalName: "Filecoin", slug: "filecoin", category: "project", localPath: "/logos/projects/filecoin.svg", aliases: ["filecoin", "fil"], knownActive: true }),
  entry({ canonicalName: "Livepeer", slug: "livepeer", category: "project", localPath: "/logos/projects/livepeer.svg", aliases: ["livepeer"], knownActive: true }),
  entry({ canonicalName: "Hivemapper", slug: "hivemapper", category: "project", localPath: "/logos/projects/hivemapper.svg", aliases: ["hivemapper"], knownActive: true }),
  entry({ canonicalName: "DIMO", slug: "dimo", category: "project", localPath: "/logos/projects/dimo.svg", aliases: ["dimo"], knownActive: true }),
  entry({ canonicalName: "Grass", slug: "grass", category: "project", localPath: "/logos/projects/grass.svg", aliases: ["grass"], knownActive: true }),
  entry({ canonicalName: "Nosana", slug: "nosana", category: "project", localPath: "/logos/projects/nosana.svg", aliases: ["nosana"], knownActive: true }),
  entry({ canonicalName: "Pocket Network", slug: "pocket-network", category: "project", localPath: "/logos/projects/pocket-network.svg", aliases: ["pocket network", "pocket"], knownActive: true }),
];

export function normalizeLogoKey(name: string) {
  return name.toLowerCase().trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

export const logoManifestBySlug = new Map(logoManifest.map((logo) => [`${logo.category}:${logo.slug}`, logo]));
export const logoAliasMap = new Map<string, LogoManifestEntry>();

for (const logo of logoManifest) {
  logoAliasMap.set(normalizeLogoKey(logo.canonicalName), logo);
  logoAliasMap.set(normalizeLogoKey(logo.slug), logo);
  for (const alias of logo.aliases) logoAliasMap.set(normalizeLogoKey(alias), logo);
}
