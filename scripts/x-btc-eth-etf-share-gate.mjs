/**
 * Skip rules for the combined BTC+ETH ETF daily X share.
 * A dash, blank, or missing issuer cell is incomplete. Explicit 0 is filled.
 * A recorded live post blocks every later run of that date. A recorded dry-run
 * blocks later dry-runs only, so a same-day live post can still go out.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function tickerList(tickers) {
  const list = Array.isArray(tickers) ? tickers : [];
  if (!list.length) return "";
  const shown = list.slice(0, 12).join(", ");
  return list.length > 12 ? `${shown}, and ${list.length - 12} more` : shown;
}

function assetProblem(label, fill) {
  if (!fill?.date) return `${label} has no session row`;
  if (fill.complete) return null;
  const why = [];
  if (fill.missingTickers?.length) why.push(`missing ${tickerList(fill.missingTickers)}`);
  if (!fill.totalReady) why.push("total is not a number");
  if (!why.length) why.push("row is incomplete");
  return `${label} ${fill.date} ${why.join("; ")}`;
}

export function blockingPosts(posts, dryRun) {
  return (Array.isArray(posts) ? posts : []).filter((post) => {
    if (!post || !DATE.test(String(post.date || ""))) return false;
    if (post.mode === "live") return true;
    return Boolean(dryRun) && post.mode === "dry-run";
  });
}

/**
 * One daily post: the oldest NYSE session that is newer than the latest
 * posted date and fully ready on both BTC and ETH. An unready session is
 * left unposted so the next run can retry it. If a newer session is ready
 * first, the older unready dates are skipped for good. With no posted
 * history, only the latest started session is eligible, so a first run does
 * not walk back through the archive. `today` is the America/New_York date.
 */
export function selectDailyEtfSession({ btcSessions, ethSessions, dryRun, posts, today, isTradingDay }) {
  const tradingDay = typeof isTradingDay === "function" ? isTradingDay : () => true;
  const btcByDate = sessionByDate(btcSessions);
  const ethByDate = sessionByDate(ethSessions);
  const dates = [...new Set([...btcByDate.keys(), ...ethByDate.keys()])]
    .filter((date) => (!today || date <= today) && tradingDay(date))
    .sort();
  const rows = dates.map((date) => ({
    date,
    btc: btcByDate.get(date) || null,
    eth: ethByDate.get(date) || null,
  }));
  const ready = (row) => Boolean(row.btc?.complete && row.eth?.complete);
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const pool = newest ? rows.filter((row) => row.date > newest) : rows.slice(-1);

  const target = pool.find(ready) || null;
  if (!target) {
    if (!pool.length) {
      return {
        proceed: false,
        skipped: true,
        reason: newest ? "no_new_session" : "incomplete",
        noNewSession: Boolean(newest),
        date: newest,
        skippedDates: [],
        message: newest
          ? `No new Farside session after ${newest}. Not posting an older session.`
          : "Farside has no ETF session to share.",
      };
    }
    const pending = pool[0];
    const parts = [assetProblem("BTC", pending.btc), assetProblem("ETH", pending.eth)].filter(Boolean);
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: pending.date,
      skippedDates: [],
      message: `Farside session ${pending.date} is not ready to share. ${parts.join(". ")}.`,
    };
  }
  if (newest && target.date <= newest) {
    return {
      proceed: false,
      skipped: true,
      reason: "no_new_session",
      noNewSession: true,
      date: target.date,
      skippedDates: [],
      message: `No new Farside session after ${newest}. Not posting ${target.date}.`,
    };
  }
  const skippedDates = pool.filter((row) => row.date < target.date).map((row) => row.date);
  const skippedText = skippedDates.length ? ` Skipping unready ${skippedDates.join(", ")}.` : "";
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: target.date,
    skippedDates,
    message: `Sharing ETF session ${target.date}.${skippedText}`,
  };
}

function sessionByDate(sessions) {
  const map = new Map();
  for (const row of Array.isArray(sessions) ? sessions : []) {
    if (row && DATE.test(String(row.date || ""))) map.set(String(row.date), row);
  }
  return map;
}

export function decideEtfShare({ btc, eth, dryRun, posts }) {
  const sessionDate = [btc?.date, eth?.date].filter(Boolean).sort().at(-1) || null;
  const sameSession = Boolean(btc?.date && eth?.date && btc.date === eth.date);
  const ready = Boolean(sameSession && btc.complete && eth.complete);
  if (!ready) {
    const parts = [assetProblem("BTC", btc), assetProblem("ETH", eth)].filter(Boolean);
    if (btc?.date && eth?.date && btc.date !== eth.date) {
      parts.push(`BTC ${btc.date} and ETH ${eth.date} are different sessions`);
    }
    return {
      proceed: false,
      skipped: true,
      reason: "incomplete",
      noNewSession: false,
      date: sessionDate,
      message: `Farside latest session is not ready to share. ${parts.join(". ")}.`,
    };
  }
  const blocking = blockingPosts(posts, dryRun);
  const newest = blocking.map((post) => post.date).sort().at(-1) || null;
  const recorded = blocking.some((post) => post.date === btc.date);
  if (recorded || (newest && btc.date <= newest)) {
    const reason = recorded ? "already_posted" : "no_new_session";
    const message = recorded
      ? `ETF date ${btc.date} was already shared. No new Farside session to post.`
      : `No new Farside session after ${newest}. Not posting ${btc.date}.`;
    return {
      proceed: false,
      skipped: true,
      reason,
      noNewSession: true,
      date: btc.date,
      message,
    };
  }
  return {
    proceed: true,
    skipped: false,
    reason: null,
    noNewSession: false,
    date: btc.date,
    message: `Sharing ETF session ${btc.date}.`,
  };
}

async function readPostStateDocument(file) {
  let raw = "";
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return {};
    throw error;
  }
  if (!raw.trim()) return {};
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  return parsed;
}

export async function readPostState(file) {
  const doc = await readPostStateDocument(file);
  return Array.isArray(doc.posts) ? doc.posts : [];
}

export async function recordShare(file, entry) {
  if (!DATE.test(String(entry?.date || ""))) {
    throw new Error("Share state date must be YYYY-MM-DD.");
  }
  if (entry.mode !== "live" && entry.mode !== "dry-run") {
    throw new Error("Share state mode must be live or dry-run.");
  }
  const doc = await readPostStateDocument(file);
  const posts = (Array.isArray(doc.posts) ? doc.posts : []).filter(
    (post) => !(post?.date === entry.date && post?.mode === entry.mode),
  );
  posts.push({
    date: entry.date,
    mode: entry.mode,
    at: entry.at || new Date().toISOString(),
    postId: entry.postId ?? null,
    postUrl: entry.postUrl ?? null,
  });
  posts.sort(
    (a, b) => String(a.date).localeCompare(String(b.date)) || String(a.at).localeCompare(String(b.at)),
  );
  const trimmed = posts.slice(-80);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify({ ...doc, posts: trimmed }, null, 2)}\n`);
  return trimmed;
}
