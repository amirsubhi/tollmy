'use strict';

/**
 * kesas.js — scraper for KESAS Shah Alam Expressway (E5), open system.
 *
 * Flat rate at all 4 plazas. Fares are in a Word-pasted HTML table on the
 * toll-lane page; each row has RM X.XX in the first <td> in class order 1–5.
 * Source: https://kesas.com.my/toll-lane/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://kesas.com.my/toll-lane/';

const PLAZAS = [
  'KESAS-AWAN-BESAR-E',
  'KESAS-AWAN-BESAR-W',
  'KESAS-SUNWAY',
  'KESAS-KEMUNING',
];

class KesasScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'kesas',
      highway: 'kesas',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2024-01-01', // effective date unconfirmed; update once verified
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);

    const tableMatch = html.match(/<table[^>]*MsoNormalTable[\s\S]*?<\/table>/);
    if (!tableMatch) throw new Error('KESAS fare table not found');

    const amounts = [];
    const re = /RM\s*([\d.]+)/g;
    let m;
    while ((m = re.exec(tableMatch[0])) !== null) amounts.push(+m[1]);
    if (amounts.length !== 5) throw new Error(`Expected 5 fare amounts, got ${amounts.length}`);

    const fareSet = { '1': amounts[0], '2': amounts[1], '3': amounts[2], '4': amounts[3], '5': amounts[4] };
    const fares = {};
    for (const id of PLAZAS) fares[id] = fareSet;
    return fares;
  }
}

module.exports = { KesasScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new KesasScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
