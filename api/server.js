'use strict';

/**
 * api/server.js — thin read-only HTTP API over the dataset.
 *
 * Endpoints (v1):
 *   GET /v1/highways                          list highways + concessionaires
 *   GET /v1/plazas?highway=plus-nse           list plazas (optionally filtered)
 *   GET /v1/promotions?active=true            list promotions (optionally only active now)
 *   GET /v1/calculate?highway=&entry=&exit=&class=&datetime=
 *                                             compute a fare (promotions auto-applied)
 *
 * Data is loaded from disk once at boot. The dataset is the source of truth;
 * this server adds no business logic beyond lib/calculate.js.
 */

const fs      = require('fs');
const path    = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { calculate } = require('../lib/calculate');

// ── Data loading (SEC-007: fail fast with a clear message) ────────────────────
const DATA = path.join(__dirname, '..', 'data');
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

let concessionaires, plazas, promotions, rates;
try {
  concessionaires = load('concessionaires.json');
  plazas          = load('plazas.json');
  promotions      = load('promotions.json');
  rates           = {};
  for (const f of fs.readdirSync(path.join(DATA, 'rates')).filter(f => f.endsWith('.json'))) {
    const doc = JSON.parse(fs.readFileSync(path.join(DATA, 'rates', f), 'utf8'));
    rates[doc.highway] = doc;
  }
} catch (e) {
  console.error('Fatal: failed to load dataset —', e.message);
  process.exit(1);
}

// ── App setup ─────────────────────────────────────────────────────────────────
const app = express();

// SEC-003: remove Express fingerprint, add basic protective headers
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// SEC-004: allow cross-origin reads (safe — all endpoints are read-only, no auth)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

// SEC-002: rate limit — 200 requests per IP per 15 minutes
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'too many requests — please slow down' },
}));

// ── Input validation helpers (SEC-005) ────────────────────────────────────────
const VALID_CLASSES = new Set(['1', '2', '3', '4', '5']);
const MAX_LEN = 60;

function validateParams(params) {
  for (const [name, val] of Object.entries(params)) {
    if (val !== undefined && String(val).length > MAX_LEN)
      return `${name} parameter too long`;
  }
  return null;
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/v1/highways', (req, res) => {
  res.json(concessionaires.flatMap(c =>
    c.highways.map(h => ({
      highway: h,
      concessionaire: c.id,
      concessionaire_name: c.name,
      system: rates[h]?.system ?? null,
      effective_date: rates[h]?.effective_date ?? null,
      last_verified: rates[h]?.last_verified ?? null,
      status: c.status,
    }))
  ));
});

app.get('/v1/plazas', (req, res) => {
  const { highway } = req.query;
  if (highway && String(highway).length > MAX_LEN)
    return res.status(400).json({ error: 'highway parameter too long' });
  res.json(highway ? plazas.filter(p => p.highway === highway) : plazas);
});

app.get('/v1/promotions', (req, res) => {
  if (req.query.active === 'true') {
    const now = Date.now();
    return res.json(promotions.filter(p =>
      now >= new Date(p.starts).getTime() && now <= new Date(p.ends).getTime()));
  }
  res.json(promotions);
});

app.get('/v1/calculate', (req, res) => {
  const { highway, entry, exit, class: vehicleClass, datetime } = req.query;

  if (!highway || !entry || !vehicleClass)
    return res.status(400).json({ error: 'highway, entry and class are required' });

  // SEC-005: validate class enum and param lengths
  const cls = String(vehicleClass);
  if (!VALID_CLASSES.has(cls))
    return res.status(400).json({ error: 'class must be 1, 2, 3, 4, or 5' });

  const lenErr = validateParams({ highway, entry, exit, datetime });
  if (lenErr) return res.status(400).json({ error: lenErr });

  const rateDoc = rates[highway];
  if (!rateDoc) return res.status(404).json({ error: `unknown highway "${highway}"` });

  if (rateDoc.system === 'closed' && !exit)
    return res.status(400).json({ error: 'exit is required for closed-system highways' });

  const at = datetime ? new Date(datetime) : new Date();
  if (isNaN(at.getTime()))
    return res.status(400).json({ error: 'datetime must be ISO 8601 (include +08:00 for MYT)' });

  const result = calculate({ rateDoc, entry, exit, vehicleClass: cls, promotions, at });
  if (result.error === 'fare_not_found')
    return res.status(404).json({ error: 'no fare for that plaza pair/class', detail: result });

  res.json({
    highway,
    system: rateDoc.system,
    entry,
    exit: exit ?? null,
    vehicle_class: cls,
    at: at.toISOString(),
    ...result,
    data_last_verified: rateDoc.last_verified,
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`tollmy API on :${PORT}`));
}

module.exports = app;
