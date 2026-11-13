/**
 * Skip rules for the combined BTC+ETH ETF weekly X share.
 * The date key is the Monday of the trading week.
 * A recorded live post blocks every later run of that week. A recorded dry-run
 * blocks later dry-runs only, so a same-week live post can still go out.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

export function decideWeeklyEtfShare({ week, dryRun, posts }) {
  const weekStart = week?.weekStart && /^\d{4}-\d{2}-\d{2}$/.test(String(week.weekStart))
    ? String(week.weekStart)
    : null;
  if (!week?.complete || !weekStart) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: weekStart,
      tradingDays: week?.tradingDays || [],
      message: week?.message || "Weekly Farside session is not ready to share.",
    };
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === weekStart);
  if (recorded || (newest && weekStart <= newest)) {
    const reason = recorded ? "already_posted" : "no_new_session";
    const message = recorded
      ? `ETF week ${weekStart} was already shared. No new Farside week to post.`
      : `No new Farside week after ${newest}. Not posting ${weekStart}.`;
    return {
      proceed: false,
      skipped: true,
      reason,
      noNewSession: true,
      date: weekStart,
      tradingDays: week.tradingDays || [],
      message,
    };
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
