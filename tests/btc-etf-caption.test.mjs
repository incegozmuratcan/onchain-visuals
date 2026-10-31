import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const etfFlowboard = await readFile(
  new URL("../components/onchain/templates/EtfFlowboard.tsx", import.meta.url),
  "utf8",
);
const publishRoute = await readFile(
  new URL("../app/api/x/publish-btc-etf-daily/route.ts", import.meta.url),
  "utf8",
);

async function loadCaption() {
  const source = await readFile(
    new URL("../lib/onchain/btcEtfCaption.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "btc-etf-caption-"));
  const file = join(dir, "caption.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const { buildBtcEtfDailyCaption, xWeightedLength } = await loadCaption();

const oct30 = {
  title: "BTC ETF Daily Flowboard",
  metadata: { latestCompletedDate: "2026-10-30" },
  headlineMetrics: [
    { formattedValue: "-$643.2M", value: -643_200_000 },
    { label: "Largest Outflow", formattedValue: "IBIT -$233.7M", value: -233_700_000 },
    { formattedValue: "+$57.0B", value: 57_000_000_000 },
  ],
  series: {
    tables: [
      { ticker: "IBIT", name: "BlackRock", value: -233_700_000 },
      { ticker: "FBTC", name: "Fidelity", value: -201_000_000 },
      { ticker: "ARKB", name: "ARK 21Shares", value: -129_500_000 },
      { ticker: "GBTC", name: "Grayscale GBTC", value: -53_300_000 },
      { ticker: "BITB", name: "Bitwise", value: -25_700_000 },
    ],
  },
};

test("daily caption includes date, net flow, largest issuer, and cumulative", () => {
  const caption = buildBtcEtfDailyCaption(oct30);
  assert.match(caption, /BTC ETF Daily Flowboard — Oct 30, 2026/);
  assert.match(caption, /US spot Bitcoin ETFs: -\$643\.2M net outflow/);
  assert.match(caption, /Largest outflow: \$IBIT \(BlackRock\) -\$233\.7M/);
  assert.match(caption, /Also out: FBTC -\$201M · ARKB -\$129\.5M · GBTC -\$53\.3M · BITB -\$25\.7M/);
  assert.match(caption, /Cumulative net flow: \+\$57\.0B/);
  assert.match(caption, /Source: Farside/);
  assert.match(caption, /#Bitcoin #ETF/);
  assert.ok(xWeightedLength(caption) <= 280, caption);
});

test("inflow captions name the largest inflow and stay within a post", () => {
  const caption = buildBtcEtfDailyCaption({
    title: "BTC ETF Daily Flowboard",
    metadata: { latestCompletedDate: "2026-10-29" },
    headlineMetrics: [
      { formattedValue: "+$120.4M", value: 120_400_000 },
      { formattedValue: "FBTC +$80.1M", value: 80_100_000 },
      { formattedValue: "+$57.1B", value: 57_100_000_000 },
    ],
    series: {
      tables: [
        { ticker: "FBTC", name: "Fidelity", value: 80_100_000 },
        { ticker: "IBIT", name: "BlackRock", value: 40_300_000 },
      ],
    },
  });
  assert.match(caption, /net inflow/);
  assert.match(caption, /Largest inflow: \$FBTC \(Fidelity\) \+\$80\.1M/);
  assert.match(caption, /Also in: IBIT/);
  assert.ok(xWeightedLength(caption) <= 280);
});

test("very long issuer tails drop extra names before exceeding 280", () => {
  const tables = Array.from({ length: 12 }, (_, index) => ({
    ticker: `T${index}`,
    name: `Issuer ${index} with a long display name`,
    value: -1_000_000 * (index + 1),
  }));
  const caption = buildBtcEtfDailyCaption({
    title: "BTC ETF Daily Flowboard",
    metadata: { latestCompletedDate: "2026-10-30" },
    headlineMetrics: [
      { formattedValue: "-$10.0M", value: -10_000_000 },
      { formattedValue: "T11 -$12.0M", value: -12_000_000 },
      { formattedValue: "+$1.0B", value: 1_000_000_000 },
    ],
    series: { tables },
  });
  assert.ok(xWeightedLength(caption) <= 280, `${xWeightedLength(caption)} ${caption}`);
});

test("publish route posts the rich caption only when dry-run is explicitly off", () => {
  assert.match(publishRoute, /buildBtcEtfDailyCaption/);
  assert.match(publishRoute, /function isLivePostEnabled/);
  assert.match(publishRoute, /value === "false"/);
  assert.doesNotMatch(publishRoute, /BTC ETF Daily Flowboard — \$\{displayDate/);
});

test("workflow stays a dry run unless posting is explicitly enabled", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/x-btc-etf-daily.yml", import.meta.url),
    "utf8",
  );
  const script = await readFile(
    new URL("../scripts/x-btc-etf-daily.mjs", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /default: true/);
  assert.match(workflow, /X_DRY_RUN=true/);
  assert.match(workflow, /ONCHAIN_PUBLISH_SECRET/);
  assert.match(workflow, /X_CONSUMER_KEY: \$\{\{ secrets\.X_CONSUMER_KEY \}\}/);
  assert.match(workflow, /X_CONSUMER_SECRET: \$\{\{ secrets\.X_CONSUMER_SECRET \}\}/);
  assert.match(workflow, /X_ACCESS_TOKEN: \$\{\{ secrets\.X_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /X_ACCESS_TOKEN_SECRET: \$\{\{ secrets\.X_ACCESS_TOKEN_SECRET \}\}/);
  assert.doesNotMatch(workflow, /X_USER_ACCESS_TOKEN: \$\{\{ secrets\.X_USER_ACCESS_TOKEN \}\}/);
  assert.match(script, /X_DRY_RUN \?\? "true"/);
  assert.match(script, /Refusing to post/);
  assert.match(script, /X_CONSUMER_KEY/);
  assert.match(script, /X_USER_ACCESS_TOKEN is not used/);
  assert.match(publishRoute, /oauth1AuthorizationHeader/);
  assert.match(publishRoute, /https:\/\/api\.x\.com\/2\/media\/upload/);
  assert.doesNotMatch(publishRoute, /Authorization: `Bearer /);
});

test("flowboard hero and stat values are not ellipsized", () => {
  assert.match(etfFlowboard, /export function heroFlowFontSize/);
  assert.match(etfFlowboard, /col-span-2 flex min-w-0 items-end/);
  assert.match(etfFlowboard, /data-hero-flow-value=/);
  assert.match(etfFlowboard, /data-stat-flow-value=/);
  assert.doesNotMatch(etfFlowboard, /data-hero-flow-value[\s\S]{0,220}truncate/);
  assert.doesNotMatch(etfFlowboard, /data-stat-flow-value[\s\S]{0,500}truncate/);
});
