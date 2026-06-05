'use strict';

/**
 * ekve.js — scraper for EKVE (East Klang Valley Expressway, E27), closed system.
 *
 * Operated by EKVE Sdn Bhd (AZRB subsidiary). Phase 1A only (Sungai Long–Ampang,
 * 24.1 km). Toll collection started 25 October 2025 (preceded by a 55-day free
 * trial from 30 August 2025).
 *
 * Fares sourced from the four official EKVE rate-card JPEG images published at
 * the toll commencement announcement:
 *   https://paultan.org/2025/10/24/east-klang-valley-expressway-ekve-toll-collection-...
 * Each image shows one exit plaza against all 3 entry plazas (Classes 1–5).
 *
 * Source: https://www.ekve.com.my
 */

const { ConcessionaireScraper } = require('./base');

// Full entry×exit matrix transcribed from 4 official rate-card images (verified 2026-06-04).
const FARES = {
  'EKVE-SUNGAI-LONG': {
    'EKVE-BANDAR-MAHKOTA-CHERAS': { '1': 2.68, '2': 4.02, '3':  5.35, '4': 1.34, '5': 1.96 },
    'EKVE-HULU-LANGAT':           { '1': 3.45, '2': 5.17, '3':  6.89, '4': 1.72, '5': 2.53 },
    'EKVE-AMPANG':                { '1': 6.08, '2': 9.12, '3': 12.16, '4': 3.04, '5': 4.46 },
  },
  'EKVE-BANDAR-MAHKOTA-CHERAS': {
    'EKVE-SUNGAI-LONG':  { '1': 2.68, '2': 4.02, '3': 5.35, '4': 1.34, '5': 1.96 },
    'EKVE-HULU-LANGAT':  { '1': 2.02, '2': 3.03, '3': 4.04, '4': 1.01, '5': 1.48 },
    'EKVE-AMPANG':       { '1': 4.65, '2': 6.98, '3': 9.31, '4': 2.33, '5': 3.41 },
  },
  'EKVE-HULU-LANGAT': {
    'EKVE-SUNGAI-LONG':           { '1': 3.45, '2': 5.17, '3': 6.89, '4': 1.72, '5': 2.53 },
    'EKVE-BANDAR-MAHKOTA-CHERAS': { '1': 2.02, '2': 3.03, '3': 4.04, '4': 1.01, '5': 1.48 },
    'EKVE-AMPANG':                { '1': 3.67, '2': 5.51, '3': 7.35, '4': 1.84, '5': 2.69 },
  },
  'EKVE-AMPANG': {
    'EKVE-SUNGAI-LONG':           { '1': 6.08, '2':  9.12, '3': 12.16, '4': 3.04, '5': 4.46 },
    'EKVE-BANDAR-MAHKOTA-CHERAS': { '1': 4.65, '2':  6.98, '3':  9.31, '4': 2.33, '5': 3.41 },
    'EKVE-HULU-LANGAT':           { '1': 3.67, '2':  5.51, '3':  7.35, '4': 1.84, '5': 2.69 },
  },
};

class EkveScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'ekve',
      highway: 'ekve',
      system: 'closed',
      sourceUrl: 'https://www.ekve.com.my',
      effectiveDate: '2025-10-25',
    });
  }

  async scrape() {
    const daysSince = (Date.now() - new Date('2026-06-04').getTime()) / 86400000;
    if (daysSince > 90) process.stderr.write(`\n  WARNING: EKVE fares last verified ${Math.floor(daysSince)} days ago — re-verify against operator source.\n`);
    return { ...FARES };
  }
}

module.exports = { EkveScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new EkveScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
