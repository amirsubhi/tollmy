'use strict';

/**
 * plus.js — REFERENCE SCRAPER for PLUS North-South Expressway (closed system).
 *
 * This is the template. Every other concessionaire scraper is a copy of this
 * with scrape() adapted to that operator's published rate source.
 *
 * NOTE: scrape() below returns a small SEEDED sample so the pipeline runs
 * end-to-end offline. In Claude Code, replace the body of scrape() with real
 * parsing of PLUS's published fare source (fetchText -> parse -> build fares).
 * Keep the return shape identical. Then widen coverage and bump last_verified.
 */

const { ConcessionaireScraper } = require('./base');

class PlusScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'plus',
      highway: 'plus-nse',
      system: 'closed',
      // Replace with the actual published rate endpoint when wiring live scrape.
      sourceUrl: 'https://www.plus.com.my/index.php?option=com_toll',
      effectiveDate: '2026-01-01',
    });
  }

  async scrape() {
    // ---- LIVE SCRAPE GOES HERE (Claude Code) ----
    // const html = await this.fetchText(this.sourceUrl);
    // ...parse the entry×exit fare matrix for all 5 classes...
    // return parsedFares;
    //
    // Seeded sample below: a few real-world-shaped Class 1–5 fares between
    // northern NSE plazas. Values are illustrative placeholders pending live
    // scrape + spot-check; do NOT treat as authoritative.
    return {
      'PLUS-NSE-JURU': {
        'PLUS-NSE-SBANGKA': { '1': 9.10, '2': 16.30, '3': 24.50, '4': 5.45, '5': 10.90 },
        'PLUS-NSE-IPOH-S':  { '1': 24.90, '2': 44.80, '3': 67.20, '4': 14.95, '5': 29.90 },
      },
      'PLUS-NSE-SBANGKA': {
        'PLUS-NSE-IPOH-S':  { '1': 16.40, '2': 29.50, '3': 44.30, '4': 9.85, '5': 19.70 },
      },
    };
  }
}

module.exports = { PlusScraper };

// Allow `node scrapers/plus.js` for a quick dry-run (no write).
if (require.main === module) {
  (async () => {
    const { doc, changes } = await new PlusScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
