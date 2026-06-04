'use strict';

/**
 * besraya.js — scraper for BESRAYA (Sungai Besi–Ulu Kelang Elevated Expressway, E9), open system.
 *
 * Operated by IJM Corporation Berhad.
 * Two plazas (Loke Yew, Mines). Each plaza has a flat per-class rate.
 *
 * Mines Utara and Mines Selatan are separate physical gantries but share one
 * fare entry — modelled as a single BESRAYA-MINES plaza.
 *
 * Source: https://ijmtolldiv.com/besraya/ (currently returning 404/bot-block).
 * Fares sourced from the official Jan 2023 rate-card image archived at:
 *   https://ijmtolldiv.com/wp-content/uploads/2022/12/WhatsApp-Image-2022-12-31-at-11.36.01-PM.jpeg
 * (Wayback snapshot 20230217203320; effective 2023-01-01)
 */

const { ConcessionaireScraper } = require('./base');

const FARES = {
  'BESRAYA-LOKE-YEW': { '1': 1.85, '2': 3.70, '3': 3.70, '4': 1.85, '5': 1.85 },
  'BESRAYA-MINES':    { '1': 1.85, '2': 3.70, '3': 3.70, '4': 1.85, '5': 1.30 },
};

class BesrayaScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'ijm',
      highway: 'besraya',
      system: 'open',
      sourceUrl: 'https://ijmtolldiv.com/besraya/',
      effectiveDate: '2023-01-01',
    });
  }

  async scrape() {
    return { ...FARES };
  }
}

module.exports = { BesrayaScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new BesrayaScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
