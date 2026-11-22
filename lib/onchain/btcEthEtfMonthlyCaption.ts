type CaptionPanel = {
  asset?: string;
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
 * One sentence. The range is the month already drawn on the card ("October 2026").
 * No amounts, inflow, or outflow. The card carries the numbers.
 */
export function buildBtcEthEtfMonthlyCaption(snapshot: CaptionSnapshot) {
  const range = String(snapshot.metadata?.captionRange || "").trim();
  if (!range) throw new Error("ETF monthly caption requires a month label.");
  const cards = snapshot.series?.cards || [];
  for (const asset of ["BTC", "ETH"] as const) {
    if (!panelByAsset(cards, asset)) throw new Error(`ETF monthly caption requires a ${asset} panel.`);
  }
  return `Here are the Bitcoin and Ethereum ETF flows for the month of ${range}.`;
}
