'use strict';

/**
 * base.js — shared scraper harness. Every concessionaire scraper extends this.
 *
 * The harness handles the parts that should be identical everywhere: polite
 * fetching, provenance stamping, schema validation, and diffing new output
 * against committed data so rate CHANGES surface for human review instead of
 * silently overwriting (which would also mask a broken scraper).
 *
 * A concessionaire scraper only implements scrape(), returning a `fares` object
 * in the shape schema.js expects for its system type.
 */

const fs = require('fs');
const path = require('path');
const { validateRateFile } = require('../lib/schema');

const DATA_RATES_DIR = path.join(__dirname, '..', 'data', 'rates');

class ConcessionaireScraper {
  /**
   * @param {object} cfg
   *   - concessionaire: id string (e.g. "plus")
   *   - highway:        highway id / output filename stem (e.g. "plus-nse")
   *   - system:         "closed" | "open"
   *   - sourceUrl:      where rates are published (for provenance + robots check)
   *   - userAgent:      identify the bot honestly
   *   - minDelayMs:     politeness delay between requests
   */
  constructor(cfg) {
    Object.assign(this, {
      userAgent: 'tollmy/0.1 (+https://github.com/amirsubhi/tollmy)',
      minDelayMs: 1500,
    }, cfg);
  }

  /** Polite fetch with identifying UA and a delay. Override if a site needs more. */
  async fetchText(url) {
    await new Promise(r => setTimeout(r, this.minDelayMs));
    const res = await fetch(url, { headers: { 'User-Agent': this.userAgent } });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    return res.text();
  }

  /**
   * Implement per concessionaire. Must return the `fares` object only
   * (closed: {entry:{exit:{class:amt}}}, open: {plaza:{class:amt}}).
   * Parsing live HTML/JSON belongs here. Do the work in Claude Code against
   * the real site — this method is a stub in the scaffold.
   */
  async scrape() {
    throw new Error(`scrape() not implemented for ${this.concessionaire}`);
  }

  /** Wrap scraped fares with the full provenance-bearing document. */
  buildDoc(fares) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      highway: this.highway,
      concessionaire: this.concessionaire,
      system: this.system,
      currency: 'MYR',
      effective_date: this.effectiveDate || today, // set when a rate revision lands
      last_verified: today,
      source: { url: this.sourceUrl, scraped_at: new Date().toISOString().replace('Z', '+00:00') },
      fares,
    };
  }

  outputPath() {
    return path.join(DATA_RATES_DIR, `${this.highway}.json`);
  }

  /** Shallow diff of fare leaves; returns human-readable change lines. */
  diffAgainstCommitted(newDoc) {
    const p = this.outputPath();
    if (!fs.existsSync(p)) return ['(new file — no prior data to diff)'];
    const old = JSON.parse(fs.readFileSync(p, 'utf8'));
    const changes = [];
    const flatten = (doc) => {
      const out = {};
      if (doc.system === 'open') {
        for (const [pz, set] of Object.entries(doc.fares || {}))
          for (const [c, a] of Object.entries(set)) out[`${pz}|${c}`] = a;
      } else {
        for (const [en, exits] of Object.entries(doc.fares || {}))
          for (const [ex, set] of Object.entries(exits))
            for (const [c, a] of Object.entries(set)) out[`${en}->${ex}|${c}`] = a;
      }
      return out;
    };
    const a = flatten(old), b = flatten(newDoc);
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[k] !== b[k]) changes.push(`  ${k}: ${a[k] ?? '—'} -> ${b[k] ?? '—'}`);
    }
    return changes.length ? changes : ['(no fare changes)'];
  }

  /** Run scrape → build → validate → diff. Writes only if write=true and valid. */
  async run({ write = false } = {}) {
    const fares = await this.scrape();
    const doc = this.buildDoc(fares);

    const errors = validateRateFile(doc);
    if (errors.length) {
      throw new Error(`Validation failed for ${this.highway}:\n` + errors.map(e => '  ' + e).join('\n'));
    }

    const changes = this.diffAgainstCommitted(doc);
    if (write) {
      fs.mkdirSync(DATA_RATES_DIR, { recursive: true });
      fs.writeFileSync(this.outputPath(), JSON.stringify(doc, null, 2) + '\n');
    }
    return { doc, changes, written: write };
  }
}

module.exports = { ConcessionaireScraper };
