/**
 * Skip rules for the Chain Revenue weekly and monthly X shares.
 *
 * The period posts only when every UTC day passes the daily completeness gate.
 * The recorded key is the period start (Monday, or the first of the month).
 * A recorded live post blocks every later run of that period. A recorded
 * dry-run blocks later dry-runs only, so a live post of the same period can
 * still go out. Each card has its own posted-state.json.
 *
 * The weekly card also waits until the daily for the week's last day (Sunday)
 * is in the daily posted-state and at least 60 minutes have passed. A missing
 * timestamp does not count as time already waited.
 */
import {
  blockingPosts,
  ensureShareTimestamps,
  readPostState,
  recordShare,
  sharePostedAtMs,
} from "./x-btc-eth-etf-share-gate.mjs";

export { ensureShareTimestamps, readPostState, recordShare };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const WEEKLY_AFTER_DAILY_MS = 60 * 60 * 1000;

/** Sunday's daily must already be posted, and posted at least 60 minutes ago. */
function sundayDailyGap({ weekEnd, dailyPosts, now, dryRun }) {
  const end = DATE.test(String(weekEnd || "")) ? String(weekEnd) : null;
  if (!end) {
    return {
      ready: false,
      reason: "daily_first",
      at: null,
      message: "Chain revenue weekly is waiting for the Sunday daily post.",
    };
  }
  const rows = blockingPosts(dailyPosts, dryRun).filter((post) => post.date === end);
  if (!rows.length) {
    return {
      ready: false,
      reason: "daily_first",
      at: null,
      message: `Chain revenue daily ${end} is not posted yet, so the weekly waits for a later run.`,
    };
  }
  const times = rows.map((post) => sharePostedAtMs(post.at)).filter((ms) => ms != null).sort((a, b) => a - b);
  if (!times.length) {
    return {
      ready: false,
      reason: "daily_recent",
      at: null,
      message: `Chain revenue daily ${end} is posted but has no timestamp. Waiting 60 minutes after one is stored.`,
    };
  }
  const at = new Date(times[0]).toISOString();
  const elapsed = now instanceof Date && !Number.isNaN(now.getTime()) ? now.getTime() - times[0] : -1;
  if (elapsed < WEEKLY_AFTER_DAILY_MS) {
    return {
      ready: false,
      reason: "daily_recent",
      at,
      message: `Chain revenue daily ${end} was posted at ${at}. The weekly waits until 60 minutes after that post.`,
    };
  }
  return { ready: true, reason: null, at, message: null };
}

export function decideChainRevenuePeriodShare({
  assessment,
  expectedStart,
  dryRun,
  posts,
  label = "period",
  dailyPosts,
  now,
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
  if (Array.isArray(dailyPosts)) {
    const gap = sundayDailyGap({ weekEnd: assessment.end, dailyPosts, now, dryRun });
    if (!gap.ready) {
      return {
        proceed: false,
        skipped: true,
        reason: gap.reason,
        noNewSession: false,
        date: start,
        coverage,
        dailyPostedAt: gap.at,
        message: gap.message,
      };
    }
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
