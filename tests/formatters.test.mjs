import test from 'node:test';
import assert from 'node:assert/strict';
import { formatSignedPercent, formatCompactUsd, formatSignedUsd, formatAddress, formatTxHash, formatTimeAgo } from '../lib/formatters.mjs';

test('formatSignedPercent shows sign', () => assert.equal(formatSignedPercent(0.124), '+12.4%'));
test('formatCompactUsd supports null', () => assert.equal(formatCompactUsd(null), 'N/A'));
test('formatSignedUsd', () => assert.equal(formatSignedUsd(-42000000).startsWith('-$'), true));
test('formatAddress', () => assert.equal(formatAddress('0x1234567890abcdef').includes('...'), true));
test('formatTxHash', () => assert.equal(formatTxHash('0x1234567890abcdef').includes('...'), true));
test('formatTimeAgo', () => assert.equal(formatTimeAgo(new Date().toISOString()).startsWith('Updated'), true));
