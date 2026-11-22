import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const publishRoute = await readFile(
  new URL("../app/api/x/publish-btc-eth-etf-daily/route.ts", import.meta.url),
  "utf8",
);
const splitTemplate = await readFile(
  new URL("../components/onchain/templates/SplitFlowboard.tsx", import.meta.url),
  "utf8",
);
const splitCard = await readFile(
  new URL("../components/share/SplitFlowboardCard.tsx", import.meta.url),
  "utf8",
);
const issuerRow = await readFile(
  new URL("../components/share/IssuerFlowRow.tsx", import.meta.url),
  "utf8",
);

async function loadCaption() {
  const source = await readFile(
    new URL("../lib/onchain/btcEthEtfCaption.ts", import.meta.url),
    "utf8",
  );
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "btc-eth-etf-caption-"));
  const file = join(dir, "caption.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const { buildBtcEthEtfDailyCaption, xWeightedLength } = await loadCaption();

function panel(asset, overrides = {}) {
  return {
    asset,
    date: "2026-10-30",
    netFlow: asset === "ETH" ? -89_400_000 : -643_200_000,
    formattedNet: asset === "ETH" ? "-$89.4M" : "-$643.2M",
    formattedCumulative: asset === "ETH" ? "+$12.1B" : "+$57.0B",
    cumulative: asset === "ETH" ? 12_100_000_000 : 57_000_000_000,
    largest:
      asset === "ETH"
        ? { ticker: "ETHA", issuer: "BlackRock", value: -41_000_000, formattedValue: "-$41M" }
        : { ticker: "IBIT", issuer: "BlackRock", value: -233_000_000, formattedValue: "-$233M" },
    issuers:
      asset === "ETH"
        ? [
            { ticker: "ETHA", name: "BlackRock", value: -41_000_000, formattedValue: "-$41M" },
            { ticker: "FETH", name: "Fidelity", value: -25_000_000, formattedValue: "-$25M" },
          ]
        : [
            { ticker: "IBIT", name: "BlackRock", value: -233_000_000, formattedValue: "-$233M" },
            { ticker: "FBTC", name: "Fidelity", value: -201_000_000, formattedValue: "-$201M" },
            { ticker: "ARKB", name: "ARK 21Shares", value: -130_000_000, formattedValue: "-$130M" },
          ],
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  const btc = overrides.btc || panel("BTC");
  const eth = overrides.eth || panel("ETH");
  return {
    title: "ETF Daily Flowboard",
    metadata: {
      latestCompletedDate: btc.date,
      ethLatestCompletedDate: eth.date,
    },
    series: { cards: [btc, eth] },
  };
}

function assertShortCaption(caption) {
  assert.doesNotMatch(caption, /\$[A-Za-z]/);
  assert.doesNotMatch(caption, /#/);
  assert.doesNotMatch(caption, /Largest|Cumulative|Source:|Also /);
  assert.ok(xWeightedLength(caption) <= 280, `${xWeightedLength(caption)} ${caption}`);
}

const CAPTION = (date) => `Here are the Bitcoin and Ethereum ETF flows for ${date}.`;

test("combined caption is one sentence with the Farside date on the card", () => {
  const caption = buildBtcEthEtfDailyCaption(snapshot());
  assert.equal(caption, CAPTION("Oct 30"));
  assert.doesNotMatch(caption, /\n/);
  assert.equal((caption.match(/[.?!]/g) || []).length, 1, "one sentence only");
  assertShortCaption(caption);
});

test("the caption names the session date, not the post date", () => {
  // A Monday post carries Friday's session.
  const friday = snapshot({
    btc: panel("BTC", { date: "2026-11-13" }),
    eth: panel("ETH", { date: "2026-11-13" }),
  });
  assert.equal(buildBtcEthEtfDailyCaption(friday), CAPTION("Nov 13"));
  const singleDigit = snapshot({
    btc: panel("BTC", { date: "2026-12-01" }),
    eth: panel("ETH", { date: "2026-12-01" }),
  });
  assert.equal(buildBtcEthEtfDailyCaption(singleDigit), CAPTION("Dec 1"));
});

test("amounts, direction words, and issuers stay off the caption", () => {
  const issuers = Array.from({ length: 12 }, (_, index) => ({
    ticker: `T${index}`,
    name: `Issuer ${index} with a long display name`,
    value: 1_000_000 * (index + 1),
    formattedValue: `+$${index + 1}M`,
  }));
  const caption = buildBtcEthEtfDailyCaption(
    snapshot({
      btc: panel("BTC", { netFlow: 120_400_000, formattedNet: "+$120.4M", issuers }),
      eth: panel("ETH", { netFlow: -8_000_000, formattedNet: "-$8.0M", issuers }),
    }),
  );
  assert.equal(caption, CAPTION("Oct 30"));
  assert.doesNotMatch(caption, /\$|inflow|outflow|Issuer|T11|IBIT|ETHA|Flowboard/);
  assertShortCaption(caption);
});

test("different BTC and ETH sessions stop the caption", () => {
  assert.throws(
    () => buildBtcEthEtfDailyCaption(snapshot({ eth: panel("ETH", { date: "2026-10-29" }) })),
    /one session; BTC is 2026-10-30 and ETH is 2026-10-29/,
  );
});

test("caption builder rejects a panel that is not ready to post", () => {
  assert.throws(
    () => buildBtcEthEtfDailyCaption({ title: "ETF Daily Flowboard", series: { cards: [panel("BTC")] } }),
    /ETH panel/,
  );
  assert.throws(
    () =>
      buildBtcEthEtfDailyCaption(
        snapshot({
          btc: panel("BTC", { date: null, formattedNet: "-$1.0M" }),
        }),
      ),
    /completed BTC and ETH dates/,
  );
});

test("publish route posts through OAuth 1.0a only when dry-run is explicitly off", () => {
  assert.match(publishRoute, /buildBtcEthEtfDailyCaption/);
  assert.match(publishRoute, /btc-eth-etf-daily-flowboard/);
  assert.match(publishRoute, /ethLatestCompletedDate/);
  assert.match(publishRoute, /function isLivePostEnabled/);
  assert.match(publishRoute, /value === "false"/);
  assert.match(publishRoute, /oauth1AuthorizationHeader/);
  assert.match(publishRoute, /https:\/\/api\.x\.com\/2\/media\/upload/);
  assert.match(publishRoute, /https:\/\/api\.x\.com\/2\/tweets/);
  assert.match(publishRoute, /Preview fixtures cannot be published/);
  assert.match(publishRoute, /duplicate/);
  assert.doesNotMatch(publishRoute, /Authorization: `Bearer /);
  assert.match(splitTemplate, /data-capture="share-card"/);
  assert.match(splitTemplate, /width: 1536, height: 1024/);
  assert.match(splitCard, /IssuerFlowRow/);
  assert.match(issuerRow, /data-issuer-flow=/);
});

test("combined workflow is the daily X schedule and stays a dry run by default", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/x-btc-eth-etf-daily.yml", import.meta.url),
    "utf8",
  );
  const script = await readFile(
    new URL("../scripts/x-btc-eth-etf-daily.mjs", import.meta.url),
    "utf8",
  );
  const btcWorkflow = await readFile(
    new URL("../.github/workflows/x-btc-etf-daily.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /cron: "30 5 \* \* 0-6"/);
  assert.match(workflow, /cron: "30 7 \* \* 0-6"/);
  assert.match(workflow, /cron: "30 10 \* \* 0-6"/);
  assert.match(workflow, /Sun–Mon catch-up/);
  assert.equal((workflow.match(/^\s*- cron:/gm) || []).length, 3);
  assert.match(workflow, /Europe\/Istanbul/);
  assert.match(workflow, /explicit 0/);
  assert.match(workflow, /posted-state\.json/);
  assert.ok(workflow.indexOf("Restore the last shared ETF date") < workflow.indexOf("Choose dry-run or live post"));
  assert.ok(workflow.indexOf("Choose dry-run or live post") < workflow.indexOf("id: gate"));
  assert.ok(workflow.indexOf("id: gate") < workflow.indexOf("npm run build"));
  assert.match(workflow, /default: true/);
  assert.match(workflow, /inputs\.dry_run/);
  assert.match(workflow, /vars\.X_DRY_RUN/);
  assert.match(workflow, /X_DRY_RUN=true/);
  assert.match(workflow, /ONCHAIN_PUBLISH_SECRET/);
  assert.match(workflow, /X_CONSUMER_KEY: \$\{\{ secrets\.X_CONSUMER_KEY \}\}/);
  assert.match(workflow, /X_CONSUMER_SECRET: \$\{\{ secrets\.X_CONSUMER_SECRET \}\}/);
  assert.match(workflow, /X_ACCESS_TOKEN: \$\{\{ secrets\.X_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /X_ACCESS_TOKEN_SECRET: \$\{\{ secrets\.X_ACCESS_TOKEN_SECRET \}\}/);
  assert.doesNotMatch(workflow, /X_USER_ACCESS_TOKEN: \$\{\{ secrets\.X_USER_ACCESS_TOKEN \}\}/);
  assert.match(workflow, /scripts\/x-btc-eth-etf-daily\.mjs/);
  assert.match(script, /X_DRY_RUN \?\? "true"/);
  assert.match(script, /process\.argv\.includes\("--preflight"\)/);
  assert.match(script, /assessEtfSessions/);
  assert.match(script, /selectDailyEtfSession/);
  assert.match(script, /ETF_DAILY_SESSION/);
  assert.match(script, /recordShare/);
  assert.match(script, /if \(!share\.decision\.proceed\)/);
  assert.match(script, /Refusing to post a preview fixture/);
  assert.match(script, /Refusing to post: set ONCHAIN_PUBLISH_SECRET/);
  assert.match(script, /X_USER_ACCESS_TOKEN is not used/);
  assert.match(script, /datasetSlug = "btc-eth-etf-daily-flowboard"/);
  assert.match(script, /period=daily&capture=1/);
  assert.match(script, /\[data-capture='share-card'\]/);
  assert.match(script, /1536/);
  assert.match(script, /1024/);
  assert.match(script, /\/api\/x\/publish-btc-eth-etf-daily/);
  assert.match(script, /refresh\/\$\{datasetSlug\}\?period=daily/);
  assert.doesNotMatch(btcWorkflow, /^\s*schedule:/m);
  assert.doesNotMatch(btcWorkflow, /^\s*- cron:/m);
});
