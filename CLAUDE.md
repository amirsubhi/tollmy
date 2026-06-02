# CLAUDE.md — Project Contract & Conventions

> Read this first. It encodes every locked decision for this project so you can
> build within the structure instead of re-deciding scope. When in doubt, this
> file wins over assumptions.

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

## The golden rules

1. **Never fabricate fares.** A wrong number is worse than a missing one. Un-scraped
   highways ship with empty `fares: {}` and a clear status. Every fare carries
   `effective_date` (when it legally started) AND `last_verified` (when we last confirmed it).
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
  plus.js, litrak.js ...
lib/
  schema.js              JSON schema + validator (source of truth for shape)
  calculate.js           fare lookup + promotion layering (the "engine")
api/             ← Express reader: calculate, listPlazas, listHighways, getPromotions
scripts/
  build.js               run scrapers → validate → write data/
  validate.js            validate all data/ against schema (used by CI)
```

## How to add a concessionaire (the repetitive core task)

1. Add the operator + its highways to `data/concessionaires.json`.
2. Add its plazas to `data/plazas.json` (with lat/lon and system type).
3. Copy `scrapers/plus.js` → `scrapers/<name>.js`, adapt selectors to that site.
4. Run `node scripts/build.js --only <name>` → writes `data/rates/<highway>.json`.
5. Run `node scripts/validate.js` → must pass.
6. Spot-check 2–3 key routes against the operator's own calculator. Record in PR.

`scrapers/plus.js` + `data/rates/plus-nse.json` are the fully-worked reference. Pattern-match them.

## Licensing
- **Data:** ODbL (Open Database License) — share-alike keeps the commons open.
- **Code:** MIT — maximally reusable reference implementation.

## Decision log (locked)
Goal: dataset + API equally · Users: devs + drivers · Scope: Peninsular ·
Maintained for years · Public GitHub + hosted API · All concessionaires ·
All 5 classes · Scrape + spot-check · Promotions current/future · Rates + distance ·
Closed/open binary · ODbL+MIT · On-announcement + quarterly · Full open contributor model.
