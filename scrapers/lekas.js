'use strict';

/**
 * lekas.js — scraper for LEKAS (Kajang–Seremban Highway, E21), closed system.
 *
 * Operated by LEKAS (Kajang Seremban) Sdn Bhd — IJM Corporation + KASEH Sdn Bhd.
 * 6 plazas; full 30-pair entry×exit fare matrix.
 *
 * Source: https://ijmtolldiv.com/lekas/ (currently returning 404/bot-block).
 * Fares sourced from six official rate-card JPEG images archived on Wayback Machine
 * (uploaded 2022-12-31 to ijmtolldiv.com/wp-content/uploads/2022/12/). Each image
 * shows one entry plaza against all exit plazas for Classes 1–5. Effective ~2023-01-01
 * (same batch as BESRAYA which explicitly states that date).
 */

const { ConcessionaireScraper } = require('./base');

// Full entry×exit fare matrix, manually transcribed from six JPEG rate-card images.
// Keys: LEKAS-{ENTRY}[LEKAS-{EXIT}] = {cls: amount}
const FARES = {
  'LEKAS-KAJANG-SELATAN': {
    'LEKAS-SEMENYIH':     { '1': 1.17, '2': 1.76, '3': 2.34, '4': 0.59, '5': 0.79 },
    'LEKAS-ECO-MAJESTIC': { '1': 1.82, '2': 2.74, '3': 3.65, '4': 0.91, '5': 1.37 },
    'LEKAS-PAJAM':        { '1': 3.10, '2': 4.66, '3': 6.21, '4': 1.55, '5': 2.09 },
    'LEKAS-MANTIN':       { '1': 4.46, '2': 6.69, '3': 8.92, '4': 2.23, '5': 2.99 },
    'LEKAS-SETUL':        { '1': 5.50, '2': 8.25, '3': 11.00, '4': 2.75, '5': 3.69 },
  },
  'LEKAS-SEMENYIH': {
    'LEKAS-KAJANG-SELATAN': { '1': 1.17, '2': 1.76, '3': 2.34, '4': 0.59, '5': 0.79 },
    'LEKAS-ECO-MAJESTIC':   { '1': 1.28, '2': 1.92, '3': 2.57, '4': 0.64, '5': 0.96 },
    'LEKAS-PAJAM':          { '1': 2.57, '2': 3.86, '3': 5.15, '4': 1.29, '5': 1.69 },
    'LEKAS-MANTIN':         { '1': 3.93, '2': 5.89, '3': 7.85, '4': 1.96, '5': 2.59 },
    'LEKAS-SETUL':          { '1': 5.00, '2': 7.50, '3': 10.00, '4': 2.50, '5': 3.37 },
  },
  'LEKAS-ECO-MAJESTIC': {
    'LEKAS-KAJANG-SELATAN': { '1': 1.82, '2': 2.74, '3': 3.65, '4': 0.91, '5': 1.37 },
    'LEKAS-SEMENYIH':       { '1': 1.28, '2': 1.92, '3': 2.57, '4': 0.64, '5': 0.96 },
    'LEKAS-PAJAM':          { '1': 1.27, '2': 1.90, '3': 2.53, '4': 0.63, '5': 0.95 },
    'LEKAS-MANTIN':         { '1': 2.63, '2': 3.95, '3': 5.26, '4': 1.32, '5': 1.98 },
    'LEKAS-SETUL':          { '1': 3.61, '2': 5.42, '3': 7.22, '4': 1.81, '5': 2.71 },
  },
  'LEKAS-PAJAM': {
    'LEKAS-KAJANG-SELATAN': { '1': 3.10, '2': 4.66, '3': 6.21, '4': 1.55, '5': 2.09 },
    'LEKAS-SEMENYIH':       { '1': 2.57, '2': 3.86, '3': 5.15, '4': 1.29, '5': 1.69 },
    'LEKAS-ECO-MAJESTIC':   { '1': 1.27, '2': 1.90, '3': 2.53, '4': 0.63, '5': 0.95 },
    'LEKAS-MANTIN':         { '1': 1.85, '2': 2.77, '3': 3.69, '4': 0.92, '5': 1.19 },
    'LEKAS-SETUL':          { '1': 2.83, '2': 4.25, '3': 5.66, '4': 1.42, '5': 1.89 },
  },
  'LEKAS-MANTIN': {
    'LEKAS-KAJANG-SELATAN': { '1': 4.46, '2': 6.69, '3': 8.92, '4': 2.23, '5': 2.99 },
    'LEKAS-SEMENYIH':       { '1': 3.93, '2': 5.89, '3': 7.85, '4': 1.96, '5': 2.59 },
    'LEKAS-ECO-MAJESTIC':   { '1': 2.63, '2': 3.95, '3': 5.26, '4': 1.32, '5': 1.98 },
    'LEKAS-PAJAM':          { '1': 1.85, '2': 2.77, '3': 3.69, '4': 0.92, '5': 1.19 },
    'LEKAS-SETUL':          { '1': 1.67, '2': 2.50, '3': 3.33, '4': 0.83, '5': 1.09 },
  },
  'LEKAS-SETUL': {
    'LEKAS-KAJANG-SELATAN': { '1': 5.50, '2': 8.25, '3': 11.00, '4': 2.75, '5': 3.69 },
    'LEKAS-SEMENYIH':       { '1': 5.00, '2': 7.50, '3': 10.00, '4': 2.50, '5': 3.37 },
    'LEKAS-ECO-MAJESTIC':   { '1': 3.61, '2': 5.42, '3': 7.22, '4': 1.81, '5': 2.71 },
    'LEKAS-PAJAM':          { '1': 2.83, '2': 4.25, '3': 5.66, '4': 1.42, '5': 1.89 },
    'LEKAS-MANTIN':         { '1': 1.67, '2': 2.50, '3': 3.33, '4': 0.83, '5': 1.09 },
  },
};

class LekasScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'ijm',
      highway: 'lekas',
      system: 'closed',
      sourceUrl: 'https://ijmtolldiv.com/lekas/',
      effectiveDate: '2023-01-01',
    });
  }

  async scrape() {
    return { ...FARES };
  }
}

module.exports = { LekasScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new LekasScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
