'use strict';

/**
 * smart.js — scraper for SMART Tunnel (Stormwater Management and Road Tunnel, E38), open system.
 *
 * Operated by Syarikat Mengurus Air Banjir & Terowong Sdn Bhd (Gamuda/ALR group).
 * Single toll point at the Sungai Besi motorway entrance. Classes 3 (heavy
 * vehicles) and 5 (buses) are PROHIBITED — they are absent from the fare set,
 * not zero-rated. Motorcycles are also prohibited (not modelled as a class).
 *
 * Official rates page (smarttunnel.com.my) serves fares as an image with no
 * parseable HTML table. Fares are hard-coded from the official rate (effective
 * 15 October 2015) and cross-checked against Wikipedia and motorist.my.
 *
 * Source: https://smarttunnel.com.my/toll-rate/
 */

const { ConcessionaireScraper } = require('./base');

// No drift-detectable image URL available; rate has been stable since Oct 2015.
const FARES = { '1': 3.00, '2': 4.00, '4': 3.00 };
// Class 3 and 5 deliberately omitted — those vehicle types are prohibited.

const PLAZAS = ['SMART-TUNNEL'];

class SmartScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'smart',
      highway: 'smart',
      system: 'open',
      sourceUrl: 'https://smarttunnel.com.my/toll-rate/',
      effectiveDate: '2015-10-15',
    });
  }

  async scrape() {
    const fares = {};
    for (const id of PLAZAS) fares[id] = FARES;
    return fares;
  }
}

module.exports = { SmartScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SmartScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
