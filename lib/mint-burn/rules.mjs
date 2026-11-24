/**
 * Treasury mint and burn alerts.
 *
 * Amounts are USD. USDT and USDC use 6 decimals, and 1 token is treated as $1.
 * Solana and Tron hold a qualifying mint (or burn) until that token, chain, and
 * type has been quiet for 30 minutes, then emit one card. Ethereum and Polygon
 * emit one card per transaction.
 *
 * Addresses were taken from Circle's CCTP and Gateway docs, the official USDC
 * and USDT contracts, a Polygon mint transaction, and the Solana USDC mint
 * account read on 2026-11-24 (mint authority BJE5…).
 */

export const QUIET_MS = 30 * 60 * 1000;
export const GROUPED_CHAINS = new Set(["solana", "tron"]);
export const MAX_TX_ROWS = 4;
export const POSTS_PER_RUN = 5;

export const THRESHOLDS_USD = {
  ethereum: { USDC: 100_000_000, USDT: 250_000_000 },
  tron: { USDT: 250_000_000 },
  solana: { USDC: 250_000_000 },
  polygon: { USDC: 10_000_000 },
};

export const TOKEN_CONTRACTS = {
  ethereum: {
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  },
  polygon: {
    USDC: "0x3c499c542cef5e3811e1192ce70d8cc03d5c3359",
  },
  tron: {
    USDT: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  },
  solana: {
    USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
};

/** Circle's fiat minter, not a bridge minter. Polygon value is the configured minter. */
export const TREASURY_MINTERS = {
  ethereum: "0x5b6122c109b78c6755486966148c1d70a50a47d7",
  polygon: "0x7cd8209e02afecfab02c0a4880f72444480b3f4f",
  solana: "BJE5MMbqXjVwjAF7oxwPYXnTXDyspzZyt4vwenNw5ruG",
};

/** Where newly issued tokens are credited, and where treasury burns leave from. */
export const TREASURIES = {
  ethereum: "0x55fe002aeff02f77364de339a1292923a15844b8",
  polygon: "0x166716c2838e182d64886135a96f1aabca9a9756",
  tron: "TBPxhVAsuzoFnKyXtc1o2UySEydPHgATto",
  solana: "7VHUFJHWu2CuExkJcJrzhQPJ2oygupTWkL2A2For4BmE",
};

export const SOLANA_TREASURY_TOKEN_ACCOUNT = "3emsAVdmGKERbHjmGfQ6oZ1e35dkf5iYcS6U4CPKFVaa";

const EVM_BRIDGES = [
  // CCTP V2 TokenMinter and TokenMessenger. Same CREATE2 address on Ethereum and Polygon.
  "0xfd78ee919681417d192449715b2594ab58f5d002",
  "0x28b5a0e9c621a5badaa536219b3a228c8168cf5d",
  "0x71f54f818671cd0d7ea140da213e5c8b5c92a408",
  // Circle Gateway minter and wallet.
  "0x2222222d7164433c4c09b0b0d809a9b52c04c205",
  "0x77777777dcc4d5a8b6e418fd04d8997ef11000ee",
];

/** Official CCTP V1 TokenMessenger and TokenMinter, which differ by chain. */
const EVM_BRIDGES_BY_CHAIN = {
  ethereum: [
    "0xc4922d64a24675e16e1586e3e3aa56c06fabe907",
    "0xbd3fa81b58ba92a82136038b25adec7066af3155",
  ],
  polygon: [
    "0x10f7835f827d6cf035115e10c50a853d7fb2d2ec",
    "0x9daf8c91aefae50b9c0e69629d3f6ca40ca3b3fe",
  ],
};

const SOLANA_BRIDGES = [
  "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
  "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
  "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3",
  "CCTPmbSD7gX1bxKPAmg77w8oFzNFpaQiQUWD43TKaecd",
];

const BRIDGES = {
  ethereum: new Set([...EVM_BRIDGES, ...EVM_BRIDGES_BY_CHAIN.ethereum]),
  polygon: new Set([...EVM_BRIDGES, ...EVM_BRIDGES_BY_CHAIN.polygon]),
  solana: new Set(SOLANA_BRIDGES),
  tron: new Set(),
};

export const TOPICS = {
  issue: "0xcb8241adb0c3fdb35b70c24ce35c5eb0c17af7431c99f827d44a445ca624176a",
  redeem: "0x702d5967f45f6513a38ffc42d6ba9bf230bd40e8f53b16363c7eb4fd2deb9a44",
  mint: "0xab8530f87dc9b59234c4623bf917212bb2536d647574c8e7e5da92c2ede0c9f8",
  burn: "0xcc16f5dbb4873280815c1ee09dbd06736cffcc184412cf7a71a0fdb75d397ca5",
  transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
};

const ZERO = "0x0000000000000000000000000000000000000000";

const CHAIN_CAPTION = {
  tron: "TRON (@trondao)",
  solana: "Solana (@solana)",
  ethereum: "Ethereum (@ethereum)",
  polygon: "Polygon (@0xPolygon)",
};

const CHAIN_LABEL = {
  tron: "Tron",
  solana: "Solana",
  ethereum: "Ethereum",
  polygon: "Polygon",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function thresholdUsd(chain, token) {
  const value = THRESHOLDS_USD[chain]?.[token];
  return Number.isFinite(value) ? value : null;
}

export function isBridgeParty(chain, address) {
  if (!address) return false;
  const set = BRIDGES[chain];
  if (!set) return false;
  if (chain === "solana" || chain === "tron") return set.has(address);
  return set.has(String(address).toLowerCase());
}

export function sameParty(chain, left, right) {
  if (!left || !right) return false;
  if (chain === "solana" || chain === "tron") return left === right;
  return String(left).toLowerCase() === String(right).toLowerCase();
}

function unitsToUsd(raw) {
  const value = BigInt(raw);
  if (value <= 0n) return 0;
  const scale = 1_000_000n;
  const whole = value / scale;
  const frac = value % scale;
  return Number(whole) + Number(frac) / 1e6;
}

function wordToRaw(hex) {
  const body = String(hex || "").toLowerCase().replace(/^0x/, "");
  if (!body || !/^[0-9a-f]+$/.test(body)) return null;
  return BigInt(`0x${body}`);
}

export function topicAddress(topic) {
  const body = String(topic || "").toLowerCase().replace(/^0x/, "");
  if (body.length !== 64) return null;
  return `0x${body.slice(24)}`;
}

function eventId(event) {
  return `${event.chain}:${event.token}:${event.kind}:${String(event.txHash).toLowerCase()}`;
}

/**
 * Keep a treasury issuance. Bridge minters, bridge recipients, and anything
 * under the chain threshold are dropped. Polygon USDT is never tracked.
 */
export function acceptsEvent(event) {
  if (!event || !event.chain || !event.token || !event.kind || !event.txHash) {
    return { ok: false, reason: "incomplete" };
  }
  if (event.chain === "polygon" && event.token === "USDT") return { ok: false, reason: "polygon-usdt" };
  const threshold = thresholdUsd(event.chain, event.token);
  if (threshold == null) return { ok: false, reason: "untracked" };
  if (!(event.amountUsd >= threshold)) return { ok: false, reason: "below-threshold" };
  const parties = [event.minter, event.to, event.burner, ...(event.accounts || [])];
  if (parties.some((party) => isBridgeParty(event.chain, party))) return { ok: false, reason: "bridge" };
  if (event.token === "USDC") {
    if (event.kind === "mint") {
      if (!sameParty(event.chain, event.minter, TREASURY_MINTERS[event.chain])) {
        return { ok: false, reason: "not-treasury-minter" };
      }
      const treasury = event.chain === "solana"
        ? sameParty(event.chain, event.to, TREASURIES.solana) || event.to === SOLANA_TREASURY_TOKEN_ACCOUNT
        : sameParty(event.chain, event.to, TREASURIES[event.chain]);
      if (!treasury) return { ok: false, reason: "not-treasury" };
    } else if (event.kind === "burn") {
      const burnerOk = sameParty(event.chain, event.burner, TREASURIES[event.chain])
        || sameParty(event.chain, event.burner, TREASURY_MINTERS[event.chain])
        || (event.chain === "solana" && event.burner === SOLANA_TREASURY_TOKEN_ACCOUNT);
      if (!burnerOk) return { ok: false, reason: "not-treasury-burn" };
    } else {
      return { ok: false, reason: "kind" };
    }
  } else if (event.token === "USDT") {
    if (event.kind !== "mint" && event.kind !== "burn") return { ok: false, reason: "kind" };
  }
  return { ok: true };
}

export function emptyState() {
  return { version: 1, cursors: {}, events: {}, liveIds: {}, dryRunGroups: {} };
}

export function ingestEvents(state, incoming) {
  const next = {
    version: 1,
    cursors: { ...(state?.cursors || {}) },
    events: { ...(state?.events || {}) },
    liveIds: { ...(state?.liveIds || {}) },
    dryRunGroups: { ...(state?.dryRunGroups || {}) },
    logos: state?.logos || {},
  };
  for (const event of incoming || []) {
    const verdict = acceptsEvent(event);
    if (!verdict.ok) continue;
    const id = eventId(event);
    if (next.liveIds[id] || next.events[id]?.livePosted) continue;
    next.events[id] = { ...event, id };
  }
  return next;
}

function alertFrom(events) {
  const sorted = [...events].sort((left, right) => left.timestampMs - right.timestampMs || String(left.txHash).localeCompare(String(right.txHash)));
  const newest = sorted[sorted.length - 1];
  const total = sorted.reduce((sum, event) => sum + event.amountUsd, 0);
  const key = `${newest.chain}:${newest.token}:${newest.kind}`;
  const id = sorted.length > 1 || GROUPED_CHAINS.has(newest.chain)
    ? `${key}:${sorted.map((event) => event.txHash).join(",")}`
    : sorted[0].id;
  return {
    id,
    chain: newest.chain,
    token: newest.token,
    kind: newest.kind,
    amountUsd: total,
    count: sorted.length,
    timestampMs: newest.timestampMs,
    events: sorted,
  };
}

/** Alerts whose quiet window has elapsed. Dry-run skips a group it already rendered. */
export function readyAlerts(state, nowMs, mode) {
  const pending = Object.values(state?.events || {}).filter((event) => !event.livePosted && !event.uncertain);
  const alerts = [];
  const groups = new Map();
  for (const event of pending) {
    if (GROUPED_CHAINS.has(event.chain)) {
      const key = `${event.chain}:${event.token}:${event.kind}`;
      const list = groups.get(key) || [];
      list.push(event);
      groups.set(key, list);
      continue;
    }
    const alert = alertFrom([event]);
    if (mode === "dry-run" && state?.dryRunGroups?.[alert.id]) continue;
    alerts.push(alert);
  }
  for (const list of groups.values()) {
    const last = Math.max(...list.map((event) => event.timestampMs));
    if (!(nowMs - last >= QUIET_MS)) continue;
    const alert = alertFrom(list);
    if (mode === "dry-run" && state?.dryRunGroups?.[alert.id]) continue;
    alerts.push(alert);
  }
  alerts.sort((left, right) => left.timestampMs - right.timestampMs || left.id.localeCompare(right.id));
  return alerts;
}

export function markAlert(state, alert, mode, meta) {
  const next = {
    version: 1,
    cursors: { ...(state?.cursors || {}) },
    events: { ...(state?.events || {}) },
    liveIds: { ...(state?.liveIds || {}) },
    dryRunGroups: { ...(state?.dryRunGroups || {}) },
    logos: state?.logos || {},
  };
  if (mode === "live") {
    for (const event of alert.events) {
      next.liveIds[event.id] = meta?.at || new Date().toISOString();
      delete next.events[event.id];
    }
    const ids = Object.entries(next.liveIds);
    if (ids.length > 2000) {
      ids.sort((left, right) => String(left[1]).localeCompare(String(right[1])));
      for (const [id] of ids.slice(0, ids.length - 2000)) delete next.liveIds[id];
    }
  } else {
    next.dryRunGroups[alert.id] = meta?.at || new Date().toISOString();
  }
  return next;
}

export function markUncertain(state, alert, meta) {
  const next = {
    version: 1,
    cursors: { ...(state?.cursors || {}) },
    events: { ...(state?.events || {}) },
    liveIds: { ...(state?.liveIds || {}) },
    dryRunGroups: { ...(state?.dryRunGroups || {}) },
    logos: state?.logos || {},
  };
  for (const event of alert.events) {
    if (next.events[event.id]) next.events[event.id] = { ...next.events[event.id], uncertain: meta || true };
  }
  return next;
}

export function formatHeroAmount(amount) {
  const rounded = Math.round(Number(amount) * 100) / 100;
  if (!Number.isFinite(rounded)) return "$0";
  const [whole, frac] = Math.abs(rounded).toFixed(2).split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return frac === "00" ? `$${withCommas}` : `$${withCommas}.${frac}`;
}

export function spellUsd(amount) {
  const abs = Math.abs(Number(amount));
  if (!Number.isFinite(abs)) return "0";
  const [scale, unit] = abs >= 1_000_000_000 ? [1_000_000_000, "billion"] : [1_000_000, "million"];
  const scaled = Math.round((abs / scale) * 100) / 100;
  const text = scaled.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return `${text} ${unit}`;
}

export function buildCaption(alert) {
  const verb = alert.kind === "burn" ? "burned" : "minted";
  const issuer = alert.token === "USDT" ? "Tether (@tether)" : "Circle (@circle)";
  const chain = CHAIN_CAPTION[alert.chain] || alert.chain;
  let sentence = `${spellUsd(alert.amountUsd)} ${alert.token} has just been ${verb} by ${issuer} on the ${chain} network`;
  if (alert.count > 1) sentence += ` in ${alert.count} transactions`;
  return `${sentence}.`;
}

export function shortenHash(hash) {
  const body = String(hash || "").replace(/^0x/i, "");
  if (body.length <= 10) return body;
  return `${body.slice(0, 6)}…${body.slice(-4)}`;
}

export function formatTxTime(timestampMs) {
  const date = new Date(timestampMs);
  let hours = date.getUTCHours();
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours %= 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${suffix} UTC`;
}

export function formatFooterDate(timestampMs) {
  const date = new Date(timestampMs);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}, ${formatTxTime(timestampMs)}`;
}

export function chainLabel(chain) {
  return CHAIN_LABEL[chain] || chain;
}

export function issuerName(token) {
  return token === "USDT" ? "Tether" : "Circle";
}

export function issuerClass(token) {
  return token === "USDT" ? "name-tether" : "name-circle";
}

function hexTimestamp(value) {
  if (value == null || value === "") return null;
  const text = String(value);
  const ms = text.startsWith("0x") ? Number(BigInt(text)) * 1000 : Number(text) * (Number(text) < 1e12 ? 1000 : 1);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * One Etherscan log. USDT is Issue or Redeem. USDC is Mint or Burn, or a
 * Transfer from or to the zero address by Circle's minter (`txFrom`).
 */
export function parseEvmLog(chain, token, log, txFrom) {
  if (!log || !log.transactionHash) return null;
  const address = String(log.address || "").toLowerCase();
  const expected = TOKEN_CONTRACTS[chain]?.[token];
  if (!expected || address !== expected) return null;
  const topics = (log.topics || []).map((topic) => String(topic).toLowerCase());
  const topic0 = topics[0];
  const timestampMs = hexTimestamp(log.timeStamp ?? log.timestamp);
  if (!topic0 || timestampMs == null) return null;
  const dataRaw = wordToRaw(log.data);
  const base = { chain, token, txHash: log.transactionHash, timestampMs, accounts: [] };

  if (token === "USDT" && (topic0 === TOPICS.issue || topic0 === TOPICS.redeem)) {
    const raw = dataRaw ?? wordToRaw(topics[1]);
    if (raw == null) return null;
    const kind = topic0 === TOPICS.issue ? "mint" : "burn";
    return {
      ...base,
      kind,
      amountUsd: unitsToUsd(raw),
      minter: null,
      to: null,
      burner: null,
    };
  }

  if (token !== "USDC") return null;
  if (topic0 === TOPICS.mint) {
    const raw = dataRaw ?? wordToRaw(topics[3]);
    if (raw == null) return null;
    return {
      ...base,
      kind: "mint",
      amountUsd: unitsToUsd(raw),
      minter: topicAddress(topics[1]),
      to: topicAddress(topics[2]),
      burner: null,
    };
  }
  if (topic0 === TOPICS.burn) {
    const raw = dataRaw ?? wordToRaw(topics[2]);
    if (raw == null) return null;
    const burner = topicAddress(topics[1]);
    return { ...base, kind: "burn", amountUsd: unitsToUsd(raw), minter: null, to: null, burner };
  }
  if (topic0 === TOPICS.transfer) {
    const from = topicAddress(topics[1]);
    const to = topicAddress(topics[2]);
    const raw = dataRaw;
    if (raw == null || !from || !to) return null;
    const sender = txFrom ? String(txFrom).toLowerCase() : null;
    if (from === ZERO && sender) {
      return { ...base, kind: "mint", amountUsd: unitsToUsd(raw), minter: sender, to, burner: null };
    }
    if (to === ZERO) {
      return { ...base, kind: "burn", amountUsd: unitsToUsd(raw), minter: null, to: null, burner: from };
    }
  }
  return null;
}

export function parseTronEvent(row) {
  if (!row) return null;
  const name = String(row.event_name || "");
  if (name !== "Issue" && name !== "Redeem") return null;
  const contract = row.contract_address;
  if (contract && contract !== TOKEN_CONTRACTS.tron.USDT) return null;
  const result = row.result || {};
  const rawText = String(result.amount ?? result.value ?? result["0"] ?? "").trim();
  const raw = rawText.startsWith("0x") ? wordToRaw(rawText) : (/^\d+$/.test(rawText) ? BigInt(rawText) : null);
  if (raw == null) return null;
  const caller = result.owner || result.issuer || result.caller || null;
  if (caller && caller !== TREASURIES.tron) return null;
  const timestampMs = Number(row.block_timestamp);
  if (!Number.isFinite(timestampMs)) return null;
  const kind = name === "Issue" ? "mint" : "burn";
  return {
    chain: "tron",
    token: "USDT",
    kind,
    amountUsd: unitsToUsd(raw),
    txHash: row.transaction_id,
    timestampMs,
    minter: kind === "mint" ? TREASURIES.tron : null,
    to: kind === "mint" ? TREASURIES.tron : null,
    burner: kind === "burn" ? TREASURIES.tron : null,
    accounts: [],
  };
}

function heliusAccounts(tx) {
  const found = new Set();
  const add = (value) => {
    if (value) found.add(value);
  };
  add(tx.feePayer);
  for (const signer of tx.signers || []) add(signer);
  for (const row of tx.accountData || []) add(row.account);
  for (const instruction of tx.instructions || []) {
    add(instruction.programId);
    for (const account of instruction.accounts || []) add(account);
  }
  return [...found];
}

function isSolanaTreasuryDestination(transfer) {
  return transfer?.toUserAccount === TREASURIES.solana || transfer?.toTokenAccount === SOLANA_TREASURY_TOKEN_ACCOUNT;
}

function isSolanaTreasurySource(transfer) {
  return transfer?.fromUserAccount === TREASURIES.solana || transfer?.fromTokenAccount === SOLANA_TREASURY_TOKEN_ACCOUNT;
}

function emptySolanaSide(value) {
  return value == null || value === "" || value === TOKEN_CONTRACTS.solana.USDC;
}

/**
 * A Helius enhanced transaction. Mints must be signed by Circle's mint
 * authority and land in the treasury. Burns must leave the treasury with no
 * recipient. Any CCTP program in the account list drops the transaction.
 */
export function parseHeliusTransaction(tx, role) {
  if (!tx?.signature || !Number.isFinite(Number(tx.timestamp))) return null;
  const accounts = heliusAccounts(tx);
  if (accounts.some((account) => isBridgeParty("solana", account))) return null;
  const transfers = (tx.tokenTransfers || []).filter((transfer) => transfer?.mint === TOKEN_CONTRACTS.solana.USDC);
  const timestampMs = Number(tx.timestamp) * 1000;
  if (role === "mint") {
    if (!accounts.includes(TREASURY_MINTERS.solana)) return null;
    const minted = transfers.find((transfer) => isSolanaTreasuryDestination(transfer) && emptySolanaSide(transfer.fromUserAccount));
    const amount = Number(minted?.tokenAmount);
    if (!minted || !(amount > 0)) return null;
    return {
      chain: "solana",
      token: "USDC",
      kind: "mint",
      amountUsd: amount,
      txHash: tx.signature,
      timestampMs,
      minter: TREASURY_MINTERS.solana,
      to: TREASURIES.solana,
      burner: null,
      accounts,
    };
  }
  if (role === "burn") {
    const burned = transfers.find((transfer) => isSolanaTreasurySource(transfer) && emptySolanaSide(transfer.toUserAccount));
    const amount = Number(burned?.tokenAmount);
    if (!burned || !(amount > 0)) return null;
    return {
      chain: "solana",
      token: "USDC",
      kind: "burn",
      amountUsd: amount,
      txHash: tx.signature,
      timestampMs,
      minter: null,
      to: null,
      burner: TREASURIES.solana,
      accounts,
    };
  }
  return null;
}

export function exampleAlerts() {
  const day = Date.parse("2026-11-23T19:20:00Z");
  const solana = (minutes, hash) => ({
    id: `solana:USDC:mint:${hash}`,
    chain: "solana",
    token: "USDC",
    kind: "mint",
    amountUsd: 250_000_000,
    txHash: hash,
    timestampMs: day - minutes * 60_000,
    minter: TREASURY_MINTERS.solana,
    to: TREASURIES.solana,
    burner: null,
    accounts: [TREASURY_MINTERS.solana],
  });
  return [
    {
      id: "tron:USDT:mint:4f3a91c0e2b7d5a6c8e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6",
      chain: "tron",
      token: "USDT",
      kind: "mint",
      amountUsd: 1_000_000_000,
      count: 1,
      timestampMs: Date.parse("2026-11-23T19:13:00Z"),
      events: [{
        txHash: "4f3a91c0e2b7d5a6c8e0f1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6",
        timestampMs: Date.parse("2026-11-23T19:13:00Z"),
        amountUsd: 1_000_000_000,
      }],
    },
    {
      id: "solana-grouped",
      chain: "solana",
      token: "USDC",
      kind: "mint",
      amountUsd: 1_000_000_000,
      count: 4,
      timestampMs: day,
      events: [
        solana(15, "4xYz7aKp9mN3qR8sT2uV5wX1yZ6bC7dE8fG9hJ0kL2mN3pQ4rS5tU6vW7xY8zA9bCkP2m"),
        solana(11, "5hJk2mNp8qR4sT6uV0wX2yZ4aB6cD8eF0gH2jK4lM6nP8qR0sT2uV4wX6yZ8aB0cDeFgHi"),
        solana(7, "6mNp3qR5sT7uV9wX1yZ3aB5cD7eF9gH1jK3lM5nP7qR9sT1uV3wX5yZ7aB9cD1eFgHiJk"),
        solana(0, "7qR4sT6uV8wX0yZ2aB4cD6eF8gH0jK2lM4nP6qR8sT0uV2wX4yZ6aB8cD0eF2gHiJkLm"),
      ],
    },
    {
      id: "polygon:USDC:mint:ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12",
      chain: "polygon",
      token: "USDC",
      kind: "mint",
      amountUsd: 10_000_000,
      count: 1,
      timestampMs: Date.parse("2026-11-23T14:05:00Z"),
      events: [{
        txHash: "ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12",
        timestampMs: Date.parse("2026-11-23T14:05:00Z"),
        amountUsd: 10_000_000,
      }],
    },
    {
      id: "ethereum:USDC:burn:cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34",
      chain: "ethereum",
      token: "USDC",
      kind: "burn",
      amountUsd: 100_000_000,
      count: 1,
      timestampMs: Date.parse("2026-11-23T11:42:00Z"),
      events: [{
        txHash: "cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34",
        timestampMs: Date.parse("2026-11-23T11:42:00Z"),
        amountUsd: 100_000_000,
      }],
    },
  ];
}
