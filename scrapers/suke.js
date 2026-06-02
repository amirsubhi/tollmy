'use strict';

/**
 * suke.js — scraper for SUKE (Sungai Besi-Ulu Kelang Elevated Expressway), open system.
 *
 * Operator:    Projek Lintasan Kota Holdings Sdn Bhd (Prolintas)
 * Data source: https://www.prolintas.com.my/suke/
 *
 * HTML table structure: 4 columns — vehicle-type image, class number, description, fare.
 * All 3 plazas charge the same flat rate. Last updated on page: 20 May 2024.
 *
 * Plazas (sourced from prolintas.com.my): Ampang, Bukit Teratai, Alam Damai.
 */

const { ConcessionaireScraper } = require('./base');

const PLAZAS = [
  'SUKE-AMPANG',
  'SUKE-BUKIT-TERATAI',
  'SUKE-ALAM-DAMAI',
];

class SukeScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'prolintas',
      highway: 'prolintas-suke',
      system: 'open',
      sourceUrl: 'https://www.prolintas.com.my/suke/',
      effectiveDate: '2022-10-15', // toll collection started 15 October 2022
    });
  }

  async scrape() {
    const html = await this.fetchText(this.sourceUrl);

    // Row: <td><img .../></td><td>CLASS</td><td>description</td><td>FARE</td>
    const fareSet = {};
    for (const [, cls, amount] of html.matchAll(
      /<td><img[^>]*><\/td>\s*<td>(\d)<\/td>\s*<td>[^<]+<\/td>\s*<td>([\d.]+)<\/td>/g
    )) {
      fareSet[cls] = +amount;
    }

    if (!Object.keys(fareSet).length) {
      throw new Error('No fares parsed — SUKE/Prolintas HTML structure may have changed.');
    }

    const fares = {};
    for (const plaza of PLAZAS) {
      fares[plaza] = { ...fareSet };
    }
    return fares;
  }
}

module.exports = { SukeScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SukeScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
