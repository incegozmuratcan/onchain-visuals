#!/usr/bin/env node
import assert from 'node:assert/strict';
const registryText = await import('node:fs/promises').then((fs)=>fs.readFile(new URL('../lib/onchain/registry.ts', import.meta.url), 'utf8'));
assert(!registryText.includes('coinglass'));
assert(!registryText.includes("category:'risk'"));
assert(registryText.includes('stablecoin-net-transfers-by-chain'));
assert(registryText.includes('btc-etf-flowboard'));
assert(registryText.includes('source_config_required'));
console.log('Onchain source registry verification passed.');
