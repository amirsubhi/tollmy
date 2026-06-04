'use strict';

/**
 * grandsaga.js — scraper for Grand Saga Cheras–Kajang Expressway (CKE, E7), open system.
 *
 * Operated by Grand Saga Sdn Bhd. Two unidirectional plazas:
 *   Batu 9  (Plaza A & B) — KL-bound→Kajang traffic
 *   Batu 11               — Kajang→KL traffic
 *
 * The fare page uses WordPress + Elementor with ACF repeater fields. Each plaza
 * is an `article.toll-rate-payment`; each vehicle class is a `dce-acf-repeater-item`
 * with ACF fields `rate_class` (bare digit) and `rate_fare` (bare decimal).
 * Source: https://grandsaga.com.my/about-cheras-kajang-highway/#Toll-Rates
 */

const { ConcessionaireScraper } = require('./base');

const SOURCE_URL = 'https://grandsaga.com.my/about-cheras-kajang-highway/';

// Article order on page: Batu 9 first, Batu 11 second.
const PLAZAS = ['GRANDSAGA-BATU-9', 'GRANDSAGA-BATU-11'];

class GrandsagaScraper extends ConcessionaireScraper {
  constructor() {
    super({
      concessionaire: 'grandsaga',
      highway: 'cke',
      system: 'open',
      sourceUrl: SOURCE_URL,
      effectiveDate: '1999-01-15', // highway opened 15 January 1999; no revision date shown
    });
  }

  async scrape() {
    const html = await this.fetchText(SOURCE_URL);

    const articles = [...html.matchAll(/<article[^>]*toll-rate-payment[^>]*>([\s\S]*?)<\/article>/g)];
    if (articles.length < 2) throw new Error(`Grand Saga: expected 2 fare articles, got ${articles.length}`);

    const fares = {};
    for (let i = 0; i < 2; i++) {
      const body = articles[i][1];
      const fareSet = {};

      // Each repeater item contains rate_class and rate_fare ACF fields.
      // The field name appears in the data-settings attribute; the value follows
      // in the next dynamic-content-for-elementor-acf div.
      const classVals = [...body.matchAll(/rate_class[\s\S]*?dynamic-content-for-elementor-acf[^>]*>\s*(\d)/g)].map(m => m[1]);
      const fareVals  = [...body.matchAll(/rate_fare[\s\S]*?dynamic-content-for-elementor-acf[^>]*>\s*([\d.]+)/g)].map(m => +m[1]);

      for (let j = 0; j < Math.min(classVals.length, fareVals.length); j++) {
        fareSet[classVals[j]] = fareVals[j];
      }
      if (!Object.keys(fareSet).length) throw new Error(`Grand Saga: no fares found for ${PLAZAS[i]}`);
      fares[PLAZAS[i]] = fareSet;
    }
    return fares;
  }
}

module.exports = { GrandsagaScraper };

if (require.main === module) {
  (async () => {
    const { doc, changes } = await new GrandsagaScraper().run({ write: false });
    console.log(JSON.stringify(doc, null, 2));
    console.log('\nChanges vs committed:\n' + changes.join('\n'));
  })().catch(e => { console.error(e); process.exit(1); });
}
