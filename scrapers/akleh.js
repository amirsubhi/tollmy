'use strict';

/**
 * akleh.js — scraper for Prolintas AKLEH (Ampang–KL Elevated Highway, E12), open system.
 *
 * Single plaza. Same 4-column table structure as SUKE:
 *   image | class | description | fare
 * Source: https://www.prolintas.com.my/akleh/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://www.prolintas.com.my/akleh/';

const PLAZAS = ['AKLEH-JALAN-DATUK-KERAMAT'];

class AklehScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'prolintas',
      highway: 'prolintas-akleh',
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
    if (!Object.keys(fareSet).length) throw new Error('AKLEH fare table not found');
    const fares = {};
    for (const id of PLAZAS) fares[id] = fareSet;
    return fares;
  }
}

module.exports = { AklehScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new AklehScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
