'use strict';

/**
 * geocode.js — populate lat/lon for plazas missing coordinates.
 *
 * Uses the Nominatim OpenStreetMap geocoding service (1 req/sec rate limit).
 * Only fills in plazas that have no coordinates — existing values are preserved.
 *
 * Usage:
 *   node scripts/geocode.js           # dry-run (shows what would be set)
 *   node scripts/geocode.js --write   # write results to data/plazas.json
 */

const fs   = require('fs');
const path = require('path');

const PLAZAS_FILE = path.join(__dirname, '..', 'data', 'plazas.json');
const DELAY_MS    = 1200; // Nominatim asks for max 1 req/sec; be polite
const UA          = 'tollmy-geocoder/1.0 (https://github.com/amirsubhi/tollmy)';

// Peninsular Malaysia bounding box (schema validation bounds)
const BOUNDS = { latMin: 0.5, latMax: 7.5, lonMin: 99, lonMax: 105.5 };

function inBounds(lat, lon) {
  return lat >= BOUNDS.latMin && lat <= BOUNDS.latMax &&
         lon >= BOUNDS.lonMin && lon <= BOUNDS.lonMax;
}

async function nominatim(query) {
  const url = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
    q: query, format: 'json', limit: '5',
    countrycodes: 'my',
    viewbox: `${BOUNDS.lonMin},${BOUNDS.latMax},${BOUNDS.lonMax},${BOUNDS.latMin}`,
    bounded: '1',
  });
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  return res.json();
}

async function geocodePlaza(plaza) {
  // Try progressively simpler queries until one returns a result in bounds
  const queries = [
    `Plaza Tol ${plaza.name} Malaysia`,
    `toll plaza ${plaza.name} Malaysia`,
    `${plaza.name} toll Malaysia`,
  ];
  for (const q of queries) {
    await new Promise(r => setTimeout(r, DELAY_MS));
    const results = await nominatim(q);
    for (const r of results) {
      const lat = Math.round(+r.lat * 10000) / 10000;
      const lon = Math.round(+r.lon * 10000) / 10000;
      if (inBounds(lat, lon)) return { lat, lon };
    }
  }
  return null;
}

async function main() {
  const write = process.argv.includes('--write');
  const plazas = JSON.parse(fs.readFileSync(PLAZAS_FILE));

  const toGeocode = plazas.filter(p => !p.lat || !p.lon);
  console.log(`${toGeocode.length} plazas need geocoding (${plazas.length - toGeocode.length} already have coords)`);
  if (!write) console.log('Dry-run — pass --write to save results\n');

  let found = 0, notFound = 0;

  for (const plaza of toGeocode) {
    try {
      const coords = await geocodePlaza(plaza);
      if (coords) {
        plaza.lat = coords.lat;
        plaza.lon = coords.lon;
        found++;
        process.stdout.write(`✓ ${plaza.id.padEnd(40)} ${coords.lat}, ${coords.lon}\n`);
      } else {
        notFound++;
        process.stdout.write(`✗ ${plaza.id.padEnd(40)} not found\n`);
      }
    } catch (e) {
      notFound++;
      process.stdout.write(`✗ ${plaza.id.padEnd(40)} error: ${e.message}\n`);
    }
  }

  console.log(`\nResult: ${found} geocoded, ${notFound} not found`);

  if (write) {
    fs.writeFileSync(PLAZAS_FILE, JSON.stringify(plazas, null, 2));
    console.log('Written to data/plazas.json');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
