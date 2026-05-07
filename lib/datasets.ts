export type DatasetStatus = "active" | "coming_soon";

export type DatasetDefinition = {
  id: string;
  name: string;
  description: string;
  source: string;
  status: DatasetStatus;
  examplePrompts: string[];
};

export const datasets: DatasetDefinition[] = [
  {
    id: "chain_revenue",
    name: "Chain Revenue",
    description: "Revenue captured by chains only. Protocol and dApp revenues are excluded.",
    source: "DefiLlama",
    status: "active",
    examplePrompts: [
      "Top 10 chains by 30D revenue",
      "Top 15 chains by 7D revenue",
      "Top 20 chains by 24H revenue",
    ],
  },
  {
    id: "protocol_revenue",
    name: "Protocol Revenue",
    description: "Rank DeFi protocols by fees and revenue capture.",
    source: "DefiLlama",
    status: "coming_soon",
    examplePrompts: ["Top 10 protocols by 30D revenue"],
  },
  {
    id: "stablecoin_liquidity",
    name: "Stablecoin Liquidity",
    description: "Track onchain dollar liquidity by chain and timeframe.",
    source: "DefiLlama / Artemis",
    status: "coming_soon",
    examplePrompts: ["Top 10 chains by 7D stablecoin growth"],
  },
  {
    id: "capital_flows",
    name: "Capital Flows",
    description: "Track bridge inflows, outflows and net flows across chains.",
    source: "Artemis / DefiLlama",
    status: "coming_soon",
    examplePrompts: ["Top 10 chains by 1D net inflow"],
  },
  {
    id: "rwa_assets",
    name: "RWA Assets",
    description: "Tokenized asset AUM, APY, issuer and chain distribution.",
    source: "RWA.xyz",
    status: "coming_soon",
    examplePrompts: ["Top tokenized treasury products by AUM"],
  },
  {
    id: "network_fundamentals",
    name: "Network Fundamentals",
    description: "TPS, finality, validators and decentralization metrics.",
    source: "Chainspect",
    status: "coming_soon",
    examplePrompts: ["Compare chains by TPS and finality"],
  },
];

export const activeDatasets = datasets.filter((dataset) => dataset.status === "active");
