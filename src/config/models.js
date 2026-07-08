/**
 * Model registry + Smart Router configuration.
 *
 * Every model here is a free Open-Meteo model id (no API key). The router always
 * fetches the three headline global models so the transparency breakdown is
 * meaningful everywhere; only the *consensus weights* change by region. A model
 * with weight 0 is still shown in the breakdown (e.g. GFS over India) so the user
 * can see *why* it was excluded.
 */

// Canonical model metadata, keyed by the Open-Meteo `models=` id.
export const MODELS = {
  ecmwf_ifs025: {
    id: 'ecmwf_ifs025',
    label: 'ECMWF',
    full: 'ECMWF IFS (0.25°)',
    origin: 'Europe · ECMWF',
    accent: '#38bdf8', // sky
  },
  icon_seamless: {
    id: 'icon_seamless',
    label: 'ICON',
    full: 'DWD ICON (Seamless)',
    origin: 'Germany · DWD',
    accent: '#34d399', // emerald
  },
  gfs_seamless: {
    id: 'gfs_seamless',
    label: 'GFS',
    full: 'NOAA GFS (Seamless)',
    origin: 'USA · NOAA',
    accent: '#fbbf24', // amber
  },
  gfs_hrrr: {
    id: 'gfs_hrrr',
    label: 'HRRR',
    full: 'NOAA HRRR (3km CONUS)',
    origin: 'USA · NOAA',
    accent: '#fb7185', // rose
  },
};

// Region bounding boxes.
export const INDIA_BBOX = { latMin: 8.4, latMax: 37.6, lonMin: 68.7, lonMax: 97.2 };
export const NORTH_AMERICA_BBOX = { latMin: 15, latMax: 72, lonMin: -168, lonMax: -52 };
export const CONUS_BBOX = { latMin: 24.5, latMax: 49.5, lonMin: -125, lonMax: -66.5 };
export const EUROPE_BBOX = { latMin: 35, latMax: 71, lonMin: -10, lonMax: 40 };

/**
 * Region definitions consumed by the router. `weights` maps model id -> blend
 * weight; models present with weight 0 are displayed but excluded from consensus.
 * `note` (optional, per model) explains an exclusion to the user.
 */
export const REGIONS = {
  india: {
    key: 'india',
    flag: '🇮🇳',
    name: 'India',
    tagline: 'Monsoon-tuned blend',
    summary: '60% ECMWF · 40% ICON — GFS down-weighted to cancel its monsoon wet/hot bias.',
    weights: { ecmwf_ifs025: 0.6, icon_seamless: 0.4, gfs_seamless: 0.0 },
    notes: { gfs_seamless: 'Down-weighted · monsoon wet/hot bias' },
    // Ensemble members for probabilistic rain (GFS excluded over India).
    ensemble: { ecmwf_ifs025: 0.6, icon_seamless: 0.4 },
  },
  northAmericaCONUS: {
    key: 'northAmericaCONUS',
    flag: '🇺🇸',
    name: 'North America (CONUS)',
    tagline: 'High-res NOAA blend',
    summary: '45% HRRR · 35% GFS · 20% ECMWF — convective-scale HRRR leads over CONUS.',
    weights: { gfs_hrrr: 0.45, gfs_seamless: 0.35, ecmwf_ifs025: 0.2, icon_seamless: 0.0 },
    notes: { icon_seamless: 'Reference only' },
    ensemble: { gfs_seamless: 0.5, ecmwf_ifs025: 0.5 },
  },
  northAmericaWide: {
    key: 'northAmericaWide',
    flag: '🇺🇸',
    name: 'North America',
    tagline: 'Standard NA blend',
    summary: '50% GFS · 30% ECMWF · 20% ICON — HRRR unavailable outside CONUS.',
    weights: { gfs_seamless: 0.5, ecmwf_ifs025: 0.3, icon_seamless: 0.2 },
    notes: { gfs_hrrr: 'Outside HRRR coverage' },
    ensemble: { gfs_seamless: 0.5, ecmwf_ifs025: 0.5 },
  },
  europe: {
    key: 'europe',
    flag: '🇪🇺',
    name: 'Europe',
    tagline: 'DWD ICON optimised blend',
    summary: '50% ECMWF · 35% ICON · 15% GFS — ICON weighted higher over its home domain.',
    weights: { ecmwf_ifs025: 0.5, icon_seamless: 0.35, gfs_seamless: 0.15 },
    notes: {},
    ensemble: { ecmwf_ifs025: 0.6, icon_seamless: 0.4 },
  },
  global: {
    key: 'global',
    flag: '🌍',
    name: 'Global',
    tagline: 'Standard baseline blend',
    summary: '70% ECMWF · 30% GFS — ICON shown for reference.',
    weights: { ecmwf_ifs025: 0.7, gfs_seamless: 0.3, icon_seamless: 0.0 },
    notes: { icon_seamless: 'Reference only' },
    ensemble: { ecmwf_ifs025: 0.7, gfs_seamless: 0.3 },
  },
};

// Default location used when geolocation is denied/unavailable (showcases India tuning).
export const DEFAULT_LOCATION = {
  name: 'New Delhi',
  admin1: 'Delhi',
  country: 'India',
  countryCode: 'IN',
  latitude: 28.6139,
  longitude: 77.209,
  timezone: 'Asia/Kolkata',
};
