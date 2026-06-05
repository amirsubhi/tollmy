# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **This encodes every locked decision for this project. When in doubt, this file wins over assumptions.**

---

## What this project is

An **open, machine-readable dataset of Malaysian highway toll fares** (`tollmy`) plus a thin **reference calculator + HTTP API** built on top of it.

- The dataset is the product. The API is a reference implementation. Both matter equally.
- **Coverage:** All active Peninsular Malaysia toll highways — 31 highways, 16 concessionaires, 223 plazas, 8,591 closed-system fare pairs. East Malaysia is OUT of scope for v1.
- **Vehicle classes:** All 5 — Class 1 car, 2 & 3 lorries, 4 taxi, 5 bus. Motorcycles are generally free and not modelled.
- **Two toll systems:** `closed` (entry×exit fare matrix, e.g. PLUS NSE) and `open` (flat per plaza, e.g. urban tolls).
- **Promotions:** Festive/government discounts are a SEPARATE dated layer, never baked into base rates.
- **MLFF/barrier-free:** Modelled as closed/open binary for now. `charging_type` field reserved for sectional gantry pricing (~2027 PLUS transition).

---

## Commands

```bash
node scripts/validate.js                   # validate all data/ against schema (CI gate)
node scripts/build.js                      # dry-run all scrapers, show diffs, no write
node scripts/build.js --write              # run all scrapers and write output to data/rates/
node scripts/build.js --only plus          # dry-run a single scraper
node scripts/build.js --only plus --write  # run one scraper and write
node api/server.js                         # start the API on :3000 (PORT env overrides)
node test/calculate.test.js                # run engine unit tests
node scrapers/plus.js                      # quick dry-run of one scraper in isolation
```

`npm run validate`, `npm run build`, `npm run api`, and `npm test` are aliases for the above.

---

## The golden rules

1. **Never fabricate fares.** A wrong number is worse than a missing one. Un-scraped highways ship with empty `fares: {}`. Every fare carries `effective_date` (when it legally started) AND `last_verified` (when we last confirmed it).
2. **Never mutate base rates to apply a discount.** Promotions layer on at calculation time.
3. **Every rate file carries provenance:** source URL + scraped timestamp.
4. **All scraper output must pass `lib/schema.js` validation before commit.** CI enforces this.
5. **Respect each concessionaire's robots.txt and terms.** Rate-limit. Re-scrape on-announcement + quarterly, no more.

---

## Repository layout

```
data/                          ← THE DATASET (the deliverable)
  concessionaires.json           registry of 16 operators + their 31 highways
  plazas.json                    223 plazas: id, name, highway, system
  promotions.json                time-boxed government/festive discounts
  rates/<highway>.json           per-highway fare data (31 files)

scrapers/                      ← one module per highway, all emit the same schema
  base.js                        shared fetch / rate-limit / validate / diff harness
  plus.js                        PLUS NSE — reference scraper (copy for new highways)
  elite.js                       PLUS ELITE (same API as plus.js)
  nkve.js                        PLUS NKVE (same API as plus.js)
  linkedua.js                    Linkedua Second Link (same API as plus.js)
  litrak.js                      LITRAK LDP — HTML table (Prolintas-style)
  sprint.js                      SPRINT — HTML multi-column table
  suke.js / gce.js / dash.js     Prolintas highways — standard 4-column table
  akleh.js / silk.js             Prolintas highways — standard 4-column table
  duke.js / spe.js               KESTURI — image hash guard (hard-coded)
  latar.js                       KLSEB — content-addressed image URL drift guard
  mex.js                         MESB — WordPress REST API
  klk.js / lpt.js                AFA Prime — PHP POST calculator
  kesas.js                       KESAS — Word-pasted MsoNormalTable HTML
  grandsaga.js                   Grand Saga — ACF repeater (Elementor CMS)
  penang2.js                     JKSB — WordPress table, strong HTML
  skve.js                        SKVE — live JSON API endpoint
  besraya.js / lekas.js          IJM — hard-coded (site down, Wayback verified)
  sde.js                         SDEB — SHA-256 image hash guard
  wce.js                         WCE Holdings — filename-based drift guard (14 images)
  ekve.js                        EKVE — hard-coded from official launch announcement
  smart.js                       SMART Tunnel — hard-coded (image-only source)

lib/
  schema.js                      hand-rolled validator — source of truth for data shape
  calculate.js                   fare lookup + promotion layering (the "engine")

api/
  server.js                      Express read-only API; loads data once at boot

scripts/
  build.js                       run scrapers → validate → write data/rates/
  validate.js                    validate all data/ (used by CI)

test/
  calculate.test.js              engine unit tests
```

---

## Architecture: key non-obvious details

### Scraper class contract

`scrapers/base.js:ConcessionaireScraper` — subclasses only implement `scrape()`, which must return the **`fares` object alone** (not the full document). The base class wraps it with provenance via `buildDoc()`, validates it, and diffs against committed data.

- Use `this.fetchText(url)` for all HTTP — it is rate-limited and sets a polite User-Agent.
- `scrape()` return shapes:
  - **closed system:** `{ 'ENTRY-ID': { 'EXIT-ID': { '1': amt, '2': amt, ... } } }`
  - **open system:** `{ 'PLAZA-ID': { '1': amt, '2': amt, ... } }`

### Scraper registration

Every scraper must be imported and added to the `SCRAPERS` map in `scripts/build.js`. The `--only <key>` filter reads from this map.

### Schema constraints (`lib/schema.js`)

- Timestamps (`source.scraped_at`, promotion `starts`/`ends`) require an explicit UTC offset — `Z` does **not** pass validation. MYT is `+08:00`.
- Plaza coordinates, when provided, are validated against Peninsular bounds: lat 0.5–7, lon 99–105.
- `currency` must be the literal string `"MYR"`.
- `fares: {}` (empty object) is valid — used for stubs not yet scraped.

### Calculation engine (`lib/calculate.js`)

`calculate()` is the public entry point. Returns `{ base, final, currency, applied[], plaza, error? }`. Promotions chain sequentially (each discount applies to the running total). The "pay plaza" for exclusion logic is the exit on closed systems, the sole plaza on open systems.

### API (`api/server.js`)

Data is loaded from disk at process start via synchronous `readFileSync`. **There is no hot reload** — restart the process after updating `data/`. The `/v1/calculate` endpoint accepts an optional `datetime` query param in ISO 8601 (include `+08:00` for MYT).

---

## Scraper patterns

Different operators publish fares in different ways. Match the pattern to the source.

### 1. PLUS Azure API — `plus.js`, `elite.js`, `nkve.js`, `linkedua.js`

```
GET https://plusapp-api-prod1.azurewebsites.net/api/tolls/GetTollFare/{from}/{to}/{apiClass}
```

Requires an `ARRAffinity` sticky-session cookie obtained by probing a known pair. Without the cookie every request returns `200 + empty body`, making live fares indistinguishable from gaps. Health-check the cookie every 200 pairs on long runs. API class map: `1→1, 5→2, 6→3, 7→4, 13→5`.

### 2. Standard Prolintas HTML table — `suke.js`, `gce.js`, `akleh.js`, `silk.js`, `dash.js`

Four-column table: image | class (bare digit) | description | fare (bare decimal, no RM prefix).

```js
/<td><img[^>]*><\/td>\s*<td>(\d)<\/td>\s*<td>[^<]+<\/td>\s*<td>([\d.]+)<\/td>/g
```

### 3. PHP POST calculator — `klk.js`, `lpt.js`

AFA Prime serves fares via `POST` to a PHP endpoint with `action=submit&from=...&to=...&class=N`. Response contains `RM X.XX`. LPT is a closed system with 19 plazas and 342 pairs — use sequential class fetches (not concurrent) to avoid Cloudflare 520 errors.

### 4. Hard-coded with image hash drift guard — `duke.js`, `sde.js`

Operator publishes fares only as images. Fares are manually transcribed and stored as constants. A SHA-256 hash of the official image is checked on every scrape run — if the image changes, the scraper aborts with an actionable error message forcing re-transcription.

```js
const actual = crypto.createHash('sha256').update(buf).digest('hex');
if (actual !== KNOWN_SHA256) throw new Error(`Image changed — re-transcribe fares`);
```

### 5. Content-addressed image URL drift guard — `latar.js`

LATAR hosts fare images with the SHA-256 hash embedded in the filename. The scraper fetches the toll-rates page and checks that the known hash still appears in an `src=` attribute with the distinctive `//public/files/` double-slash path. If the URL changes (new hash = new content), the scraper aborts.

### 6. Filename-based drift guard — `wce.js`

WCE publishes 14 separate fare images with date-stamped filenames. When rates change, they upload new files with new names. The scraper fetches the toll-rates page and checks that all 14 known filenames are still present. Missing filename = rates updated.

### 7. WordPress REST API — `mex.js`

```
GET https://www.mex.com.my/wp-json/wp/v2/pages?slug=toll-rates&_fields=content
```

Returns JSON with `content.rendered` containing per-plaza HTML tables. Split on `<table>` blocks and match by index to the known plaza order.

### 8. ACF repeater (Elementor CMS) — `grandsaga.js`

Grand Saga uses WordPress + Elementor with Advanced Custom Fields. Each plaza is an `article.toll-rate-payment`; each vehicle class is a `dce-acf-repeater-item` with `rate_class` and `rate_fare` ACF fields identified via `data-settings` attributes.

### 9. Live JSON API — `skve.js`

```
GET https://www.skve.com.my/toll-rates
```

Returns a JSON array with one record per valid entry/exit pair and fields `fare_class_1` through `fare_class_5`. Single request, no auth. The calculator page's JavaScript consumes this same endpoint.

### 10. Hard-coded (no live source) — `spe.js`, `smart.js`, `ekve.js`, `besraya.js`, `lekas.js`

Used when the operator's website is down, image-only with no URL drift to detect, or fares come from a static announcement article. Document the provenance URL and effective date in the scraper file header. Add a comment explaining why it's hard-coded.

---

## How to add a concessionaire

1. Add the operator + its highways to `data/concessionaires.json`.
2. Add its plazas to `data/plazas.json` (with `highway`, `system`, `charging_type`; add `lat`/`lon` if known).
3. Copy `scrapers/plus.js` → `scrapers/<name>.js`; adapt `scrape()` to parse that operator's published source. Return the fares object only. Choose the right [scraper pattern](#scraper-patterns) above.
4. Import and register the new scraper in `scripts/build.js`'s `SCRAPERS` map.
5. Run `node scripts/build.js --only <name> --write` → writes `data/rates/<highway>.json`.
6. Run `node scripts/validate.js` → must pass.
7. Spot-check 2–3 key routes against the operator's own calculator. Record results in the PR description.

`scrapers/plus.js` + `data/rates/plus-nse.json` are the fully-worked reference. Pattern-match them.

---

## Licensing

| Component | Licence |
|-----------|---------|
| **Data** (`data/`) | ODbL (Open Database License) — share-alike keeps the commons open |
| **Code** | MIT — maximally reusable reference implementation |

---

## Decision log (locked)

Goal: dataset + API equally · Users: devs + drivers · Scope: Peninsular Malaysia ·
Maintained for years · Public GitHub + hosted API · All concessionaires · All 5 classes ·
Scrape + spot-check · Promotions current/future only · Rates + distance per segment ·
Closed/open binary (MLFF deferred) · ODbL + MIT · On-announcement + quarterly re-verify ·
Full open contributor model.
