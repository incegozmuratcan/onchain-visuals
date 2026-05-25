export type DatasetCategory = 'chains' | 'protocols' | 'capital-flows' | 'markets';
export type FreshnessStatus = 'fresh' | 'stale' | 'missing' | 'source_error' | 'manual_review_required';

export type DatasetRegistryItem = {
  id: string;
  name: string;
  slug: string;
  category: DatasetCategory;
  description: string;
  frequency: string;
  sources: string[];
  primarySource: string;
  fallbackSources: string[];
  refreshPolicy: string;
  requiredFields: string[];
  derivedMetrics: string[];
  chartTemplates: string[];
  status: 'active' | 'disabled' | 'planned';
  sourceLabel: string;
  notes?: string;
};

export const datasetRegistry: DatasetRegistryItem[] = [
  { id:'chain-revenue-league', name:'Chain Revenue League', slug:'chain-revenue-league', category:'chains', description:'Top chains by captured chain-level revenue.', frequency:'daily/weekly/monthly', sources:['defillama'], primarySource:'defillama', fallbackSources:[], refreshPolicy:'6h snapshot', requiredFields:['chain','revenue_24h','revenue_7d','revenue_30d'], derivedMetrics:['weekly_change_pct','monthly_change_pct','market_share','rank_change','top_gainer','top_loser'], chartTemplates:['leaderboard_bar','metric_cards','insight_chips'], status:'active', sourceLabel:'Source: DefiLlama'},
  { id:'chain-stablecoin-supply', name:'Chain Stablecoin Supply', slug:'chain-stablecoin-supply', category:'chains', description:'Stablecoin supply and market share by chain.', frequency:'weekly/monthly', sources:['defillama'], primarySource:'defillama', fallbackSources:[], refreshPolicy:'daily snapshot', requiredFields:['chain','supply','supply_7d','supply_30d'], derivedMetrics:['weekly_change_pct','monthly_change_pct','mom_change_pct','yoy_change_pct','market_share','rank_change'], chartTemplates:['leaderboard_bar','market_share_cards','insight_chips'], status:'active', sourceLabel:'Source: DefiLlama'},
  { id:'stablecoin-net-transfers-by-chain', name:'Stablecoin Net Transfers by Chain', slug:'stablecoin-net-transfers-by-chain', category:'chains', description:'Dune special dataset showing stablecoin net inflow and outflow by chain.', frequency:'weekly/monthly', sources:['dune'], primarySource:'dune', fallbackSources:[], refreshPolicy:'scheduled daily refresh', requiredFields:['chain','net_transfer_7d','net_transfer_30d'], derivedMetrics:['largest_inflow','largest_outflow','market_share_change'], chartTemplates:['stablecoin_flow_board','insight_chips'], status:'planned', sourceLabel:'Source: Dune', notes:'Requires DUNE_STABLECOIN_NET_TRANSFERS_QUERY_ID' },
  { id:'dex-volume-by-chain', name:'DEX Volume by Chain', slug:'dex-volume-by-chain', category:'chains', description:'DEX trading volume by chain.', frequency:'daily/weekly', sources:['defillama'], primarySource:'defillama', fallbackSources:[], refreshPolicy:'6h snapshot', requiredFields:['chain','volume_24h','volume_7d','volume_30d'], derivedMetrics:['weekly_change_pct','monthly_change_pct','market_share','rank_change'], chartTemplates:['leaderboard_bar','market_share_cards'], status:'planned', sourceLabel:'Source: DefiLlama'},
  { id:'btc-etf-flowboard', name:'BTC ETF Flowboard', slug:'btc-etf-flowboard', category:'capital-flows', description:'BTC ETF flow dashboard.', frequency:'trading-days', sources:['defillama','farside'], primarySource:'defillama', fallbackSources:['farside'], refreshPolicy:'daily market close refresh', requiredFields:['date','issuer','net_flow'], derivedMetrics:['rolling_5d','rolling_20d','cumulative_sum','streak_count','largest_inflow','largest_outflow'], chartTemplates:['etf_flowboard','metric_cards','insight_chips'], status:'planned', sourceLabel:'Source: DefiLlama (fallback: Farside)'},
  { id:'eth-etf-flowboard', name:'ETH ETF Flowboard', slug:'eth-etf-flowboard', category:'capital-flows', description:'ETH ETF flow dashboard.', frequency:'trading-days', sources:['defillama','farside'], primarySource:'defillama', fallbackSources:['farside'], refreshPolicy:'daily market close refresh', requiredFields:['date','issuer','net_flow'], derivedMetrics:['rolling_5d','rolling_20d','cumulative_sum','streak_count','largest_inflow','largest_outflow'], chartTemplates:['etf_flowboard','metric_cards','insight_chips'], status:'planned', sourceLabel:'Source: DefiLlama (fallback: Farside)'},
  { id:'btc-vs-eth-etf-flow-battle', name:'BTC vs ETH ETF Flow Battle', slug:'btc-vs-eth-etf-flow-battle', category:'capital-flows', description:'BTC vs ETH ETF comparative flow battle.', frequency:'weekly/monthly', sources:['defillama','farside'], primarySource:'defillama', fallbackSources:['farside'], refreshPolicy:'daily market close refresh', requiredFields:['btc_net_flow','eth_net_flow'], derivedMetrics:['flow_as_percent_of_aum','rolling_5d','rolling_20d','cumulative_sum'], chartTemplates:['btc_eth_comparison','metric_cards','insight_chips'], status:'planned', sourceLabel:'Source: DefiLlama (fallback: Farside)'}
];

export const categories = [
  { id: 'chains', name: 'Chains' },
  { id: 'protocols', name: 'Protocols' },
  { id: 'capital-flows', name: 'Capital Flows' },
  { id: 'markets', name: 'Markets' },
] as const;

export const datasetsByCategory = categories.map((category) => ({
  ...category,
  datasets: datasetRegistry.filter((dataset) => dataset.category === category.id),
}));
