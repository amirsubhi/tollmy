<div align="center">

# tollmy

**The open dataset of Malaysian highway toll fares**

[![Data: ODbL](https://img.shields.io/badge/data-ODbL%20v1.0-blue?style=flat-square)](https://opendatacommons.org/licenses/odbl/1-0/)
[![Code: MIT](https://img.shields.io/badge/code-MIT-green?style=flat-square)](LICENSE)
[![Node ≥ 18](https://img.shields.io/badge/node-%E2%89%A518-brightgreen?style=flat-square)](package.json)
[![Highways](https://img.shields.io/badge/highways-31-orange?style=flat-square)](#coverage)
[![Validated](https://img.shields.io/badge/schema-validated-success?style=flat-square)](#quick-start)

Machine-readable fares for every active toll highway in Peninsular Malaysia — scraped from official sources, validated against a strict schema, and free to use under ODbL.

**The dataset is the product.** The calculator and HTTP API are a reference implementation you can use or replace.

</div>

---

## Coverage

> **31 highways · 16 concessionaires · 223 plazas · 8,591 closed-system fare pairs** — full Peninsular Malaysia coverage.

<details open>
<summary><strong>Closed systems</strong> (entry × exit fare matrix)</summary>

| Highway | Operator | Plazas | Fare pairs | Source |
|---------|----------|-------:|----------:|--------|
| `plus-nse` | PLUS Malaysia | 94 | 7,921 | Live API |
| `lpt` | AFA Prime | 19 | 342 | Live calculator |
| `wce` | WCE Holdings | 14 | 52 | Official images |
| `elite` | PLUS Malaysia | 11 | 110 | Live API |
| `nkve` | PLUS Malaysia | 9 | 72 | Live API |
| `lekas` | IJM Corporation | 6 | 30 | Official images |
| `skve` | SKVE Holdings | 6 | 28 | Live JSON API |
| `sde` | SDEB | 4 | 12 | Official image |
| `ekve` | EKVE Sdn Bhd | 4 | 12 | Official images |
| `linkedua` | PLUS / Linkedua | 4 | 12 | Live API |

</details>

<details open>
<summary><strong>Open systems</strong> (flat rate per plaza)</summary>

| Highway | Operator | Plazas | Source |
|---------|----------|-------:|--------|
| `latar` | KLSEB | 7 | Official image |
| `duke` | KESTURI | 5 | Live scrape |
| `litrak-ldp` | Lingkaran Trans Kota | 4 | Live scrape |
| `prolintas-silk` | Prolintas | 4 | Live scrape |
| `kesas` | KESAS Sdn Bhd | 4 | Live scrape |
| `prolintas-dash` | Prolintas | 3 | Live scrape |
| `prolintas-gce` | Prolintas | 3 | Live scrape |
| `prolintas-suke` | Prolintas | 3 | Live scrape |
| `sprint` | Lingkaran Trans Kota | 3 | Live scrape |
| `spe` | KESTURI | 3 | Hard-coded |
| `mex` | MESB | 3 | Live scrape |
| `klk` | AFA Prime | 2 | Live calculator |
| `besraya` | IJM Corporation | 2 | Official image |
| `penang2` | JKSB | 2 | Live scrape |
| `cke` | Grand Saga | 2 | Live scrape |
| `smart` | SMART / Gamuda | 1 | Hard-coded |
| `prolintas-akleh` | Prolintas | 1 | Live scrape |

</details>

East Malaysia is out of scope for v1.

---

## Quick start

```bash
git clone https://github.com/amirsubhi/tollmy.git
cd tollmy
npm install
npm run validate    # validate every rate file against the schema
npm test            # engine unit tests
npm run api         # start the HTTP API on :3000
```

---

## Data model

```
data/
├── concessionaires.json    operators and the highways they run
├── plazas.json             every plaza: id, name, highway, system
├── promotions.json         time-boxed government/festive discounts
└── rates/
    ├── plus-nse.json       7,921 entry×exit fare pairs
    ├── lpt.json            342 pairs (Karak → Kuala Terengganu)
    ├── litrak-ldp.json     4 open plazas
    └── ...                 31 files total
```

### Closed system — entry × exit matrix

PLUS NSE, LPT, ELITE, NKVE, Linkedua, LEKAS, SKVE, SDE, EKVE, WCE.

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

### Open system — flat rate per plaza

LDP, SPRINT, DUKE, KESAS, LATAR, MEX, and all other urban highways.

```json
{
  "highway": "litrak-ldp",
  "system": "open",
  "currency": "MYR",
  "fares": {
    "LITRAK-LDP-PENCHALA": { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PJ":        { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PUCHONG-B": { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 },
    "LITRAK-LDP-PUCHONG-S": { "1": 2.10, "2": 4.20, "3": 6.30, "4": 1.10, "5": 1.60 }
  }
}
```

**Vehicle classes:** `1` car/SUV · `2` 2-axle lorry · `3` 3-axle lorry · `4` taxi · `5` bus. Motorcycles are generally free and not modelled.

**Promotions** are a separate dated layer — they never mutate base rates, and are applied at calculation time against the moment of travel.

---

## HTTP API

Start the server: `npm run api` (default port 3000)

| Endpoint | Description |
|----------|-------------|
| `GET /v1/highways` | List all highways and concessionaires |
| `GET /v1/plazas?highway=plus-nse` | List plazas, optionally filtered by highway |
| `GET /v1/promotions?active=true` | List promotions (all, or currently active only) |
| `GET /v1/calculate?...` | Compute a fare with promotions applied |

### Examples

**Closed system — PLUS NSE, Juru → Ipoh Utara, Class 1:**

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

**Closed system — LPT, Karak → Kuantan, Class 1:**

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

**Open system — LDP, Penchala plaza, Class 1:**

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

**With festive pricing** — pass `datetime` in ISO 8601 MYT:

```
GET /v1/calculate?highway=plus-nse&entry=PLUS-NSE-JRU&exit=PLUS-NSE-IPU&class=1&datetime=2026-12-25T10:00:00+08:00
```

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

### As a Node.js library

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
  at: new Date(),   // defaults to now; pass a future Date for festive pricing
});
// → { base: 13.78, final: 13.78, currency: 'MYR', applied: [] }
```

---

## Updating data

Each scraper lives in `scrapers/` and implements a single `scrape()` method returning the fares object. The base class handles provenance, validation, and diffing. `scrapers/plus.js` is the fully-worked reference.

```bash
node scripts/build.js --only plus          # dry-run one scraper, shows diff
node scripts/build.js --only plus --write  # run and write to data/rates/
node scripts/build.js --write              # run all scrapers
node scripts/validate.js                   # validate everything (CI gate)
```

**Update cadence:** on-announcement (rate revisions, new promotions) + quarterly re-verify sweep.

To add a new concessionaire, see [CLAUDE.md — How to add a concessionaire](./CLAUDE.md#how-to-add-a-concessionaire). See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

---

## Licensing

| Component | Licence |
|-----------|---------|
| **Data** (`data/`) | [ODbL v1.0](https://opendatacommons.org/licenses/odbl/1-0/) — share-alike keeps the commons open |
| **Code** | [MIT](LICENSE) |

---

<div align="center">

Fares are sourced from each operator's published schedule (see `source.url` and `last_verified` in every rate file).<br>
Always verify against the operator's own calculator before relying on any fare for payment.<br>
Not affiliated with PLUS, Prolintas, or any concessionaire.

</div>
