'use strict';

/**
 * plus.js — LIVE scraper for PLUS North-South Expressway (NSE), closed system.
 *
 * Data source: PLUS fare calculator API (extracted from the calculator page JS):
 *   https://plusapp-api-prod1.azurewebsites.net/api/tolls/GetTollFare/{from}/{to}/{class}
 * Returns: plain-text MYR fare, or an empty body if no fare for that pair/class.
 *
 * IMPORTANT — session cookie:
 *   Without an ARRAffinity sticky-session cookie the server returns 200 + empty
 *   body for EVERY request, making live pairs look like gaps. This scraper obtains
 *   the cookie on startup and refreshes it every 200 pairs during a full run.
 *
 * API class → schema class mapping (from website JS switch statement):
 *   API  1  car / SUV / MPV      → schema class 1
 *   API  5  2-axle lorry         → schema class 2
 *   API  6  3-axle lorry         → schema class 3
 *   API  7  taxi                 → schema class 4
 *   API 13  2-axle bus           → schema class 5
 *
 * SPOT-CHECK NOTE — Juru (JRU) → Ipoh Selatan (IPS):
 *   The PLUS API returns an empty body for JRU→IPS, matching what the PLUS
 *   website calculator would show (it calls the same endpoint). IPS appears to
 *   be an entry-only plaza for southbound traffic; northbound travelers exiting
 *   at Ipoh use IPU (Ipoh Utara) instead. Verified:
 *     JRU → IPU (Ipoh Utara)   = RM 13.78 Class 1  ← correct Juru-to-Ipoh fare
 *     BTR → IPS (Ipoh Selatan) = RM 16.32 Class 1  ← IPS is valid as exit from south
 *   The rate file will contain JRU→IPU but NOT JRU→IPS; this is authoritative,
 *   not a data gap.
 */

const { ConcessionaireScraper } = require('./base');

const API_BASE = 'https://plusapp-api-prod1.azurewebsites.net/api/tolls/GetTollFare';
const ORIGIN   = 'https://www.plus.com.my';

// Schema class number → PLUS API class number
const SCHEMA_TO_API = { '1': 1, '2': 5, '3': 6, '4': 7, '5': 13 };

// All active NSE plazas from the PLUS fare calculator (sourced 2026-06-02).
// Key = 3-letter API code; value = human-readable name (for plazas.json parity).
const PLAZA_MAP = {
  // Johor
  TGK: 'Tangkak',          PGH: 'Pagoh',                BGR: 'Bukit Gambir',
  YPU: 'Yong Peng Utara',  YPS: 'Yong Peng Selatan',    AHT: 'Ayer Hitam',
  MAC: 'Machap',            SPR: 'Simpang Renggam',      SDK: 'Sedenak',
  KLI: 'Kulai',             SKD: 'Skudai',               SNU: 'Senai Utara',
  KPS: 'Kempas',            BSI: 'Bangunan Sultan Iskandar',
  TTK: 'Tanjung Kupang',   TLK: 'Lima Kedai',            TTP: 'Perling',
  // Kedah
  JTR: 'Jitra',            HKG: 'Hutan Kampong',         ASU: 'Alor Setar Utara',
  ASS: 'Alor Setar Selatan', PDG: 'Pendang',             GRN: 'Gurun',
  SPU: 'Sungai Petani Utara', SPS: 'Sungai Petani Selatan', BBR: 'Bandar Baharu',
  // Melaka
  SAT: 'Simpang Ampat',    AKH: 'Ayer Keroh',            JSN: 'Jasin',
  // Negeri Sembilan
  BDA: 'Bandar Ainsdale',  SBN: 'Seremban',              PDU: 'Port Dickson Utara',
  PDS: 'Port Dickson Selatan', SWG: 'Senawang',          PLI: 'Pedas Linggi',
  MBU: 'Mambau',           BBN: 'Bandar Baru Nilai',     LKT: 'Lukut',
  // Perak
  ALP: 'Alor Pongsu',      BKM: 'Bukit Merah',           TPU: 'Taiping Utara',
  CKJ: 'Changkat Jering',  KKS: 'Kuala Kangsar',         IPU: 'Ipoh Utara',
  IPS: 'Ipoh Selatan',     SPP: 'Simpang Pulai',         GPG: 'Gopeng',
  TPH: 'Tapah',            BDR: 'Bidor',                 SKI: 'Sungkai',
  PSR: 'Slim River',       TGM: 'Tanjung Malim',         BRG: 'Behrang',
  // Penang
  BRT: 'Bertam',           SGD: 'Sungai Dua',            JRU: 'Juru',
  BTU: 'Bukit Tambun Utara', BTS: 'Bukit Tambun Selatan', BCS: 'Bandar Cassia',
  KSG: 'Kubang Semang',    LUN: 'Lunas',                 JWI: 'Jawi',
  JPP: 'Penang Bridge',
  // Selangor
  LBB: 'Lembah Beringin',  BKB: 'Bukit Beruntung',       RAW: 'Rawang',
  SGB: 'Sungai Buloh',     RWS: 'Rawang Selatan',        HSB: 'Hospital Sungai Buloh',
  SBY: 'Sungai Buaya',     KDR: 'Kota Damansara',        DMR: 'Damansara',
  SBG: 'Subang',           STA: 'Setia Alam',            BKR: 'Bukit Raja',
  SBI: 'Sungai Besi',      UPM: 'UPM',                   KJG: 'Kajang',
  BGS: 'Bangi',            PSV: 'Southville',            PPM: 'Putra Mahkota',
  SHA: 'Shah Alam',        EBN: 'Ebor Utara',            EBS: 'Ebor Selatan',
  SEA: 'Seafield',         USJ: 'USJ',                   PHT: 'Putra Height',
  BSP: 'Bandar Saujana Putra', BGC: 'Bandar Gamuda Cove', BSR: 'Bandar Serenia',
  BTR: 'Bukit Tagar',      KLA: 'KLIA',
  // Kuala Lumpur / Putrajaya
  JLD: 'Jalan Duta',       PTJ: 'Putrajaya',
};

class PlusScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'plus',
      highway: 'plus-nse',
      system: 'closed',
      sourceUrl: 'https://www.plus.com.my/?option=com_toll',
      effectiveDate: '2026-01-01',
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
    // Verify immediately — without a working cookie every request returns empty
    const probe = await this._get('BTR', 'BSR', 1);
    if (probe === null) throw new Error('Cookie probe BTR→BSR/1 returned empty — cannot distinguish live fares from API failures. Aborting.');
  }

  async _get(from, to, apiClass) {
    const res = await fetch(`${API_BASE}/${from}/${to}/${apiClass}`, {
      headers: {
        'User-Agent': this.userAgent,
        'Origin': ORIGIN,
        'Referer': `${ORIGIN}/`,
        ...(this._cookie ? { Cookie: this._cookie } : {}),
      },
    });
    if (!res.ok) throw new Error(`API ${from}→${to}/${apiClass}: HTTP ${res.status}`);
    const text = (await res.text()).trim();
    return text ? +text : null;
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

        // Re-probe a known pair every 200 attempts — the ARRAffinity affinity target
        // can recycle on a 3h+ run; a stale cookie causes live fares to look empty.
        if (checked > 0 && checked % 200 === 0) {
          await new Promise(r => setTimeout(r, this.minDelayMs));
          const health = await this._get('BTR', 'BSR', 1);
          if (health === null) {
            process.stdout.write('\n  [stale cookie — refreshing]');
            await this._refreshCookie();
          }
        }

        await new Promise(r => setTimeout(r, this.minDelayMs));
        checked++;

        // Class 1 probe — empty body means no fare for this entry/exit pair
        const c1 = await this._get(entry, exit, 1);
        if (c1 === null) continue;

        // Remaining 4 standard classes concurrently (mirrors website behaviour)
        const [c2, c3, c4, c5] = await Promise.all(
          [5, 6, 7, 13].map(ac => this._get(entry, exit, ac))
        );

        const fareSet = { '1': c1 };
        if (c2 !== null) fareSet['2'] = c2;
        if (c3 !== null) fareSet['3'] = c3;
        if (c4 !== null) fareSet['4'] = c4;
        if (c5 !== null) fareSet['5'] = c5;

        const entryId = `PLUS-NSE-${entry}`;
        const exitId  = `PLUS-NSE-${exit}`;
        if (!fares[entryId]) fares[entryId] = {};
        fares[entryId][exitId] = fareSet;
        valid++;

        if (valid % 50 === 0) process.stdout.write(`\n  [${checked} checked, ${valid} valid pairs]`);
      }
    }

    process.stdout.write(`\n  Done: ${checked} pairs checked, ${valid} valid\n`);
    return fares;
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
