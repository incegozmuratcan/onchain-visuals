/**
 * Previous calendar month for the combined BTC+ETH ETF card.
 * A trading day is a weekday that is not an NYSE holiday. The month is ready
 * only when every one of those days has a numeric total and numeric issuer
 * cells in both Farside tables. Dash shells are unfinished, not zeros.
 * Weeks are Monday–Friday buckets clipped to this month's trading days, so a
 * holiday is omitted and a one-day week is its own box.
 * The target month follows the Europe/Istanbul calendar, which is the clock
 * the days 1–5 cron uses. America/New_York is still the holiday calendar.
 */
import {
  cumulativeThrough,
  dayFill,
  isNyseHoliday,
  mondayOf,
  topIssuers,
  totalOn,
  type EtfFlowInput,
  type WeeklyIssuerModel,
} from "./btcEthEtfWeek";

export type { EtfFlowInput };

export type MonthWeekModel = {
  weekStart: string;
  start: string;
  end: string;
  label: string;
  dates: string[];
  value: number;
};

export type MonthlyPanelModel = {
  asset: "BTC" | "ETH";
  monthStart: string;
  monthEnd: string;
  periodLabel: string;
  captionRange: string;
  priorMonthLabel: string;
  metricLabel: "NET INFLOW" | "NET OUTFLOW";
  netFlow: number;
  priorMonth: number | null;
  cumulative: number;
  weeks: MonthWeekModel[];
  issuers: WeeklyIssuerModel[];
};

export type MonthDecision = {
  complete: boolean;
  blocked: boolean;
  monthStart: string | null;
  monthEnd: string | null;
  year: number | null;
  monthIndex: number | null;
  tradingDays: string[];
  problems: string[];
  message: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
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

function utcDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function iso(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function istanbulDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Previous calendar month in Europe/Istanbul. */
export function previousCalendarMonth(now: Date = new Date()) {
  const [yearStr, monthStr] = istanbulDate(now).split("-");
  let year = Number(yearStr);
  let monthIndex = Number(monthStr) - 2;
  if (monthIndex < 0) {
    monthIndex = 11;
    year -= 1;
  }
  return { year, monthIndex };
}

export function monthBounds(year: number, monthIndex: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return { monthStart: iso(year, monthIndex, 1), monthEnd: iso(year, monthIndex, last) };
}

export function monthTradingDays(year: number, monthIndex: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const days: string[] = [];
  for (let day = 1; day <= last; day += 1) {
    const date = iso(year, monthIndex, day);
    const dow = utcDate(date).getUTCDay();
    if (dow === 0 || dow === 6 || isNyseHoliday(date)) continue;
    days.push(date);
  }
  return days;
}

export function formatMonthHeading(year: number, monthIndex: number, style: "card" | "caption") {
  const name = MONTHS_FULL[monthIndex] || "";
  return style === "card" ? `${name.toUpperCase()} ${year}` : `${name} ${year}`;
}

export function priorMonthChipLabel(year: number, monthIndex: number) {
  const previous = monthIndex === 0 ? 11 : monthIndex - 1;
  return `PRIOR MONTH · ${MONTHS[previous].toUpperCase()}`;
}

/** "Oct 1–2", or "May 1" when the bucket has a single trading day. */
export function formatTradingSpan(start: string, end: string) {
  const startDate = utcDate(start);
  const endDate = utcDate(end);
  const startMonth = MONTHS[startDate.getUTCMonth()];
  const startDay = startDate.getUTCDate();
  if (start === end) return `${startMonth} ${startDay}`;
  const endMonth = MONTHS[endDate.getUTCMonth()];
  const endDay = endDate.getUTCDate();
  const sameMonth =
    startDate.getUTCMonth() === endDate.getUTCMonth() &&
    startDate.getUTCFullYear() === endDate.getUTCFullYear();
  if (sameMonth) return `${startMonth} ${startDay}–${endDay}`;
  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

export function groupTradingWeeks(dates: string[]) {
  const groups = new Map<string, string[]>();
  for (const date of dates) {
    const monday = mondayOf(date);
    const list = groups.get(monday) || [];
    list.push(date);
    groups.set(monday, list);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, days]) => {
      const sorted = [...days].sort();
      return { weekStart, dates: sorted };
    });
}

function rowsFor(rows: EtfFlowInput[], asset: "BTC" | "ETH") {
  return rows.filter((row) => !row.asset || row.asset === asset);
}

function shiftMonth(year: number, monthIndex: number, delta: number) {
  const date = new Date(Date.UTC(year, monthIndex + delta, 1));
  return { year: date.getUTCFullYear(), monthIndex: date.getUTCMonth() };
}

function priorMonthNet(rows: EtfFlowInput[], year: number, monthIndex: number) {
  const previous = shiftMonth(year, monthIndex, -1);
  const expected = monthTradingDays(previous.year, previous.monthIndex);
  if (!expected.length) return null;
  let sum = 0;
  for (const date of expected) {
    if (dayFill(rows, date) !== "complete") return null;
    const total = totalOn(rows, date);
    if (total == null) return null;
    sum += total;
  }
  return sum;
}

function emptyDecision(message: string): MonthDecision {
  return {
    complete: false,
    blocked: true,
    monthStart: null,
    monthEnd: null,
    year: null,
    monthIndex: null,
    tradingDays: [],
    problems: [message],
    message,
  };
}

export function assessMonth(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  year: number,
  monthIndex: number,
): MonthDecision {
  const expected = monthTradingDays(year, monthIndex);
  const bounds = monthBounds(year, monthIndex);
  const problems: string[] = [];
  const filled: string[] = [];
  for (const date of expected) {
    const btc = dayFill(btcRows, date);
    const eth = dayFill(ethRows, date);
    if (btc === "complete" && eth === "complete") {
      filled.push(date);
      continue;
    }
    problems.push(`${date} BTC ${btc}, ETH ${eth}`);
  }
  const allComplete = expected.length > 0 && filled.length === expected.length;
  const heading = formatMonthHeading(year, monthIndex, "caption");
  const problemText = problems.length ? `${problems.join("; ")}.` : "No completed trading days.";
  const message = allComplete
    ? `Sharing ETF month ${heading}.`
    : `Monthly Farside session is not ready to share. ${problemText}`;
  return {
    complete: allComplete,
    blocked: !allComplete,
    monthStart: bounds.monthStart,
    monthEnd: bounds.monthEnd,
    year,
    monthIndex,
    tradingDays: allComplete ? expected : filled,
    problems,
    message,
  };
}

/**
 * Month the days 1–5 job is allowed to share: the previous Istanbul calendar month.
 * An incomplete month blocks the run. It does not fall back to an earlier month.
 */
export function selectPostingMonth(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  now: Date = new Date(),
): MonthDecision {
  const target = previousCalendarMonth(now);
  if (!Number.isFinite(target.year) || target.monthIndex < 0) {
    return emptyDecision("The previous calendar month is not available.");
  }
  return assessMonth(rowsFor(btcRows, "BTC"), rowsFor(ethRows, "ETH"), target.year, target.monthIndex);
}

function panelFor(asset: "BTC" | "ETH", rows: EtfFlowInput[], month: MonthDecision): MonthlyPanelModel {
  const groups = groupTradingWeeks(month.tradingDays);
  const weeks = groups.map((group) => {
    const value = group.dates.reduce((sum, date) => sum + (totalOn(rows, date) || 0), 0);
    return {
      weekStart: group.weekStart,
      start: group.dates[0],
      end: group.dates[group.dates.length - 1],
      label: formatTradingSpan(group.dates[0], group.dates[group.dates.length - 1]),
      dates: group.dates,
      value,
    };
  });
  const netFlow = weeks.reduce((sum, week) => sum + week.value, 0);
  const dailySum = month.tradingDays.reduce((sum, date) => sum + (totalOn(rows, date) || 0), 0);
  if (Math.abs(dailySum - netFlow) > 0.5) {
    throw new Error(`${asset} week buckets ${netFlow} do not equal the month total ${dailySum}.`);
  }
  const last = month.tradingDays[month.tradingDays.length - 1];
  const year = month.year ?? 0;
  const monthIndex = month.monthIndex ?? 0;
  return {
    asset,
    monthStart: month.monthStart || "",
    monthEnd: month.monthEnd || "",
    periodLabel: formatMonthHeading(year, monthIndex, "card"),
    captionRange: formatMonthHeading(year, monthIndex, "caption"),
    priorMonthLabel: priorMonthChipLabel(year, monthIndex),
    metricLabel: netFlow >= 0 ? "NET INFLOW" : "NET OUTFLOW",
    netFlow,
    priorMonth: month.monthStart ? priorMonthNet(rows, year, monthIndex) : null,
    cumulative: last ? cumulativeThrough(rows, last) : 0,
    weeks,
    issuers: topIssuers(rows, month.tradingDays),
  };
}

export function buildMonthlyPanels(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  now: Date = new Date(),
) {
  const decision = selectPostingMonth(btcRows, ethRows, now);
  if (!decision.complete || !decision.tradingDays.length) {
    return { decision, panels: null as MonthlyPanelModel[] | null };
  }
  const btc = rowsFor(btcRows, "BTC");
  const eth = rowsFor(ethRows, "ETH");
  return {
    decision,
    panels: [panelFor("BTC", btc, decision), panelFor("ETH", eth, decision)],
  };
}
