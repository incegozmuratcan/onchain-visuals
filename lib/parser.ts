export type Timeframe = "24h" | "7d" | "30d" | "current";

export type QueryMetric = "chain_revenue" | "chain_stablecoin_supply" | "chain_tvl" | "buidl_network_value" | "benji_network_value";

export type ParsedQuery = {
  limit: number;
  timeframe: Timeframe;
  metric: QueryMetric;
  scope: "chains" | "assets";
  entity: "all_chains" | "all_networks";
  visualType: "leaderboard_card";
  labels: string[];
};

const MIN_LIMIT = 3;
const MAX_LIMIT = 30;

function clampLimit(value: number) {
  if (!Number.isFinite(value)) return 10;
  return Math.min(Math.max(Math.floor(value), MIN_LIMIT), MAX_LIMIT);
}

function parseLimit(text: string) {
  const limitMatch = text.match(/top\s+(\d+)|first\s+(\d+)|(\d+)\s+(chains?|networks?)/);
  return clampLimit(Number(limitMatch?.[1] || limitMatch?.[2] || limitMatch?.[3] || 10));
}

function parseTimeframe(text: string, metric: QueryMetric): Timeframe {
  if (metric !== "chain_revenue") return "current";

  if (/(1d|24h|daily|today|bugün|son 24)/.test(text)) return "24h";
  if (/(7d|week|weekly|hafta|son 7)/.test(text)) return "7d";
  return "30d";
}

function parseMetric(text: string): QueryMetric {
  if (/(benji|franklin|benjamin)/.test(text)) {
    return "benji_network_value";
  }

  if (/(buidl|build|blackrock|tokenized fund|tokenized treasury)/.test(text)) {
    return "buidl_network_value";
  }

  if (/(stablecoin|stablecoins|stable|stables|supply|mcap|market cap)/.test(text)) {
    return "chain_stablecoin_supply";
  }

  if (/(tvl|total value locked|defi tvl|liquidity locked|kilitli değer|kilitli deger)/.test(text)) {
    return "chain_tvl";
  }

  return "chain_revenue";
}

function metricLabel(metric: QueryMetric) {
  if (metric === "chain_stablecoin_supply") return "Stablecoin Supply";
  if (metric === "chain_tvl") return "DeFi TVL";
  if (metric === "buidl_network_value") return "Build";
  if (metric === "benji_network_value") return "BENJI";
  return "Revenue";
}

function timeframeLabel(timeframe: Timeframe) {
  if (timeframe === "current") return "Current";
  return timeframe.toUpperCase();
}

export function parsePrompt(input: string): ParsedQuery {
  const text = input.toLowerCase().slice(0, 240);
  const metric = parseMetric(text);
  const limit = parseLimit(text);
  const timeframe = parseTimeframe(text, metric);
  const isAssetMetric = metric === "buidl_network_value" || metric === "benji_network_value";

  return {
    limit,
    timeframe,
    metric,
    scope: isAssetMetric ? "assets" : "chains",
    entity: isAssetMetric ? "all_networks" : "all_chains",
    visualType: "leaderboard_card",
    labels: [isAssetMetric ? "Assets" : "Chains", metricLabel(metric), `Top ${limit}`, timeframeLabel(timeframe)],
  };
}
