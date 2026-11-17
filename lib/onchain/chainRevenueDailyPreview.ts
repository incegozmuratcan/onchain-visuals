import { datasetRegistry } from "./registry";
import { buildChainRevenueDailyCard } from "./snapshots";
import type { RevenueChain, RevenueDays } from "./chainRevenueDaily";

/**
 * Synthetic Chain Revenue day with the longest real DefiLlama chain names in
 * the top 10, plus one chain whose icon does not exist so the initial-circle
 * fallback is visible. Lab preview and capture check only. Never posted.
 */
const PREVIEW_NOW = new Date("2026-11-17T13:00:00.000Z");
const PREVIEW_DATE = "2026-11-16";

const chains: RevenueChain[] = [
  { slug: "tron", name: "Tron", logoKey: "tron" },
  { slug: "robinhood-chain", name: "Robinhood Chain", logoKey: "robinhood chain" },
  { slug: "hyperliquid-l1", name: "Hyperliquid L1", logoKey: "hyperliquid l1" },
  { slug: "gravity-by-galxe", name: "Gravity by Galxe", logoKey: "gravity by galxe" },
  { slug: "immutable-zkevm", name: "Immutable zkEVM", logoKey: "immutable zkevm" },
  { slug: "babylon-genesis", name: "Babylon Genesis", logoKey: "babylon genesis" },
  { slug: "bifrost-network", name: "Bifrost Network", logoKey: "bifrost network" },
  { slug: "bitcoincash", name: "Bitcoin Cash", logoKey: "bitcoincash" },
  { slug: "polygon-zkevm", name: "Polygon zkEVM", logoKey: "polygon zkevm" },
  { slug: "preview-unlisted-chain", name: "Unlisted Testnet", logoKey: "preview-unlisted-chain" },
];

const values = [1_204_500, 412_300, 188_900, 96_400, 61_250, 40_120, 22_800, 9_870, 4_410, 1_020];

function previewDays(): RevenueDays {
  const days: RevenueDays = {};
  const dates = ["2026-11-13", "2026-11-14", "2026-11-15", PREVIEW_DATE];
  for (const date of dates) {
    const day: Record<string, number> = {};
    chains.forEach((chain, index) => {
      day[chain.slug] = values[index];
    });
    // Ninety small chains so the coverage gate sees a normal day.
    for (let i = 0; i < 90; i += 1) day[`preview-small-${i}`] = 50 + i;
    days[date] = day;
  }
  return days;
}

export function buildChainRevenueDailyLongNamesPreview() {
  const dataset = datasetRegistry.find((item) => item.slug === "chain-revenue-daily");
  if (!dataset) throw new Error("Chain Revenue dataset is not registered.");
  const snapshot = buildChainRevenueDailyCard(
    dataset,
    "24h",
    {
      url: null,
      warnings: [],
      data: { chains, days: previewDays(), failed: [], fetchedAt: PREVIEW_NOW.toISOString() },
    },
    PREVIEW_NOW,
  );
  return {
    ...snapshot,
    metadata: { ...snapshot.metadata, previewState: "long-names" },
  };
}
