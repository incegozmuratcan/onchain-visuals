import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTs } from "./load-ts.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const equal = await importTs("../lib/security/timingSafeEqual.ts");

const bounded = await importTs("../lib/onchain/boundedCache.ts");

test("stored-read fallback cache drops the oldest entries", () => {
  const map = new Map();
  for (let i = 0; i < 55; i += 1) bounded.touchBounded(map, String(i), i, 50);
  assert.equal(map.size, 50);
  assert.equal(map.has("0"), false);
  assert.equal(map.has("5"), true);
  bounded.touchBounded(map, "5", 5, 50);
  bounded.touchBounded(map, "newest", 1, 50);
  assert.equal(map.size, 50);
  assert.equal(map.has("5"), true);
  assert.equal(map.has("6"), false);
  assert.equal(map.has("newest"), true);
});

test("timing-safe compare does not throw on different lengths", () => {
  assert.equal(equal.timingSafeEqualText("a", "ab"), false);
  assert.equal(equal.timingSafeEqualText("same", "same"), true);
  assert.equal(equal.timingSafeEqualText("", "x"), false);
});

test("public chart reads use the stored snapshot and capture still builds live", async () => {
  const charts = await read("../app/api/charts/[datasetSlug]/route.ts");
  const page = await read("../app/onchain/[slug]/page.tsx");
  const chain = await read("../app/api/chain-revenue/route.ts");
  const home = await read("../app/page.tsx");
  const layout = await read("../app/layout.tsx");
  assert.match(charts, /readPublicChartSnapshot/);
  assert.match(charts, /publicCacheHeaders/);
  const cache = await read("../lib/onchain/publicSnapshot.ts");
  assert.match(cache, /Vercel-CDN-Cache-Control/);
  assert.match(cache, /s-maxage=300, stale-while-revalidate=600/);
  assert.match(cache, /normalizeChartPeriod/);
  assert.match(cache, /supportedPeriods\.includes/);
  assert.match(cache, /defaultPeriod/);
  assert.match(cache, /process\.env\.VERCEL/);
  assert.match(cache, /FALLBACK_LIMIT = 50/);
  assert.match(cache, /PublicDataUnavailableError/);
  assert.match(charts, /VERCEL_ENV !== "production"/);
  assert.match(charts, /export const dynamic = "force-dynamic"/);
  assert.match(page, /const live = capture && !process\.env\.VERCEL/);
  assert.match(page, /live[\s\S]*buildChartSnapshot/);
  assert.match(page, /readPublicChartSnapshot/);
  assert.match(page, /if \(capture\) return chart/);
  assert.match(page, /Data unavailable/);
  assert.match(charts, /status: 503/);
  assert.match(page, /VERCEL_ENV === 'production'/);
  assert.doesNotMatch(chain, /buildChartSnapshot/);
  assert.match(chain, /readPublicChartSnapshot/);
  assert.match(chain, /publicCacheHeaders/);
  assert.match(home, /export const revalidate = 300/);
  assert.doesNotMatch(home, /force-dynamic/);
  assert.match(layout, /export const revalidate = 300/);
  assert.doesNotMatch(layout, /force-dynamic/);
});

test("source health hides secret names unless the caller has an admin session", async () => {
  const route = await read("../app/api/onchain/source-health/route.ts");
  const health = await importTs("../lib/onchain/redactSourceHealth.ts");
  assert.match(route, /hasSession/);
  assert.match(route, /redactPublicSourceHealth/);
  const redacted = health.redactPublicSourceHealth({
    sources: [{
      source: "dune",
      missingEnv: ["DUNE_API_KEY"],
      lastError: "relation missing: secret",
      warnings: ["DUNE_API_KEY is not configured", "dataset note"],
    }],
  });
  assert.deepEqual(redacted.sources[0].missingEnv, []);
  assert.equal(redacted.sources[0].lastError, null);
  assert.deepEqual(redacted.sources[0].warnings, ["dataset note"]);
});

test("admin session secret fails closed in production and login is throttled", async () => {
  const auth = await read("../lib/admin/auth.ts");
  const actions = await read("../lib/admin/actions.ts");
  const refresh = await read("../app/api/admin/onchain/refresh/[datasetSlug]/route.ts");
  const cron = await read("../app/api/cron/onchain/refresh/route.ts");
  assert.match(auth, /ADMIN_SESSION_SECRET is required in production/);
  assert.match(auth, /timingSafeEqualText/);
  assert.match(auth, /isProduction\(\)/);
  const throttle = await read("../lib/admin/loginThrottle.ts");
  assert.doesNotMatch(throttle, /global/);
  assert.match(throttle, /recordLoginSuccess/);
  assert.match(actions, /assertLoginAllowed/);
  assert.match(actions, /timingSafeEqualText\(token, process\.env\.ADMIN_SETUP_TOKEN\)/);
  assert.match(refresh, /timingSafeEqualText/);
  assert.match(cron, /timingSafeEqualText/);
  const schema = await read("../db/schema.sql");
  assert.match(schema, /admin_login_attempts/);
});

test("non-X workflows install from the lockfile and pin create-pull-request", async () => {
  for (const file of ["../.github/workflows/admin-db-setup.yml", "../.github/workflows/admin-seed-protection-test.yml", "../.github/workflows/sync-logos.yml"]) {
    const source = await read(file);
    assert.match(source, /npm ci/, file);
    assert.doesNotMatch(source, /npm install --no-package-lock/, file);
  }
  const logos = await read("../.github/workflows/sync-logos.yml");
  assert.match(logos, /peter-evans\/create-pull-request@[0-9a-f]{40} # v6/);
  const config = await read("../next.config.mjs");
  assert.match(config, /poweredByHeader: false/);
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /X-Frame-Options/);
  assert.match(config, /Content-Security-Policy-Report-Only/);
  const robots = await read("../app/robots.ts");
  assert.match(robots, /\/api/);
  assert.match(robots, /\/admin/);
});
