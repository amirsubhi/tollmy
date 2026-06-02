'use strict';

/**
 * duke.js — scraper for DUKE (Duta-Ulu Kelang Expressway), open system.
 *
 * Operator:    Konsortium Lebuhraya Utara-Timur (KL) Sdn. Bhd. (KESTURI), an Ekovest subsidiary.
 * Data source: https://www.duke.com.my/page/143/Toll-Fare/ — the fare table is a JPEG image
 *              (kadartol.jpg), not a parseable HTML table. Fares were manually transcribed from
 *              the official image and are hard-coded here.
 *
 * Drift guard: scrape() fetches the image on every run and compares its SHA-256 against a known
 *              value. If the hash changes the run ABORTS — forcing a human to re-read the image
 *              and update the hard-coded fares and hash. This ensures a rate revision is never
 *              silently missed.
 *
 * Fares from image (EXIF-dated 2017-11-28, coincides with DUKE Phase 2 opening):
 *   Class 1 RM2.50 · Class 2 RM3.80 · Class 3 RM5.00 · Class 4 RM1.30 · Class 5 RM1.30
 *
 * Plaza names NOTE: sourced from motorist.my (secondary). The DUKE website lists route
 * interchanges, not toll plazas, so these need verification against an official DUKE source.
 */

const crypto = require('crypto');
const { ConcessionaireScraper } = require('./base');

const IMAGE_URL = 'https://www.duke.com.my/files/editor_files//images/The%20Highway/kadartol.jpg';

// SHA-256 of the kadartol.jpg as fetched on 2026-06-02.
// If this changes, ABORT — the image was updated and fares must be re-transcribed.
const KNOWN_IMAGE_SHA256 = '0dec38e6315fadd71c4a15d69e399e912973757ae0b1ffb3175440dd0e91d686';

// NOTE: sourced from motorist.my — verify against an official DUKE toll-plaza listing.
const PLAZAS = [
  'DUKE-AYER-PANAS',
  'DUKE-BATU',
  'DUKE-SEGAMBUT',
  'DUKE-SENTUL-PASAR',
  'DUKE-SENTUL-PASAR-T',
];

// Manually transcribed from the official fare image (Class 4 = taxi, Class 5 = bus).
const FARES = { '1': 2.50, '2': 3.80, '3': 5.00, '4': 1.30, '5': 1.30 };

class DukeScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'duke',
      highway: 'duke',
      system: 'open',
      sourceUrl: 'https://www.duke.com.my/page/143/Toll-Fare/',
      effectiveDate: '2017-11-28', // DUKE Phase 2 opening; exact gazette date unconfirmed
    });
  }

  async scrape() {
    // Fetch the fare image and verify it has not changed.
    await new Promise(r => setTimeout(r, this.minDelayMs));
    const res = await fetch(IMAGE_URL, {
      headers: {
        'User-Agent': this.userAgent,
        'Referer': 'https://www.duke.com.my/',
      },
    });
    if (!res.ok) throw new Error(`Fare image fetch failed: HTTP ${res.status} — source may have moved.`);

    const buf = Buffer.from(await res.arrayBuffer());
    const hash = crypto.createHash('sha256').update(buf).digest('hex');
    if (hash !== KNOWN_IMAGE_SHA256) {
      throw new Error(
        `Fare image hash changed:\n  got:   ${hash}\n  known: ${KNOWN_IMAGE_SHA256}\n` +
        'The DUKE fare table image was updated. Re-read the image, update FARES and KNOWN_IMAGE_SHA256.'
      );
    }

    // Image unchanged — return the manually-transcribed fares.
    const fares = {};
    for (const plaza of PLAZAS) {
      fares[plaza] = { ...FARES };
    }
    return fares;
  }
}

module.exports = { DukeScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new DukeScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
