export type DatasetStatus = "active" | "coming_soon";

export type QueryDefinition = {
  id: string;
  label: string;
  prompt: string;
  status: DatasetStatus;
  source: string;
  chip: string;
};

export type MetricDefinition = {
  id: string;
  label: string;
  status: DatasetStatus;
  queries: QueryDefinition[];
};

export type DatasetGroup = {
  id: string;
  name: string;
  description: string;
  metrics: MetricDefinition[];
};

export const datasetGroups: DatasetGroup[] = [
  {
    id: "chains",
    name: "Chains",
    description: "Network-level metrics for chain comparisons.",
    metrics: [
      {
        id: "chain_revenue",
        label: "Revenue",
        status: "active",
        queries: [
          {
            id: "chain_revenue_24h",
            label: "Chain revenue · 24H",
            prompt: "Top 10 chains by 24H revenue",
            status: "active",
            source: "DefiLlama",
            chip: "24H",
          },
          {
            id: "chain_revenue_7d",
            label: "Chain revenue · 7D",
            prompt: "Top 10 chains by 7D revenue",
            status: "active",
            source: "DefiLlama",
            chip: "7D",
          },
          {
            id: "chain_revenue_30d",
            label: "Chain revenue · 30D",
            prompt: "Top 10 chains by 30D revenue",
            status: "active",
            source: "DefiLlama",
            chip: "30D",
          },
        ],
      },
      {
        id: "chain_stablecoin_supply",
        label: "Stablecoins",
        status: "active",
        queries: [
          {
            id: "stablecoin_supply",
            label: "Stablecoin supply by chain",
            prompt: "Top 10 chains by stablecoin supply",
            status: "active",
            source: "DefiLlama",
            chip: "Supply",
          },
        ],
      },
      {
        id: "chain_net_flows",
        label: "Net Flows",
        status: "coming_soon",
        queries: [
          {
            id: "chain_net_flows_1d",
            label: "Net flows by chain",
            prompt: "Top 10 chains by 1D net inflow",
            status: "coming_soon",
            source: "Artemis / DefiLlama",
            chip: "Soon",
          },
        ],
      },
    ],
  },
  {
    id: "protocols",
    name: "Protocols",
    description: "Protocol-level revenue, fees, TVL and efficiency views.",
    metrics: [
      {
        id: "protocol_revenue",
        label: "Revenue",
        status: "coming_soon",
        queries: [
          {
            id: "protocol_revenue_30d",
            label: "Protocol revenue",
            prompt: "Top 10 protocols by 30D revenue",
            status: "coming_soon",
            source: "DefiLlama",
            chip: "Soon",
          },
        ],
      },
      {
        id: "protocol_fees",
        label: "Fees",
        status: "coming_soon",
        queries: [
          {
            id: "protocol_fees_30d",
            label: "Protocol fees",
            prompt: "Top 10 protocols by 30D fees",
            status: "coming_soon",
            source: "DefiLlama",
            chip: "Soon",
          },
        ],
      },
    ],
  },
  {
    id: "assets",
    name: "Assets",
    description: "Tokenized assets, stable assets and RWA-style market views.",
    metrics: [
      {
        id: "rwa_assets",
        label: "RWA AUM",
        status: "coming_soon",
        queries: [
          {
            id: "rwa_aum",
            label: "RWA assets by AUM",
            prompt: "Top tokenized treasury products by AUM",
            status: "coming_soon",
            source: "RWA.xyz",
            chip: "Soon",
          },
        ],
      },
    ],
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    description: "Network performance, finality, decentralization and throughput.",
    metrics: [
      {
        id: "network_fundamentals",
        label: "Network fundamentals",
        status: "coming_soon",
        queries: [
          {
            id: "network_fundamentals_compare",
            label: "Network fundamentals",
            prompt: "Compare chains by TPS and finality",
            status: "coming_soon",
            source: "Chainspect",
            chip: "Soon",
          },
        ],
      },
    ],
  },
];

export const activeQueries = datasetGroups.flatMap((group) =>
  group.metrics.flatMap((metric) => metric.queries.filter((query) => query.status === "active"))
);

export const activeDataset = {
  id: "chain_metrics",
  name: "Chain Metrics",
  examplePrompts: activeQueries.map((query) => query.prompt),
};
