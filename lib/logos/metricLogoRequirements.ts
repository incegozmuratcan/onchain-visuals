import type { LogoCategory } from "./logoRegistry";

export type MetricLogoRequirement = {
  category: LogoCategory;
  requiredSlugs: string[];
  note: string;
};

export const topThirtyChainSlugs = [
  "canton-network",
  "tron",
  "ethereum",
  "polygon",
  "solana",
  "base",
  "abstract",
  "bsc",
  "arbitrum",
  "injective",
  "starknet",
  "aptos",
  "hyperliquid",
  "morph",
  "sui",
  "monad",
  "internet-computer",
  "ton",
  "avalanche",
  "filecoin",
  "pulsechain",
  "near",
  "optimism",
  "linea",
  "mantle",
  "stellar",
  "ink",
  "ripple",
  "zksync-era",
  "cardano",
];

export const commonInfrastructureChainSlugs = [
  ...topThirtyChainSlugs,
  "bitcoin",
  "cosmos",
  "fantom",
  "celo",
  "sei",
  "cronos",
  "hedera",
  "algorand",
  "rootstock",
  "fogo",
  "bsv-blockchain",
];

export const depinProjectSlugs = [
  "helium",
  "glow",
  "geodnet",
  "io-net",
  "chutes",
  "render-network",
  "akash",
  "doublezero",
  "filecoin",
  "livepeer",
  "hivemapper",
  "dimo",
  "grass",
  "nosana",
  "pocket-network",
];

export const metricLogoRequirements: Record<string, MetricLogoRequirement> = {
  chain_revenue: { category: "chain", requiredSlugs: topThirtyChainSlugs, note: "Current top chain revenue/stablecoin screenshot acceptance list." },
  chain_stablecoin_supply: { category: "chain", requiredSlugs: topThirtyChainSlugs, note: "Current top stablecoin card output acceptance list." },
  chain_tvl: { category: "chain", requiredSlugs: topThirtyChainSlugs, note: "Current top TVL chain coverage." },
  depin_revenue: { category: "project", requiredSlugs: depinProjectSlugs, note: "Known active DePIN Pulse projects in current card outputs." },
  buidl_network_value: { category: "asset", requiredSlugs: ["buidl"], note: "BUIDL active tokenized asset card." },
  benji_network_value: { category: "asset", requiredSlugs: ["benji"], note: "BENJI active tokenized asset card." },
  chain_realtime_tps: { category: "chain", requiredSlugs: commonInfrastructureChainSlugs, note: "Active Chainspect TPS coverage." },
  chain_block_time: { category: "chain", requiredSlugs: commonInfrastructureChainSlugs, note: "Active Chainspect block-time coverage." },
  chain_avg_tx_fee: { category: "chain", requiredSlugs: commonInfrastructureChainSlugs, note: "Active Chainspect fee coverage." },
  chain_developers: { category: "chain", requiredSlugs: commonInfrastructureChainSlugs, note: "Active developer-count coverage." },
};

export const requiredActiveLogoKeys = Array.from(
  new Set(Object.values(metricLogoRequirements).flatMap((requirement) => requirement.requiredSlugs.map((slug) => `${requirement.category}:${slug}`)))
).sort();
