'use strict';

/**
 * mex.js — scraper for MEX (Maju Expressway), open system.
 *
 * Operator:    Maju Expressway Sdn Bhd (MESB)
 * Data source: https://www.mex.com.my/features-and-facilities/toll-operations/
 *              fetched via the WordPress REST API (returns full tab panel HTML)
 *
 * Unlike other open-system highways, MEX has DIFFERENT rates at each plaza.
 * The page uses SiteOrigin tabs — one tab per plaza, each containing a TablePress
 * table (tablepress-1/2/3). The API returns all three in document order, matching
 * the tab order: Salak Selatan → Seri Kembangan → Putrajaya Utama.
 *
 * Parsing strategy:
 *   1. Fetch JSON from the WP pages API.
 *   2. Slice the rendered HTML into three <table> blocks.
 *   3. In each block, match <tr> rows that contain "Class N" and "RMX.XX".
 */

const { ConcessionaireScraper } = require('./base');

const API_URL = 'https://www.mex.com.my/wp-json/wp/v2/pages?slug=toll-operations&_fields=content';

// Tab order matches tablepress-1/2/3 order in the rendered HTML.
const PLAZA_IDS = [
  'MEX-SALAK-SELATAN',
  'MEX-SERI-KEMBANGAN',
  'MEX-PUTRAJAYA',
];

class MexScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'mex',
      highway: 'mex',
      system: 'open',
      sourceUrl: 'https://www.mex.com.my/features-and-facilities/toll-operations/',
      effectiveDate: '2016-01-13', // fully electronic since 13 January 2016
    });
  }

  async scrape() {
    const json = JSON.parse(await this.fetchText(API_URL));
    const html = json[0]?.content?.rendered;
    if (!html) throw new Error('Unexpected WP API response — content.rendered missing.');

    // Split into individual tablepress table blocks
    const tables = [...html.matchAll(/<table[^>]*class="tablepress[^"]*"[\s\S]*?<\/table>/g)];
    if (tables.length < PLAZA_IDS.length) {
      throw new Error(`Expected ${PLAZA_IDS.length} fare tables, found ${tables.length} — page structure may have changed.`);
    }

    const fares = {};
    for (let i = 0; i < PLAZA_IDS.length; i++) {
      const tableHtml = tables[i][0];
      const fareSet = {};

      // Each body row: ... Class N ... RM X.XX ...
      for (const [, cls, amount] of tableHtml.matchAll(
        /<tr[^>]*>[\s\S]*?Class\s+(\d)[\s\S]*?RM([\d.]+)[\s\S]*?<\/tr>/g
      )) {
        fareSet[cls] = +amount;
      }

      if (!Object.keys(fareSet).length) {
        throw new Error(`No fares parsed from table ${i + 1} (${PLAZA_IDS[i]}) — HTML structure may have changed.`);
      }

      fares[PLAZA_IDS[i]] = fareSet;
    }

    return fares;
  }
}

module.exports = { MexScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new MexScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
