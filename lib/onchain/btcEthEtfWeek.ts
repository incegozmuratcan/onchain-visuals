/**
 * Completed Mon–Fri weeks for the combined BTC+ETH ETF card.
 * A trading day is a weekday that is not an NYSE holiday. The week is ready
 * only when every one of those days has a numeric total and numeric issuer
 * cells in both Farside tables. Dash shells are unfinished, not zeros.
 * Holiday dates are omitted, so a short week never renders an empty box.
 */

export type EtfFlowInput = {
  date: string;
  asset?: "BTC" | "ETH" | string;
  issuer: string;
  ticker: string;
  flowUsd: number | null;
  isTotal: boolean;
};

export type WeeklyDayModel = {
  date: string;
  label: string;
  value: number;
};

export type WeeklyIssuerModel = {
  ticker: string;
  name: string;
  value: number;
};

export type WeeklyPanelModel = {
  asset: "BTC" | "ETH";
  weekStart: string;
  weekEnd: string;
  periodLabel: string;
  captionRange: string;
  metricLabel: "NET INFLOW" | "NET OUTFLOW";
  netFlow: number;
  priorWeek: number | null;
  cumulative: number;
  days: WeeklyDayModel[];
  issuers: WeeklyIssuerModel[];
};

export type WeekDecision = {
  complete: boolean;
  /** Still inside the week, and every past trading day is already filled. */
  open: boolean;
  /** The week has ended (or a session started printing) but it is not shareable. */
  blocked: boolean;
  weekStart: string | null;
  weekEnd: string | null;
  tradingDays: string[];
  problems: string[];
  message: string;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const ISSUER_LABELS: Record<string, string> = {
  GBTC: "Grayscale",
  ETHE: "Grayscale",
  ETHB: "BlackRock Staked",
  BTC: "Grayscale Mini",
  ETH: "Grayscale Mini",
};

function finite(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value);
}

function utcDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number) {
  const date = utcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function iso(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

export function nyDate(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function mondayOf(isoDate: string) {
  const day = utcDate(isoDate).getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  return addDays(isoDate, delta);
}

export function weekdayLabel(isoDate: string) {
  return WEEKDAY_LABELS[utcDate(isoDate).getUTCDay()] || "";
}

function nthWeekdayOfMonth(year: number, monthIndex: number, weekday: number, n: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const delta = (weekday - first.getUTCDay() + 7) % 7;
  return iso(year, monthIndex, 1 + delta + (n - 1) * 7);
}

function lastWeekdayOfMonth(year: number, monthIndex: number, weekday: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0));
  const delta = (last.getUTCDay() - weekday + 7) % 7;
  return iso(year, monthIndex, last.getUTCDate() - delta);
}

/** Saturday holidays are observed Friday. Sunday holidays are observed Monday. */
function observeFixed(year: number, monthIndex: number, day: number) {
  const date = iso(year, monthIndex, day);
  const dow = utcDate(date).getUTCDay();
  if (dow === 6) return addDays(date, -1);
  if (dow === 0) return addDays(date, 1);
  return date;
}

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month - 1, day);
}

const holidayCache = new Map<number, Set<string>>();

export function nyseHolidays(year: number) {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const set = new Set<string>();
  set.add(observeFixed(year, 0, 1));
  set.add(nthWeekdayOfMonth(year, 0, 1, 3));
  set.add(nthWeekdayOfMonth(year, 1, 1, 3));
  set.add(addDays(easterSunday(year), -2));
  set.add(lastWeekdayOfMonth(year, 4, 1));
  set.add(observeFixed(year, 5, 19));
  set.add(observeFixed(year, 6, 4));
  set.add(nthWeekdayOfMonth(year, 8, 1, 1));
  set.add(nthWeekdayOfMonth(year, 10, 4, 4));
  set.add(observeFixed(year, 11, 25));
  const nextNewYear = observeFixed(year + 1, 0, 1);
  if (nextNewYear.startsWith(String(year))) set.add(nextNewYear);
  holidayCache.set(year, set);
  return set;
}

export function isNyseHoliday(isoDate: string) {
  if (!DATE_RE.test(isoDate)) return false;
  const year = Number(isoDate.slice(0, 4));
  return nyseHolidays(year).has(isoDate) || nyseHolidays(year - 1).has(isoDate);
}

export function weekdaysOf(monday: string) {
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}

export function expectedTradingDays(monday: string) {
  return weekdaysOf(monday).filter((date) => !isNyseHoliday(date));
}

export function weeklyIssuerName(ticker: string, fallback: string) {
  return ISSUER_LABELS[ticker] || fallback || ticker;
}

/**
 * Issuer underline width from the approved weekly card.
 * Square-root of the absolute share keeps a $15M print visible under a $346M print
 * (v21: 15/346 → 21%, 93/1210 → 27.7%, 48/346 → 37.2%).
 */
export function issuerBarPercent(value: number, maxAbs: number) {
  if (!Number.isFinite(value) || !Number.isFinite(maxAbs) || maxAbs <= 0) return 0;
  return Math.sqrt(Math.abs(value) / maxAbs) * 100;
}

/** Day bar length as a percent of the full track. 50 is the center-to-edge maximum. */
export function dayBarPercent(value: number, maxAbs: number) {
  if (!Number.isFinite(value) || !Number.isFinite(maxAbs) || maxAbs <= 0) return 0;
  return (Math.abs(value) / maxAbs) * 50;
}

export function formatWeekRange(start: string, end: string, style: "card" | "caption") {
  const startDate = utcDate(start);
  const endDate = utcDate(end);
  const startMonth = MONTHS[startDate.getUTCMonth()];
  const endMonth = MONTHS[endDate.getUTCMonth()];
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  const startYear = startDate.getUTCFullYear();
  const endYear = endDate.getUTCFullYear();
  const sameMonth = startMonth === endMonth && startYear === endYear;
  const sameYear = startYear === endYear;
  if (style === "card") {
    if (sameMonth) return `${startMonth} ${startDay}–${endDay}`.toUpperCase();
    if (sameYear) return `${startMonth} ${startDay}–${endMonth} ${endDay}`.toUpperCase();
    return `${startMonth} ${startDay}, ${startYear}–${endMonth} ${endDay}, ${endYear}`.toUpperCase();
  }
  if (!sameYear) return `${startMonth} ${startDay}, ${startYear}–${endMonth} ${endDay}, ${endYear}`;
  if (!sameMonth) return `${startMonth} ${startDay}–${endMonth} ${endDay}, ${endYear}`;
  return `${startMonth} ${startDay}–${endDay}, ${endYear}`;
}

type DayFill = "absent" | "placeholder" | "partial" | "complete";

function rowsOn(rows: EtfFlowInput[], date: string) {
  return rows.filter((row) => row.date === date);
}

function issuerMap(rows: EtfFlowInput[]) {
  const map = new Map<string, EtfFlowInput>();
  for (const row of rows) {
    if (row.isTotal) continue;
    const prior = map.get(row.ticker);
    if (!prior || (prior.flowUsd == null && row.flowUsd != null)) map.set(row.ticker, row);
  }
  return map;
}

export function dayFill(rows: EtfFlowInput[], date: string): DayFill {
  const day = rowsOn(rows, date);
  if (!day.length) return "absent";
  const issuers = issuerMap(day);
  if (!issuers.size || [...issuers.values()].every((row) => !finite(row.flowUsd))) return "placeholder";
  const totalReady = day.some((row) => row.isTotal && finite(row.flowUsd));
  const missing = [...issuers.values()].some((row) => !finite(row.flowUsd));
  if (!totalReady || missing) return "partial";
  return "complete";
}

function totalOn(rows: EtfFlowInput[], date: string) {
  const total = rowsOn(rows, date).find((row) => row.isTotal && finite(row.flowUsd));
  return total ? Number(total.flowUsd) : null;
}

type WeekAssessment = WeekDecision & {
  monday: string;
  expected: string[];
  partial: boolean;
};

function emptyDecision(message: string): WeekDecision {
  return {
    complete: false,
    open: false,
    blocked: true,
    weekStart: null,
    weekEnd: null,
    tradingDays: [],
    problems: [message],
    message,
  };
}

function assessWeek(btcRows: EtfFlowInput[], ethRows: EtfFlowInput[], monday: string, now: Date): WeekAssessment {
  const expected = expectedTradingDays(monday);
  const today = nyDate(now);
  const last = expected[expected.length - 1] || addDays(monday, 4);
  const problems: string[] = [];
  let partial = false;
  const filled: string[] = [];
  for (const date of expected) {
    const btc = dayFill(btcRows, date);
    const eth = dayFill(ethRows, date);
    if (btc === "partial" || eth === "partial") partial = true;
    if (btc === "complete" && eth === "complete") {
      filled.push(date);
      continue;
    }
    problems.push(`${date} BTC ${btc}, ETH ${eth}`);
  }
  const allComplete = expected.length > 0 && filled.length === expected.length;
  const ended = today > last;
  const pastIncomplete = expected.some((date) => date < today && !filled.includes(date));
  const open = !allComplete && !ended && !partial && !pastIncomplete;
  const problemText = problems.length ? `${problems.join("; ")}.` : "No completed trading days.";
  const message = allComplete
    ? `Sharing ETF week ${filled[0]}–${filled[filled.length - 1]}.`
    : `Weekly Farside session is not ready to share. ${problemText}`;
  return {
    complete: allComplete,
    open,
    blocked: !allComplete && !open,
    weekStart: monday,
    weekEnd: addDays(monday, 4),
    tradingDays: allComplete ? expected : filled,
    problems,
    message,
    monday,
    expected,
    partial,
  };
}

function mondaysIn(rows: EtfFlowInput[]) {
  const mondays = new Set<string>();
  for (const row of rows) {
    if (!DATE_RE.test(row.date)) continue;
    const day = utcDate(row.date).getUTCDay();
    if (day === 0 || day === 6) continue;
    mondays.add(mondayOf(row.date));
  }
  return [...mondays].sort((a, b) => b.localeCompare(a));
}

function rowsFor(rows: EtfFlowInput[], asset: "BTC" | "ETH") {
  return rows.filter((row) => !row.asset || row.asset === asset);
}

export function selectLatestCompletedWeek(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  now: Date = new Date(),
): WeekDecision {
  const mondays = mondaysIn([...btcRows, ...ethRows]);
  if (!mondays.length) return emptyDecision("Farside has no BTC or ETH sessions.");
  for (const monday of mondays) {
    const week = assessWeek(btcRows, ethRows, monday, now);
    if (week.complete) {
      return { ...week, blocked: false };
    }
  }
  const newest = assessWeek(btcRows, ethRows, mondays[0], now);
  return { ...newest, complete: false };
}

/**
 * Week the Sunday job is allowed to share.
 * An in-progress week is skipped so the previous completed week can be rendered.
 * A week that has already ended, but is missing a trading day, blocks the run.
 * Falling through would republish the prior week while this one is still incomplete.
 */
export function selectPostingWeek(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  now: Date = new Date(),
): WeekDecision {
  const mondays = mondaysIn([...btcRows, ...ethRows]);
  if (!mondays.length) return emptyDecision("Farside has no BTC or ETH sessions.");
  for (const monday of mondays) {
    const week = assessWeek(btcRows, ethRows, monday, now);
    if (week.open) continue;
    if (week.complete) return { ...week, blocked: false };
    return {
      ...week,
      complete: false,
      blocked: true,
      message: week.message,
    };
  }
  return emptyDecision("No ended ETF week is available to share.");
}

function cumulativeThrough(rows: EtfFlowInput[], lastDate: string) {
  // Farside cumulative is the running sum of daily totals. Older sessions often
  // have a dash for a fund that had not launched yet, so those days are not
  // "complete" issuer rows, but their total still counts.
  const seen = new Set<string>();
  let sum = 0;
  const dates = [...new Set(rows.map((row) => row.date))]
    .filter((date) => DATE_RE.test(date) && date <= lastDate)
    .sort();
  for (const date of dates) {
    if (seen.has(date) || dayFill(rows, date) === "placeholder" || dayFill(rows, date) === "absent") continue;
    const total = totalOn(rows, date);
    if (total == null) continue;
    seen.add(date);
    sum += total;
  }
  return sum;
}

function priorWeekNet(rows: EtfFlowInput[], monday: string) {
  const previousMonday = addDays(monday, -7);
  const expected = expectedTradingDays(previousMonday);
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

function topIssuers(rows: EtfFlowInput[], dates: string[]) {
  const totals = new Map<string, WeeklyIssuerModel>();
  for (const date of dates) {
    for (const row of issuerMap(rowsOn(rows, date)).values()) {
      if (!finite(row.flowUsd)) continue;
      const current = totals.get(row.ticker) || {
        ticker: row.ticker,
        name: weeklyIssuerName(row.ticker, row.issuer),
        value: 0,
      };
      current.value += Number(row.flowUsd);
      if (row.issuer) current.name = weeklyIssuerName(row.ticker, row.issuer);
      totals.set(row.ticker, current);
    }
  }
  return [...totals.values()]
    .filter((row) => row.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value) || a.ticker.localeCompare(b.ticker))
    .slice(0, 3);
}

function panelFor(asset: "BTC" | "ETH", rows: EtfFlowInput[], week: WeekDecision): WeeklyPanelModel {
  const days = week.tradingDays.map((date) => ({
    date,
    label: weekdayLabel(date),
    value: totalOn(rows, date) || 0,
  }));
  const netFlow = days.reduce((sum, day) => sum + day.value, 0);
  const first = week.tradingDays[0];
  const last = week.tradingDays[week.tradingDays.length - 1];
  return {
    asset,
    weekStart: week.weekStart || "",
    weekEnd: week.weekEnd || "",
    periodLabel: formatWeekRange(first, last, "card"),
    captionRange: formatWeekRange(first, last, "caption"),
    metricLabel: netFlow >= 0 ? "NET INFLOW" : "NET OUTFLOW",
    netFlow,
    priorWeek: week.weekStart ? priorWeekNet(rows, week.weekStart) : null,
    cumulative: last ? cumulativeThrough(rows, last) : 0,
    days,
    issuers: topIssuers(rows, week.tradingDays),
  };
}

export function buildWeeklyPanels(
  btcRows: EtfFlowInput[],
  ethRows: EtfFlowInput[],
  now: Date = new Date(),
) {
  const btc = rowsFor(btcRows, "BTC");
  const eth = rowsFor(ethRows, "ETH");
  const decision = selectLatestCompletedWeek(btc, eth, now);
  if (!decision.complete || !decision.tradingDays.length) {
    return { decision, panels: null as WeeklyPanelModel[] | null };
  }
  return {
    decision,
    panels: [panelFor("BTC", btc, decision), panelFor("ETH", eth, decision)],
  };
}
