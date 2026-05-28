#!/usr/bin/env node
process.env.TS_NODE_COMPILER_OPTIONS = '{"module":"commonjs"}';
const { build } = await import('esbuild').catch(() => ({ build: null }));
const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/onchain-refresh-dataset.mjs <datasetSlug> [period]'); process.exit(1); }
const res = await fetch(`http://localhost:${process.env.PORT || 3000}/api/admin/onchain/refresh/${slug}?period=${process.argv[3] || ''}`, { method:'POST', headers: process.env.ONCHAIN_REFRESH_SECRET ? { authorization:`Bearer ${process.env.ONCHAIN_REFRESH_SECRET}` } : {} });
console.log(JSON.stringify(await res.json(), null, 2));
process.exit(res.ok ? 0 : 1);
