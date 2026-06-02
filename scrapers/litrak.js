'use strict';

/**
 * litrak.js — scraper for LITRAK Lebuhraya Damansara-Puchong (LDP), open system.
 *
 * Data source: https://litrak.com.my/our-highways/litrak/toll-fares/
 * Structure: single HTML fare table; all 4 plazas share identical flat rates.
 *
 * Plazas: Penchala, Petaling Jaya, Puchong Barat, Puchong Selatan.
 *
 * NOTE: The fare page does not publish an effective date. Rates have been stable
 * since at least 2016 (government-mandated freeze). Set effectiveDate below once
 * the gazette date is confirmed.
 */

const { ConcessionaireScraper } = require('./base');

// All 4 active LDP toll plazas. Each charges the same flat rate (open system).
const PLAZAS = [
  'LITRAK-LDP-PENCHALA',
  'LITRAK-LDP-PJ',
  'LITRAK-LDP-PUCHONG-B',
  'LITRAK-LDP-PUCHONG-S',
];

class LitrakScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'litrak',
      highway: 'litrak-ldp',
      system: 'open',
      sourceUrl: 'https://litrak.com.my/our-highways/litrak/toll-fares/',
      effectiveDate: '2016-01-01', // gazette date unconfirmed; rates stable since ~2016
    });
  }

  async scrape() {
    const html = await this.fetchText(this.sourceUrl);

    // Each table row: <td>Class N</td><td><img/></td><td>description</td><td>RMX.XX</td>
    const fareSet = {};
    for (const [, cls, amount] of html.matchAll(/<td>Class\s+(\d)<\/td>[\s\S]*?<td>RM([\d.]+)<\/td>/g)) {
      fareSet[cls] = +amount;
    }

    if (!Object.keys(fareSet).length) {
      throw new Error('No fares parsed — LITRAK HTML structure may have changed.');
    }

    // Same flat fare at every plaza
    const fares = {};
    for (const plaza of PLAZAS) {
      fares[plaza] = { ...fareSet };
    }
    return fares;
  }
}

module.exports = { LitrakScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new LitrakScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
