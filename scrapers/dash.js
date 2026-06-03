'use strict';

/**
 * dash.js — scraper for Prolintas DASH (Damansara–Shah Alam Elevated Expressway, E31), open system.
 *
 * Barrier-free (MLFF) expressway. Single flat rate applied at 3 gantry points:
 * Denai Alam, Kwasa Damansara, Kota Damansara. Standard Prolintas 4-column table:
 *   image | class | description | fare (bare decimal, no RM prefix)
 * Source: https://www.prolintas.com.my/dash/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://www.prolintas.com.my/dash/';

const PLAZAS = ['DASH-DENAI-ALAM', 'DASH-KWASA-DAMANSARA', 'DASH-KOTA-DAMANSARA'];

class DashScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'prolintas',
      highway: 'prolintas-dash',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2024-05-20',
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);
    const re = /<td><img[^>]*><\/td>\s*<td>(\d)<\/td>\s*<td>[^<]+<\/td>\s*<td>([\d.]+)<\/td>/g;
    const fareSet = {};
    let m;
    while ((m = re.exec(html)) !== null) fareSet[m[1]] = +m[2];
    if (!Object.keys(fareSet).length) throw new Error('DASH fare table not found');
    const fares = {};
    for (const id of PLAZAS) fares[id] = fareSet;
    return fares;
  }
}

module.exports = { DashScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new DashScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
