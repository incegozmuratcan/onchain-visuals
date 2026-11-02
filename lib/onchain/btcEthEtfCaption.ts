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

function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function panelByAsset(cards: CaptionPanel[], asset: "BTC" | "ETH") {
  return cards.find((panel) => String(panel.asset || "").toUpperCase() === asset);
}

function completedDate(panel: CaptionPanel, fallback?: string | null) {
  const date = String(panel.date || fallback || "");
  return DATE_RE.test(date) ? date : "";
}

function directionOf(value: number) {
  if (value > 0) return "inflow";
  if (value < 0) return "outflow";
  return "flat";
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

function assetLine(label: string, panel: CaptionPanel) {
  const net = Number(panel.netFlow);
  const direction = directionOf(Number.isFinite(net) ? net : 0);
  return `${label}: ${String(panel.formattedNet || "").trim()} net ${direction}`;
}

/**
 * Caption for the combined daily card. Amounts are the hero strings already
 * drawn on each panel (`formattedNet`). X allows one cashtag per post, so this
 * caption has no tickers, issuer lines, cumulative totals, source line, or hashtags.
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

  const header =
    btcDate === ethDate
      ? `${snapshot.title || "ETF Daily Flowboard"} — ${longDate(btcDate)}`
      : `${snapshot.title || "ETF Daily Flowboard"} — BTC ${longDate(btcDate)} · ETH ${longDate(ethDate)}`;

  return [header, "", assetLine("Bitcoin ETFs", btc), "", assetLine("Ethereum ETFs", eth)].join("\n");
}
