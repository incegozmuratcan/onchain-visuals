type CaptionPanel = {
  asset?: string;
  date?: string | null;
  netFlow?: number | null;
  formattedNet?: string;
};

type CaptionSnapshot = {
  title?: string;
  metadata?: {
    latestCompletedDate?: string | null;
    ethLatestCompletedDate?: string | null;
  };
  series?: { cards?: CaptionPanel[] };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** X counts supplementary-plane emoji as two characters. */
export function xWeightedLength(text: string) {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    length += code > 0xffff ? 2 : 1;
  }
  return length;
}

/** "Nov 14": the Farside session date drawn on the card, in UTC. */
function shortDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });
}

function panelByAsset(cards: CaptionPanel[], asset: "BTC" | "ETH") {
  return cards.find((panel) => String(panel.asset || "").toUpperCase() === asset);
}

function completedDate(panel: CaptionPanel, fallback?: string | null) {
  const date = String(panel.date || fallback || "");
  return DATE_RE.test(date) ? date : "";
}

function requirePanel(panel: CaptionPanel | undefined, asset: "BTC" | "ETH") {
  if (!panel) {
    throw new Error(`BTC+ETH ETF caption requires a ${asset} panel.`);
  }
  if (!String(panel.formattedNet || "").trim()) {
    throw new Error(`BTC+ETH ETF caption requires a formatted ${asset} net flow.`);
  }
  return panel;
}

/**
 * Caption for the combined daily card: one plain sentence with the Farside
 * session date shown on the card ("Here are the Bitcoin and Ethereum ETF
 * flows for Nov 14."). The date is explicit because a Monday post
 * carries Friday's session, so "yesterday" would be wrong. Simple English
 * keeps X's translation clean. No amounts, cashtags, or hashtags; the card
 * carries the numbers. BTC and ETH must be the same completed session.
 */
export function buildBtcEthEtfDailyCaption(snapshot: CaptionSnapshot) {
  const cards = snapshot.series?.cards || [];
  const btc = requirePanel(panelByAsset(cards, "BTC"), "BTC");
  const eth = requirePanel(panelByAsset(cards, "ETH"), "ETH");
  const btcDate = completedDate(btc, snapshot.metadata?.latestCompletedDate);
  const ethDate = completedDate(eth, snapshot.metadata?.ethLatestCompletedDate);
  if (!btcDate || !ethDate) {
    throw new Error("BTC+ETH ETF caption requires completed BTC and ETH dates.");
  }
  if (btcDate !== ethDate) {
    throw new Error(`BTC+ETH ETF caption requires one session; BTC is ${btcDate} and ETH is ${ethDate}.`);
  }
  return `Here are the Bitcoin and Ethereum ETF flows for ${shortDate(btcDate)}.`;
}
