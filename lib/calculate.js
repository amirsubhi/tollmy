'use strict';

/**
 * calculate.js — the engine. Deliberately small: the dataset does the heavy
 * lifting, this just looks up a fare and layers any active promotions on top.
 *
 * Base rates are NEVER mutated. Promotions are evaluated against the moment of
 * travel (passing the plaza), defaulting to "now", always compared in MYT.
 */

const MYT_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * Look up the base fare (no promotions) for a journey.
 *
 * @param {object} rateDoc  a parsed data/rates/<highway>.json
 * @param {object} opts     { entry, exit, vehicleClass }
 *   - closed system: entry + exit required
 *   - open system:   entry is the plaza; exit ignored
 * @returns {number|null}   fare in MYR, or null if not found
 */
function baseFare(rateDoc, { entry, exit, vehicleClass }) {
  if (!rateDoc || typeof rateDoc.fares !== 'object') return null;
  const cls = String(vehicleClass);

  if (rateDoc.system === 'open') {
    const set = rateDoc.fares[entry];
    return set && set[cls] != null ? set[cls] : null;
  }
  // closed
  const exits = rateDoc.fares[entry];
  if (!exits) return null;
  const set = exits[exit];
  return set && set[cls] != null ? set[cls] : null;
}

/**
 * Is a promotion active for this plaza/class/time?
 *
 * @param {object} promo   a promotions.json entry
 * @param {object} ctx     { plaza, vehicleClass, at } (at = Date, the travel time)
 */
function promotionApplies(promo, { plaza, vehicleClass, at }) {
  const cls = String(vehicleClass);
  const t = at.getTime();
  if (t < new Date(promo.starts).getTime()) return false;
  if (t > new Date(promo.ends).getTime()) return false;

  if (Array.isArray(promo.excluded_plazas) && promo.excluded_plazas.includes(plaza)) {
    return false;
  }

  // Base eligibility by class...
  let eligible = Array.isArray(promo.eligible_classes) && promo.eligible_classes.includes(cls);

  // ...plus any conditional per-plaza class additions
  // e.g. Class 2 eligible only at the Penang Bridge.
  if (!eligible && Array.isArray(promo.conditional_eligibility)) {
    for (const cond of promo.conditional_eligibility) {
      if (cond.plaza === plaza &&
          Array.isArray(cond.additional_classes) &&
          cond.additional_classes.includes(cls)) {
        eligible = true;
        break;
      }
    }
  }
  return eligible;
}

/** Apply one promotion to an amount. */
function applyOne(amount, promo) {
  if (promo.type === 'percentage') {
    return Math.max(0, amount * (1 - promo.value / 100));
  }
  if (promo.type === 'fixed') {
    return Math.max(0, amount - promo.value);
  }
  return amount;
}

/**
 * Full calculation: base fare + any active promotions.
 *
 * @param {object} args
 *   - rateDoc:      the highway's rate file
 *   - entry, exit:  plaza ids (exit unused for open systems)
 *   - vehicleClass: "1".."5"
 *   - promotions:   array from data/promotions.json (optional)
 *   - at:           Date of travel (optional, defaults to now)
 * @returns {object} { base, final, currency, applied:[...], plaza }
 */
function calculate({ rateDoc, entry, exit, vehicleClass, promotions = [], at = new Date() }) {
  const base = baseFare(rateDoc, { entry, exit, vehicleClass });
  if (base == null) {
    return { base: null, final: null, currency: 'MYR', applied: [], plaza: exit || entry,
             error: 'fare_not_found' };
  }

  // For promotion exclusion purposes the relevant plaza is where you pay:
  // exit on a closed system, the single plaza on an open one.
  const payPlaza = rateDoc.system === 'open' ? entry : exit;

  const applied = [];
  let final = base;
  for (const promo of promotions) {
    if (promotionApplies(promo, { plaza: payPlaza, vehicleClass, at })) {
      const before = final;
      final = applyOne(final, promo);
      applied.push({ id: promo.id, name: promo.name, type: promo.type, value: promo.value,
                     saved: +(before - final).toFixed(2) });
    }
  }

  return {
    base: +base.toFixed(2),
    final: +final.toFixed(2),
    currency: 'MYR',
    applied,
    plaza: payPlaza,
  };
}

module.exports = { calculate, baseFare, promotionApplies, applyOne, MYT_OFFSET_MS };
