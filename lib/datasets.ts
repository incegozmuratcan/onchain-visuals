export type DatasetStatus = "active" | "coming_soon";

export type QueryDefinition = {
  id: string;
  label: string;
  prompt: string;
  status: DatasetStatus;
  source: string;
};

export type DatasetGroup = {
  id: string;
  name: string;
  description: string;
  queries: QueryDefinition[];
};

export const datasetGroups: DatasetGroup[] = [
  {
    id: "chains",
    name: "Chains",
    description: "Network-level metrics for comparing chain fundamentals and liquidity.",
    queries: [
      {
        id: "chain_revenue_30d",
        label: "Chain revenue · 30D",
        prompt: "Top 10 chains by 30D revenue",
        status: "active",
        source: "DefiLlama",
      },
      {
        id: "chain_revenue_7d",
        label: "Chain revenue · 7D",
        prompt: "Top 15 chains by 7D revenue",
        status: "active",
        source: "DefiLlama",
      },
      {
        id: "chain_revenue_24h",
        label: "Chain revenue · 24H",
        prompt: "Top 20 chains by 24H revenue",
        status: "active",
        source: "DefiLlama",
      },
      {
        id: "stablecoin_supply",
        label: "Stablecoin supply by chain",
        prompt: "Top 10 chains by stablecoin supply",
        status: "coming_soon",
        source: "DefiLlama / Artemis",
      },
      {
        id: "chain_net_flows",
        label: "Net flows by chain",
        prompt: "Top 10 chains by 1D net inflow",
        status: "coming_soon",
        source: "Artemis / DefiLlama",
      },
    ],
  },
  {
    id: "protocols",
    name: "Protocols",
    description: "Protocol-level revenue, fees, TVL and efficiency views.",
    queries: [
      {
        id: "protocol_revenue",
        label: "Protocol revenue",
        prompt: "Top 10 protocols by 30D revenue",
        status: "coming_soon",
        source: "DefiLlama",
      },
      {
        id: "protocol_fees",
        label: "Protocol fees",
        prompt: "Top 10 protocols by 30D fees",
        status: "coming_soon",
        source: "DefiLlama",
      },
    ],
  },
  {
    id: "assets",
    name: "Assets",
    description: "Tokenized assets, stable assets and RWA-style market views.",
    queries: [
      {
        id: "rwa_aum",
        label: "RWA assets by AUM",
        prompt: "Top tokenized treasury products by AUM",
        status: "coming_soon",
        source: "RWA.xyz",
      },
      {
        id: "yield_stable_assets",
        label: "Yield-bearing stable assets",
        prompt: "Top yield-bearing stable assets by supply",
        status: "coming_soon",
        source: "DefiLlama / RWA.xyz",
      },
    ],
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    description: "Network performance, finality, decentralization and throughput.",
    queries: [
      {
        id: "network_fundamentals",
        label: "Network fundamentals",
        prompt: "Compare chains by TPS and finality",
        status: "coming_soon",
        source: "Chainspect",
      },
    ],
  },
];

export const activeQueries = datasetGroups.flatMap((group) =>
  group.queries.filter((query) => query.status === "active")
);

export const activeDataset = {
  id: "chain_revenue",
  name: "Chain Revenue",
  examplePrompts: activeQueries.map((query) => query.prompt),
};
