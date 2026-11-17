/**
 * Skip rules for the Chain Revenue Daily X share.
 *
 * The share day is always the latest completed UTC day (yesterday in UTC), so
 * the caption's "yesterday" stays true. It posts only when DefiLlama has filled
 * that day: the chain count reaches 95% of the median of the previous three
 * days AND every chain from the previous day's top 10 has revenue on it. An
 * incomplete day skips with exit 0 so a later trigger can try again. An older
 * day is never posted late.
 *
 * A recorded live post blocks every later run of that day. A recorded dry-run
 * blocks later dry-runs only, so a same-day live post can still go out.
 */
import { blockingPosts, readPostState, recordShare } from "./x-btc-eth-etf-share-gate.mjs";

export { readPostState, recordShare };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function coverageSummary(assessment) {
  if (!assessment) return null;
  return {
    chainCount: assessment.chainCount,
    threshold: assessment.threshold,
    priorDates: assessment.priorDates,
    priorCounts: assessment.priorCounts,
    missingPriorTop: assessment.missingPriorTop,
    total: Math.round(Number(assessment.total) || 0),
  };
}

export function decideChainRevenueShare({ assessment, expectedDate, dryRun, posts }) {
  const date = DATE.test(String(assessment?.date || "")) ? String(assessment.date) : null;
  const coverage = coverageSummary(assessment);
  if (!date || (expectedDate && date !== expectedDate)) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: expectedDate || date,
      coverage,
      message: `Chain revenue gate checked ${date || "no day"}; the share day is ${expectedDate}.`,
    };
  }
  if (!assessment.complete) {
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date,
      coverage,
      message: assessment.message || `Chain revenue ${date} is not complete yet.`,
    };
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === date);
  if (recorded || (newest && date <= newest)) {
    return {
      proceed: false,
      skipped: true,
      reason: recorded ? "already_posted" : "no_new_session",
      noNewSession: true,
      date,
      coverage,
      message: recorded
        ? `Chain revenue ${date} was already shared. No new UTC day to post.`
        : `No new chain revenue day after ${newest}. Not posting ${date}.`,
    };
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date,
    coverage,
    message: `Sharing chain revenue ${date}. ${assessment.message || ""}`.trim(),
  };
}
