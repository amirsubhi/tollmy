'use strict';

/**
 * wce.js — scraper for WCE (West Coast Expressway, E32), closed system.
 *
 * Operated by WCE Holdings Berhad. Currently open in 4 disconnected sections;
 * fare pairs are only valid within each section. 14 plazas, 52 internal pairs.
 *
 * NOTE: The Banting and SAE fare boards also show exits to SKVE junction plazas
 * (Ayer Hitam, Saujana Putra, Teluk Panglima Garang, Pulau Indah). Those
 * cross-concessionaire pairs are deliberately omitted here to avoid duplicate
 * plaza IDs with data/rates/skve.json (where SKVE-WCE and SKVE-SAE already model
 * those junctions from the SKVE side).
 *
 * Drift guard: fetches the toll-rates page and checks that all known fare-image
 * filenames are still present. WCE uploads new files (new names) when rates change,
 * as observed in June 2025 when Banting/SAE boards were updated.
 *
 * Source: https://wce.com.my/toll-rates/
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://wce.com.my/toll-rates/';

// Known fare image filenames as of 2026-06-04. If any disappear (replaced by
// updated images with new names), the scraper aborts.
const KNOWN_IMAGES = new Set([
  'BTG-WEBSITE-LATEST.png',
  'SAE-FAREEE.png',
  'BBS-FARE-ALL-SECTION-WCE-WEB_page-0001.jpg',
  'BBU-FARE-ALL-SECTION-WCE-WEB_page-0002.jpg',
  'AJW-FARE-ALL-SECTION-WCE-WEB_page-0003.jpg',
  'HMT-FARE-ALL-SECTION-WCE-WEB_page-0004.jpg',
  'TLI-FARE-ALL-SECTION-WCE-WEB_page-0005.jpg',
  'KLK-FARE-ALL-SECTION-WCE-WEB_page-0006.jpg',
  'STW-FARE-ALL-SECTION-WCE-WEB_page-0007.jpg',
  'STN-FARE-ALL-SECTION-WCE-WEB_page-0008.jpg',
  'CKC-FARE-ALL-SECTION-WCE-WEB_page-0009.jpg',
  'BRS-FARE-ALL-SECTION-WCE-WEB_page-0010.jpg',
  'TRG-FARE-ALL-SECTION-WCE-WEB_page-0011.jpg',
  'TPS-FARE-ALL-SECTION-WCE-WEB_page-0012.jpg',
]);

// Full entry×exit matrix — only intra-WCE pairs (verified 2026-06-04).
// Sections:  [1] South: BTG↔SAE  [2] Central: BBS/BBU/AJW
//            [3] HMT↔TLI         [4] North: LKR/STW/STN/CKC/BRS/TRG/TPS
const FARES = {
  // ── Section 1: Southern (Banting ↔ SAE) ──────────────────────────────────
  'WCE-BTG': {
    'WCE-SAE': { '1': 3.53, '2': 7.06, '3': 10.59, '4': 1.76, '5': 2.64 },
  },
  'WCE-SAE': {
    'WCE-BTG': { '1': 3.53, '2': 7.06, '3': 10.59, '4': 1.76, '5': 2.64 },
  },
  // ── Section 2: Central (Bandar Bukit Raja / Assam Jawa) ──────────────────
  'WCE-BBS': {
    'WCE-BBU': { '1':  1.50, '2':  2.90, '3':  4.40, '4': 0.70, '5': 1.10 },
    'WCE-AJW': { '1':  5.05, '2': 10.11, '3': 15.16, '4': 2.53, '5': 3.79 },
  },
  'WCE-BBU': {
    'WCE-BBS': { '1':  1.50, '2':  2.90, '3':  4.40, '4': 0.70, '5': 1.10 },
    'WCE-AJW': { '1':  4.12, '2':  8.24, '3': 12.36, '4': 2.06, '5': 3.09 },
  },
  'WCE-AJW': {
    'WCE-BBS': { '1':  5.05, '2': 10.11, '3': 15.16, '4': 2.53, '5': 3.79 },
    'WCE-BBU': { '1':  4.12, '2':  8.24, '3': 12.36, '4': 2.06, '5': 3.09 },
  },
  // ── Section 3: Hutan Melintang / Teluk Intan ─────────────────────────────
  'WCE-HMT': {
    'WCE-TLI': { '1': 2.90, '2': 5.80, '3': 8.70, '4': 1.50, '5': 2.20 },
  },
  'WCE-TLI': {
    'WCE-HMT': { '1': 2.90, '2': 5.80, '3': 8.70, '4': 1.50, '5': 2.20 },
  },
  // ── Section 4: Northern (Kg Lekir → Taiping Selatan) ─────────────────────
  'WCE-LKR': {
    'WCE-STW': { '1':  2.00, '2':  4.00, '3':  6.00, '4': 1.00, '5': 1.50 },
    'WCE-STN': { '1':  2.80, '2':  5.60, '3':  8.40, '4': 1.40, '5': 2.10 },
    'WCE-CKC': { '1':  4.70, '2':  9.50, '3': 14.20, '4': 2.40, '5': 3.60 },
    'WCE-BRS': { '1':  7.90, '2': 15.70, '3': 23.60, '4': 3.90, '5': 5.90 },
    'WCE-TRG': { '1': 12.53, '2': 25.05, '3': 37.58, '4': 6.26, '5': 9.40 },
    'WCE-TPS': { '1': 13.12, '2': 26.24, '3': 39.36, '4': 6.56, '5': 9.84 },
  },
  'WCE-STW': {
    'WCE-LKR': { '1':  2.00, '2':  4.00, '3':  6.00, '4': 1.00, '5': 1.50 },
    'WCE-STN': { '1':  2.20, '2':  4.50, '3':  6.70, '4': 1.10, '5': 1.70 },
    'WCE-CKC': { '1':  4.20, '2':  8.30, '3': 12.50, '4': 2.10, '5': 3.10 },
    'WCE-BRS': { '1':  7.30, '2': 14.60, '3': 21.90, '4': 3.70, '5': 5.50 },
    'WCE-TRG': { '1': 11.55, '2': 23.11, '3': 34.66, '4': 5.78, '5': 8.67 },
    'WCE-TPS': { '1': 12.95, '2': 25.91, '3': 38.86, '4': 6.48, '5': 9.72 },
  },
  'WCE-STN': {
    'WCE-LKR': { '1':  2.80, '2':  5.60, '3':  8.40, '4': 1.40, '5': 2.10 },
    'WCE-STW': { '1':  2.20, '2':  4.50, '3':  6.70, '4': 1.10, '5': 1.70 },
    'WCE-CKC': { '1':  2.70, '2':  5.30, '3':  8.00, '4': 1.30, '5': 2.00 },
    'WCE-BRS': { '1':  5.80, '2': 11.60, '3': 17.40, '4': 2.90, '5': 4.40 },
    'WCE-TRG': { '1': 10.04, '2': 20.08, '3': 30.12, '4': 5.02, '5': 7.53 },
    'WCE-TPS': { '1': 11.44, '2': 22.88, '3': 34.32, '4': 5.72, '5': 8.58 },
  },
  'WCE-CKC': {
    'WCE-LKR': { '1':  4.70, '2':  9.50, '3': 14.20, '4': 2.40, '5': 3.60 },
    'WCE-STW': { '1':  4.20, '2':  8.30, '3': 12.50, '4': 2.10, '5': 3.10 },
    'WCE-STN': { '1':  2.70, '2':  5.30, '3':  8.00, '4': 1.30, '5': 2.00 },
    'WCE-BRS': { '1':  3.60, '2':  7.20, '3': 10.90, '4': 1.80, '5': 2.70 },
    'WCE-TRG': { '1':  7.87, '2': 15.74, '3': 23.60, '4': 3.93, '5': 5.90 },
    'WCE-TPS': { '1':  9.30, '2': 18.60, '3': 27.90, '4': 4.65, '5': 6.98 },
  },
  'WCE-BRS': {
    'WCE-LKR': { '1':  7.90, '2': 15.70, '3': 23.60, '4': 3.90, '5': 5.90 },
    'WCE-STW': { '1':  7.30, '2': 14.60, '3': 21.90, '4': 3.70, '5': 5.50 },
    'WCE-STN': { '1':  5.80, '2': 11.60, '3': 17.40, '4': 2.90, '5': 4.40 },
    'WCE-CKC': { '1':  3.60, '2':  7.20, '3': 10.90, '4': 1.80, '5': 2.70 },
    'WCE-TRG': { '1':  4.69, '2':  9.38, '3': 14.07, '4': 2.35, '5': 3.52 },
    'WCE-TPS': { '1':  6.06, '2': 12.11, '3': 18.17, '4': 3.03, '5': 4.54 },
  },
  'WCE-TRG': {
    'WCE-LKR': { '1': 12.53, '2': 25.05, '3': 37.58, '4': 6.26, '5': 9.40 },
    'WCE-STW': { '1': 11.55, '2': 23.11, '3': 34.66, '4': 5.78, '5': 8.67 },
    'WCE-STN': { '1': 10.04, '2': 20.08, '3': 30.12, '4': 5.02, '5': 7.53 },
    'WCE-CKC': { '1':  7.87, '2': 15.74, '3': 23.60, '4': 3.93, '5': 5.90 },
    'WCE-BRS': { '1':  4.69, '2':  9.38, '3': 14.07, '4': 2.35, '5': 3.52 },
    'WCE-TPS': { '1':  1.88, '2':  3.75, '3':  5.63, '4': 0.94, '5': 1.41 },
  },
  'WCE-TPS': {
    'WCE-LKR': { '1': 13.12, '2': 26.24, '3': 39.36, '4': 6.56, '5': 9.84 },
    'WCE-STW': { '1': 12.95, '2': 25.91, '3': 38.86, '4': 6.48, '5': 9.72 },
    'WCE-STN': { '1': 11.44, '2': 22.88, '3': 34.32, '4': 5.72, '5': 8.58 },
    'WCE-CKC': { '1':  9.30, '2': 18.60, '3': 27.90, '4': 4.65, '5': 6.98 },
    'WCE-BRS': { '1':  6.06, '2': 12.11, '3': 18.17, '4': 3.03, '5': 4.54 },
    'WCE-TRG': { '1':  1.88, '2':  3.75, '3':  5.63, '4': 0.94, '5': 1.41 },
  },
};

class WceScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'wce',
      highway: 'wce',
      system: 'closed',
      sourceUrl: SOURCE_URL,
      effectiveDate: '2024-07-01', // original 12 plazas July 2024; BTG/SAE updated June 2025
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);
    const missing = [...KNOWN_IMAGES].filter(f => !html.includes(f));
    if (missing.length) {
      throw new Error(
        `WCE fare images have changed — these filenames are no longer on the page:\n` +
        missing.map(f => `  ${f}`).join('\n') + '\n' +
        `Download updated images from ${SOURCE_URL} and re-transcribe fares, ` +
        `then update KNOWN_IMAGES and FARES in this file.`
      );
    }
    return { ...FARES };
  }
}

module.exports = { WceScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new WceScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
