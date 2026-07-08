/**
 * Smart Model Router.
 *
 * Given coordinates, resolves which region profile applies. The region profile
 * carries the per-model consensus weights. The set of models actually fetched is
 * the union of every model named in the active region's `weights` map.
 */
import { REGIONS, INDIA_BBOX, NORTH_AMERICA_BBOX, CONUS_BBOX, EUROPE_BBOX } from '../config/models.js';

function inBox(lat, lon, box) {
  return lat >= box.latMin && lat <= box.latMax && lon >= box.lonMin && lon <= box.lonMax;
}

/**
 * @param {number} lat
 * @param {number} lon
 * @returns {object} the active region profile from REGIONS
 */
export function resolveRegion(lat, lon) {
  if (inBox(lat, lon, INDIA_BBOX)) return REGIONS.india;
  if (inBox(lat, lon, NORTH_AMERICA_BBOX)) {
    return inBox(lat, lon, CONUS_BBOX) ? REGIONS.northAmericaCONUS : REGIONS.northAmericaWide;
  }
  if (inBox(lat, lon, EUROPE_BBOX)) return REGIONS.europe;
  return REGIONS.global;
}

/**
 * Model ids to request from Open-Meteo for a region, ordered by descending weight
 * so the highest-trust models render first in the breakdown.
 * @param {object} region
 * @returns {string[]}
 */
export function modelsForRegion(region) {
  return Object.keys(region.weights).sort((a, b) => region.weights[b] - region.weights[a]);
}
