'use strict';

/**
 * elite.js — scraper for PLUS ELITE Highway (North-South Expressway Central Link, E6), closed system.
 *
 * Operated by PLUS Malaysia Berhad via the same Azure API as PLUS NSE.
 * 12 plazas from Sungai Besi (KL) through KLIA to Bandar Baru Nilai.
 * Cookie management mirrors scrapers/plus.js — see that file for full notes.
 *
 * API class → schema class: {1:1, 5:2, 6:3, 7:4, 13:5}
 * Effective date: 1 February 2020 (PLUS 18% fare reduction across all PLUS highways).
 * Source: https://www.plus.com.my/?option=com_toll
 */

const { ConcessionaireScraper } = require('./base');

const API_BASE = 'https://plusapp-api-prod1.azurewebsites.net/api/tolls/GetTollFare';
const ORIGIN   = 'https://www.plus.com.my';

const SCHEMA_TO_API = { '1': 1, '2': 5, '3': 6, '4': 7, '5': 13 };

// ELITE plaza codes (PLUS API 3-letter codes) verified via live API probes.
// SEA/BSP/PHT sit at the ELITE/NKVE interchange; assigned to ELITE per highway alignment.
const PLAZA_MAP = {
  SBI: 'Sungai Besi',
  EBN: 'Ebor Utara',
  EBS: 'Ebor Selatan',
  SEA: 'Seafield',
  USJ: 'USJ',
  PHT: 'Putra Heights',
  BSP: 'Bandar Saujana Putra',
  PTJ: 'Putrajaya',
  BGC: 'Bandar Gamuda Cove',
  KLA: 'KLIA',
  BSR: 'Bandar Serenia',
  BBN: 'Bandar Baru Nilai',
};

function plazaId(code) { return `ELITE-${code}`; }

class EliteScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'plus',
      highway: 'elite',
      system: 'closed',
      sourceUrl: 'https://www.plus.com.my/?option=com_toll',
      effectiveDate: '2020-02-01',
      minDelayMs: 1500,
    });
    this._cookie = null;
  }

  async _refreshCookie() {
    await new Promise(r => setTimeout(r, this.minDelayMs));
    const res = await fetch(`${API_BASE}/BTR/BSR/1`, {
      headers: { 'User-Agent': this.userAgent, 'Origin': ORIGIN },
    });
    const m = (res.headers.get('set-cookie') || '').match(/ARRAffinity=[^;]*/);
    this._cookie = m ? m[0] : null;
    const probe = await this._get('BTR', 'BSR', 1);
    if (probe === null) throw new Error('Cookie probe BTR→BSR/1 returned empty — aborting.');
  }

  async _get(from, to, apiClass) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`${API_BASE}/${from}/${to}/${apiClass}`, {
          headers: {
            'User-Agent': this.userAgent,
            'Origin': ORIGIN,
            'Referer': `${ORIGIN}/`,
            ...(this._cookie ? { Cookie: this._cookie } : {}),
          },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = (await res.text()).trim();
        return text ? +text : null;
      } catch (e) {
        if (attempt === 3) throw e;
        process.stdout.write(` [net-retry ${attempt}]`);
        await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
  }

  async scrape() {
    await this._refreshCookie();

    const fares  = {};
    const codes  = Object.keys(PLAZA_MAP);
    let checked  = 0;
    let valid    = 0;

    for (const entry of codes) {
      for (const exit of codes) {
        if (entry === exit) continue;

        if (checked > 0 && checked % 50 === 0) {
          const health = await this._get('BTR', 'BSR', 1);
          if (health === null) await this._refreshCookie();
        }

        await new Promise(r => setTimeout(r, this.minDelayMs));
        checked++;

        const c1 = await this._get(entry, exit, 1);
        if (c1 === null) continue;

        const [c2, c3, c4, c5] = await Promise.all(
          [5, 6, 7, 13].map(ac => this._get(entry, exit, ac))
        );

        const fareSet = { '1': c1 };
        if (c2 !== null) fareSet['2'] = c2;
        if (c3 !== null) fareSet['3'] = c3;
        if (c4 !== null) fareSet['4'] = c4;
        if (c5 !== null) fareSet['5'] = c5;

        const entryId = plazaId(entry);
        const exitId  = plazaId(exit);
        if (!fares[entryId]) fares[entryId] = {};
        fares[entryId][exitId] = fareSet;
        valid++;
      }
    }

    process.stdout.write(`\n  ELITE: ${checked} checked, ${valid} valid\n`);
    return fares;
  }
}

module.exports = { EliteScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new EliteScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
