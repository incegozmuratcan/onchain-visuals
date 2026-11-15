/**
 * Skip rules for the combined BTC+ETH ETF monthly X share.
 * The date key is the first calendar day of the target month.
 * A recorded live post blocks every later run of that month. A recorded dry-run
 * blocks later dry-runs only, so a same-month live post can still go out.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

export function decideMonthlyEtfShare({ month, dryRun, posts }) {
  const monthStart = month?.monthStart && /^\d{4}-\d{2}-\d{2}$/.test(String(month.monthStart))
    ? String(month.monthStart)
    : null;
  if (!month?.complete || !monthStart) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: monthStart,
      tradingDays: month?.tradingDays || [],
      message: month?.message || "Monthly Farside session is not ready to share.",
    };
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === monthStart);
  if (recorded || (newest && monthStart <= newest)) {
    const reason = recorded ? "already_posted" : "no_new_session";
    const message = recorded
      ? `ETF month ${monthStart} was already shared. No new Farside month to post.`
      : `No new Farside month after ${newest}. Not posting ${monthStart}.`;
    return {
      proceed: false,
      skipped: true,
      reason,
      noNewSession: true,
      date: monthStart,
      tradingDays: month.tradingDays || [],
      message,
    };
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: monthStart,
    tradingDays: month.tradingDays || [],
    message: month.message || `Sharing ETF month ${monthStart}.`,
  };
}
