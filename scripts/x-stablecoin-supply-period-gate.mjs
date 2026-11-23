/**
 * Skip rules for the stablecoin supply weekly and monthly X shares.
 * The recorded key is the period start (Monday, or the first of the month).
 * A live post blocks a later live post. A dry-run blocks later dry-runs only.
 * Same-day spacing with the sibling card is applied by the caller for live posts.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function decideStablecoinPeriodShare({ assessment, expectedStart, dryRun, posts, label = "period" }) {
  const start = DATE.test(String(assessment?.start || "")) ? String(assessment.start) : null;
  const coverage = assessment
    ? { start: assessment.start, end: assessment.end, chainCount: assessment.chainCount, problems: assessment.problems || [] }
    : null;
  if (!start || (expectedStart && start !== expectedStart)) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: expectedStart || start,
      coverage,
      message: `Stablecoin supply ${label} gate checked ${start || "no period"}; the share period starts ${expectedStart}.`,
    };
  }
  if (!assessment.complete) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: start,
      coverage,
      message: assessment.message || `Stablecoin supply ${label} ${start} is not complete yet.`,
    };
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === start);
  if (recorded || (newest && start <= newest)) {
    return {
      proceed: false,
      skipped: true,
      reason: recorded ? "already_posted" : "no_new_session",
      noNewSession: true,
      date: start,
      coverage,
      message: recorded
        ? `Stablecoin supply ${label} ${start} was already shared. No new period to post.`
        : `No new stablecoin supply ${label} after ${newest}. Not posting ${start}.`,
    };
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: start,
    coverage,
    message: `Sharing stablecoin supply ${label} ${start} through ${assessment.end}.`,
  };
}
