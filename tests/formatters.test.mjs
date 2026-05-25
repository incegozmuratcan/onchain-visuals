import test from 'node:test';
import assert from 'node:assert/strict';
const formatSignedPercent = (value) => value == null ? 'N/A' : `${value >= 0 ? '+' : ''}${(value*100).toFixed(1)}%`;
const formatCompactUsd = (value) => value == null ? 'N/A' : new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(value);

test('formatSignedPercent shows sign', () => assert.equal(formatSignedPercent(0.124), '+12.4%'));
test('formatCompactUsd supports null', () => assert.equal(formatCompactUsd(null), 'N/A'));
