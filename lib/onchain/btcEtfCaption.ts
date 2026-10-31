type CaptionMetric = {
  label?: string;
  formattedValue?: string;
  value?: number | null;
};

type CaptionRow = {
  ticker?: string;
  name?: string;
  value?: number | null;
};

type CaptionSnapshot = {
  title?: string;
  metadata?: { latestCompletedDate?: string | null };
  headlineMetrics?: CaptionMetric[];
  series?: { tables?: CaptionRow[] };
};

function trimCompactFraction(formatted: string) {
  return formatted.replace(/\.(\d*?)0+(?=\D|$)/g, (_, digits: string) =>
    digits ? `.${digits}` : "",
  );
}

function signedCompactUsd(value: number) {
  const abs = trimCompactFraction(
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(Math.abs(value)),
  );
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return abs;
}

function longDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** X counts supplementary-plane emoji as two characters. */
export function xWeightedLength(text: string) {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    length += code > 0xffff ? 2 : 1;
  }
  return length;
}

function driverLine(metric: CaptionMetric, rows: CaptionRow[]) {
  const value = Number(metric.value);
  const word =
    value > 0 ? "Largest inflow" : value < 0 ? "Largest outflow" : "Largest move";
  const formatted = String(metric.formattedValue || "").trim();
  const match = formatted.match(/^(\S+)\s+(.+)$/);
  if (!match) return `${word}: ${formatted || "n/a"}`;
  const ticker = match[1];
  const amount = match[2];
  const row = rows.find(
    (item) => String(item.ticker || "").toUpperCase() === ticker.toUpperCase(),
  );
  const name = row?.name ? ` (${row.name})` : "";
  return `${word}: $${ticker}${name} ${amount}`;
}

function fitCaption(lines: {
  header: string;
  summary: string;
  driver: string;
  cumulative: string;
  alsoPrefix: string;
  alsoParts: string[];
}) {
  const base = (also: string | null, hashtags: boolean) => {
    const body = [
      lines.header,
      "",
      lines.summary,
      lines.driver,
      ...(also ? [also] : []),
      lines.cumulative,
      "",
      "Source: Farside",
      ...(hashtags ? ["#Bitcoin #ETF"] : []),
    ];
    return body.join("\n");
  };

  for (let count = lines.alsoParts.length; count >= 0; count -= 1) {
    const also = count
      ? `${lines.alsoPrefix}: ${lines.alsoParts.slice(0, count).join(" · ")}`
      : null;
    const withTags = base(also, true);
    if (xWeightedLength(withTags) <= 280) return withTags;
  }
  const bare = base(null, false);
  if (xWeightedLength(bare) <= 280) return bare;
  return [...bare].slice(0, 280).join("");
}

export function buildBtcEtfDailyCaption(snapshot: CaptionSnapshot) {
  const date = snapshot?.metadata?.latestCompletedDate;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("BTC ETF caption requires metadata.latestCompletedDate.");
  }
  const metrics = snapshot.headlineMetrics || [];
  if (metrics.length < 3) {
    throw new Error("BTC ETF caption requires net, driver, and cumulative metrics.");
  }
  const [net, driver, cumulative] = metrics;
  const netValue = Number(net?.value);
  const direction = netValue > 0 ? "inflow" : netValue < 0 ? "outflow" : "flat";
  const emoji = direction === "inflow" ? "🟢" : direction === "outflow" ? "🔴" : "⚪";
  const rows = snapshot.series?.tables || [];
  const driverTicker = String(driver?.formattedValue || "").split(/\s+/)[0] || "";
  const sameSign = rows.filter((row) => {
    const value = Number(row.value);
    if (!Number.isFinite(value) || value === 0) return false;
    if (String(row.ticker || "").toUpperCase() === driverTicker.toUpperCase()) return false;
    if (direction === "outflow") return value < 0;
    if (direction === "inflow") return value > 0;
    return false;
  });

  return fitCaption({
    header: `${snapshot.title || "BTC ETF Daily Flowboard"} — ${longDate(date)}`,
    summary: `US spot Bitcoin ETFs: ${net?.formattedValue || "n/a"} net ${direction} ${emoji}`,
    driver: driverLine(driver || {}, rows),
    cumulative: `Cumulative net flow: ${cumulative?.formattedValue || "n/a"}`,
    alsoPrefix: direction === "inflow" ? "Also in" : "Also out",
    alsoParts: sameSign.map(
      (row) => `${row.ticker || row.name} ${signedCompactUsd(Number(row.value))}`,
    ),
  });
}
