'use strict';

/**
 * sprint.js — scraper for SPRINT Expressway (Kerinchi/Damansara/Penchala Links), open system.
 *
 * Operated by SPRINT Highway Sdn Bhd (under Lingkaran Trans Kota / ALR group).
 * Three plazas with different per-plaza rates. Table is a multi-column matrix:
 *   Class | Type | Damansara | Pantai | Bukit Kiara
 * Source: https://litrak.com.my/our-highways/sprint/toll-fares/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://litrak.com.my/our-highways/sprint/toll-fares/';

const PLAZAS = ['SPRINT-DAMANSARA', 'SPRINT-PANTAI', 'SPRINT-BUKIT-KIARA'];

class SprintScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'litrak',
      highway: 'sprint',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2021-12-14',
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);
    const fares = {};
    for (const id of PLAZAS) fares[id] = {};

    // Each data row: "Class N" | <img> | RM{d} | RM{p} | RM{bk}
    for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cls = row.match(/Class\s+(\d)/)?.[1];
      if (!cls) continue;
      const amounts = [...row.matchAll(/RM\s*([\d.]+)/g)].map(m => +m[1]);
      if (amounts.length === 3) {
        for (let i = 0; i < PLAZAS.length; i++) fares[PLAZAS[i]][cls] = amounts[i];
      }
    }

    if (!Object.keys(fares[PLAZAS[0]]).length) throw new Error('SPRINT fare table not found');
    return fares;
  }
}

module.exports = { SprintScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SprintScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
