# Changelog

All notable changes to the **tollmy** dataset and codebase are recorded here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

---

## [0.2.0] — 2026-06-06

### Added — dataset
- **31 highways** at full Peninsular Malaysia coverage (up from 1 seeded highway)
- **224 plazas** registered in `plazas.json` (including all 94 PLUS NSE plazas)
- **150/224 plazas** geocoded with lat/lon via Nominatim OSM
- `scripts/geocode.js` — rerunnable coordinate lookup tool

### Added — scrapers
New scrapers: `plus`, `elite`, `nkve`, `linkedua` (PLUS Azure API);
`litrak`, `sprint` (LITRAK/ALR); `suke`, `gce`, `dash`, `akleh`, `silk` (Prolintas);
`duke`, `spe` (KESTURI); `latar` (KLSEB); `klk`, `lpt` (AFA Prime);
`mex` (MESB); `kesas` (KESAS); `grandsaga` (Grand Saga);
`penang2` (JKSB); `besraya`, `lekas` (IJM); `skve` (SKVE Holdings);
`sde`, `wce`, `ekve` (SDEB / WCE Holdings / EKVE Sdn Bhd);
`smart` (SMART Tunnel)

### Fixed — effective dates
- KESAS: `2013-01-15` (was placeholder `2024-01-01`)
- LATAR: `2015-10-15` (was placeholder `2024-01-01`)
- SDE:   `2015-10-15` (was placeholder `2024-01-01`)
- SKVE:  `2015-10-15` (was placeholder `2024-01-01`)

### Added — API & developer experience
- Rate limiting: 200 req/IP/15 min (`express-rate-limit`)
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, removed `X-Powered-By`
- CORS: `Access-Control-Allow-Origin: *` (read-only API, no auth)
- Input validation: `class` enum check, 60-char param cap
- Startup safety: `JSON.parse` wrapped in try/catch with clear error message
- 90-day staleness warning on hard-coded scrapers (SPE, SMART, EKVE, BESRAYA, LEKAS)
- `openapi.yaml` — full OpenAPI 3.1 spec for all four endpoints
- `Dockerfile` + `docker-compose.yml` — one-command local API setup
- `.github/workflows/ci.yml` — validate + test on every push and PR

### Added — documentation
- `README.md` — complete rewrite: badges, collapsible coverage tables, data model samples, API response examples
- `CLAUDE.md` — updated to reflect live 31-highway state; new Scraper Patterns section
- `DISCLAIMER.md` — data accuracy, no affiliation, scraping notice, no warranty, PDPA note, ODbL obligations
- `data/LICENSE-DATA.txt` — strengthened warranty disclaimer

---

## [0.1.0] — 2026-06-02

### Added
- Initial scaffold: schema, calculate engine, base scraper harness, Express API
- Seeded PLUS NSE rate file (illustrative data, not live)
- `test/calculate.test.js` — 8 engine unit tests
- `data/concessionaires.json`, `data/plazas.json`, `data/promotions.json` structure
- `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `LICENSE-CODE.txt`, `data/LICENSE-DATA.txt`
