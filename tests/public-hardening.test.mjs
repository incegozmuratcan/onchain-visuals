import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { importTs } from "./load-ts.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const equal = await importTs("../lib/security/timingSafeEqual.ts");

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
  assert.match(charts, /PUBLIC_CACHE_CONTROL/);
  const cache = await read("../lib/onchain/publicSnapshot.ts");
  assert.match(cache, /s-maxage=300, stale-while-revalidate=600/);
  assert.match(charts, /VERCEL_ENV !== "production"/);
  assert.match(charts, /export const dynamic = "force-dynamic"/);
  assert.match(page, /capture\s*\?[\s\S]*buildChartSnapshot/);
  assert.match(page, /readPublicChartSnapshot/);
  assert.match(page, /VERCEL_ENV === 'production'/);
  assert.doesNotMatch(chain, /buildChartSnapshot/);
  assert.match(chain, /readPublicChartSnapshot/);
  assert.match(chain, /PUBLIC_CACHE_CONTROL/);
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
