import test from 'node:test';
import assert from 'node:assert/strict';

const datasetRegistry = [
  {slug:'chain-revenue-league',category:'chains',sources:['defillama']},
  {slug:'chain-stablecoin-supply',category:'chains',sources:['defillama']},
  {slug:'stablecoin-net-transfers-by-chain',category:'chains',sources:['dune']},
  {slug:'binance-liquidation-pulse',category:'markets',sources:['binance']},
];

test('unique slugs', () => { const s = datasetRegistry.map(d=>d.slug); assert.equal(new Set(s).size, s.length); });
test('categories constrained', () => datasetRegistry.forEach(d=>assert.ok(['chains','protocols','capital-flows','markets'].includes(d.category))));
test('no coinglass', () => datasetRegistry.forEach(d=>assert.equal(d.sources.includes('coinglass'), false)));
