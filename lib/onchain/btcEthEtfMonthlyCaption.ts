import { buildBtcEthEtfWeeklyCaption } from "./btcEthEtfWeeklyCaption";

type CaptionPanel = {
  asset?: string;
  netFlow?: number | null;
  formattedNet?: string;
};

type CaptionSnapshot = {
  title?: string;
  metadata?: {
    captionRange?: string | null;
  };
  series?: { cards?: CaptionPanel[] };
};

function panelByAsset(cards: CaptionPanel[], asset: "BTC" | "ETH") {
  return cards.find((panel) => String(panel.asset || "").toUpperCase() === asset);
}

/**
 * Caption v3, same shape as the weekly card.
 * Amounts are the hero strings already drawn on each panel.
 * No cashtags, hashtags, or links. The range is the month ("October 2026").
 */
export function buildBtcEthEtfMonthlyCaption(snapshot: CaptionSnapshot) {
  const cards = snapshot.series?.cards || [];
  const range = String(snapshot.metadata?.captionRange || "").trim();
  if (!range) throw new Error("ETF monthly caption requires a month label.");
  for (const asset of ["BTC", "ETH"] as const) {
    const panel = panelByAsset(cards, asset);
    if (!panel) throw new Error(`ETF monthly caption requires a ${asset} panel.`);
    if (!String(panel.formattedNet || "").trim()) {
      throw new Error(`ETF monthly caption requires a formatted ${asset} net flow.`);
    }
  }
  return buildBtcEthEtfWeeklyCaption({
    ...snapshot,
    title: snapshot.title || "ETF Monthly Flowboard",
  });
}
