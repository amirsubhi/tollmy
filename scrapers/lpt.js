'use strict';

/**
 * lpt.js — scraper for LPT (Lebuhraya Pantai Timur), closed system.
 *
 * Covers the FULL East Coast Expressway from Karak to Kuala Terengganu:
 *   LPT1 (Karak–Jabor, 9 plazas):  operated by AFA Prime Berhad
 *   LPT2 (Jabor–Kuala Terengganu): operated by LPT2 Sdn Bhd (lpt2.com.my)
 *
 * Both segments are served by the same combined calculator on the AFA Prime
 * website, which is the only parseable official source available for LPT2.
 * Source: https://www.afaprime.com/wp-content/toll_rate/lpt.php
 *
 * The calculator accepts POST with from/to/class and returns
 * "TOLL RATE : <u>RM X.XX</u>". An empty/no-fare response means the
 * pair doesn't exist (not all combinations are valid).
 */

const { ConcessionaireScraper } = require('./base');

const CALC_URL = 'https://www.afaprime.com/wp-content/toll_rate/lpt.php';

// All 19 plazas in route order, Karak (west) → Kuala Terengganu (east).
const PLAZAS = [
  'Karak', 'Lanchang', 'Temerloh', 'Chenor', 'Maran', 'Sri Jaya',
  'Gambang', 'Kuantan', 'Jabor',                          // LPT1
  'Cheneh', 'Cukai', 'Kijal', 'Kertih', 'Paka',           // LPT2
  'Kuala Dungun', 'Bukit Besi', 'Ajil', 'Telemung', 'Kuala Terengganu',
];

function plazaId(name) {
  return 'LPT-' + name.toUpperCase().replace(/\s+/g, '-');
}

class LptScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'afa-prime',
      highway: 'lpt',
      system: 'closed',
      sourceUrl: 'https://www.afaprime.com/?page_id=328',
      effectiveDate: '2016-01-01', // effective date unconfirmed; update once verified
    });
  }

  async _post(from, to, cls) {
    await new Promise(r => setTimeout(r, this.minDelayMs));
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`${CALC_URL}?action=submit`, {
        method: 'POST',
        headers: {
          'User-Agent': this.userAgent,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': 'https://www.afaprime.com/?page_id=328',
        },
        body: `action=submit&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&class=${cls}`,
      });
      if (res.ok) {
        const html = await res.text();
        const m = html.match(/RM\s*([\d.]+)/);
        return m ? +m[1] : null;
      }
      if (attempt < 3) {
        process.stdout.write(` [${res.status} retry ${attempt}]`);
        await new Promise(r => setTimeout(r, 3000 * attempt));
      } else {
        throw new Error(`LPT POST ${from}→${to}/cl${cls}: HTTP ${res.status} after 3 attempts`);
      }
    }
  }

  async scrape() {
    const fares = {};
    let pairs = 0;

    for (const entry of PLAZAS) {
      for (const exit of PLAZAS) {
        if (entry === exit) continue;

        // Probe class 1; skip pair if no fare
        const c1 = await this._post(entry, exit, 1);
        if (c1 === null) continue;

        // Remaining classes sequentially — AFA Prime's server can't handle bursts
        const fareSet = { '1': c1 };
        for (const cls of [2, 3, 4, 5]) {
          const amount = await this._post(entry, exit, cls);
          if (amount !== null) fareSet[String(cls)] = amount;
        }

        if (!fares[plazaId(entry)]) fares[plazaId(entry)] = {};
        fares[plazaId(entry)][plazaId(exit)] = fareSet;
        pairs++;
      }
    }

    process.stdout.write(`\n  LPT: ${pairs} valid pairs\n`);
    return fares;
  }
}

module.exports = { LptScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new LptScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
