/**
 * Skip rules for the combined BTC+ETH ETF weekly X share.
 * The date key is the Monday of the trading week.
 * Posts run Sunday through Tuesday (Europe/Istanbul) for the previous
 * Mon–Fri week. A recorded live post blocks every later run of that week.
 * A recorded dry-run blocks later dry-runs only. A daily post due in the
 * same run makes the weekly wait. A week is not posted once the following
 * week's weekly is due or a later week is already posted.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function istanbulDate(now) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function istanbulWeekday(now) {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Istanbul",
    weekday: "short",
  }).format(now);
  return WEEKDAYS.indexOf(name);
}

function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function weeklyWindowOpen(now) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) return false;
  const weekday = istanbulWeekday(now);
  return weekday >= 0 && weekday <= 2;
}

/** The following week's window opens on the Sunday 13 days after this Monday. */
export function followingWeeklyDue(weekStart, now) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(weekStart || "")) || !(now instanceof Date)) return false;
  return istanbulDate(now) >= addDays(String(weekStart), 13);
}

function skip(reason, weekStart, week, message, noNewSession) {
  return {
    proceed: false,
    skipped: true,
    reason,
    noNewSession,
    date: weekStart,
    tradingDays: week?.tradingDays || [],
    message,
  };
}

export function decideWeeklyEtfShare({ week, dryRun, posts, now, dailyDue = false }) {
  const weekStart = week?.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(String(week.weekStart))
    ? String(week.weekStart)
    : null;
  if ((now && !weeklyWindowOpen(now)) || week?.outsideWindow) {
    return skip(
      "outside_window",
      weekStart,
      week,
      week?.message || "ETF weekly posts Sunday through Tuesday (Europe/Istanbul).",
      false,
    );
  }
  if (!week?.complete || !weekStart) {
    return skip(
      "incomplete",
      weekStart,
      week,
      week?.message || "Weekly Farside session is not ready to share.",
      false,
    );
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === weekStart);
  if (recorded || (newest && weekStart <= newest)) {
    const reason = recorded ? "already_posted" : "no_new_session";
    const message = recorded
      ? `ETF week ${weekStart} was already shared. No new Farside week to post.`
      : `No new Farside week after ${newest}. Not posting ${weekStart}.`;
    return skip(reason, weekStart, week, message, true);
  }
  if (now && followingWeeklyDue(weekStart, now)) {
    return skip(
      "superseded",
      weekStart,
      week,
      `ETF week ${weekStart} is closed. The following week's weekly is due.`,
      true,
    );
  }
  if (dailyDue) {
    return skip(
      "daily_first",
      weekStart,
      week,
      `ETF week ${weekStart} is ready. A daily post is due, so the weekly waits for a later run.`,
      false,
    );
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: weekStart,
    tradingDays: week.tradingDays || [],
    message: week.message || `Sharing ETF week ${weekStart}.`,
  };
}
