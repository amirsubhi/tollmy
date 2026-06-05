# Disclaimer

## Data accuracy

Toll fares in this dataset are sourced from each concessionaire's **publicly published fare schedules** (see the `source.url` and `last_verified` fields in every rate file). They are provided for **informational and reference purposes only**.

- Fares may be **incomplete, outdated, or contain transcription errors**.
- Operators may change their rates at any time without prior notice.
- **Always verify the fare against the operator's own calculator or toll plaza before making any payment decision.**
- The maintainers accept no responsibility for any financial loss, incorrect payment, or inconvenience arising from reliance on data in this repository.

## No affiliation

This project is an **independent open-data initiative** and is **not affiliated with, endorsed by, or connected to** PLUS Malaysia Berhad, Lingkaran Trans Kota, Prolintas, AFA Prime, or any other toll concessionaire, the Malaysian Highway Authority (Lembaga Lebuhraya Malaysia), or any agency of the Malaysian Government.

Concessionaire names, highway names, and plaza names are used for identification purposes only.

## Data sources and scraping

Fare data is collected from operators' **publicly accessible web pages** using polite automated requests (rate-limited, with an honest User-Agent). The dataset does not:

- Access any password-protected, subscriber-only, or otherwise restricted system.
- Capture, store, or republish personal data of any kind.
- Reproduce concessionaire branding, logos, or original creative content.

Individual fare amounts are **facts** and are not subject to copyright protection under Malaysian law or internationally. The **compiled database** is licensed under ODbL (see `data/LICENSE-DATA.txt`).

If you are a concessionaire and believe any data here misrepresents your published rates, please open a GitHub issue or contact the maintainer — corrections are welcomed and acted on promptly.

## No warranty

This dataset and software are provided **"AS IS"**, without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.

In no event shall the maintainers or contributors be liable for any claim, damages, or other liability — whether in contract, tort, or otherwise — arising from, out of, or in connection with the dataset, the software, or the use or other dealings in them.

## Privacy (PDPA 2010)

This project does not collect, process, or store personal data. If you deploy the API on a public server, your web server access logs will capture visitor IP addresses, which are personal data under the **Personal Data Protection Act 2010 (Malaysia)**. You are responsible for:

- Setting an appropriate log retention period (recommended: 30 days maximum).
- Informing users of your log retention policy if you operate a public-facing instance.
- Complying with PDPA 2010 in your jurisdiction if you build a product on top of this dataset.

## Licence obligations for data reuse

If you redistribute or adapt the data (`data/`), the **Open Database Licence (ODbL v1.0)** requires that you:

1. **Attribute** this project — include a link to this repository.
2. **Share-alike** — any adapted or derived database must be released under ODbL.
3. **Keep it open** — you may not apply technical or legal measures that restrict access to any adapted version.

The reference code (`api/`, `scrapers/`, `lib/`, `scripts/`, `test/`) is separately licensed under **MIT** with no share-alike requirement.

Full licence texts: [`LICENSE-CODE.txt`](./LICENSE-CODE.txt) · [`data/LICENSE-DATA.txt`](./data/LICENSE-DATA.txt)
