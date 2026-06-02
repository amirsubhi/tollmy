'use strict';

/**
 * klk.js — scraper for KLK (Lebuhraya Kuala Lumpur-Karak), open system.
 *
 * Operator:    AFA Prime Berhad (formerly ANIH Berhad)
 * Data source: https://www.afaprime.com/wp-content/toll_rate/klk.php
 *              POST-based PHP calculator; returns "TOLL RATE : <u>RM X.XX</u>"
 *
 * Plazas: Gombak, Bentong (each charges a different flat rate).
 */

const { ConcessionaireScraper } = require('./base');

const CALC_URL = 'https://www.afaprime.com/wp-content/toll_rate/klk.php?action=submit2';
const PLAZAS = ['Gombak', 'Bentong'];

class KlkScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'afa-prime',
      highway: 'klk',
      system: 'open',
      sourceUrl: 'https://www.afaprime.com/?page_id=328',
      effectiveDate: '2016-01-01', // effective date unconfirmed; update once verified
    });
  }

  async _post(plaza, cls) {
    await new Promise(r => setTimeout(r, this.minDelayMs));
    const res = await fetch(CALC_URL, {
      method: 'POST',
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.afaprime.com/?page_id=328',
      },
      body: `action2=submit2&toll_plaza2=${encodeURIComponent(plaza)}&class2=${cls}`,
    });
    if (!res.ok) throw new Error(`KLK POST ${plaza}/cl${cls}: HTTP ${res.status}`);
    const html = await res.text();
    const m = html.match(/RM\s*([\d.]+)/);
    return m ? +m[1] : null;
  }

  async scrape() {
    const fares = {};
    for (const plaza of PLAZAS) {
      const fareSet = {};
      for (const cls of [1, 2, 3, 4, 5]) {
        const amount = await this._post(plaza, cls);
        if (amount !== null) fareSet[String(cls)] = amount;
      }
      if (!Object.keys(fareSet).length) {
        throw new Error(`No fares returned for KLK plaza "${plaza}" — calculator may have changed.`);
      }
      fares[`KLK-${plaza.toUpperCase()}`] = fareSet;
    }
    return fares;
  }
}

module.exports = { KlkScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new KlkScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
