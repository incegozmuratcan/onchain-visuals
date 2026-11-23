/**
 * Skip rules for the Chain Revenue weekly and monthly X shares.
 *
 * The period posts only when every UTC day passes the daily completeness gate
 * (`assessChainRevenuePeriod`). The recorded key is the period start (Monday,
 * or the first of the month). A recorded live post blocks every later run of
 * that period. A recorded dry-run blocks later dry-runs only, so a live post
 * of the same period can still go out. Each card has its own posted-state.json.
 *
 * The weekly posts as soon as the Monday–Sunday week is complete, including
 * Sunday. It does not read the daily posted-state. Sunday uses that day's own
 * Monday 20:00 Europe/Istanbul cutoff inside the daily gate. The monthly card
 * does not read the daily posted-state either.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function decideChainRevenuePeriodShare({
  assessment,
  expectedStart,
  dryRun,
  posts,
  label = "period",
}) {
  const start = DATE.test(String(assessment?.start || "")) ? String(assessment.start) : null;
  const coverage = assessment
    ? {
        start: assessment.start,
        end: assessment.end,
        incompleteDates: assessment.incompleteDates || [],
        dayCount: (assessment.dates || []).length,
      }
    : null;
  if (!start || (expectedStart && start !== expectedStart)) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: expectedStart || start,
      coverage,
      message: `Chain revenue ${label} gate checked ${start || "no period"}; the share period starts ${expectedStart}.`,
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
      message: assessment.message || `Chain revenue ${label} ${start} is not complete yet.`,
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
        ? `Chain revenue ${label} ${start} was already shared. No new period to post.`
        : `No new chain revenue ${label} after ${newest}. Not posting ${start}.`,
    };
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: start,
    coverage,
    message: `Sharing chain revenue ${label} ${start} through ${assessment.end}. ${assessment.message || ""}`.trim(),
  };
}
