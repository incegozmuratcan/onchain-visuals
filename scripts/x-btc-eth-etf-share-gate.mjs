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

export async function readPostState(file) {
  let raw = "";
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  if (!raw.trim()) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed?.posts) ? parsed.posts : [];
}

export async function recordShare(file, entry) {
  if (!DATE.test(String(entry?.date || ""))) {
    throw new Error("Share state date must be YYYY-MM-DD.");
  }
  if (entry.mode !== "live" && entry.mode !== "dry-run") {
    throw new Error("Share state mode must be live or dry-run.");
  }
  const posts = (await readPostState(file)).filter(
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
  await writeFile(file, `${JSON.stringify({ posts: trimmed }, null, 2)}\n`);
  return trimmed;
}
