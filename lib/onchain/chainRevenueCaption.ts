type CaptionSnapshot = {
  datasetSlug?: string;
  metadata?: { latestCompletedDate?: string | null; layout?: string };
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const PANEL_MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** X counts supplementary-plane emoji as two characters. */
export function xWeightedLength(text: string) {
  let length = 0;
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    length += code > 0xffff ? 2 : 1;
  }
  return length;
}

function parts(day: string) {
  if (!DATE_RE.test(day)) throw new Error(`Chain Revenue caption requires a YYYY-MM-DD day, got ${day || "none"}.`);
  const [year, month, date] = day.split("-").map(Number);
  return { year, month: month - 1, date };
}

/** "November 21". Full month name, no year. The card already shows the year. */
export function formatChainRevenueFullDay(day: string) {
  const parsed = parts(day);
  return `${FULL_MONTHS[parsed.month]} ${parsed.date}`;
}

/**
 * Plain question in simple English so X's translate button reads cleanly in any
 * language. The date is the UTC day drawn on the card. The card carries the
 * numbers. No hashtags, cashtags, or emoji.
 */
export function buildChainRevenueDailyCaption(snapshot: CaptionSnapshot) {
  return `How much revenue did blockchains generate on ${formatChainRevenueFullDay(String(snapshot?.metadata?.latestCompletedDate || ""))}?`;
}

export type ChainRevenuePeriodCopy = {
  subtitle: string;
  panelDay: string;
  panelYear: string;
  caption: string;
};

/** Card copy and caption for a Monday–Sunday week. */
export function chainRevenueWeekCopy(start: string, end: string): ChainRevenuePeriodCopy {
  const first = parts(start);
  const last = parts(end);
  if (start > end) throw new Error(`Chain Revenue week ${start} starts after ${end}.`);
  const sameMonth = first.year === last.year && first.month === last.month;
  const sameYear = first.year === last.year;
  const subtitleRange = sameMonth
    ? `${SHORT_MONTHS[first.month]} ${first.date}–${last.date}, ${first.year}`
    : sameYear
      ? `${SHORT_MONTHS[first.month]} ${first.date}–${SHORT_MONTHS[last.month]} ${last.date}, ${first.year}`
      : `${SHORT_MONTHS[first.month]} ${first.date}, ${first.year}–${SHORT_MONTHS[last.month]} ${last.date}, ${last.year}`;
  const panelDay = sameMonth
    ? `${PANEL_MONTHS[first.month]} ${first.date}–${last.date}`
    : `${PANEL_MONTHS[first.month]} ${first.date}–${PANEL_MONTHS[last.month]} ${last.date}`;
  const captionRange = sameYear
    ? `${FULL_MONTHS[first.month]} ${first.date} – ${FULL_MONTHS[last.month]} ${last.date}`
    : `${FULL_MONTHS[first.month]} ${first.date}, ${first.year} – ${FULL_MONTHS[last.month]} ${last.date}, ${last.year}`;
  return {
    subtitle: `Revenue captured by the blockchains themselves, ${subtitleRange}.`,
    panelDay,
    panelYear: sameYear ? String(first.year) : `${first.year}–${last.year}`,
    caption: `How much revenue did blockchains generate last week? (${captionRange})`,
  };
}

/** Card copy and caption for one calendar month. `start` is the first UTC day. */
export function chainRevenueMonthCopy(start: string): ChainRevenuePeriodCopy {
  const parsed = parts(start);
  const full = `${FULL_MONTHS[parsed.month]} ${parsed.year}`;
  return {
    subtitle: `Revenue captured by the blockchains themselves, ${full}.`,
    panelDay: PANEL_MONTHS[parsed.month],
    panelYear: String(parsed.year),
    caption: `How much revenue did blockchains generate over the full month of ${full}?`,
  };
}

export function buildChainRevenueWeeklyCaption(start: string, end: string) {
  return chainRevenueWeekCopy(start, end).caption;
}

export function buildChainRevenueMonthlyCaption(start: string) {
  return chainRevenueMonthCopy(start).caption;
}
