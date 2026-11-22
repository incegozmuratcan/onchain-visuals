type CaptionDay = {
  date?: string | null;
};

type CaptionPanel = {
  asset?: string;
  days?: CaptionDay[];
};

type CaptionSnapshot = {
  title?: string;
  metadata?: {
    captionRange?: string | null;
    tradingDays?: string[] | null;
  };
  series?: { cards?: CaptionPanel[] };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function panelByAsset(cards: CaptionPanel[], asset: "BTC" | "ETH") {
  return cards.find((panel) => String(panel.asset || "").toUpperCase() === asset);
}

function requirePanel(panel: CaptionPanel | undefined, asset: "BTC" | "ETH") {
  if (!panel) throw new Error(`ETF weekly caption requires a ${asset} panel.`);
  return panel;
}

function shortDate(date: string, withYear: boolean) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" as const } : {}),
  });
}

function tradingBounds(snapshot: CaptionSnapshot) {
  const listed = (snapshot.metadata?.tradingDays || []).map(String).filter((date) => DATE_RE.test(date));
  if (listed.length) return { first: listed[0], last: listed[listed.length - 1] };
  const days = snapshot.series?.cards?.[0]?.days || [];
  const dates = days.map((day) => String(day?.date || "")).filter((date) => DATE_RE.test(date));
  if (!dates.length) return null;
  return { first: dates[0], last: dates[dates.length - 1] };
}

/**
 * One sentence. The range is the first and last trading day of the week
 * ("Nov 17 – Nov 21"). Short month names. No amounts, inflow, or outflow.
 * A one-day week names that day once. A week that crosses a year includes both years.
 */
export function buildBtcEthEtfWeeklyCaption(snapshot: CaptionSnapshot) {
  const cards = snapshot.series?.cards || [];
  requirePanel(panelByAsset(cards, "BTC"), "BTC");
  requirePanel(panelByAsset(cards, "ETH"), "ETH");
  const bounds = tradingBounds(snapshot);
  if (!bounds) throw new Error("ETF weekly caption requires the week's trading days.");
  const crossYear = bounds.first.slice(0, 4) !== bounds.last.slice(0, 4);
  const startLabel = shortDate(bounds.first, crossYear);
  const endLabel = shortDate(bounds.last, crossYear);
  const range = bounds.first === bounds.last ? startLabel : `${startLabel} – ${endLabel}`;
  return `Here are the Bitcoin and Ethereum ETF flows for the week of ${range}.`;
}
