'use strict';

/**
 * silk.js — scraper for Prolintas Kajang SILK (E18), open system.
 *
 * Flat rate at all 4 plazas. Standard Prolintas 4-column table:
 *   image | class | description | fare (bare decimal, no RM prefix)
 * Source: https://www.prolintas.com.my/kajang-silk/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://www.prolintas.com.my/kajang-silk/';

const PLAZAS = [
  'SILK-SUNGAI-BALAK',
  'SILK-SUNGAI-RAMAL',
  'SILK-BUKIT-KAJANG',
  'SILK-SUNGAI-LONG',
];

class SilkScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'prolintas',
      highway: 'prolintas-silk',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2022-10-19',
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);
    const re = /<td><img[^>]*><\/td>\s*<td>(\d)<\/td>\s*<td>[^<]+<\/td>\s*<td>([\d.]+)<\/td>/g;
    const fareSet = {};
    let m;
    while ((m = re.exec(html)) !== null) fareSet[m[1]] = +m[2];
    if (!Object.keys(fareSet).length) throw new Error('SILK fare table not found');
    const fares = {};
    for (const id of PLAZAS) fares[id] = fareSet;
    return fares;
  }
}

module.exports = { SilkScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SilkScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
