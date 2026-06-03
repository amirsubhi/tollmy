'use strict';

/**
 * penang2.js — scraper for Penang Second Bridge (Sultan Abdul Halim Mu'adzam Shah Bridge, E28).
 *
 * Operated by Jambatan Kedua Sdn Bhd (JKSB).
 * Two toll plazas:
 *   JKSB-JK2PP      — main bridge plaza (southbound, Batu Kawan side)
 *   JKSB-BANDAR-CASSIA — lower-rate ramp plaza for Bandar Cassia I/C users only
 *
 * Table format: Type | Class (bare digit) | Description | Fare (RM X.XX with space)
 * Source: https://www.jambatankedua.com.my/public/
 *
 * Class 1 was reduced from RM 7.00 to RM 5.74 on 1 February 2020 (PLUS 18%
 * reduction; Classes 2–5 unchanged). Motorcycles are free (not modelled).
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://www.jambatankedua.com.my/public/';

// Bandar Cassia fares confirmed from jambatankedua.com.my source.
const BANDAR_CASSIA_FARES = { '1': 0.60, '2': 0.90, '3': 1.20, '4': 0.30, '5': 0.50 };

class Penang2Scraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'jksb',
      highway: 'penang2',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2020-02-01',
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);

    // Row format: type-icon td | class-number td (digit, sometimes in <span>) |
    //             description td | fare td (RM <strong>X.XX</strong>)
    const mainFares = {};
    for (const [, row] of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cls  = row.match(/class-number[^>]*>(?:<[^>]+>)?(\d)(?:<\/[^>]+>)?/)?.[1];
      const fare = row.match(/<strong>([\d.]+)<\/strong>/)?.[1];
      if (cls && fare) mainFares[cls] = +fare;
    }
    if (!Object.keys(mainFares).length) throw new Error('Penang 2nd Bridge: fare table not found');

    return {
      'JKSB-JK2PP':        mainFares,
      'JKSB-BANDAR-CASSIA': BANDAR_CASSIA_FARES,
    };
  }
}

module.exports = { Penang2Scraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new Penang2Scraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
