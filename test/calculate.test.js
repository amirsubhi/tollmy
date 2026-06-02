'use strict';

/* Minimal assertion-based tests for the engine. Run: node test/calculate.test.js */

const assert = require('assert');
const { calculate } = require('../lib/calculate');

const closedDoc = {
  highway: 'plus-nse', system: 'closed', currency: 'MYR',
  fares: { 'A': { 'B': { '1': 10.00, '2': 18.00 } } },
};
const openDoc = {
  highway: 'litrak-ldp', system: 'open', currency: 'MYR',
  fares: { 'P': { '1': 2.10 } },
};
const promos = [{
  id: 'raya', name: 'Raya 50%', type: 'percentage', value: 50,
  starts: '2026-03-18T00:01:00+08:00', ends: '2026-03-19T23:59:00+08:00',
  eligible_classes: ['1'], excluded_plazas: ['BORDER'],
  conditional_eligibility: [{ plaza: 'PENANG-BRIDGE', additional_classes: ['2'] }],
}];

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('✓', name); };

ok('closed base fare', () => {
  const r = calculate({ rateDoc: closedDoc, entry: 'A', exit: 'B', vehicleClass: '1' });
  assert.strictEqual(r.base, 10.00);
  assert.strictEqual(r.final, 10.00);
});

ok('open base fare', () => {
  const r = calculate({ rateDoc: openDoc, entry: 'P', vehicleClass: '1' });
  assert.strictEqual(r.final, 2.10);
});

ok('fare not found', () => {
  const r = calculate({ rateDoc: closedDoc, entry: 'A', exit: 'Z', vehicleClass: '1' });
  assert.strictEqual(r.error, 'fare_not_found');
});

ok('promotion applies in window for eligible class', () => {
  const at = new Date('2026-03-18T10:00:00+08:00');
  const r = calculate({ rateDoc: closedDoc, entry: 'A', exit: 'B', vehicleClass: '1', promotions: promos, at });
  assert.strictEqual(r.final, 5.00);
  assert.strictEqual(r.applied.length, 1);
  assert.strictEqual(r.applied[0].saved, 5.00);
});

ok('promotion does NOT apply to ineligible class', () => {
  const at = new Date('2026-03-18T10:00:00+08:00');
  const r = calculate({ rateDoc: closedDoc, entry: 'A', exit: 'B', vehicleClass: '2', promotions: promos, at });
  assert.strictEqual(r.final, 18.00);
  assert.strictEqual(r.applied.length, 0);
});

ok('promotion does NOT apply outside time window', () => {
  const at = new Date('2026-03-20T10:00:00+08:00');
  const r = calculate({ rateDoc: closedDoc, entry: 'A', exit: 'B', vehicleClass: '1', promotions: promos, at });
  assert.strictEqual(r.final, 10.00);
});

ok('promotion excluded at border plaza', () => {
  const at = new Date('2026-03-18T10:00:00+08:00');
  const doc = { highway: 'x', system: 'open', currency: 'MYR', fares: { 'BORDER': { '1': 10 } } };
  const r = calculate({ rateDoc: doc, entry: 'BORDER', vehicleClass: '1', promotions: promos, at });
  assert.strictEqual(r.final, 10.00);
});

ok('conditional eligibility (Class 2 at Penang Bridge)', () => {
  const at = new Date('2026-03-18T10:00:00+08:00');
  const doc = { highway: 'x', system: 'open', currency: 'MYR', fares: { 'PENANG-BRIDGE': { '2': 14 } } };
  const r = calculate({ rateDoc: doc, entry: 'PENANG-BRIDGE', vehicleClass: '2', promotions: promos, at });
  assert.strictEqual(r.final, 7.00);
});

console.log(`\n${n} tests passed.`);
