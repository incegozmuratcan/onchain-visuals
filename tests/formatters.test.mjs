import test from 'node:test';
import assert from 'node:assert/strict';
import { importTs } from './load-ts.mjs';
const f = await importTs('../lib/formatters.ts');
test('formatSignedPercent shows sign', () => assert.equal(f.formatSignedPercent(0.124), '+12.4%'));
test('formatCompactUsd supports null', () => assert.equal(f.formatCompactUsd(null), 'N/A'));
test('formatSignedUsd negative flows', () => assert.equal(f.formatSignedUsd(-42000000).startsWith('-$'), true));
test('formatFlowOneDecimal keeps one compact decimal', () => {
  assert.equal(f.formatFlowOneDecimal(-643_200_000), '-$643.2M');
  assert.equal(f.formatFlowOneDecimal(-89_400_000), '-$89.4M');
  assert.equal(f.formatFlowOneDecimal(57_000_000_000), '+$57.0B');
  assert.equal(f.formatFlowOneDecimal(12_100_000_000), '+$12.1B');
  assert.equal(f.formatFlowOneDecimal(null), 'N/A');
});
test('formatFlowCardAmount uses one decimal for millions and two for billions', () => {
  assert.equal(f.formatFlowCardAmount(-284_100_000), '-$284.1M');
  assert.equal(f.formatFlowCardAmount(-70_500_000), '-$70.5M');
  assert.equal(f.formatFlowCardAmount(-1_280_000_000), '-$1.28B');
  assert.equal(f.formatFlowCardAmount(54_890_000_000), '+$54.89B');
  assert.equal(f.formatFlowCardAmount(11_550_000_000), '+$11.55B');
  assert.equal(f.formatFlowCardAmount(null), 'N/A');
});
test('formatFlowWholeMillions rounds issuer flows', () => {
  assert.equal(f.formatFlowWholeMillions(-233_400_000), '-$233M');
  assert.equal(f.formatFlowWholeMillions(-233_500_000), '-$234M');
  assert.equal(f.formatFlowWholeMillions(-204_000_000), '-$204M');
  assert.equal(f.formatFlowWholeMillions(-41_000_000), '-$41M');
  assert.equal(f.formatFlowWholeMillions(1_280_000_000), '+$1.28B');
  assert.equal(f.formatFlowWholeMillions(12_100_000_000), '+$12.10B');
});
test('formatAddress', () => assert.equal(f.formatAddress('0x1234567890abcdef').includes('...'), true));
test('formatTxHash', () => assert.equal(f.formatTxHash('0x1234567890abcdef').includes('...'), true));
test('formatTimeAgo', () => assert.equal(f.formatTimeAgo(new Date().toISOString()).startsWith('Updated'), true));
test('formatShareUpdated uses the card footer clock in UTC', () => {
  assert.equal(f.formatShareUpdated('2026-11-13T14:02:00.000Z'), 'Nov 13, 2026, 02:02 PM UTC');
  assert.equal(f.formatShareUpdated('2026-11-13T00:05:00.000Z'), 'Nov 13, 2026, 12:05 AM UTC');
  assert.equal(f.formatShareUpdated('2026-01-01T12:00:00.000Z'), 'Jan 1, 2026, 12:00 PM UTC');
  assert.equal(f.formatShareUpdated(null), '—');
  assert.equal(f.formatShareUpdated('not-a-date'), 'not-a-date');
});
