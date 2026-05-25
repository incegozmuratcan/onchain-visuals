import test from 'node:test';
import assert from 'node:assert/strict';

const safeChangePct = (current, previous) => (current == null || previous == null || previous === 0) ? null : (current - previous) / Math.abs(previous);
const rollingSum = (values, window) => values.slice(-window).reduce((a,b)=>a+(Number.isFinite(b)?b:0),0);
const marketShares = (rows) => { const total = rows.reduce((a,r)=>a+r.value,0); return total ? rows.map((r)=>r.value/total) : rows.map(()=>0); };

test('safeChangePct handles zero previous', () => assert.equal(safeChangePct(100, 0), null));
test('rollingSum computes last N values', () => assert.equal(rollingSum([1,2,3,4], 2), 7));
test('marketShares handles empty total', () => assert.deepEqual(marketShares([{ value: 0 }, { value: 0 }]), [0,0]));
