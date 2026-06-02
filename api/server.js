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

const fs = require('fs');
const path = require('path');
const express = require('express');
const { calculate } = require('../lib/calculate');

const DATA = path.join(__dirname, '..', 'data');
const load = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8'));

const concessionaires = load('concessionaires.json');
const plazas = load('plazas.json');
const promotions = load('promotions.json');
const rates = {};
for (const f of fs.readdirSync(path.join(DATA, 'rates')).filter(f => f.endsWith('.json'))) {
  const doc = JSON.parse(fs.readFileSync(path.join(DATA, 'rates', f), 'utf8'));
  rates[doc.highway] = doc;
}

const app = express();

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
  if (!highway || !entry || !vehicleClass) {
    return res.status(400).json({ error: 'highway, entry and class are required (exit required for closed systems)' });
  }
  const rateDoc = rates[highway];
  if (!rateDoc) return res.status(404).json({ error: `unknown highway "${highway}"` });
  if (rateDoc.system === 'closed' && !exit) {
    return res.status(400).json({ error: 'exit is required for closed-system highways' });
  }

  const at = datetime ? new Date(datetime) : new Date();
  if (isNaN(at.getTime())) return res.status(400).json({ error: 'datetime must be ISO 8601 (include +08:00 for MYT)' });

  const result = calculate({ rateDoc, entry, exit, vehicleClass, promotions, at });
  if (result.error === 'fare_not_found') {
    return res.status(404).json({ error: 'no fare for that plaza pair/class', detail: result });
  }
  res.json({
    highway,
    system: rateDoc.system,
    entry, exit: exit ?? null,
    vehicle_class: String(vehicleClass),
    at: at.toISOString(),
    ...result,
    data_last_verified: rateDoc.last_verified,
  });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`tollmy API on :${PORT}`));
}

module.exports = app;
