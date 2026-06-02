# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> This encodes every locked decision for this project. When in doubt, this file wins over assumptions.

## What this project is

An **open, machine-readable dataset of Malaysian highway toll fares** (`tollmy`) plus a thin
**reference calculator + HTTP API** built on top of it. The dataset is the product;
the API is a reference implementation. Both matter equally.

- **Coverage (v1):** All Peninsular Malaysia concessionaires. East Malaysia is OUT of scope.
- **Vehicle classes:** All 5 (Class 1 car, 2 & 3 lorries, 4 taxi, 5 bus). Motorcycles usually free.
- **Two toll systems:** `closed` (entry×exit fare matrix, e.g. PLUS NSE) and `open` (flat per plaza, e.g. urban tolls).
- **Promotions:** Festive/government discounts are a SEPARATE dated layer, never baked into base rates. Current/future only in v1.
- **Extras:** Rates + distance per segment. NO fuel estimates in v1 (trivial to add later).
- **MLFF/barrier-free:** Modelled as closed/open binary for now. Refactor to sectional gantry pricing later (~2027 transition). `charging_type` field reserved.

## Commands

```bash
node scripts/validate.js           # validate all data/ against schema (CI gate)
node scripts/build.js              # dry-run all scrapers, show diffs, no write
node scripts/build.js --write      # run all scrapers and write output to data/rates/
node scripts/build.js --only plus  # run a single scraper (dry-run by default)
node scripts/build.js --only plus --write
node api/server.js                 # start the API on :3000 (PORT env overrides)
node test/calculate.test.js        # run engine unit tests
node scrapers/plus.js              # quick dry-run of one scraper in isolation
```

`npm run validate`, `npm run build`, `npm run api`, and `npm test` are aliases for the above.

## The golden rules

1. **Never fabricate fares.** A wrong number is worse than a missing one. Un-scraped highways ship with empty `fares: {}` and a clear status. Every fare carries `effective_date` (when it legally started) AND `last_verified` (when we last confirmed it).
2. **Never mutate base rates to apply a discount.** Promotions layer on at calculation time.
3. **Every rate file carries provenance:** source URL, scraped timestamp.
4. **All scraper output must pass `lib/schema.js` validation before commit.** CI enforces this.
5. **Respect each concessionaire's robots.txt and terms.** Rate-limit. Re-scrape on-announcement + quarterly, no more.

## Layout

```
data/            ← THE DATASET (the deliverable)
  concessionaires.json   registry of operators + their highways
  plazas.json            every plaza: id, name, highway, system, lat/lon
  promotions.json        time-boxed government/festive discounts
  rates/<highway>.json   per-highway fare data
scrapers/        ← one module per concessionaire, all emit the same schema
  base.js                shared fetch / normalize / diff / validate harness
  plus.js                reference scraper (copy this for new concessionaires)
lib/
  schema.js              hand-rolled validator — source of truth for data shape
  calculate.js           fare lookup + promotion layering (the "engine")
api/             ← Express read-only API; loads data once at boot, no hot reload
scripts/
  build.js               run scrapers → validate → write data/; register scrapers here
  validate.js            validate all data/ against schema (used by CI)
test/
  calculate.test.js      engine unit tests
```

## Architecture: key non-obvious details

**Scraper class contract** (`scrapers/base.js:ConcessionaireScraper`): subclasses only implement `scrape()`, which must return the **`fares` object alone** (not the full document). The base class wraps it with provenance fields via `buildDoc()`, validates it, and diffs against committed data. Use `fetchText(url)` for polite requests (rate-limited, sets User-Agent).

Return shape for `scrape()`:
- **closed system:** `{ entryId: { exitId: { '1': amt, '2': amt, ... } } }`
- **open system:** `{ plazaId: { '1': amt, '2': amt, ... } }`

**Scraper registration:** Every new scraper must be imported and added to the `SCRAPERS` map in `scripts/build.js` — the build and `--only` filter both read from this map.

**Schema constraints** (`lib/schema.js`):
- Timestamps (`source.scraped_at`, promotion `starts`/`ends`) require an explicit UTC offset — `Z` does NOT pass validation. MYT is `+08:00`.
- Plaza coordinates are validated against Peninsular bounds: lat 0.5–7, lon 99–105.
- `currency` in rate files must be the literal string `"MYR"`.
- `fares: {}` (empty object) is valid and expected for highways not yet scraped.

**Calculation engine** (`lib/calculate.js`): `calculate()` is the public entry point. Returns `{ base, final, currency, applied[], plaza, error? }`. Promotions chain sequentially (each discount applies to the running total). The "pay plaza" for exclusion logic is the exit on closed systems, the sole plaza on open systems.

**API** (`api/server.js`): data is loaded from disk at process start via synchronous `readFileSync`. There is no hot reload — restart the process after updating `data/`. The `/v1/calculate` endpoint accepts an optional `datetime` query param in ISO 8601 (include `+08:00` for MYT).

## How to add a concessionaire

1. Add the operator + its highways to `data/concessionaires.json`.
2. Add its plazas to `data/plazas.json` (with lat/lon and system type).
3. Copy `scrapers/plus.js` → `scrapers/<name>.js`; adapt `scrape()` to parse that operator's published source. Return the fares object only.
4. Import and register the new scraper in `scripts/build.js`'s `SCRAPERS` map.
5. Run `node scripts/build.js --only <name> --write` → writes `data/rates/<highway>.json`.
6. Run `node scripts/validate.js` → must pass.
7. Spot-check 2–3 key routes against the operator's own calculator. Record results in PR.

`scrapers/plus.js` + `data/rates/plus-nse.json` are the fully-worked reference. Pattern-match them.

## Licensing
- **Data:** ODbL (Open Database License) — share-alike keeps the commons open.
- **Code:** MIT — maximally reusable reference implementation.

## Decision log (locked)
Goal: dataset + API equally · Users: devs + drivers · Scope: Peninsular ·
Maintained for years · Public GitHub + hosted API · All concessionaires ·
All 5 classes · Scrape + spot-check · Promotions current/future · Rates + distance ·
Closed/open binary · ODbL+MIT · On-announcement + quarterly · Full open contributor model.
