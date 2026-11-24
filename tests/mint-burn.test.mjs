import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTs } from "./load-ts.mjs";
import { renderCardHtml, APPROVED_CARD_CSS } from "../lib/mint-burn/card.mjs";
import { FIXED_LOGOS, planMintBurnLogos } from "../lib/mint-burn/logos.mjs";
import { redactUrl, scanEthereumUsdt, scanPolygonUsdc, scanSolana, scanTronUsdt, setEtherscanPace } from "../lib/mint-burn/sources.mjs";
import {
  QUIET_MS,
  THRESHOLDS_USD,
  TOKEN_CONTRACTS,
  TOPICS,
  TREASURIES,
  TREASURY_MINTERS,
  acceptsEvent,
  buildCaption,
  emptyState,
  exampleAlerts,
  formatFooterDate,
  formatHeroAmount,
  formatTxTime,
  ingestEvents,
  markAlert,
  parseEvmLog,
  parseHeliusTransaction,
  parseTronEvent,
  readyAlerts,
  shortenHash,
  spellUsd,
} from "../lib/mint-burn/rules.mjs";

const handles = await importTs("../lib/share/chain-x-handles.ts");

function padAddress(address) {
  return `0x${address.toLowerCase().replace(/^0x/, "").padStart(64, "0")}`;
}

function padAmount(usd) {
  return `0x${(BigInt(Math.round(usd * 1e6))).toString(16).padStart(64, "0")}`;
}

function evmLog(chain, token, topic, topics, usd, tx = "0xabc") {
  return {
    address: TOKEN_CONTRACTS[chain][token],
    topics: [topic, ...topics],
    data: padAmount(usd),
    timeStamp: "0x655f0e00",
    transactionHash: tx,
  };
}

test("thresholds match the approved table and skip Polygon USDT", () => {
  assert.equal(THRESHOLDS_USD.ethereum.USDC, 100_000_000);
  assert.equal(THRESHOLDS_USD.ethereum.USDT, 250_000_000);
  assert.equal(THRESHOLDS_USD.tron.USDT, 250_000_000);
  assert.equal(THRESHOLDS_USD.solana.USDC, 250_000_000);
  assert.equal(THRESHOLDS_USD.polygon.USDC, 10_000_000);
  assert.equal(THRESHOLDS_USD.polygon.USDT, undefined);
  const below = acceptsEvent({
    chain: "ethereum", token: "USDC", kind: "mint", amountUsd: 99_999_999,
    txHash: "0x1", minter: TREASURY_MINTERS.ethereum, to: TREASURIES.ethereum,
  });
  assert.equal(below.reason, "below-threshold");
  const at = acceptsEvent({
    chain: "ethereum", token: "USDC", kind: "mint", amountUsd: 100_000_000,
    txHash: "0x1", minter: TREASURY_MINTERS.ethereum, to: TREASURIES.ethereum,
  });
  assert.equal(at.ok, true);
  const polygon = acceptsEvent({
    chain: "polygon", token: "USDT", kind: "mint", amountUsd: 1_000_000_000, txHash: "0x2",
  });
  assert.equal(polygon.reason, "polygon-usdt");
  for (const [chain, tokens] of Object.entries(THRESHOLDS_USD)) {
    for (const [token, threshold] of Object.entries(tokens)) {
      const event = {
        chain, token, kind: "burn", amountUsd: threshold, txHash: "0xburn",
        burner: token === "USDC" ? TREASURIES[chain] : null,
        minter: token === "USDC" ? TREASURY_MINTERS[chain] : null,
      };
      assert.equal(acceptsEvent(event).ok, true, `${chain} ${token} burn`);
      assert.equal(acceptsEvent({ ...event, amountUsd: threshold - 1 }).ok, false);
    }
  }
});

test("bridge minters and messengers are excluded on every watched chain", () => {
  const bridges = {
    ethereum: [
      "0xfd78ee919681417d192449715b2594ab58f5d002",
      "0x28b5a0e9c621a5badaa536219b3a228c8168cf5d",
      "0xc4922d64a24675e16e1586e3e3aa56c06fabe907",
      "0xbd3fa81b58ba92a82136038b25adec7066af3155",
      "0x2222222d7164433c4c09b0b0d809a9b52c04c205",
    ],
    polygon: [
      "0xfd78EE919681417d192449715b2594ab58f5D002",
      "0x10f7835F827D6Cf035115E10c50A853d7FB2D2EC",
      "0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE",
      "0x2222222d7164433c4C09B0b0D809a9b52C04C205",
    ],
  };
  for (const [chain, addresses] of Object.entries(bridges)) {
    for (const minter of addresses) {
      const log = evmLog(chain, "USDC", TOPICS.mint, [padAddress(minter), padAddress(TREASURIES[chain])], 500_000_000, `0x${minter.slice(2, 8)}`);
      const event = parseEvmLog(chain, "USDC", log);
      assert.equal(acceptsEvent(event).reason, "bridge", minter);
    }
  }
  const treasuryMint = parseEvmLog("polygon", "USDC", evmLog(
    "polygon", "USDC", TOPICS.mint,
    [padAddress(TREASURY_MINTERS.polygon), padAddress(TREASURIES.polygon)],
    10_000_000,
    "0xpoly",
  ));
  assert.equal(acceptsEvent(treasuryMint).ok, true);
  const elsewhere = parseEvmLog("ethereum", "USDC", evmLog(
    "ethereum", "USDC", TOPICS.mint,
    [padAddress(TREASURY_MINTERS.ethereum), padAddress("0x1111111111111111111111111111111111111111")],
    100_000_000,
  ));
  assert.equal(acceptsEvent(elsewhere).reason, "not-treasury");
  const transferMint = parseEvmLog("ethereum", "USDC", {
    address: TOKEN_CONTRACTS.ethereum.USDC,
    topics: [TOPICS.transfer, padAddress("0x0000000000000000000000000000000000000000"), padAddress(TREASURIES.ethereum)],
    data: padAmount(100_000_000),
    timeStamp: "0x655f0e00",
    transactionHash: "0xtransfer",
  }, TREASURY_MINTERS.ethereum);
  assert.equal(acceptsEvent(transferMint).ok, true);
});

test("Ethereum USDT uses Issue and Redeem, and Tron uses the treasury contract", () => {
  const issue = parseEvmLog("ethereum", "USDT", {
    address: TOKEN_CONTRACTS.ethereum.USDT,
    topics: [TOPICS.issue],
    data: padAmount(250_000_000),
    timeStamp: "0x655f0e00",
    transactionHash: "0xissue",
  });
  assert.equal(issue.kind, "mint");
  assert.equal(acceptsEvent(issue).ok, true);
  const redeem = parseEvmLog("ethereum", "USDT", {
    address: TOKEN_CONTRACTS.ethereum.USDT,
    topics: [TOPICS.redeem],
    data: padAmount(249_999_999),
    timeStamp: "0x655f0e00",
    transactionHash: "0xredeem",
  });
  assert.equal(redeem.kind, "burn");
  assert.equal(acceptsEvent(redeem).reason, "below-threshold");
  const tron = parseTronEvent({
    event_name: "Issue",
    contract_address: TOKEN_CONTRACTS.tron.USDT,
    transaction_id: "tronhash",
    block_timestamp: 1_700_000_000_000,
    result: { amount: "250000000000000" },
  });
  assert.equal(tron.amountUsd, 250_000_000);
  assert.equal(acceptsEvent(tron).ok, true);
  const otherCaller = parseTronEvent({
    event_name: "Redeem",
    contract_address: TOKEN_CONTRACTS.tron.USDT,
    transaction_id: "other",
    block_timestamp: 1_700_000_000_000,
    result: { amount: "250000000000000", owner: "TNotTheTreasuryxxxxxxxxxxxxxxxxx" },
  });
  assert.equal(otherCaller, null);
});

test("Solana treasury mints group, and CCTP program ids are excluded", () => {
  const mint = parseHeliusTransaction({
    signature: "sigmint",
    timestamp: 1_700_000_000,
    feePayer: TREASURY_MINTERS.solana,
    accountData: [{ account: TREASURY_MINTERS.solana }],
    tokenTransfers: [{
      mint: TOKEN_CONTRACTS.solana.USDC,
      fromUserAccount: "",
      toUserAccount: TREASURIES.solana,
      toTokenAccount: "3emsAVdmGKERbHjmGfQ6oZ1e35dkf5iYcS6U4CPKFVaa",
      tokenAmount: 250_000_000,
    }],
  }, "mint");
  assert.equal(acceptsEvent(mint).ok, true);
  const bridged = parseHeliusTransaction({
    signature: "sigbridge",
    timestamp: 1_700_000_000,
    accountData: [{ account: TREASURY_MINTERS.solana }, { account: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe" }],
    instructions: [{ programId: "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe" }],
    tokenTransfers: [{
      mint: TOKEN_CONTRACTS.solana.USDC,
      fromUserAccount: "",
      toUserAccount: TREASURIES.solana,
      tokenAmount: 250_000_000,
    }],
  }, "mint");
  assert.equal(bridged, null);
  const v1 = parseHeliusTransaction({
    signature: "sigv1",
    timestamp: 1_700_000_000,
    accountData: [{ account: "CCTPiPYPc6AsJuwueEnWgSgucamXDZwBd53dQ11YiKX3" }, { account: TREASURIES.solana }],
    tokenTransfers: [{
      mint: TOKEN_CONTRACTS.solana.USDC,
      fromUserAccount: TREASURIES.solana,
      toUserAccount: "",
      tokenAmount: 250_000_000,
    }],
  }, "burn");
  assert.equal(v1, null);
});

test("Solana and Tron wait 30 minutes and then post one group; Ethereum posts per tx", () => {
  const start = Date.parse("2026-11-23T19:00:00Z");
  const solana = (minute, hash) => ({
    chain: "solana", token: "USDC", kind: "mint", amountUsd: 250_000_000,
    txHash: hash, timestampMs: start + minute * 60_000,
    minter: TREASURY_MINTERS.solana, to: TREASURIES.solana, accounts: [],
  });
  const tron = (minute, hash, amount) => ({
    chain: "tron", token: "USDT", kind: "burn", amountUsd: amount,
    txHash: hash, timestampMs: start + minute * 60_000,
  });
  let state = ingestEvents(emptyState(), [
    solana(0, "a"),
    solana(10, "b"),
    tron(0, "t1", 250_000_000),
    tron(0, "t2", 300_000_000),
    {
      chain: "ethereum", token: "USDT", kind: "mint", amountUsd: 250_000_000,
      txHash: "0xe1", timestampMs: start,
    },
    {
      chain: "ethereum", token: "USDT", kind: "mint", amountUsd: 300_000_000,
      txHash: "0xe2", timestampMs: start + 60_000,
    },
  ]);
  assert.equal(readyAlerts(state, start + 20 * 60_000, "live").length, 2);
  assert.equal(readyAlerts(state, start + 10 * 60_000 + QUIET_MS - 1, "live").filter((alert) => alert.chain === "solana").length, 0);
  const ready = readyAlerts(state, start + 10 * 60_000 + QUIET_MS, "live");
  const grouped = ready.find((alert) => alert.chain === "solana");
  assert.equal(grouped.count, 2);
  assert.equal(grouped.amountUsd, 500_000_000);
  assert.equal(ready.filter((alert) => alert.chain === "ethereum").length, 2);
  state = ingestEvents(state, [solana(39, "c")]);
  assert.equal(readyAlerts(state, start + 40 * 60_000, "live").some((alert) => alert.chain === "solana"), false);
  const later = readyAlerts(state, start + 39 * 60_000 + QUIET_MS, "live").find((alert) => alert.chain === "solana");
  assert.equal(later.count, 3);
  const burned = readyAlerts(state, start + QUIET_MS, "live").find((alert) => alert.chain === "tron");
  assert.equal(burned.count, 2);
  assert.equal(burned.kind, "burn");
  const marked = markAlert(state, later, "dry-run", { at: "2026-11-23T20:00:00Z" });
  assert.equal(readyAlerts(marked, start + 39 * 60_000 + QUIET_MS, "dry-run").some((alert) => alert.chain === "solana"), false);
  assert.equal(readyAlerts(marked, start + 39 * 60_000 + QUIET_MS, "live").some((alert) => alert.chain === "solana"), true);
  const lived = markAlert(marked, later, "live", { at: "2026-11-23T20:10:00Z" });
  assert.equal(readyAlerts(lived, start + 39 * 60_000 + QUIET_MS, "live").some((alert) => alert.chain === "solana"), false);
});

test("captions, hashes, and times follow the approved wording", () => {
  assert.equal(spellUsd(1_000_000_000), "1 billion");
  assert.equal(spellUsd(150_000_000), "150 million");
  assert.equal(spellUsd(2_500_000_000), "2.5 billion");
  assert.equal(spellUsd(10_000_000), "10 million");
  assert.equal(formatHeroAmount(1_000_000_000), "$1,000,000,000");
  assert.equal(formatHeroAmount(250_000_000), "$250,000,000");
  assert.equal(shortenHash("4xYz7aKp9mN3qR8sT2uV5wX1yZ6bC7dE8fG9hJ0kL2mN3pQ4rS5tU6vW7xY8zA9bCkP2m"), "4xYz7a…kP2m");
  assert.equal(shortenHash("0xcd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34ef56ab12cd34"), "cd34ef…cd34");
  assert.equal(formatTxTime(Date.parse("2026-11-23T19:13:00Z")), "07:13 PM UTC");
  assert.equal(formatTxTime(Date.parse("2026-11-23T00:05:00Z")), "12:05 AM UTC");
  assert.equal(formatFooterDate(Date.parse("2026-11-23T19:20:00Z")), "Nov 23, 2026, 07:20 PM UTC");
  const [tron, solana, polygon, burn] = exampleAlerts();
  assert.equal(buildCaption(tron), "1 billion USDT has just been minted by Tether (@tether) on the TRON (@trondao) network.");
  assert.equal(buildCaption(solana), "1 billion USDC has just been minted by Circle (@circle) on the Solana (@solana) network in 4 transactions.");
  assert.equal(buildCaption(polygon), "10 million USDC has just been minted by Circle (@circle) on the Polygon (@0xPolygon) network.");
  assert.equal(buildCaption(burn), "100 million USDC has just been burned by Circle (@circle) on the Ethereum (@ethereum) network.");
  assert.equal(handles.chainXHandle("Tether"), "tether");
  assert.equal(handles.chainXHandle("Circle"), "circle");
  assert.equal(handles.chainXHandle("TRON"), "trondao");
  assert.equal(handles.chainXHandle("Solana"), "solana");
  assert.equal(handles.chainXHandle("Ethereum"), "ethereum");
  assert.equal(handles.chainXHandle("Polygon"), "0xPolygon");
});

test("the card keeps the approved CSS and the single, grouped, and burn variants", () => {
  assert.match(APPROVED_CARD_CSS, /font-family:"InterCard";src:url\("\.\.\/assets\/InterVariable-opsz\.woff"\)/);
  assert.match(APPROVED_CARD_CSS, /width:1200px;height:675px/);
  assert.match(APPROVED_CARD_CSS, /--tether:#009393/);
  assert.match(APPROVED_CARD_CSS, /--tron:#EB0029/);
  assert.match(APPROVED_CARD_CSS, /--circle:#2775CA/);
  assert.match(APPROVED_CARD_CSS, /--polygon:#8247E5/);
  assert.match(APPROVED_CARD_CSS, /\.name-ethereum\{font-weight:600;color:#111\}/);
  assert.match(APPROVED_CARD_CSS, /linear-gradient\(90deg,var\(--solana\) 0%,var\(--solana-green\) 100%\)/);
  assert.doesNotMatch(APPROVED_CARD_CSS, /#D93A3A/);
  const [tron, solana, , burn] = exampleAlerts();
  const logos = { token: "usdt.png", chain: "tron.png" };
  const single = renderCardHtml(tron, logos);
  assert.equal(single.includes('class="sub"'), false);
  assert.match(single, /Transaction</);
  assert.doesNotMatch(single, /Transactions/);
  assert.match(single, />Mint</);
  assert.match(single, /\$1,000,000,000/);
  assert.match(single, /name-tether">Tether Treasury/);
  assert.match(single, /name-tron">Tron/);
  assert.match(single, /4f3a91…d5e6/);
  const grouped = renderCardHtml(solana, { token: "usdc.png", chain: "solana.png" });
  assert.match(grouped, /4 mints/);
  assert.match(grouped, /× \$250,000,000/);
  assert.match(grouped, /Transactions/);
  assert.match(grouped, /name-solana">Solana/);
  assert.equal(grouped.match(/class="tx"/g).length, 4);
  const uneven = renderCardHtml({
    ...solana,
    events: [
      { ...solana.events[0], amountUsd: 300_000_000 },
      ...solana.events.slice(1),
    ],
  }, logos);
  assert.match(uneven, /4 mints/);
  assert.equal(uneven.includes('class="sub-amount"'), false);
  const many = renderCardHtml({
    ...solana,
    count: 6,
    events: [
      ...solana.events,
      { txHash: "8extraaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaZZZZ", timestampMs: solana.timestampMs + 60_000, amountUsd: 250_000_000 },
      { txHash: "9extraaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaYYYY", timestampMs: solana.timestampMs + 120_000, amountUsd: 250_000_000 },
    ],
  }, logos);
  assert.match(many, /\+3 more/);
  assert.equal(many.match(/class="tx-hash"/g).length, 3);
  const burned = renderCardHtml(burn, { token: "usdc.png", chain: "ethereum.png" });
  assert.match(burned, />BURN</);
  assert.match(burned, /color:#D93A3A/);
  assert.match(burned, /Burned at <span class="name-circle">Circle Treasury/);
  assert.match(burned, /name-ethereum">Ethereum/);
  assert.equal(burned.includes('class="sub"'), false);
  assert.equal(burned.includes("http"), false);
});

test("logo order is approved, cache, fixed, DefiLlama, then an initial", () => {
  const approved = "https://assets.coingecko.com/coins/images/1/large/usd-coin.png";
  const cached = "data:image/png;base64,YQ==";
  const fixed = FIXED_LOGOS.usdc;
  const llama = "https://icons.llamao.fi/icons/protocols/usd-coin?w=96";
  const checked = (renderUrl, byteLength = 20) => ({ renderUrl, byteLength, contentType: "image/png" });
  const base = {
    dbAvailable: true,
    approvedUrlBySlug: { usdc: approved },
    cache: { usdc: { slug: "usdc", name: "USDC", approvedUrl: approved, contentType: "image/png", dataUrl: cached, byteLength: 9, updatedAt: "2026-11-01T00:00:00Z" } },
    images: { [approved]: checked("data:image/png;base64,YQI=", 40), [fixed]: checked(fixed), [llama]: checked(llama) },
    now: "2026-11-24T00:00:00Z",
  };
  assert.equal(planMintBurnLogos(base).choices.find((row) => row.slug === "usdc").source, "approved");
  assert.equal(planMintBurnLogos({ ...base, images: { ...base.images, [approved]: null } }).choices.find((row) => row.slug === "usdc").source, "cache");
  assert.equal(planMintBurnLogos({ ...base, dbAvailable: false, images: { [fixed]: checked(fixed), [llama]: checked(llama) } }).choices.find((row) => row.slug === "usdc").source, "cache");
  const fixedOnly = planMintBurnLogos({ dbAvailable: false, approvedUrlBySlug: {}, cache: {}, images: { [fixed]: checked(fixed) } });
  assert.equal(fixedOnly.choices.find((row) => row.slug === "usdc").source, "fixed");
  const llamaOnly = planMintBurnLogos({ dbAvailable: true, approvedUrlBySlug: { usdc: null }, cache: {}, images: { [llama]: checked(llama) } });
  assert.equal(llamaOnly.choices.find((row) => row.slug === "usdc").source, "defillama");
  const initial = planMintBurnLogos({ dbAvailable: true, approvedUrlBySlug: {}, cache: {}, images: {} });
  assert.equal(initial.choices.find((row) => row.slug === "ethereum").source, "initial");
  assert.equal(initial.choices.length, 6);
});

test("secret redaction and the workflow stay dry-run and unscheduled", async () => {
  const url = "https://api.etherscan.io/v2/api?chainid=1&apikey=super-secret&module=proxy";
  assert.equal(redactUrl(url).includes("super-secret"), false);
  assert.equal(redactUrl("https://api.helius.xyz/v0/addresses/abc/transactions?api-key=super-secret").includes("super-secret"), false);
  const workflow = await readFile(new URL("../.github/workflows/x-mint-burn.yml", import.meta.url), "utf8");
  const script = await readFile(new URL("../scripts/x-mint-burn.mjs", import.meta.url), "utf8");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /default: true/);
  assert.doesNotMatch(workflow, /\n\s*schedule:/);
  assert.match(workflow, /X_DRY_RUN=true/);
  assert.match(workflow, /restore-posted-state\.mjs mint-burn/);
  assert.match(workflow, /ETHERSCAN_API_KEY/);
  assert.match(workflow, /TRONGRID_API_KEY/);
  assert.match(workflow, /HELIUS_API_KEY/);
  assert.match(script, /X_DRY_RUN \?\? "true"/);
  assert.match(script, /Refusing to post a caption that contains a URL/);
  assert.doesNotMatch(workflow, /super-secret|api-key=/);
});

test("etherscan spaces calls and retries a rate limit", async () => {
  const key = "test-etherscan-key";
  let clock = 0;
  const waits = [];
  const calls = [];

  function jsonResponse(body) {
    return { ok: true, status: 200, json: async () => body };
  }

  function install(handler) {
    clock = 0;
    waits.length = 0;
    calls.length = 0;
    setEtherscanPace({
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      fetch: async (url, init) => {
        const parsed = new URL(url);
        const index = calls.length;
        calls.push({
          chainid: parsed.searchParams.get("chainid"),
          action: parsed.searchParams.get("action"),
          hasKey: parsed.searchParams.has("apikey"),
        });
        return handler(index, parsed, init);
      },
    });
  }

  try {
    install(() => jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x10" }));
    await scanEthereumUsdt(null, key);
    await scanPolygonUsdc(null, key);
    assert.deepEqual(calls, [
      { chainid: "1", action: "eth_blockNumber", hasKey: true },
      { chainid: "137", action: "eth_blockNumber", hasKey: true },
    ]);
    assert.deepEqual(waits, [400]);

    const bodies = [
      { jsonrpc: "2.0", id: 1, error: { code: -32005, message: "Max calls per sec rate limit reached (3/sec)" } },
      { jsonrpc: "2.0", id: 1, result: "0x64" },
      { status: "0", message: "No records found", result: [] },
      { status: "0", message: "No records found", result: [] },
    ];
    install((index) => jsonResponse(bodies[index]));
    const scanned = await scanEthereumUsdt({ block: 80, primed: true }, key);
    assert.deepEqual(calls.map((call) => call.action), ["eth_blockNumber", "eth_blockNumber", "getLogs", "getLogs"]);
    assert.deepEqual(waits, [1500, 400, 400]);
    assert.equal(scanned.events.length, 0);
    assert.equal(JSON.stringify(scanned).includes(key), false);

    const rateLimited = { status: "0", message: "NOTOK", result: "Max calls per sec rate limit reached (3/sec)" };
    install(() => jsonResponse(rateLimited));
    await assert.rejects(
      () => scanEthereumUsdt(null, key),
      (error) => {
        assert.match(error.message, /Etherscan eth_blockNumber failed: Max calls per sec rate limit reached \(3\/sec\)/);
        assert.equal(error.message.includes(key), false);
        assert.equal(error.message.includes("apikey"), false);
        return true;
      },
    );
    assert.equal(calls.length, 3);
    assert.deepEqual(waits, [1500, 1500]);

    install(() => {
      throw new Error("network down");
    });
    await assert.rejects(
      () => scanEthereumUsdt(null, key),
      (error) => {
        assert.match(error.message, /Mint\/burn request failed for https:\/\/api\.etherscan\.io/);
        assert.equal(error.message.includes(key), false);
        assert.equal(error.message.includes("apikey"), false);
        return true;
      },
    );
    assert.equal(calls.length, 1);
  } finally {
    setEtherscanPace();
  }
});

test("trongrid and helius space calls, retry 429, and send their keys", async () => {
  const tronKey = "test-trongrid-key";
  const heliusKey = "test-helius-key";
  let clock = 0;
  const waits = [];
  const calls = [];

  function jsonResponse(status, body, headers) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: (name) => headers?.[String(name).toLowerCase()] ?? null },
      json: async () => body,
    };
  }

  function install(handler) {
    clock = 0;
    waits.length = 0;
    calls.length = 0;
    setEtherscanPace({
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
      fetch: async (url, init) => {
        const index = calls.length;
        calls.push({ url: String(url), init });
        return handler(index, new URL(url), init);
      },
    });
  }

  function assertTronKey(call) {
    assert.equal(call.init.headers["TRON-PRO-API-KEY"], tronKey);
    assert.equal(call.init.headers.accept, "application/json");
    assert.equal(call.url.includes(tronKey), false);
  }

  try {
    const recovered = [
      jsonResponse(429, { Error: "request rate exceeded" }),
      jsonResponse(200, { data: [], success: true }),
      jsonResponse(200, { data: [], success: true }),
    ];
    install((index) => recovered[index]);
    const scanned = await scanTronUsdt({ timestampMs: 1, primed: true }, tronKey);
    assert.equal(calls.length, 3);
    for (const call of calls) assertTronKey(call);
    assert.match(calls[0].url, /event_name=Issue/);
    assert.match(calls[2].url, /event_name=Redeem/);
    assert.deepEqual(waits, [1500, 350]);
    assert.equal(scanned.events.length, 0);
    assert.equal(JSON.stringify(scanned).includes(tronKey), false);

    const withRetryAfter = [
      jsonResponse(429, { error: "Too Many Requests" }, { "retry-after": "2" }),
      jsonResponse(200, { data: [], success: true }),
      jsonResponse(200, { data: [], success: true }),
    ];
    install((index) => withRetryAfter[index]);
    await scanTronUsdt({ timestampMs: 1, primed: true }, tronKey);
    for (const call of calls) assertTronKey(call);
    assert.deepEqual(waits, [2000, 350]);

    const rateLimitedBody = [
      jsonResponse(200, { success: false, error: "request rate exceeded" }),
      jsonResponse(200, { data: [], success: true }),
      jsonResponse(200, { data: [], success: true }),
    ];
    install((index) => rateLimitedBody[index]);
    await scanTronUsdt({ timestampMs: 1, primed: true }, tronKey);
    assert.deepEqual(waits, [1500, 350]);

    install(() => jsonResponse(429, { Error: "request rate exceeded" }));
    await assert.rejects(
      () => scanTronUsdt({ timestampMs: 1, primed: true }, tronKey),
      (error) => {
        assert.match(error.message, /Mint\/burn request failed for https:\/\/api\.trongrid\.io\/.* with HTTP 429\./);
        assert.equal(error.message.includes(tronKey), false);
        assert.equal(error.message.includes("TRON-PRO-API-KEY"), false);
        return true;
      },
    );
    assert.equal(calls.length, 3);
    assert.deepEqual(waits, [1500, 3000]);
    for (const call of calls) assertTronKey(call);

    install((index) => (index === 0 ? jsonResponse(429, { error: "rate limit" }) : jsonResponse(200, [])));
    await scanSolana("mint", null, heliusKey);
    assert.equal(calls.length, 2);
    assert.deepEqual(waits, [1500]);
    for (const call of calls) {
      const parsed = new URL(call.url);
      assert.equal(parsed.searchParams.get("api-key"), heliusKey);
      assert.equal(call.url.includes("api.helius.xyz"), true);
    }

    install(() => jsonResponse(200, []));
    await scanSolana("mint", null, heliusKey);
    await scanSolana("burn", null, heliusKey);
    assert.deepEqual(waits, [250]);
    assert.equal(new URL(calls[0].url).searchParams.get("api-key"), heliusKey);
    assert.equal(new URL(calls[1].url).searchParams.get("api-key"), heliusKey);

    install(() => {
      throw new Error("network down");
    });
    await assert.rejects(
      () => scanSolana("mint", null, heliusKey),
      (error) => {
        assert.match(error.message, /Mint\/burn request failed for https:\/\/api\.helius\.xyz/);
        assert.equal(error.message.includes(heliusKey), false);
        assert.equal(error.message.includes("api-key"), false);
        return true;
      },
    );
    assert.equal(calls.length, 1);
  } finally {
    setEtherscanPace();
  }
});
