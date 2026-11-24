/**
 * Free readers for treasury mints and burns.
 * Etherscan V2 covers Ethereum and Polygon. TronGrid covers Tron. Helius covers Solana.
 * API keys are read from the environment and are never written to errors or logs.
 * One source failing leaves its cursor in place and does not stop the others.
 */
import {
  TOKEN_CONTRACTS,
  TOPICS,
  TREASURY_MINTERS,
  TREASURIES,
  parseEvmLog,
  parseHeliusTransaction,
  parseTronEvent,
} from "./rules.mjs";

const ETHERSCAN = "https://api.etherscan.io/v2/api";
const TRONGRID = "https://api.trongrid.io/v1/contracts";
const HELIUS = "https://api.helius.xyz/v0/addresses";

// One queue per host. Etherscan's free tier allows 3 calls/sec, shared by Ethereum and Polygon.
const HOST_MIN_GAP_MS = {
  "api.etherscan.io": 400,
  "api.trongrid.io": 350,
  "api.helius.xyz": 250,
};
const ETHERSCAN_RETRY_WAIT_MS = 1500;
const RATE_LIMIT_BACKOFF_MS = [1500, 3000];
const RATE_LIMIT_RETRIES = 2;

const CHAIN_ID = { ethereum: 1, polygon: 137 };
const MAX_BLOCKS = { ethereum: 2000, polygon: 5000 };
const BLOCK_OVERLAP = 20;
const TRON_OVERLAP_MS = 2 * 60 * 1000;
const HELIUS_PAGES = 5;

export function requiredSecretNames() {
  return ["ETHERSCAN_API_KEY", "TRONGRID_API_KEY", "HELIUS_API_KEY"];
}

export function readSecrets(env = process.env) {
  const etherscan = String(env.ETHERSCAN_API_KEY || "").trim();
  const tron = String(env.TRONGRID_API_KEY || env.TRON_PRO_API_KEY || "").trim();
  const helius = String(env.HELIUS_API_KEY || "").trim();
  const missing = [];
  if (!etherscan) missing.push("ETHERSCAN_API_KEY");
  if (!tron) missing.push("TRONGRID_API_KEY");
  if (!helius) missing.push("HELIUS_API_KEY");
  return { etherscan, tron, helius, missing };
}

export function redactUrl(value) {
  try {
    const url = new URL(value);
    for (const key of ["apikey", "api-key", "api_key", "key"]) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return "[url]";
  }
}

function defaultEtherscanPace() {
  return {
    minGapMs: HOST_MIN_GAP_MS["api.etherscan.io"],
    retryWaitMs: ETHERSCAN_RETRY_WAIT_MS,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    now: () => Date.now(),
    fetch: (...args) => globalThis.fetch(...args),
  };
}

let etherscanPace = defaultEtherscanPace();
const requestLanes = new Map();

/** Replace the shared gap, retry wait, clock, or fetch for every mint/burn host. Call with no argument to restore the defaults. */
export function setEtherscanPace(overrides) {
  etherscanPace = { ...defaultEtherscanPace(), ...(overrides || {}) };
  requestLanes.clear();
}

function isEtherscanRateLimit(payload) {
  if (!payload || typeof payload !== "object") return false;
  const statusError = payload.status === "0";
  const rpcError = payload.error != null;
  if (!statusError && !rpcError) return false;
  const error = payload.error;
  const parts = [payload.message, payload.result];
  if (error && typeof error === "object") parts.push(error.message, error.result);
  else parts.push(error);
  const text = parts
    .filter((part) => part != null && typeof part !== "object")
    .map(String)
    .join(" ");
  return /max calls per sec|rate limit/i.test(text);
}

function providerRateLimitText(payload) {
  if (typeof payload === "string") return payload;
  if (!payload || typeof payload !== "object") return "";
  const error = payload.error;
  const parts = [payload.message, payload.result, payload.Error, payload.error_message];
  if (error && typeof error === "object") parts.push(error.message, error.result);
  else parts.push(error);
  return parts
    .filter((part) => part != null && typeof part !== "object")
    .map(String)
    .join(" ");
}

function isProviderRateLimit(payload) {
  return /max calls per sec|rate limit|too many requests|request rate exceeded/i.test(providerRateLimitText(payload));
}

function headerValue(headers, name) {
  if (!headers) return undefined;
  if (typeof headers.get === "function") {
    const value = headers.get(name);
    return value == null ? undefined : value;
  }
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return undefined;
}

function retryAfterMs(response, attempt) {
  const header = headerValue(response?.headers, "retry-after");
  if (header != null && String(header).trim() !== "") {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, Math.round(seconds * 1000));
    const when = Date.parse(String(header));
    if (Number.isFinite(when)) return Math.max(0, when - etherscanPace.now());
  }
  return RATE_LIMIT_BACKOFF_MS[Math.min(attempt, RATE_LIMIT_BACKOFF_MS.length - 1)];
}

const SNIPPET_MAX = 300;

function headerEntries(headers) {
  if (!headers) return [];
  if (typeof headers.entries === "function") return [...headers.entries()];
  return Object.entries(headers);
}

function collectSecrets(url, init) {
  const secrets = [];
  try {
    const parsed = new URL(url);
    for (const [name, value] of parsed.searchParams) {
      if (value && /api[_-]?key|^key$|token|secret/i.test(name)) secrets.push(value);
    }
  } catch {
    // A failed parse has no query secret to strip.
  }
  for (const [name, value] of headerEntries(init?.headers)) {
    if (value && /api|key|auth|token|secret/i.test(String(name))) secrets.push(String(value));
  }
  return [...new Set(secrets)].filter((secret) => secret.length >= 8);
}

function redactSnippet(value, secrets = []) {
  let text = String(value ?? "").replace(/\s+/g, " ").trim();
  const needles = [];
  for (const secret of secrets) {
    needles.push(secret);
    try {
      const encoded = encodeURIComponent(secret);
      if (encoded && encoded !== secret) needles.push(encoded);
    } catch {
      // The plain secret is still removed below.
    }
  }
  for (const needle of needles.sort((left, right) => right.length - left.length)) {
    text = text.split(needle).join("[redacted]");
  }
  text = text.replace(/\bBearer\s+\S+/gi, "Bearer [redacted]");
  text = text.replace(
    /((?:api[_-]?key|apikey|tron-pro-api-key|authorization|access[_-]?token|secret)["']?\s*[:=]\s*["']?)[^\s"',}&]+/gi,
    "$1[redacted]",
  );
  if (text.length > SNIPPET_MAX) text = `${text.slice(0, SNIPPET_MAX - 1)}…`;
  return text;
}

function responseText(payload, text) {
  if (text) return String(text);
  if (payload == null) return "";
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function logFailedResponse(url, init, response, payload, text, extraSecrets = []) {
  const secrets = [...collectSecrets(url, init), ...extraSecrets].filter((secret) => secret && String(secret).length >= 8);
  const snippet = redactSnippet(responseText(payload, text), secrets);
  const retryAfter = headerValue(response?.headers, "retry-after");
  const parts = [`Mint/burn HTTP ${response?.status ?? "?"} for ${redactUrl(url)}.`];
  if (retryAfter != null && String(retryAfter).trim() !== "") parts.push(`Retry-After: ${String(retryAfter).trim()}.`);
  if (snippet) parts.push(`Body: ${snippet}`);
  console.warn(parts.join(" "));
}

function httpError(url, status) {
  const error = new Error(`Mint/burn request failed for ${redactUrl(url)} with HTTP ${status}.`);
  error.status = status;
  return error;
}

function gapMs(host) {
  if (host === "api.etherscan.io") return etherscanPace.minGapMs;
  return HOST_MIN_GAP_MS[host] ?? 0;
}

function laneFor(host) {
  let lane = requestLanes.get(host);
  if (!lane) {
    lane = { nextAt: 0, queue: Promise.resolve() };
    requestLanes.set(host, lane);
  }
  return lane;
}

async function waitForSlot(url) {
  const host = new URL(url).host;
  const lane = laneFor(host);
  const gap = gapMs(host);
  const ticket = lane.queue.then(async () => {
    const wait = Math.max(0, lane.nextAt - etherscanPace.now());
    if (wait > 0) await etherscanPace.sleep(wait);
    lane.nextAt = etherscanPace.now() + gap;
  });
  lane.queue = ticket.then(() => {}, () => {});
  await ticket;
}

async function fetchPayload(url, init) {
  let response;
  try {
    response = await etherscanPace.fetch(url, init);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "request failed";
    throw new Error(`Mint/burn request failed for ${redactUrl(url)}: ${detail}`);
  }
  if (typeof response?.text === "function") {
    const text = String(await response.text().catch(() => "") ?? "");
    if (!text) return { response, payload: null, text: "" };
    try {
      return { response, payload: JSON.parse(text), text };
    } catch {
      return { response, payload: null, text };
    }
  }
  const payload = typeof response?.json === "function" ? await response.json().catch(() => null) : null;
  return { response, payload, text: responseText(payload, "") };
}

async function getJson(url, init, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : RATE_LIMIT_RETRIES;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await waitForSlot(url);
    const { response, payload, text } = await fetchPayload(url, init);
    const limited = response.status === 429 || isProviderRateLimit(payload);
    if (limited && attempt < retries) {
      await etherscanPace.sleep(retryAfterMs(response, attempt));
      continue;
    }
    if (!response.ok || limited) {
      logFailedResponse(url, init, response, payload, text, options.secrets);
      const error = httpError(url, response.ok ? 429 : response.status);
      error.httpStatus = response.status;
      throw error;
    }
    return payload;
  }
}

async function tronGridJson(url, key) {
  const keyed = { headers: { "TRON-PRO-API-KEY": key, accept: "application/json" } };
  try {
    return await getJson(url, keyed, { secrets: [key] });
  } catch (error) {
    if (error?.httpStatus !== 429) throw error;
    console.warn(`TronGrid still returned HTTP 429 for ${redactUrl(url)} after retries with the API key. Trying once without TRON-PRO-API-KEY.`);
    return getJson(url, { headers: { accept: "application/json" } }, { retries: 0, secrets: [key] });
  }
}

async function etherscan(params, key) {
  const url = new URL(ETHERSCAN);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  url.searchParams.set("apikey", key);
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt += 1) {
    await waitForSlot(url);
    const { response, payload, text } = await fetchPayload(url);
    const limited = response.status === 429 || isEtherscanRateLimit(payload);
    if (limited && attempt < RATE_LIMIT_RETRIES) {
      await etherscanPace.sleep(response.status === 429 ? retryAfterMs(response, attempt) : etherscanPace.retryWaitMs);
      continue;
    }
    if (!response.ok) {
      logFailedResponse(url, undefined, response, payload, text);
      throw httpError(url, response.status);
    }
    if (payload?.status === "0" && /no records/i.test(String(payload.message || payload.result || ""))) return [];
    if (payload?.status === "0" && typeof payload?.result === "string") {
      logFailedResponse(url, undefined, response, payload, text);
      throw new Error(`Etherscan ${params.action || params.module} failed: ${payload.result}`);
    }
    return payload?.result ?? payload;
  }
}

function hexBlock(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  return text.startsWith("0x") ? Number(BigInt(text)) : Number(text);
}

async function headBlock(chain, key) {
  const result = await etherscan({ chainid: CHAIN_ID[chain], module: "proxy", action: "eth_blockNumber" }, key);
  const block = hexBlock(result);
  if (!Number.isFinite(block) || block <= 0) throw new Error(`Etherscan did not return a ${chain} block height.`);
  return block;
}

async function logs(chain, address, topic0, fromBlock, toBlock, key) {
  const rows = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await etherscan({
      chainid: CHAIN_ID[chain],
      module: "logs",
      action: "getLogs",
      address,
      topic0,
      fromBlock,
      toBlock,
      page,
      offset: 1000,
    }, key);
    const batch = Array.isArray(result) ? result : [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

async function scanEvm(chain, token, topics, cursor, key) {
  const head = await headBlock(chain, key);
  if (!cursor) return { cursor: { block: head, primed: false }, events: [] };
  const from = cursor.primed ? Math.max(0, Number(cursor.block) - BLOCK_OVERLAP) : Number(cursor.block) + 1;
  const to = Math.min(head, from + MAX_BLOCKS[chain]);
  if (to < from) return { cursor: { block: head, primed: Boolean(cursor.primed) }, events: [] };
  const address = TOKEN_CONTRACTS[chain][token];
  const events = [];
  for (const topic of topics) {
    const rows = await logs(chain, address, topic, from, to, key);
    for (const row of rows) {
      const event = parseEvmLog(chain, token, row);
      if (event) events.push(event);
    }
  }
  return { cursor: { block: to, primed: true }, events, behind: to < head };
}

export async function scanEthereumUsdt(cursor, key) {
  return scanEvm("ethereum", "USDT", [TOPICS.issue, TOPICS.redeem], cursor, key);
}

export async function scanEthereumUsdc(cursor, key) {
  return scanEvm("ethereum", "USDC", [TOPICS.mint, TOPICS.burn], cursor, key);
}

export async function scanPolygonUsdc(cursor, key) {
  return scanEvm("polygon", "USDC", [TOPICS.mint, TOPICS.burn], cursor, key);
}

export async function scanTronUsdt(cursor, key) {
  const now = Date.now();
  if (!cursor) return { cursor: { timestampMs: now, primed: false }, events: [] };
  const min = cursor.primed ? Number(cursor.timestampMs) - TRON_OVERLAP_MS : Number(cursor.timestampMs) + 1;
  const events = [];
  for (const name of ["Issue", "Redeem"]) {
    const url = new URL(`${TRONGRID}/${TOKEN_CONTRACTS.tron.USDT}/events`);
    url.searchParams.set("event_name", name);
    url.searchParams.set("only_confirmed", "true");
    url.searchParams.set("min_timestamp", String(Math.max(0, min)));
    url.searchParams.set("order_by", "block_timestamp,asc");
    url.searchParams.set("limit", "200");
    const payload = await tronGridJson(url, key);
    for (const row of payload?.data || []) {
      const event = parseTronEvent(row);
      if (event) events.push(event);
    }
  }
  return { cursor: { timestampMs: now, primed: true }, events };
}

async function heliusPage(address, before, key) {
  const url = new URL(`${HELIUS}/${address}/transactions`);
  url.searchParams.set("limit", "100");
  if (before) url.searchParams.set("before", before);
  url.searchParams.set("api-key", key);
  const payload = await getJson(url);
  return Array.isArray(payload) ? payload : [];
}

export async function scanSolana(role, cursor, key) {
  const address = role === "mint" ? TREASURY_MINTERS.solana : TREASURIES.solana;
  const first = await heliusPage(address, null, key);
  if (!cursor) {
    const newest = first[0];
    return {
      cursor: newest
        ? { signature: newest.signature, timestampMs: Number(newest.timestamp) * 1000, primed: false }
        : { signature: null, timestampMs: Date.now(), primed: false },
      events: [],
    };
  }
  const events = [];
  let page = first;
  let before = null;
  let reached = !cursor.signature;
  let gap = false;
  for (let index = 0; index < HELIUS_PAGES && page.length; index += 1) {
    for (const tx of page) {
      if (cursor.signature && tx.signature === cursor.signature) {
        reached = true;
        break;
      }
      const timestampMs = Number(tx.timestamp) * 1000;
      if (!cursor.primed && timestampMs < Number(cursor.timestampMs)) continue;
      const event = parseHeliusTransaction(tx, role);
      if (event) events.push(event);
    }
    if (reached || page.length < 100) break;
    before = page[page.length - 1]?.signature;
    if (!before) break;
    page = await heliusPage(address, before, key);
  }
  if (cursor.signature && !reached) gap = true;
  const newest = first[0];
  return {
    cursor: newest
      ? { signature: newest.signature, timestampMs: Number(newest.timestamp) * 1000, primed: true }
      : { ...cursor, primed: true },
    events,
    gap,
  };
}

export async function scanAll(state, secrets) {
  const cursors = { ...(state?.cursors || {}) };
  const found = [];
  const notes = [];
  const failures = [];
  const jobs = [
    ["ethereum-usdt", () => scanEthereumUsdt(cursors["ethereum-usdt"], secrets.etherscan)],
    ["ethereum-usdc", () => scanEthereumUsdc(cursors["ethereum-usdc"], secrets.etherscan)],
    ["polygon-usdc", () => scanPolygonUsdc(cursors["polygon-usdc"], secrets.etherscan)],
    ["tron-usdt", () => scanTronUsdt(cursors["tron-usdt"], secrets.tron)],
    ["solana-usdc-mint", () => scanSolana("mint", cursors["solana-usdc-mint"], secrets.helius)],
    ["solana-usdc-burn", () => scanSolana("burn", cursors["solana-usdc-burn"], secrets.helius)],
  ];
  for (const [name, run] of jobs) {
    try {
      const result = await run();
      cursors[name] = result.cursor;
      found.push(...result.events);
      if (result.behind) notes.push(`${name} is still behind the chain head and will continue next run.`);
      if (result.gap) notes.push(`${name} moved faster than this page window. Older signatures in the gap were not read.`);
    } catch (error) {
      failures.push(name);
      const detail = error instanceof Error ? error.message : "request failed";
      const warning = `${name} failed and will be retried next run. ${detail}`;
      notes.push(warning);
      console.warn(warning);
    }
  }
  if (failures.length === jobs.length) {
    throw new Error(`Mint/burn scan failed for every source (${failures.join(", ")}).`);
  }
  return { cursors, events: found, notes, failures };
}
