'use strict';

/**
 * skve.js — scraper for SKVE (South Klang Valley Expressway, E26), closed system.
 *
 * Operated by SKVE Holdings Sdn Bhd.
 * 6 plazas; 28 valid directional pairs (SAE↔WCE excluded — those are WCE junction
 * entries that don't connect to each other through SKVE).
 *
 * The toll-rates endpoint returns a JSON array — one record per valid entry/exit pair.
 * Source: https://www.skve.com.my/toll-rates
 */

const { ConcessionaireScraper } = require('./base');

const RATES_URL = 'https://www.skve.com.my/toll-rates';

function plazaId(code) { return `SKVE-${code}`; }

class SkveScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'skve',
      highway: 'skve',
      system: 'closed',
      sourceUrl: 'https://www.skve.com.my/toll-fare-calculator',
      effectiveDate: '2024-01-01', // effective date unconfirmed; update once verified
    });
  }

  async scrape() {
    const json = JSON.parse(await this.fetchText(RATES_URL));
    if (!Array.isArray(json) || !json.length) throw new Error('SKVE toll-rates JSON empty or invalid');

    const fares = {};
    for (const row of json) {
      const entry = plazaId(row.from);
      const exit  = plazaId(row.to);
      if (!fares[entry]) fares[entry] = {};
      fares[entry][exit] = {
        '1': +row.fare_class_1,
        '2': +row.fare_class_2,
        '3': +row.fare_class_3,
        '4': +row.fare_class_4,
        '5': +row.fare_class_5,
      };
    }
    return fares;
  }
}

module.exports = { SkveScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SkveScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
