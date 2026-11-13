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

function directionOf(value: number) {
  if (value > 0) return "inflow";
  if (value < 0) return "outflow";
  return "flat";
}

function requirePanel(panel: CaptionPanel | undefined, asset: "BTC" | "ETH") {
  if (!panel) throw new Error(`ETF weekly caption requires a ${asset} panel.`);
  if (!String(panel.formattedNet || "").trim()) {
    throw new Error(`ETF weekly caption requires a formatted ${asset} net flow.`);
  }
  return panel;
}

function assetLine(label: string, panel: CaptionPanel) {
  const net = Number(panel.netFlow);
  const direction = directionOf(Number.isFinite(net) ? net : 0);
  return `${label}: ${String(panel.formattedNet || "").trim()} net ${direction}`;
}

/**
 * Caption v3. Amounts are the hero strings already drawn on each panel.
 * No cashtags, hashtags, or links. The range is preformatted
 * ("Nov 2–6, 2026", "Oct 27–31, 2026", "Sep 29–Oct 3, 2026").
 */
export function buildBtcEthEtfWeeklyCaption(snapshot: CaptionSnapshot) {
  const cards = snapshot.series?.cards || [];
  const btc = requirePanel(panelByAsset(cards, "BTC"), "BTC");
  const eth = requirePanel(panelByAsset(cards, "ETH"), "ETH");
  const range = String(snapshot.metadata?.captionRange || "").trim();
  if (!range) throw new Error("ETF weekly caption requires a week range.");
  return [
    `${snapshot.title || "ETF Weekly Flowboard"} — ${range}`,
    "",
    assetLine("US spot Bitcoin ETFs", btc),
    assetLine("US spot Ethereum ETFs", eth),
  ].join("\n");
}
