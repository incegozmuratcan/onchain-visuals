"use client";
import { ChartShell, DisabledState, SourceConfigRequiredState, SourceErrorState } from "./ChartShell";
import { LeaderboardBarChart } from "./templates/LeaderboardBarChart";
import { EtfFlowboard } from "./templates/EtfFlowboard";
import { BtcEthEtfComparison } from "./templates/BtcEthEtfComparison";
import { HolderConcentration, LiquidationPulse, StablecoinFlowBoard, UnlockCalendar, WhaleTransferCards } from "./templates/SpecialBoards";

export default function DatasetChartClient({ data }: { data: any }) {
  const template = data?.metadata?.chartType || data?.series?.metadata?.chartType;
  const slug = data?.datasetSlug;
  const hasRenderableData = Boolean((data?.series?.bars||[]).length || (data?.series?.lines||[]).length || (data?.series?.cards||[]).length || (data?.series?.tables||[]).length || (data?.series?.calendar||[]).length);
  const render = () => {
    if (data.status === 'source_error' || data?.freshness?.status === 'source_error') return <SourceErrorState data={data}/>;
    if (data.status === 'disabled') return <DisabledState data={data}/>;
    if (data.status === 'source_config_required' || data?.freshness?.status === 'source_config_required') return <SourceConfigRequiredState missingConfig={data.freshness?.missingConfig||[]} message={data.freshness?.message}/>;
    if (!hasRenderableData) return <SourceErrorState data={{...data, freshness:{...data.freshness, message:'No usable series is available for this dataset. Empty chart panels are suppressed until a real snapshot exists.'}}}/>;
    if (template === 'etf_flowboard') return <EtfFlowboard data={data}/>;
    if (template === 'btc_eth_comparison') return <BtcEthEtfComparison data={data}/>;
    if (template === 'stablecoin_flow_board' || slug === 'chain-stablecoin-supply' || slug === 'stablecoin-net-transfers-by-chain') return <StablecoinFlowBoard data={data}/>;
    if (template === 'unlock_calendar') return <UnlockCalendar data={data}/>;
    if (template === 'liquidation_pulse') return <LiquidationPulse data={data}/>;
    if (template === 'holder_concentration') return <HolderConcentration data={data}/>;
    if (template === 'whale_transfer_cards') return <WhaleTransferCards data={data}/>;
    return <LeaderboardBarChart data={data}/>;
  };
  return <ChartShell data={data}>{render()}</ChartShell>;
}
