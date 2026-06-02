'use strict';

/**
 * build.js — run registered scrapers, validate output, optionally write.
 *
 * Usage:
 *   node scripts/build.js                 # dry-run all, show diffs, no write
 *   node scripts/build.js --write         # run all and write changes
 *   node scripts/build.js --only plus     # run a single concessionaire
 *
 * Register each new scraper in the SCRAPERS map below.
 */

const { PlusScraper } = require('../scrapers/plus');
const { LitrakScraper } = require('../scrapers/litrak');
const { DukeScraper } = require('../scrapers/duke');
const { SukeScraper } = require('../scrapers/suke');
const { SpeScraper } = require('../scrapers/spe');
const { MexScraper } = require('../scrapers/mex');
const { KlkScraper } = require('../scrapers/klk');
const { LptScraper } = require('../scrapers/lpt');

const SCRAPERS = {
  plus: PlusScraper,
  litrak: LitrakScraper,
  duke: DukeScraper,
  suke: SukeScraper,
  spe: SpeScraper,
  mex: MexScraper,
  klk: KlkScraper,
  lpt: LptScraper,
};

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const onlyIdx = args.indexOf('--only');
  const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

  const entries = Object.entries(SCRAPERS).filter(([id]) => !only || id === only);
  if (!entries.length) {
    console.error(`No scraper "${only}". Known: ${Object.keys(SCRAPERS).join(', ')}`);
    process.exit(1);
  }

  for (const [id, Scraper] of entries) {
    process.stdout.write(`\n[${id}] scraping... `);
    try {
      const { changes, written } = await new Scraper().run({ write });
      console.log(written ? 'written.' : 'dry-run.');
      console.log(changes.map(c => '   ' + c).join('\n'));
    } catch (e) {
      console.error(`FAILED:\n   ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log(write ? '\nDone. Run `node scripts/validate.js` then review the diff before committing.'
                    : '\nDry-run complete. Re-run with --write to persist.');
}

main();
