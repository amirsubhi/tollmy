# Contributing

Thanks for helping build an open Malaysian toll dataset. Two kinds of contribution matter most:

## 1. Fare corrections (anyone)
Found a wrong or outdated fare? Open a **fare-correction** issue (use the template).
Include evidence: a link or screenshot from the operator's own calculator, or a toll receipt.
Maintainers verify, then update the rate file and bump its `last_verified` date.

## 2. Adding a concessionaire (developers)
This is the core expansion work. Follow the recipe in [`CLAUDE.md`](./CLAUDE.md):

1. Register the operator + highways in `data/concessionaires.json`.
2. Add its plazas to `data/plazas.json` (id, name, highway, `system`, lat/lon).
3. Copy `scrapers/plus.js` → `scrapers/<name>.js`; adapt `scrape()` to the operator's published source.
4. Register the scraper in `scripts/build.js`.
5. `node scripts/build.js --only <name> --write`
6. `node scripts/validate.js` — must pass.
7. Spot-check 2–3 key routes against the operator's own calculator; note them in your PR.

### Non-negotiables
- **Never invent fares.** Empty `fares: {}` is acceptable; fabricated numbers are not.
- Every rate file needs `effective_date`, `last_verified`, and a `source` (url + scraped_at).
- Output must pass `scripts/validate.js`. CI enforces this on every PR.
- Respect each operator's robots.txt and terms; rate-limit your scraper.
- Promotions go in `data/promotions.json` as a separate dated layer — never baked into base rates. Always cite a source.

## Licensing of contributions
By contributing you agree your **data** contributions are released under ODbL and your **code** contributions under MIT (see `data/LICENSE-DATA.txt` and `LICENSE-CODE.txt`).
