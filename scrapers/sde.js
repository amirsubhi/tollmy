'use strict';

/**
 * sde.js — scraper for SDE (Senai–Desaru Expressway, E22), closed system.
 *
 * Operated by Senai-Desaru Expressway Berhad (SDEB).
 * 4 plazas; 12 directional pairs. Fares published as a single PNG on the
 * official Wix site — no parseable HTML table.
 *
 * Drift guard: downloads the fare image and checks its SHA-256. If SDEB
 * replaces the image the hash changes and this scraper aborts, forcing
 * manual re-transcription.
 *
 * Source: https://www.sde22.com/toll-fare
 */

const { ConcessionaireScraper } = require('./base');
const crypto = require('crypto');

const IMAGE_URL  = 'https://static.wixstatic.com/media/ca157d_eea17fb007434dca90dfaaa514a0146b~mv2.png';
const KNOWN_SHA256 = '62f3391b81e568d2d97c0ab087204d09c18313f7ea1ab979546c6796c3170bb9';

// Full entry×exit matrix transcribed from the official fare image (verified 2026-06-04).
const FARES = {
  'SDE-SENAI': {
    'SDE-ULU-TIRAM':   { '1':  4.50, '2':  6.80, '3':  9.00, '4': 2.30, '5': 2.80 },
    'SDE-CAHAYA-BARU': { '1':  9.20, '2': 13.80, '3': 18.40, '4': 4.60, '5': 5.70 },
    'SDE-PENAWAR':     { '1': 13.50, '2': 20.20, '3': 27.00, '4': 6.80, '5': 8.40 },
  },
  'SDE-ULU-TIRAM': {
    'SDE-SENAI':       { '1':  4.50, '2':  6.80, '3':  9.00, '4': 2.30, '5': 2.80 },
    'SDE-CAHAYA-BARU': { '1':  5.60, '2':  8.50, '3': 11.30, '4': 2.80, '5': 3.50 },
    'SDE-PENAWAR':     { '1':  9.90, '2': 14.90, '3': 19.90, '4': 5.00, '5': 6.20 },
  },
  'SDE-CAHAYA-BARU': {
    'SDE-SENAI':       { '1':  9.20, '2': 13.80, '3': 18.40, '4': 4.60, '5': 5.70 },
    'SDE-ULU-TIRAM':   { '1':  5.60, '2':  8.50, '3': 11.30, '4': 2.80, '5': 3.50 },
    'SDE-PENAWAR':     { '1':  5.20, '2': 11.40, '3': 14.40, '4': 3.60, '5': 4.50 },
  },
  'SDE-PENAWAR': {
    'SDE-SENAI':       { '1': 13.50, '2': 20.20, '3': 27.00, '4': 6.80, '5': 8.40 },
    'SDE-ULU-TIRAM':   { '1':  9.90, '2': 14.90, '3': 19.90, '4': 5.00, '5': 6.20 },
    'SDE-CAHAYA-BARU': { '1':  7.20, '2': 10.80, '3': 14.40, '4': 3.60, '5': 4.50 },
  },
};

class SdeScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'sdeb',
      highway: 'sde',
      system: 'closed',
      sourceUrl: 'https://www.sde22.com/toll-fare',
      effectiveDate: '2024-01-01', // effective date unconfirmed; update once verified
    });
  }

  async scrape() {
    const res = await fetch(IMAGE_URL, { headers: { 'User-Agent': this.userAgent } });
    if (!res.ok) throw new Error(`SDE fare image fetch failed: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const actual = crypto.createHash('sha256').update(buf).digest('hex');
    if (actual !== KNOWN_SHA256) {
      throw new Error(
        `SDE fare image has changed (SHA-256 ${actual} ≠ expected ${KNOWN_SHA256}).\n` +
        `Download ${IMAGE_URL} and manually re-transcribe fares, then update KNOWN_SHA256 and FARES.`
      );
    }
    return { ...FARES };
  }
}

module.exports = { SdeScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new SdeScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
