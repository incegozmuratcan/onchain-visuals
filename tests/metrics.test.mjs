import test from 'node:test';
import assert from 'node:assert/strict';
import { safeChangePct, rolling_7d, cumulative_sum, market_share, rank_change, streak_count, supply_pressure_score, long_short_imbalance } from '../tests/testlib.mjs';

test('safeChangePct handles zero previous', () => assert.equal(safeChangePct(100, 0), null));
test('rolling_7d computes sum', () => assert.equal(rolling_7d([1,2,3,4,5,6,7]), 28));
test('cumulative_sum works', () => assert.deepEqual(cumulative_sum([1,2,null,3]), [1,3,3,6]));
test('market_share safe', ()=>assert.equal(market_share(5,10),0.5));
test('rank_change', ()=>assert.equal(rank_change(2,5),3));
test('streak_count', ()=>assert.equal(streak_count([1,2,-1,-2]),2));
test('supply pressure', ()=>assert.equal(supply_pressure_score(100,20),5));
test('imbalance', ()=>assert.equal(long_short_imbalance(70,30),0.4));
