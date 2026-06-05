'use strict';

/**
 * spe.js — scraper for SPE (Setiawangsa-Pantai Expressway), open system.
 *
 * Operator:    Lebuhraya DUKE Fasa 3 Sdn. Bhd. (DUKE 3), under Ekovest / KESTURI.
 * Toll start:  3 December 2023.
 *
 * No parseable HTML fare table exists on the operator's website. Fares are
 * hard-coded from the official toll commencement announcement and confirmed by
 * the user. Source URL is the announcement article used as provenance.
 *
 * Fares (all 3 plazas same flat rate):
 *   Class 1 RM3.50 · Class 2 RM7.00 · Class 3 RM10.50 · Class 4 RM1.80 · Class 5 RM3.50
 *
 * Plazas: Chan Sow Lin, Ampang, Setiawangsa — from official toll start announcement.
 *
 * When the operator publishes a parseable fare page, replace scrape() with a live parse
 * and point sourceUrl at the official page.
 */

const { ConcessionaireScraper } = require('./base');

const PLAZAS = [
  'SPE-CHAN-SOW-LIN',
  'SPE-AMPANG',
  'SPE-SETIAWANGSA',
];

const FARES = { '1': 3.50, '2': 7.00, '3': 10.50, '4': 1.80, '5': 3.50 };

class SpeScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'duke',
      highway: 'spe',
      system: 'open',
      sourceUrl: 'https://paultan.org/2023/12/08/setiawangsa-pantai-expressway-spe-toll-starts-rm3-50-at-chan-sow-lin-ampang-and-setiawangsa/',
      effectiveDate: '2023-12-03',
    });
  }

  async scrape() {
    const daysSince = (Date.now() - new Date('2026-06-04').getTime()) / 86400000;
    if (daysSince > 90) process.stderr.write(`\n  WARNING: SPE fares last verified ${Math.floor(daysSince)} days ago — re-verify against operator source.\n`);
    const fares = {};
    for (const plaza of PLAZAS) {
      fares[plaza] = { ...FARES };
    }
    return fares;
  }
}

module.exports = { SpeScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SpeScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
