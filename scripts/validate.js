'use strict';

/**
 * validate.js — validates the entire data/ tree against lib/schema.js.
 * Exit code 1 on any error so CI fails. Run: `node scripts/validate.js`
 */

const fs = require('fs');
const path = require('path');
const {
  validateConcessionaires, validatePlazas, validateRateFile, validatePromotions,
} = require('../lib/schema');

const DATA = path.join(__dirname, '..', 'data');
let errorCount = 0;

function load(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
}

function report(label, errs) {
  if (errs.length) {
    errorCount += errs.length;
    console.error(`\n✗ ${label} — ${errs.length} error(s):`);
    errs.forEach(e => console.error('   ' + e));
  } else {
    console.log(`✓ ${label}`);
  }
}

report('concessionaires.json', validateConcessionaires(load('concessionaires.json')));
report('plazas.json', validatePlazas(load('plazas.json')));
report('promotions.json', validatePromotions(load('promotions.json')));

// Cross-check: every plaza references a known highway; every rate file too.
const concessionaires = load('concessionaires.json');
const knownHighways = new Set(concessionaires.flatMap(c => c.highways));
const plazas = load('plazas.json');
const plazaXref = [];
plazas.forEach(p => {
  if (!knownHighways.has(p.highway)) plazaXref.push(`plaza ${p.id} references unknown highway ${p.highway}`);
});
report('plaza→highway cross-reference', plazaXref);

const ratesDir = path.join(DATA, 'rates');
for (const f of fs.readdirSync(ratesDir).filter(f => f.endsWith('.json'))) {
  report(`rates/${f}`, validateRateFile(JSON.parse(fs.readFileSync(path.join(ratesDir, f), 'utf8'))));
}

if (errorCount) {
  console.error(`\n${errorCount} total error(s). Dataset INVALID.`);
  process.exit(1);
}
console.log('\nAll data valid.');
