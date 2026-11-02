type CaptionIssuer = {
  ticker?: string;
  name?: string;
  value?: number | null;
  formattedValue?: string;
};

type CaptionLargest = {
  ticker?: string;
  issuer?: string;
  value?: number | null;
  formattedValue?: string;
};

type CaptionPanel = {
  asset?: string;
  date?: string | null;
  netFlow?: number | null;
  formattedNet?: string;
  largest?: CaptionLargest | null;
  cumulative?: number | null;
  formattedCumulative?: string;
  issuers?: CaptionIssuer[];
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

function emojiFor(direction: string) {
  if (direction === "inflow") return "🟢";
  if (direction === "outflow") return "🔴";
  return "⚪";
}

function assetSummary(label: string, panel: CaptionPanel) {
  const net = Number(panel.netFlow);
  const direction = directionOf(Number.isFinite(net) ? net : 0);
  return `${label}: ${String(panel.formattedNet || "").trim() || "n/a"} net ${direction} ${emojiFor(direction)}`;
}

function driverLine(panel: CaptionPanel, withName: boolean) {
  const value = Number(panel.largest?.value ?? panel.netFlow);
  const word =
    value > 0 ? "Largest inflow" : value < 0 ? "Largest outflow" : "Largest move";
  const ticker = String(panel.largest?.ticker || "").trim();
  const amount = String(panel.largest?.formattedValue || "").trim();
  if (!ticker || !amount) return `${word}: n/a`;
  const issuer = String(panel.largest?.issuer || "").trim();
  const name = withName && issuer ? ` (${issuer})` : "";
  return `${word}: $${ticker}${name} ${amount}`;
}

function alsoParts(panel: CaptionPanel) {
  const direction = directionOf(Number(panel.netFlow));
  const driver = String(panel.largest?.ticker || "").toUpperCase();
  return (panel.issuers || []).flatMap((row) => {
    const value = Number(row.value);
    const ticker = String(row.ticker || row.name || "").trim();
    const amount = String(row.formattedValue || "").trim();
    if (!ticker || !amount || !Number.isFinite(value) || value === 0) return [];
    if (ticker.toUpperCase() === driver) return [];
    if (direction === "outflow" && value >= 0) return [];
    if (direction === "inflow" && value <= 0) return [];
    if (direction === "flat") return [];
    return [`${ticker} ${amount}`];
  });
}

function requirePanel(panel: CaptionPanel | undefined, asset: "BTC" | "ETH") {
  if (!panel) {
    throw new Error(`BTC+ETH ETF caption requires a ${asset} panel.`);
  }
  if (!String(panel.formattedNet || "").trim()) {
    throw new Error(`BTC+ETH ETF caption requires a formatted ${asset} net flow.`);
  }
  if (!String(panel.formattedCumulative || "").trim()) {
    throw new Error(`BTC+ETH ETF caption requires a formatted ${asset} cumulative flow.`);
  }
  if (!String(panel.largest?.ticker || "").trim() || !String(panel.largest?.formattedValue || "").trim()) {
    throw new Error(`BTC+ETH ETF caption requires the largest ${asset} issuer.`);
  }
  return panel;
}

/**
 * Caption for the combined daily card. Numbers come from the Farside snapshot
 * panels (`series.cards`), which are the same strings drawn on the card.
 * Optional issuer tails, names, and hashtags drop until the post is <= 280.
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
  const btcAlso = alsoParts(btc);
  const ethAlso = alsoParts(eth);
  const btcDirection = directionOf(Number(btc.netFlow));
  const ethDirection = directionOf(Number(eth.netFlow));

  const render = (btcCount: number, ethCount: number, withNames: boolean, hashtags: boolean) => {
    const btcAlsoLine =
      btcCount > 0
        ? `${btcDirection === "inflow" ? "Also in" : "Also out"}: ${btcAlso.slice(0, btcCount).join(" · ")}`
        : null;
    const ethAlsoLine =
      ethCount > 0
        ? `${ethDirection === "inflow" ? "Also in" : "Also out"}: ${ethAlso.slice(0, ethCount).join(" · ")}`
        : null;
    return [
      header,
      "",
      assetSummary("Bitcoin ETFs", btc),
      driverLine(btc, withNames),
      ...(btcAlsoLine ? [btcAlsoLine] : []),
      "",
      assetSummary("Ethereum ETFs", eth),
      driverLine(eth, withNames),
      ...(ethAlsoLine ? [ethAlsoLine] : []),
      "",
      `Cumulative: BTC ${btc.formattedCumulative} · ETH ${eth.formattedCumulative}`,
      "",
      "Source: Farside",
      ...(hashtags ? ["#Bitcoin #Ethereum #ETF"] : []),
    ].join("\n");
  };

  let best: string | null = null;
  let bestScore = -1;
  for (const withNames of [true, false]) {
    for (const hashtags of [true, false]) {
      for (let btcCount = btcAlso.length; btcCount >= 0; btcCount -= 1) {
        for (let ethCount = ethAlso.length; ethCount >= 0; ethCount -= 1) {
          const text = render(btcCount, ethCount, withNames, hashtags);
          if (xWeightedLength(text) > 280) continue;
          const score =
            (withNames ? 1_000_000 : 0) +
            (hashtags ? 10_000 : 0) +
            (btcCount + ethCount) * 100 +
            btcCount;
          if (score > bestScore) {
            best = text;
            bestScore = score;
          }
        }
      }
    }
  }
  if (best) return best;

  let trimmed = render(0, 0, false, false);
  while (xWeightedLength(trimmed) > 280 && trimmed.length > 0) {
    trimmed = [...trimmed].slice(0, -1).join("");
  }
  return trimmed;
}
