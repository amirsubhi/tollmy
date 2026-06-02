'use strict';

/**
 * schema.js — the source of truth for dataset shape.
 *
 * No external deps: a small hand-rolled validator keeps the repo dependency-light
 * and makes the rules legible. Each validate* function returns an array of error
 * strings (empty array = valid).
 */

const VEHICLE_CLASSES = ['1', '2', '3', '4', '5'];
const SYSTEMS = ['closed', 'open'];
// charging_type reserved for the MLFF/barrier-free refactor. Binary for v1.
const CHARGING_TYPES = ['plaza', 'gantry'];

function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function isISODateTime(v) {
  // Require an explicit offset — MYT is +08:00. Naive datetimes are a bug source.
  return typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?([.,]\d+)?[+-]\d{2}:\d{2}$/.test(v);
}

function isISODate(v) {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** Validate a per-class fare object, e.g. {"1":9.10,"2":16.30,...}. */
function validateFareSet(fares, path, errs) {
  if (!isObject(fares)) {
    errs.push(`${path}: expected an object of class→amount`);
    return;
  }
  for (const [cls, amount] of Object.entries(fares)) {
    if (!VEHICLE_CLASSES.includes(cls)) {
      errs.push(`${path}.${cls}: unknown vehicle class (allowed: ${VEHICLE_CLASSES.join(',')})`);
    }
    if (!isFiniteNumber(amount) || amount < 0) {
      errs.push(`${path}.${cls}: fare must be a non-negative number`);
    }
  }
}

/** Validate data/concessionaires.json */
function validateConcessionaires(doc) {
  const errs = [];
  if (!Array.isArray(doc)) return ['concessionaires: must be an array'];
  doc.forEach((c, i) => {
    const p = `concessionaires[${i}]`;
    if (!isObject(c)) { errs.push(`${p}: must be an object`); return; }
    if (typeof c.id !== 'string' || !c.id) errs.push(`${p}.id: required string`);
    if (typeof c.name !== 'string' || !c.name) errs.push(`${p}.name: required string`);
    if (!Array.isArray(c.highways)) errs.push(`${p}.highways: required array of highway ids`);
  });
  return errs;
}

/** Validate data/plazas.json */
function validatePlazas(doc) {
  const errs = [];
  if (!Array.isArray(doc)) return ['plazas: must be an array'];
  const seen = new Set();
  doc.forEach((pz, i) => {
    const p = `plazas[${i}]`;
    if (!isObject(pz)) { errs.push(`${p}: must be an object`); return; }
    if (typeof pz.id !== 'string' || !pz.id) errs.push(`${p}.id: required string`);
    else if (seen.has(pz.id)) errs.push(`${p}.id: duplicate plaza id "${pz.id}"`);
    else seen.add(pz.id);
    if (typeof pz.name !== 'string' || !pz.name) errs.push(`${p}.name: required string`);
    if (typeof pz.highway !== 'string' || !pz.highway) errs.push(`${p}.highway: required string`);
    if (!SYSTEMS.includes(pz.system)) errs.push(`${p}.system: must be one of ${SYSTEMS.join(',')}`);
    if (pz.charging_type !== undefined && !CHARGING_TYPES.includes(pz.charging_type)) {
      errs.push(`${p}.charging_type: must be one of ${CHARGING_TYPES.join(',')}`);
    }
    // Coordinates optional but, if present, must be sane (Peninsular-ish bounds).
    if (pz.lat !== undefined && (!isFiniteNumber(pz.lat) || pz.lat < 0.5 || pz.lat > 7)) {
      errs.push(`${p}.lat: out of Peninsular Malaysia range`);
    }
    if (pz.lon !== undefined && (!isFiniteNumber(pz.lon) || pz.lon < 99 || pz.lon > 105)) {
      errs.push(`${p}.lon: out of Peninsular Malaysia range`);
    }
  });
  return errs;
}

/** Validate one data/rates/<highway>.json file */
function validateRateFile(doc) {
  const errs = [];
  if (!isObject(doc)) return ['rate file: must be an object'];

  if (typeof doc.highway !== 'string' || !doc.highway) errs.push('highway: required string');
  if (typeof doc.concessionaire !== 'string' || !doc.concessionaire) errs.push('concessionaire: required string');
  if (!SYSTEMS.includes(doc.system)) errs.push(`system: must be one of ${SYSTEMS.join(',')}`);
  if (doc.currency !== 'MYR') errs.push('currency: must be "MYR"');
  if (!isISODate(doc.effective_date)) errs.push('effective_date: required YYYY-MM-DD');
  if (!isISODate(doc.last_verified)) errs.push('last_verified: required YYYY-MM-DD');

  // Provenance is mandatory — undated/unsourced data is untrustworthy.
  if (!isObject(doc.source)) {
    errs.push('source: required object { url, scraped_at }');
  } else {
    if (typeof doc.source.url !== 'string') errs.push('source.url: required string');
    if (!isISODateTime(doc.source.scraped_at)) errs.push('source.scraped_at: required ISO datetime with offset');
  }

  // fares may be empty ({}) for not-yet-scraped highways — that's allowed and honest.
  if (!isObject(doc.fares)) {
    errs.push('fares: required object (may be empty {} if not yet scraped)');
    return errs;
  }

  if (doc.system === 'closed') {
    // fares[entryId][exitId] = { class: amount }
    for (const [entry, exits] of Object.entries(doc.fares)) {
      if (!isObject(exits)) { errs.push(`fares.${entry}: expected object of exit→fareset`); continue; }
      for (const [exit, fareset] of Object.entries(exits)) {
        validateFareSet(fareset, `fares.${entry}.${exit}`, errs);
      }
    }
  } else if (doc.system === 'open') {
    // fares[plazaId] = { class: amount }
    for (const [plaza, fareset] of Object.entries(doc.fares)) {
      validateFareSet(fareset, `fares.${plaza}`, errs);
    }
  }
  return errs;
}

/** Validate data/promotions.json */
function validatePromotions(doc) {
  const errs = [];
  if (!Array.isArray(doc)) return ['promotions: must be an array'];
  doc.forEach((pr, i) => {
    const p = `promotions[${i}]`;
    if (!isObject(pr)) { errs.push(`${p}: must be an object`); return; }
    if (typeof pr.id !== 'string' || !pr.id) errs.push(`${p}.id: required string`);
    if (typeof pr.name !== 'string' || !pr.name) errs.push(`${p}.name: required string`);
    if (pr.type !== 'percentage' && pr.type !== 'fixed') {
      errs.push(`${p}.type: must be "percentage" or "fixed"`);
    }
    if (!isFiniteNumber(pr.value) || pr.value < 0) errs.push(`${p}.value: non-negative number`);
    if (pr.type === 'percentage' && pr.value > 100) errs.push(`${p}.value: percentage cannot exceed 100`);
    if (!isISODateTime(pr.starts)) errs.push(`${p}.starts: ISO datetime with offset (MYT +08:00)`);
    if (!isISODateTime(pr.ends)) errs.push(`${p}.ends: ISO datetime with offset (MYT +08:00)`);
    if (!Array.isArray(pr.eligible_classes) || pr.eligible_classes.some(c => !VEHICLE_CLASSES.includes(c))) {
      errs.push(`${p}.eligible_classes: array of valid class strings`);
    }
    if (pr.excluded_plazas !== undefined && !Array.isArray(pr.excluded_plazas)) {
      errs.push(`${p}.excluded_plazas: array of plaza ids`);
    }
    if (pr.source !== undefined && typeof pr.source !== 'string') {
      errs.push(`${p}.source: source URL string`);
    }
  });
  return errs;
}

module.exports = {
  VEHICLE_CLASSES,
  SYSTEMS,
  CHARGING_TYPES,
  isISODateTime,
  validateConcessionaires,
  validatePlazas,
  validateRateFile,
  validatePromotions,
};
