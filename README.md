# tollmy

`tollmy` — an **open, machine-readable dataset of Malaysian highway toll fares**, with a reference calculator and HTTP API.

The dataset is the product. The calculator and API are a reference implementation you can use or replace.

> ⚠️ **Status: early scaffold.** Coverage is partial and some seeded fares are illustrative placeholders pending live scraping and spot-checks. Every fare carries a `last_verified` date — check it. Verify against the operator before relying on any number for payment.

## Scope (v1)
- **Peninsular Malaysia** only (East Malaysia out of scope for now).
- **All concessionaires** targeted; shipped incrementally, one scraper at a time.
- **All 5 vehicle classes** (1 car, 2–3 lorry, 4 taxi, 5 bus).
- **Closed** (entry×exit matrix, e.g. PLUS NSE) and **open** (flat per plaza, e.g. LDP) systems.
- **Festive/government discounts** modelled as a separate dated promotions layer.
- **Rates + distance** per segment. Fuel estimates intentionally out of v1.

## Data model
```
data/
  concessionaires.json   operators and the highways they run
  plazas.json            every plaza: id, name, highway, system, lat/lon
  promotions.json        time-boxed government/festive discounts (dated, sourced)
  rates/<highway>.json   per-highway fares + provenance (effective_date, last_verified, source)
```
- **Closed** rate file: `fares[entryPlaza][exitPlaza][class] = amount`
- **Open** rate file: `fares[plaza][class] = amount`
- Promotions never mutate base rates; they're applied at calculation time against the moment of travel, in MYT.

## Use it

```bash
npm install
npm run validate     # validate the whole dataset against the schema
npm test             # engine tests (incl. promotion layering)
npm run api          # start the HTTP API on :3000
```

### API
```
GET /v1/highways
GET /v1/plazas?highway=plus-nse
GET /v1/promotions?active=true
GET /v1/calculate?highway=plus-nse&entry=PLUS-NSE-JURU&exit=PLUS-NSE-IPOH-S&class=1
GET /v1/calculate?...&datetime=2026-03-18T10:00:00+08:00   # see festive pricing
```
`calculate` returns base fare, final fare, and which promotions were applied.

### As a library
```js
const { calculate } = require('./lib/calculate');
```

## Updating data
- **Cadence:** on-announcement (festive promos, rate revisions) + a quarterly re-verify sweep.
- **Add a concessionaire / fix a fare:** see [CONTRIBUTING.md](./CONTRIBUTING.md) and [CLAUDE.md](./CLAUDE.md).

## Licensing
- **Data** (`data/`): [ODbL v1.0](https://opendatacommons.org/licenses/odbl/1-0/) — share-alike keeps the commons open.
- **Code:** MIT.

## Disclaimer
Provided without warranty. Fares are sourced from operators' published schedules (see each file's `source`) and may be incomplete or outdated. Not affiliated with PLUS, LLM, or any concessionaire.
