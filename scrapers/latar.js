'use strict';

/**
 * latar.js — scraper for LATAR (KL–Kuala Selangor Expressway, E25), open system.
 *
 * Operated by KL-Kuala Selangor Expressway Berhad (KLSEB).
 * The official toll-rates page publishes fares as a single PNG image — no HTML
 * table. Fares are manually transcribed from that image. The image URL is
 * content-addressed (SHA-256 hash in filename), so checking whether the URL
 * has changed is equivalent to checking whether the image has changed.
 *
 * Two fare tiers (from official image, verified 2026-06-03):
 *   Standard: Taman Rimba Templer, Ijok, Kuang Barat, Kuang Timur, Eco Grandeur
 *   Kundang:  Kundang Barat, Kundang Timur
 *
 * Source: https://www.latar.com.my/toll-rates
 */

const { ConcessionaireScraper } = require('./base');

const TOLL_RATES_URL = 'https://www.latar.com.my/toll-rates';

// SHA-256 embedded in content-addressed image filename as of 2026-06-03
const KNOWN_IMAGE_HASH = '6f6f171e69950963fc0746d798e20fcb8561f77716f0c7ad649f7582503ab88d';

const FARES_STANDARD = { '1': 2.50, '2': 5.00, '3': 7.50, '4': 1.30, '5': 2.00 };
const FARES_KUNDANG  = { '1': 1.30, '2': 2.60, '3': 3.90, '4': 0.70, '5': 1.30 };

const PLAZAS = [
  { id: 'LATAR-TAMAN-RIMBA-TEMPLER', fares: FARES_STANDARD },
  { id: 'LATAR-KUNDANG-BARAT',       fares: FARES_KUNDANG  },
  { id: 'LATAR-KUNDANG-TIMUR',       fares: FARES_KUNDANG  },
  { id: 'LATAR-IJOK',                fares: FARES_STANDARD },
  { id: 'LATAR-KUANG-BARAT',         fares: FARES_STANDARD },
  { id: 'LATAR-KUANG-TIMUR',         fares: FARES_STANDARD },
  { id: 'LATAR-ECO-GRANDEUR',        fares: FARES_STANDARD },
];

class LatarScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'latar',
      highway: 'latar',
      system: 'open',
      sourceUrl: TOLL_RATES_URL,
      effectiveDate: '2015-10-15', // standard plazas raised to RM2.50 w.e.f. 15 Oct 2015; Kundang plazas at RM1.30 since 1 Jan 2015
    });
  }

  async scrape() {
    // Drift guard: the image URL contains its own SHA-256 hash. If LATAR updates
    // the rates, the image filename changes — forcing manual re-transcription.
    const html = await this.fetchText(TOLL_RATES_URL);
    // The rate image src uses a double-slash path (//public/files/...) which
    // distinguishes it from other PNGs on the page and from JS hash values.
    const imgMatch = html.match(/src="[^"]*\/\/public\/files\/([a-f0-9]{64})\.png"/);
    if (!imgMatch) throw new Error('LATAR rate image not found on toll-rates page');
    if (imgMatch[1] !== KNOWN_IMAGE_HASH) {
      throw new Error(
        `LATAR rate image has changed (hash ${imgMatch[1]} ≠ expected ${KNOWN_IMAGE_HASH}).\n` +
        `Download https://www.latar.com.my/public/files/${imgMatch[1]}.png and manually ` +
        `re-transcribe fares, then update KNOWN_IMAGE_HASH and FARES_* in this file.`
      );
    }
    const fares = {};
    for (const { id, fares: f } of PLAZAS) fares[id] = f;
    return fares;
  }
}

module.exports = { LatarScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new LatarScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
