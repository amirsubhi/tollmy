# tollmy

**An open, machine-readable dataset of Malaysian highway toll fares** — with a reference calculator and HTTP API.

The dataset is the product. The calculator and API are a reference implementation you can use or replace.

## Coverage

**31 highways · 16 concessionaires · 223 plazas · 8,591 closed-system fare pairs** — full Peninsular Malaysia.

| # | Highway | Operator | System | Plazas | Pairs |
|---|---------|----------|--------|--------|-------|
| 1 | plus-nse | PLUS Malaysia | closed | 94 | 7,921 |
| 2 | lpt | AFA Prime | closed | 19 | 342 |
| 3 | elite | PLUS Malaysia | closed | 11 | 110 |
| 4 | wce | WCE Holdings | closed | 14 | 52 |
| 5 | nkve | PLUS Malaysia | closed | 9 | 72 |
| 6 | lekas | IJM | closed | 6 | 30 |
| 7 | skve | SKVE Holdings | closed | 6 | 28 |
| 8 | sde | SDEB | closed | 4 | 12 |
| 9 | ekve | EKVE Sdn Bhd | closed | 4 | 12 |
| 10 | linkedua | PLUS / Linkedua | closed | 4 | 12 |
| 11 | latar | KLSEB | open | 7 | — |
| 12 | prolintas-silk | Prolintas | open | 4 | — |
| 13 | kesas | KESAS Sdn Bhd | open | 4 | — |
| 14 | litrak-ldp | Lingkaran Trans Kota | open | 4 | — |
| 15 | duke | KESTURI | open | 5 | — |
| 16 | prolintas-dash | Prolintas | open | 3 | — |
| 17 | prolintas-gce | Prolintas | open | 3 | — |
| 18 | prolintas-suke | Prolintas | open | 3 | — |
| 19 | sprint | Lingkaran Trans Kota | open | 3 | — |
| 20 | spe | KESTURI | open | 3 | — |
| 21 | mex | MESB | open | 3 | — |
| 22 | klk | AFA Prime | open | 2 | — |
| 23 | besraya | IJM | open | 2 | — |
| 24 | penang2 | JKSB | open | 2 | — |
| 25 | cke | Grand Saga | open | 2 | — |
| 26 | prolintas-akleh | Prolintas | open | 1 | — |
| 27 | smart | SMART / Gamuda | open | 1 | — |

East Malaysia is out of scope for v1.

## Data model

```
data/
  concessionaires.json       operators and the highways they run
  plazas.json                every plaza: id, name, highway, system
  promotions.json            time-boxed government/festive discounts
  rates/<highway>.json       per-highway fares + provenance
```

### Closed system (entry × exit matrix)

Used by PLUS NSE, LPT, ELITE, LEKAS, SKVE, SDE, EKVE, WCE, NKVE, Linkedua.

```json
{
  "highway": "plus-nse",
  "concessionaire": "plus",
  "system": "closed",
  "currency": "MYR",
  "effective_date": "2026-01-01",
  "last_verified": "2026-06-03",
  "source": {
    "url": "https://www.plus.com.my/?option=com_toll",
    "scraped_at": "2026-06-03T06:12:44.422+00:00"
  },
  "fares": {
    "PLUS-NSE-JRU": {
      "PLUS-NSE-IPU": {
        "1": 13.78,
        "2": 25.20,
        "3": 33.60,
        "4": 6.89,
        "5": 10.33
      }
    }
  }
}
```

### Open system (flat per plaza)

Used by LDP, SPRINT, DUKE, KESAS, LATAR, MEX, and others.

```json
{
  "highway": "litrak-ldp",
  "concessionaire": "litrak",
  "system": "open",
  "currency": "MYR",
  "fares": {
    "LITRAK-LDP-PENCHALA": { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PJ":       { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PUCHONG-B":{ "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PUCHONG-S":{ "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 }
  }
}
```

Vehicle classes: `1` = car/SUV, `2` = 2-axle lorry, `3` = 3-axle lorry, `4` = taxi, `5` = bus.
Motorcycles are generally free and not modelled.

Promotions are a **separate dated layer** — they never mutate base rates, and are applied at calculation time against the travel datetime.

## Quick start

```bash
npm install
npm run validate   # validate the whole dataset against the schema
npm test           # engine unit tests
npm run api        # start the HTTP API on :3000
```

## HTTP API

```
GET /v1/highways
GET /v1/plazas?highway=plus-nse
GET /v1/promotions?active=true
GET /v1/calculate?highway=plus-nse&entry=PLUS-NSE-JRU&exit=PLUS-NSE-IPU&class=1
GET /v1/calculate?...&datetime=2026-12-25T10:00:00+08:00
```

### Sample responses

**PLUS NSE — Juru → Ipoh Utara, Class 1 (car):**
```
GET /v1/calculate?highway=plus-nse&entry=PLUS-NSE-JRU&exit=PLUS-NSE-IPU&class=1
```
```json
{
  "highway": "plus-nse",
  "system": "closed",
  "entry": "PLUS-NSE-JRU",
  "exit": "PLUS-NSE-IPU",
  "vehicle_class": "1",
  "base": 13.78,
  "final": 13.78,
  "currency": "MYR",
  "applied": []
}
```

**LPT — Karak → Kuantan, Class 1:**
```
GET /v1/calculate?highway=lpt&entry=LPT-KARAK&exit=LPT-KUANTAN&class=1
```
```json
{
  "highway": "lpt",
  "system": "closed",
  "entry": "LPT-KARAK",
  "exit": "LPT-KUANTAN",
  "vehicle_class": "1",
  "base": 19.60,
  "final": 19.60,
  "currency": "MYR",
  "applied": []
}
```

**LDP — Penchala plaza, Class 1:**
```
GET /v1/calculate?highway=litrak-ldp&entry=LITRAK-LDP-PENCHALA&class=1
```
```json
{
  "highway": "litrak-ldp",
  "system": "open",
  "entry": "LITRAK-LDP-PENCHALA",
  "exit": null,
  "vehicle_class": "1",
  "base": 2.10,
  "final": 2.10,
  "currency": "MYR",
  "applied": []
}
```

**With an active festive promotion** (`applied` shows the discount chain):
```json
{
  "base": 13.78,
  "final": 11.30,
  "currency": "MYR",
  "applied": [
    { "id": "hari-raya-2026", "label": "Hari Raya 50% discount", "discount": 2.48 }
  ]
}
```

### As a library

```js
const { calculate } = require('./lib/calculate');
const rateDoc    = require('./data/rates/plus-nse.json');
const promotions = require('./data/promotions.json');

const result = calculate({
  rateDoc,
  entry: 'PLUS-NSE-JRU',
  exit:  'PLUS-NSE-IPU',
  vehicleClass: 1,
  promotions,
  at: new Date(),   // defaults to now; pass a Date for future/past travel
});
// → { base: 13.78, final: 13.78, currency: 'MYR', applied: [] }
```

## Updating data

Scrapers live in `scrapers/`. Each concessionaire has one file; subclasses only implement `scrape()` and return the fares object. `scrapers/plus.js` is the reference.

```bash
node scripts/build.js --only plus          # dry-run one scraper, show diff
node scripts/build.js --only plus --write  # run and write to data/rates/
node scripts/build.js --write              # run all scrapers
node scripts/validate.js                   # validate everything (CI gate)
```

- **Cadence:** on-announcement (rate revisions, new promotions) + quarterly re-verify sweep.
- **Add a concessionaire:** follow the steps in [CLAUDE.md](./CLAUDE.md#how-to-add-a-concessionaire).
- **Fix a fare:** update the scraper, re-run with `--write`, run `validate.js`, open a PR with spot-check evidence.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Licensing

- **Data** (`data/`): [ODbL v1.0](https://opendatacommons.org/licenses/odbl/1-0/) — share-alike keeps the commons open.
- **Code:** MIT.

## Disclaimer

Fares are sourced from each operator's published schedule (see each file's `source.url` and `last_verified`). Always verify against the operator's own calculator before relying on any fare for payment. Not affiliated with PLUS, Prolintas, or any concessionaire.
