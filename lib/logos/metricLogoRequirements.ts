import type { LogoCategory } from "./logoRegistry";

export type MetricLogoRequirement = {
  category: LogoCategory;
  requiredSlugs: string[];
  note: string;
};

export const topThirtyChainSlugs = [
  "ethereum",
  "tron",
  "bsc",
  "solana",
  "hyperliquid",
  "base",
  "arbitrum",
  "polygon",
  "avalanche",
  "aptos",
  "x-layer",
  "plasma",
  "megaeth",
  "ton",
  "optimism",
  "mantle",
  "sui",
  "plume",
  "ripple",
  "monad",
  "stellar",
  "fantom",
  "sei",
  "starknet",
  "ink",
  "kaia",
  "provenance",
  "cronos",
  "celo",
  "saga",
  "canton-network",
  "morph",
  "abstract",
  "injective",
  "internet-computer",
  "linea",
  "pulsechain",
  "near",
  "zksync-era",
  "cardano",
  "hyperliquid",
  "megaeth",
  "provenance",
  "eni",
  "bsv-blockchain",
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
