/**
 * Migraine Risk Card
 * Home Assistant Custom Lovelace Card
 *
 * Works two ways:
 *   1. With the Migraine Risk custom integration (auto-detected)
 *   2. Standalone — point it at any weather entities and the card
 *      computes the risk score internally.
 *
 * All factor entities are optional. The card only shows what you configure.
 *
 * Installation: Copy to /config/www/migraine-risk-card.js
 * Add resource: /local/migraine-risk-card.js (JavaScript Module)
 *
 * © 2026 — MIT Licence
 */

const CARD_VERSION = '3.3.3';

/* ─── Calibration (personal threshold overrides) ─────────────────────
 * Priority: card config `thresholds:` → input_number helpers → defaults.
 * Helper IDs follow a shared contract with the sensor package:
 *   input_number.migraine_threshold_<name>        (scalar thresholds)
 *   input_number.migraine_threshold_<name>_<step> (ladder thresholds)
 * Arrays are point ladders: value ≥ arr[i] scores i+1 points
 * (AQI uses strict >, matching the 51–100 banding). */
const THRESHOLD_DEFAULTS = {
  pressure_6h: [4, 6, 8, 10],
  pressure_24h: [6, 10, 14],
  humidity_low: 30,
  humidity_high: 80,
  temp_hot: 30,
  temp_cold: 5,
  temp_change: [5, 8],
  wind: [35, 50],
  uv: [6, 8],
  aqi: [50, 100, 150],
};
const THRESHOLD_HELPER_PREFIX = 'input_number.migraine_threshold_';

function thresholdHelperIds() {
  const ids = [];
  for (const [name, def] of Object.entries(THRESHOLD_DEFAULTS)) {
    if (Array.isArray(def)) def.forEach((_, i) => ids.push(THRESHOLD_HELPER_PREFIX + name + '_' + (i + 1)));
    else ids.push(THRESHOLD_HELPER_PREFIX + name);
  }
  return ids;
}

function resolveThresholds(hass, config) {
  const cfg = (config && config.thresholds) || {};
  const helperVal = (id) => parseNum(hass && hass.states && hass.states[id] && hass.states[id].state);
  const out = {};
  for (const [name, def] of Object.entries(THRESHOLD_DEFAULTS)) {
    if (Array.isArray(def)) {
      out[name] = def.map((d, i) => {
        const c = Array.isArray(cfg[name]) ? parseNum(cfg[name][i]) : null;
        if (c != null) return c;
        const h = helperVal(THRESHOLD_HELPER_PREFIX + name + '_' + (i + 1));
        return h != null ? h : d;
      });
    } else {
      const c = parseNum(cfg[name]);
      if (c != null) { out[name] = c; continue; }
      const h = helperVal(THRESHOLD_HELPER_PREFIX + name);
      out[name] = h != null ? h : def;
    }
  }
  return out;
}

console.info(
  `%c🧠 Migraine Risk Card %cv${CARD_VERSION}`,
  'color: #ff6b6b; font-weight: bold; background: #1a1d23; padding: 4px 8px; border-radius: 4px;',
  'color: #888; background: #1a1d23; padding: 4px 8px; border-radius: 4px;'
);

/* ─── Factor Definitions ─────────────────────────────────────────── */

const FACTORS = {
  pressure_6h: {
    name: 'Pressure 6h',
    icon: 'mdi:gauge',
    unit: '',
    maxPts: 4,
    configKey: 'entity_pressure_6h',
    label: 'Pressure Change (6h)',
  },
  pressure_24h: {
    name: 'Pressure 24h',
    icon: 'mdi:hours-24',
    unit: '',
    maxPts: 3,
    configKey: 'entity_pressure_24h',
    label: 'Pressure Change (24h)',
  },
  humidity: {
    name: 'Humidity',
    icon: 'mdi:water-percent',
    unit: '%',
    maxPts: 2,
    configKey: 'entity_humidity',
    label: 'Humidity',
  },
  temperature: {
    name: 'Temperature',
    icon: 'mdi:thermometer',
    unit: '°',
    maxPts: 2,
    configKey: 'entity_temperature',
    label: 'Current Temperature',
  },
  temperature_change: {
    name: 'Temp Change',
    icon: 'mdi:thermometer-chevron-up',
    unit: '°',
    maxPts: 2,
    configKey: 'entity_temperature_change',
    label: 'Temperature Change (6h)',
  },
  wind: {
    name: 'Wind',
    icon: 'mdi:weather-windy',
    unit: 'km/h',
    maxPts: 2,
    configKey: 'entity_wind_speed',
    label: 'Wind Speed',
  },
  uv: {
    name: 'UV',
    icon: 'mdi:sun-wireless',
    unit: '',
    maxPts: 2,
    configKey: 'entity_uv_index',
    label: 'UV Index',
  },
  thunderstorm: {
    name: 'Storm',
    icon: 'mdi:weather-lightning',
    unit: '',
    maxPts: 2,
    configKey: 'entity_storm',
    label: 'Storm / Lightning',
  },
  air_quality: {
    name: 'AQI',
    icon: 'mdi:air-filter',
    unit: '',
    maxPts: 3,
    configKey: 'entity_air_quality',
    label: 'Air Quality (AQI)',
  },
};

const FACTOR_KEYS = Object.keys(FACTORS);

const STORM_DISPLAY = { '0': 'Clear', '1': 'Risk', '2': 'Storm' };

/* ─── Translations ───────────────────────────────────────────────── */

const I18N = {
  en: {
    factors_header: 'Contributing Factors',
    empty: 'Configure entity sensors in the card editor to get started.',
    no_data: 'NO DATA',
    no_forecast: 'Forecast unavailable',
    forecast_loading: 'Loading forecast…',
    forecast_title: "Tomorrow's Forecast",
    pts: 'pts',
    rain: 'Rain',
    level: { 'Low': 'Low', 'Moderate': 'Moderate', 'High': 'High', 'Very High': 'Very High' },
    storm: { '0': 'Clear', '1': 'Risk', '2': 'Storm' },
    factor: {
      pressure_6h:        { name: 'Pressure 6h',  label: 'Pressure Change (6h)' },
      pressure_24h:       { name: 'Pressure 24h', label: 'Pressure Change (24h)' },
      humidity:           { name: 'Humidity',     label: 'Humidity' },
      temperature:        { name: 'Temperature',  label: 'Current Temperature' },
      temperature_change: { name: 'Temp Change',  label: 'Temperature Change (6h)' },
      wind:               { name: 'Wind',         label: 'Wind Speed' },
      uv:                 { name: 'UV',           label: 'UV Index' },
      thunderstorm:       { name: 'Storm',        label: 'Storm / Lightning' },
      air_quality:        { name: 'AQI',          label: 'Air Quality (AQI)' },
    },
    editor: {
      integration: 'Integration (Optional)',
      integration_hint: 'Optional: pre-computed scores from the sensor package. Forecast Entity may also be a weather entity — the card will compute tomorrow itself.',
      risk_score: 'Risk Score Entity',
      risk_level: 'Risk Level Entity',
      forecast: 'Forecast Entity',
      weather: 'Weather Sensors',
      weather_hint: 'Sensors or a weather entity both work. From a weather entity the card reads attributes directly and computes pressure/temperature changes from history and storms from the forecast — no sensor package needed.',
      display: 'Display',
      display_hint: 'Internal scoring is always metric; only what you see on the card changes.',
      units: 'Display Units',
      metric: 'Metric (°C, km/h, hPa)',
      imperial: 'Imperial (°F, mph, inHg)',
      language: 'Language',
      lang_auto: 'Auto (Home Assistant)',
      max_score: 'Gauge maximum (integration mode)',
      max_score_hint: 'Leave empty for automatic.',
      title: 'Card title',
      theme: 'Theme',
      theme_auto: 'Auto (follow Home Assistant)',
      theme_dark: 'Dark',
      theme_light: 'Light',
      title_hint: 'Optional — useful when showing several locations.',
      calibration: 'Calibration — personal thresholds',
      calibration_hint: 'Migraine triggers are individual. Leave a field empty to use the input_number helper (if present) or the research default shown as the placeholder.',
      pts_step: 'pts',
      th: {
        pressure_6h: 'Pressure change 6h (hPa)',
        pressure_24h: 'Pressure change 24h (hPa)',
        humidity_low: 'Humidity — dry, 1 pt (%)',
        humidity_high: 'Humidity — humid, 2 pts (%)',
        temp_hot: 'Hot temperature, 2 pts (°C)',
        temp_cold: 'Cold temperature, 2 pts (°C)',
        temp_change: 'Temperature change 6h (°C)',
        wind: 'Wind speed (km/h)',
        uv: 'UV index',
        aqi: 'Air quality (AQI)',
      },
    },
  }
};

/* Built-in English acts as the guaranteed fallback; every other language
 * (and any English overrides) load from translations/<lang>.json shipped
 * alongside the card, so contributors can add a language with a PR that
 * touches no JavaScript. */
const AVAILABLE_LANGS = ['en', 'ru'];

const TRANSLATION_PATHS = [
  '/hacsfiles/migraine-risk-card/translations/',
  '/local/community/migraine-risk-card/translations/',
];

// lang → dictionary | 'loading' | 'failed'
const LOADED_TRANSLATIONS = {};

function translationBases(config) {
  const custom = config && config.translations_path;
  return custom ? [custom.replace(/\/?$/, '/')] : TRANSLATION_PATHS;
}

// Fetches a language file once; calls onLoad when it becomes available.
function loadTranslation(lang, config, onLoad) {
  if (!lang || LOADED_TRANSLATIONS[lang]) return;
  LOADED_TRANSLATIONS[lang] = 'loading';
  const bases = translationBases(config);
  const attempt = (i) => {
    if (i >= bases.length) {
      LOADED_TRANSLATIONS[lang] = 'failed';
      return;
    }
    fetch(bases[i] + lang + '.json', { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(dict => {
        LOADED_TRANSLATIONS[lang] = dict;
        if (onLoad) onLoad();
      })
      .catch(() => attempt(i + 1));
  };
  attempt(0);
}

function dictFor(lang) {
  const d = LOADED_TRANSLATIONS[lang];
  return (d && d !== 'loading' && d !== 'failed') ? d : null;
}

/* theme: 'auto' (default) follows Home Assistant's dark mode, falling back to
 * the OS preference; 'dark'/'light' pin the card regardless of the HA theme. */
function resolveTheme(hass, config) {
  const pref = (config && config.theme) || 'auto';
  if (pref === 'dark' || pref === 'light') return pref;
  const haDark = hass && hass.themes && hass.themes.darkMode;
  if (typeof haDark === 'boolean') return haDark ? 'dark' : 'light';
  const mq = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;
  return mq && mq.matches ? 'light' : 'dark';
}

function resolveLang(hass, config) {
  const forced = config?.language;
  if (forced && AVAILABLE_LANGS.includes(forced)) return forced;
  const haLang = (hass?.locale?.language || hass?.language || 'en').split('-')[0];
  return AVAILABLE_LANGS.includes(haLang) ? haLang : 'en';
}

function tr(lang, path, fallback) {
  const walk = (dict) => (dict == null ? null : path.split('.').reduce((cur, p) => (cur == null ? cur : cur[p]), dict));
  let v = walk(dictFor(lang));
  if (v == null) v = walk(I18N.en);        // built-in fallback
  return v != null ? v : (fallback != null ? fallback : path);
}

/* ─── Weather-entity support ─────────────────────────────────────── */

// Which weather-entity attribute feeds which factor.
// Pressure-change factors have no source attribute: a weather entity only
// exposes the instantaneous pressure, not its change over time.
const WEATHER_ATTR = {
  temperature: 'temperature',
  humidity: 'humidity',
  wind: 'wind_speed',
  uv: 'uv_index',
};

function windToKmh(v, unit) {
  if (v == null) return null;
  switch (String(unit || '').toLowerCase()) {
    case 'm/s': case 'm/с': case 'м/с': return v * 3.6;
    case 'mph': return v * 1.60934;
    case 'kn': case 'knots': return v * 1.852;
    default: return v; // km/h
  }
}

function tempToC(v, unit) {
  if (v == null) return null;
  return (unit === '°F' || unit === 'F') ? (v - 32) * 5 / 9 : v;
}

function pressureToHpa(v, unit) {
  if (v == null) return null;
  switch (String(unit || '').toLowerCase().replace(/\s/g, '')) {
    case 'mmhg': case 'ммрт.ст.': case 'ммртст': return v * 1.33322;
    case 'inhg': return v * 33.8639;
    case 'kpa': case 'кпа': return v * 10;
    case 'psi': return v * 68.9476;
    default: return v; // hPa / mbar
  }
}

/**
 * Extract a factor value from either a numeric sensor or a weather.* entity.
 * Returns { score, display, unit }:
 *   score   — metric-normalised number used by the scoring engine (or null)
 *   display — raw value in the source's own units (or null)
 *   unit    — unit string for display
 */
function extractFactorValue(entity, key, def) {
  if (!entity) return { score: null, display: null, unit: def?.unit || '' };
  const a = entity.attributes || {};

  if (!entity.entity_id.startsWith('weather.')) {
    const n = parseNum(entity.state);
    let score = n;
    if (key === 'wind' && n != null) score = windToKmh(n, a.unit_of_measurement);
    if (key === 'temperature' && n != null) score = tempToC(n, a.unit_of_measurement);
    if ((key === 'pressure_6h' || key === 'pressure_24h') && n != null) {
      score = pressureToHpa(n, a.unit_of_measurement);
    }
    return { score, display: n, unit: a.unit_of_measurement || def?.unit || '' };
  }

  // weather.* entity: read from attributes
  if (key === 'thunderstorm') {
    const cond = String(entity.state || '');
    const v = cond.startsWith('lightning') ? 2 : 0;
    return { score: v, display: v, unit: '' };
  }

  const attr = WEATHER_ATTR[key];
  if (!attr) return { score: null, display: null, unit: '' };
  const raw = parseNum(a[attr]);
  if (raw == null) return { score: null, display: null, unit: '' };

  switch (key) {
    case 'temperature':
      return { score: tempToC(raw, a.temperature_unit), display: raw, unit: a.temperature_unit || '°C' };
    case 'wind':
      return { score: windToKmh(raw, a.wind_speed_unit), display: raw, unit: a.wind_speed_unit ? ' ' + a.wind_speed_unit : ' km/h' };
    case 'humidity':
      return { score: raw, display: raw, unit: '%' };
    default:
      return { score: raw, display: raw, unit: def?.unit || '' };
  }
}

/* ─── Standalone mode: history & forecast computation ────────────── */

const THUNDER_CONDITIONS = ['lightning', 'lightning-rainy', 'thunderstorm', 'storm'];

// WeatherEntityFeature bits
const FEATURE_FORECAST_DAILY = 1;
const FEATURE_FORECAST_HOURLY = 2;

// A subscription for an unsupported forecast type can be accepted and then
// stay silent forever, so give up waiting after this long and try the other type.
const FORECAST_TIMEOUT_MS = 8000;
const FORECAST_RETRY_MS = 60000;   // a failed forecast is retried, not abandoned
const FORECAST_MAX_TRIES = 5;

function supportsForecast(entity, type) {
  const f = entity && entity.attributes && entity.attributes.supported_features;
  if (typeof f !== 'number') return true; // unknown → try anyway
  return type === 'daily' ? !!(f & FEATURE_FORECAST_DAILY) : !!(f & FEATURE_FORECAST_HOURLY);
}

// Drop from the highest value within the last `hours` (matches the sensor
// package semantics: pressure falling from a peak is the migraine trigger).
function computeDropFromPeak(points, hours, current, sampledAt) {
  const anchor = sampledAt || Date.now();
  const cutoff = anchor - hours * 3600e3;
  let peak = current;
  let seen = false;
  for (const p of points) {
    if (p.t >= cutoff) {
      seen = true;
      if (p.v > peak) peak = p.v;
    }
  }
  if (!seen) return null;
  return Math.max(0, peak - current);
}

// Signed change vs. the value closest to `hours` ago (±2h tolerance).
function computeChange(points, hours, current, sampledAt) {
  const target = (sampledAt || Date.now()) - hours * 3600e3;
  let best = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const d = Math.abs(p.t - target);
    if (d < bestDiff) { bestDiff = d; best = p; }
  }
  if (!best || bestDiff > 2 * 3600e3) return null;
  return current - best.v;
}

// 2 = thunderstorm within the next 3 hours, 1 = later today, 0 = none.
function thunderLevelFromHourly(forecast) {
  const now = Date.now();
  const todayStr = new Date().toDateString();
  let next3 = false;
  let today = false;
  for (const f of forecast || []) {
    if (!f || !f.datetime || !THUNDER_CONDITIONS.includes(f.condition)) continue;
    const t = new Date(f.datetime).getTime();
    if (isNaN(t)) continue;
    if (t >= now - 3600e3 && t <= now + 3 * 3600e3) next3 = true;
    if (new Date(f.datetime).toDateString() === todayStr) today = true;
  }
  return next3 ? 2 : today ? 1 : 0;
}

// Extract tomorrow's data from a daily forecast, or aggregate hourly entries.
function tomorrowFromForecast(forecast, isHourly) {
  const tomorrow = new Date(Date.now() + 24 * 3600e3).toDateString();
  const entries = (forecast || []).filter(f => {
    if (!f || !f.datetime) return false;
    const d = new Date(f.datetime);
    return !isNaN(d.getTime()) && d.toDateString() === tomorrow;
  });
  if (!entries.length) return null;
  if (!isHourly) {
    const e = entries[0];
    return {
      temp_max: parseNum(e.temperature),
      temp_min: parseNum(e.templow),
      uv: parseNum(e.uv_index),
      rain: parseNum(e.precipitation_probability),
      wind: parseNum(e.wind_speed),
      thunder: THUNDER_CONDITIONS.includes(e.condition),
      condition: e.condition || null,
    };
  }
  const nums = (k) => entries.map(e => parseNum(e[k])).filter(v => v != null);
  const temps = nums('temperature');
  const max = (a) => a.length ? Math.max(...a) : null;
  const min = (a) => a.length ? Math.min(...a) : null;
  // Condition at midday is the most representative for an aggregated day
  const midday = entries.reduce((best, e) =>
    Math.abs(new Date(e.datetime).getHours() - 13) <
    Math.abs(new Date(best.datetime).getHours() - 13) ? e : best, entries[0]);
  return {
    temp_max: max(temps),
    temp_min: min(temps),
    uv: max(nums('uv_index')),
    rain: max(nums('precipitation_probability')),
    wind: max(nums('wind_speed')),
    thunder: entries.some(e => THUNDER_CONDITIONS.includes(e.condition)),
    condition: midday.condition || null,
  };
}

// Mirror of the sensor package's tomorrow scoring.
function scoreTomorrow(d, windUnit, th) {
  const t = th || THRESHOLD_DEFAULTS;
  const hot = t.temp_hot, cold = t.temp_cold;
  let pts = 0;
  const { temp_max: tmax, temp_min: tmin, uv, rain } = d;
  if (tmax != null && tmin != null) {
    pts += (tmax > hot || tmin < cold) ? 2 : (tmax > hot - 2 || tmin < cold + 3) ? 1 : 0;
    const range = tmax - tmin;
    pts += range >= 15 ? 2 : range >= 10 ? 1 : 0;
  } else if (tmax != null) {
    pts += tmax > hot ? 2 : tmax > hot - 2 ? 1 : 0;
  }
  if (uv != null) pts += uv >= t.uv[1] ? 2 : uv >= t.uv[0] ? 1 : 0;
  if (d.wind != null) {
    const w = windToKmh(d.wind, windUnit);
    pts += w >= t.wind[1] ? 2 : w >= t.wind[0] ? 1 : 0;
  }
  if (d.thunder) pts += 2;
  if (rain != null && rain >= 80) pts += 1;
  return pts;
}

function tomorrowLevel(pts) {
  if (pts >= 8) return 'Very High';
  if (pts >= 5) return 'High';
  if (pts >= 3) return 'Moderate';
  return 'Low';
}

const RISK_COLOURS = {
  'Low':       '#4ade80',
  'Moderate':  '#facc15',
  'High':      '#f97316',
  'Very High': '#ef4444',
};

const WEATHER_ICONS = {
  'mostly_sunny': 'mdi:weather-partly-cloudy', 'sunny': 'mdi:weather-sunny', 'clear': 'mdi:weather-sunny',
  'partly_cloudy': 'mdi:weather-partly-cloudy', 'cloudy': 'mdi:weather-cloudy', 'mostly_cloudy': 'mdi:weather-cloudy',
  'rain': 'mdi:weather-pouring', 'heavy_rain': 'mdi:weather-pouring', 'drizzle': 'mdi:weather-rainy',
  'shower': 'mdi:weather-rainy', 'showers': 'mdi:weather-rainy',
  'storm': 'mdi:weather-lightning-rainy', 'thunderstorm': 'mdi:weather-lightning',
  'snow': 'mdi:weather-snowy', 'hail': 'mdi:weather-hail', 'fog': 'mdi:weather-fog', 'wind': 'mdi:weather-windy',
  // Home Assistant standard weather conditions
  'clear-night': 'mdi:weather-night', 'partlycloudy': 'mdi:weather-partly-cloudy',
  'rainy': 'mdi:weather-rainy', 'pouring': 'mdi:weather-pouring',
  'lightning': 'mdi:weather-lightning', 'lightning-rainy': 'mdi:weather-lightning-rainy',
  'snowy': 'mdi:weather-snowy', 'snowy-rainy': 'mdi:weather-snowy-rainy',
  'windy': 'mdi:weather-windy', 'windy-variant': 'mdi:weather-windy-variant',
  'exceptional': 'mdi:alert-circle-outline',
};

/* ─── Scoring Engine ─────────────────────────────────────────────── */

function computeFactorPoints(factorKey, rawValue, th) {
  if (rawValue == null || !FACTORS[factorKey]) return 0;
  const t = th || THRESHOLD_DEFAULTS;
  // value ≥ step[i] → i+1 points (gte); strict > variant for AQI banding
  const ladder = (val, steps, strict) => {
    let pts = 0;
    steps.forEach((min, i) => { if (strict ? val > min : val >= min) pts = i + 1; });
    return pts;
  };
  const v = rawValue;
  switch (factorKey) {
    case 'pressure_6h': return ladder(Math.abs(v), t.pressure_6h);
    case 'pressure_24h': return ladder(Math.abs(v), t.pressure_24h);
    case 'humidity': return v > t.humidity_high ? 2 : v < t.humidity_low ? 1 : 0;
    case 'temperature': return (v > t.temp_hot || v < t.temp_cold) ? 2 : 0;
    case 'temperature_change': return ladder(Math.abs(v), t.temp_change);
    case 'wind': return ladder(v, t.wind);
    case 'uv': return ladder(v, t.uv);
    case 'thunderstorm': return Math.min(Math.max(Math.round(parseFloat(v) || 0), 0), 2);
    case 'air_quality': return Math.min(ladder(v, t.aqi, true), FACTORS.air_quality.maxPts);
    default: return 0;
  }
}

function scoreToLevel(score) {
  if (score >= 12) return 'Very High';
  if (score >= 8) return 'High';
  if (score >= 4) return 'Moderate';
  return 'Low';
}

/* ─── Helpers ────────────────────────────────────────────────────── */

function pointColour(pts) {
  if (pts <= 0) return '#4ade80';
  if (pts === 1) return '#facc15';
  if (pts === 2) return '#f97316';
  return '#ef4444';
}

function riskColour(level) {
  return RISK_COLOURS[level] || '#4ade80';
}

/* On a white background the vivid palette is too pale for small text, so
 * text and icons switch to darker, WCAG-friendlier shades. Thick graphics
 * (the gauge arc, the tile's left border) keep the vivid colours. */
const RISK_COLOURS_ON_LIGHT = {
  'Low':       '#15803d',
  'Moderate':  '#a16207',
  'High':      '#c2410c',
  'Very High': '#b91c1c',
};
const POINT_COLOURS_ON_LIGHT = ['#15803d', '#a16207', '#c2410c', '#b91c1c'];

function pointTextColour(pts, theme) {
  if (theme !== 'light') return pointColour(pts);
  return POINT_COLOURS_ON_LIGHT[Math.min(Math.max(pts, 0), 3)];
}

function riskTextColour(level, theme) {
  if (theme !== 'light') return riskColour(level);
  return RISK_COLOURS_ON_LIGHT[level] || RISK_COLOURS_ON_LIGHT.Low;
}

function parseNum(val) {
  if (val == null || val === 'unavailable' || val === 'unknown') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function fmtNum(n) {
  if (n == null) return '?';
  return n % 1 === 0 ? String(n) : n.toFixed(1);
}

function convertToImperial(factorKey, metricValue) {
  switch (factorKey) {
    case 'pressure_6h':
    case 'pressure_24h':
      return { value: metricValue * 0.02953, unit: ' inHg' };
    case 'temperature':
      return { value: metricValue * 9 / 5 + 32, unit: '°F' };
    case 'temperature_change':
      return { value: metricValue * 9 / 5, unit: '°F' };
    case 'wind':
      return { value: metricValue / 1.60934, unit: ' mph' };
    default:
      return null;
  }
}

function ensureFonts() {
  if (document.querySelector('link[data-migraine-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.dataset.migraineFonts = '';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,500;9..40,700&family=Space+Mono:wght@400;700&display=swap';
  document.head.appendChild(link);
}

/* ─── Styles ─────────────────────────────────────────────────────── */

const CARD_STYLES = `
  :host {
    display: block;
    --risk-color: #4ade80;
    --forecast-color: #4ade80;

    /* Dark palette (default). The light variant below only overrides these. */
    --mrc-bg: #1a1d23;
    --mrc-tile: #22252c;
    --mrc-forecast-from: #1e2128;
    --mrc-forecast-to: #22252c;
    --mrc-track: #2a2d35;
    --mrc-text: #e0e0e0;
    --mrc-score: #fff;
    --mrc-dim: #666;
    --mrc-mute: #555;
    --mrc-faint: #444;
    --mrc-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
    --mrc-tile-shadow: none;
  }

  :host([data-theme="light"]) {
    --mrc-bg: #ffffff;
    --mrc-tile: #f4f6fa;
    --mrc-forecast-from: #f7f9fc;
    --mrc-forecast-to: #eef1f7;
    --mrc-track: #e3e7ee;
    --mrc-text: #1f2430;
    --mrc-score: #111827;
    --mrc-dim: #6b7280;
    --mrc-mute: #8b93a1;
    --mrc-faint: #a6adba;
    --mrc-shadow: 0 4px 20px rgba(17,24,39,0.10), 0 0 0 1px rgba(17,24,39,0.06);
    --mrc-tile-shadow: 0 1px 2px rgba(17,24,39,0.04);
  }

  .card {
    background: var(--mrc-bg);
    border-radius: 20px;
    padding: 28px 24px 20px;
    box-shadow: var(--mrc-shadow);
    position: relative;
    overflow: hidden;
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: var(--mrc-text);
  }

  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: var(--risk-color);
    opacity: 0.8;
  }

  /* ── Gauge ── */
  .gauge-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 8px;
  }

  .gauge-svg {
    width: 220px;
    height: 130px;
    overflow: visible;
  }

  .gauge-track {
    fill: none;
    stroke: var(--mrc-track);
    stroke-width: 14;
    stroke-linecap: round;
  }

  .gauge-fill {
    fill: none;
    stroke: var(--risk-color);
    stroke-width: 14;
    stroke-linecap: round;
    transition: stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1),
                stroke 0.6s ease;
    filter: drop-shadow(0 0 8px var(--risk-color));
  }

  .gauge-score {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 42px;
    font-weight: 700;
    fill: var(--mrc-score);
    text-anchor: middle;
    dominant-baseline: auto;
  }

  .gauge-max {
    font-family: 'DM Sans', sans-serif;
    font-size: 13px;
    fill: var(--mrc-mute);
    text-anchor: middle;
  }

  .risk-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--risk-text, var(--risk-color));
    text-align: center;
    margin-top: 2px;
  }

  /* ── Factors ── */
  .card-title {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--mrc-text);
    text-align: center;
    margin-bottom: 4px;
  }
  .card-title:empty { display: none; }
  .factors-header {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 9px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: var(--mrc-faint);
    margin: 18px 0 10px;
  }

  .factors-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }

  .factor {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--mrc-tile);
    box-shadow: var(--mrc-tile-shadow);
    border-radius: 10px;
    border-left: 3px solid var(--f-color, #4ade80);
    opacity: 0;
    animation: fadeUp 0.5s ease both;
  }

  .factor:nth-child(1) { animation-delay: 0.30s; }
  .factor:nth-child(2) { animation-delay: 0.37s; }
  .factor:nth-child(3) { animation-delay: 0.44s; }
  .factor:nth-child(4) { animation-delay: 0.51s; }
  .factor:nth-child(5) { animation-delay: 0.58s; }
  .factor:nth-child(6) { animation-delay: 0.65s; }
  .factor:nth-child(7) { animation-delay: 0.72s; }
  .factor:nth-child(8) { animation-delay: 0.79s; }
  .factor:nth-child(9) { animation-delay: 0.86s; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0);    }
  }

  .factor-icon {
    flex-shrink: 0;
    --mdc-icon-size: 18px;
    color: var(--f-text, var(--f-color));
  }
  .factor-icon ha-icon {
    display: block;
    width: 18px;
    height: 18px;
  }

  .factor-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .factor-name {
    font-size: 9px;
    color: var(--mrc-dim);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .factor-value {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--f-text, var(--f-color));
  }

  /* ── Forecast ── */
  .forecast {
    margin-top: 14px;
    padding: 10px 14px;
    background: linear-gradient(135deg, var(--mrc-forecast-from), var(--mrc-forecast-to));
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255,255,255,0.04);
    opacity: 0;
    animation: fadeUp 0.5s ease 1s both;
  }

  .forecast-icon {
    flex-shrink: 0;
    --mdc-icon-size: 24px;
    color: var(--forecast-text, var(--forecast-color));
  }
  .forecast-icon ha-icon {
    display: block;
    width: 24px;
    height: 24px;
  }

  .forecast-details { flex: 1; min-width: 0; }

  .forecast-title {
    font-size: 10px;
    color: var(--mrc-mute);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .forecast-risk {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 13px;
    font-weight: 700;
    color: var(--forecast-text, var(--forecast-color));
  }

  .forecast-meta {
    font-size: 11px;
    color: var(--mrc-dim);
    margin-top: 1px;
  }

  .forecast-badge {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 18px;
    font-weight: 700;
    color: var(--forecast-text, var(--forecast-color));
    flex-shrink: 0;
  }

  /* ── Error / Empty ── */
  .error {
    padding: 16px;
    font-family: 'DM Sans', sans-serif;
    color: #ef4444;
    font-size: 13px;
    line-height: 1.5;
  }
  .error b { display: block; margin-bottom: 4px; }

  .empty-msg {
    text-align: center;
    padding: 20px;
    color: var(--mrc-mute);
    font-size: 12px;
  }
`;

/* ═══════════════════════════════════════════════════════════════════
   Card Element
   ═══════════════════════════════════════════════════════════════════ */

class MigraineRiskCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._built = false;
    this._prevHash = '';
    this._hist = {};   // history series cache: 'eid|mode' → {ts, points, fetching}
    this._fc = {};     // forecast store: 'eid|type' → {forecast, unsub, failed}
  }

  disconnectedCallback() {
    this._hist = {};   // drop cached history so re-created cards don't accumulate
    for (const k of Object.keys(this._fc)) {
      const store = this._fc[k];
      if (store && store.timer) clearTimeout(store.timer);
      if (store && store.retry) clearTimeout(store.retry);
      const u = store && store.unsub;
      if (u) { try { u(); } catch (e) { /* connection already closed */ } }
    }
    this._fc = {};
  }

  static async getConfigElement() {
    // ha-entity-picker is lazy-loaded by HA; force-load it so editor
    // fields are functional immediately (standard custom-card workaround).
    try {
      const helpers = window.loadCardHelpers ? await window.loadCardHelpers() : null;
      if (helpers) {
        const ents = await helpers.createCardElement({ type: 'entities', entities: [] });
        if (ents && ents.constructor && ents.constructor.getConfigElement) {
          await ents.constructor.getConfigElement();
        }
      }
    } catch (e) { /* pickers will upgrade lazily instead */ }
    return document.createElement('migraine-risk-card-editor');
  }

  static getStubConfig(hass) {
    const ids = Object.keys(hass.states);
    const find = (p) => ids.find(id => id.includes(p)) || '';
    const cfg = { type: 'custom:migraine-risk-card' };
    // Auto-detect integration entities
    const rs = find('migraine_risk_score');
    if (rs) cfg.entity_risk_score = rs;
    const rl = find('migraine_risk_level');
    if (rl) cfg.entity_risk_level = rl;
    const fc = find('migraine_risk_forecast');
    if (fc) cfg.entity_forecast = fc;
    // Factor entities
    const map = {
      entity_pressure_6h: 'pressure_drop_6h',
      entity_pressure_24h: 'pressure_drop_24h',
      entity_humidity: 'migraine_humidity',
      entity_temperature: 'migraine_temperature',
      entity_temperature_change: 'temperature_change',
      entity_wind_speed: 'migraine_wind',
      entity_uv_index: 'migraine_uv',
      entity_storm: 'thunderstorm',
      entity_air_quality: 'waqi_aqi',
    };
    for (const [key, pattern] of Object.entries(map)) {
      const e = find(pattern);
      if (e) cfg[key] = e;
    }
    return cfg;
  }

  setConfig(config) {
    // No required entities — card shows what's configured
    this._config = { ...config };
    if (this._hass) {
      this._lang = resolveLang(this._hass, this._config);
      loadTranslation(this._lang, this._config, () => { this._prevHash = ''; this._update(); });
      this._prevHash = '';
      this._built = false;
      this._update();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._lang = resolveLang(hass, this._config);
    loadTranslation(this._lang, this._config, () => { this._prevHash = ''; this._update(); });
    const hash = this._stateHash();
    if (hash !== this._prevHash) {
      this._prevHash = hash;
      this._update();
    }
  }

  getCardSize() { return 5; }

  /* ── Which factors are configured? ── */

  _activeFactors() {
    return FACTOR_KEYS.filter(k => {
      const eid = this._config[FACTORS[k].configKey];
      return eid && eid.length > 0;
    });
  }

  /* ── State hash ── */

  _stateHash() {
    const h = this._hass;
    if (!h || !this._config) return '';
    const c = this._config;
    let s = resolveTheme(h, c) + '|';
    if (c.entity_risk_score) {
      const e = h.states[c.entity_risk_score];
      s += (e?.state || '') + '|';
      // Integration attributes carry per-factor points
      if (e?.attributes) for (const k of FACTOR_KEYS) s += (e.attributes[k + '_points'] ?? '') + ',';
      s += '|';
    }
    if (c.entity_risk_level) s += (h.states[c.entity_risk_level]?.state || '') + '|';
    if (c.entity_forecast) {
      const e = h.states[c.entity_forecast];
      const a = e?.attributes || {};
      s += (e?.state || '') + ';' + (a.risk_level || '') + ';' + (a.temp_min ?? '') + ';' + (a.temp_max ?? '') + ';' + (a.uv_index ?? '') + ';' + (a.rain_chance ?? '') + '|';
    }
    for (const tid of thresholdHelperIds()) {
      const e = h.states[tid];
      if (e) s += e.state + ';';
    }
    s += '|';
    for (const k of FACTOR_KEYS) {
      const eid = c[FACTORS[k].configKey];
      if (!eid) continue;
      const e = h.states[eid];
      s += (e?.state || '');
      // weather.* entities: the interesting data lives in attributes and the
      // state ("cloudy") often does not change when they do
      if (eid.startsWith('weather.') && e?.attributes) {
        const a = e.attributes;
        s += ';' + (a.temperature ?? '') + ';' + (a.humidity ?? '') + ';' + (a.wind_speed ?? '') + ';' + (a.uv_index ?? '');
      }
      s += '|';
    }
    return s;
  }

  /* ── Determine mode: integration vs standalone ── */

  _hasIntegration() {
    const c = this._config;
    return c.entity_risk_score && this._hass.states[c.entity_risk_score];
  }

  /* ── Build / Update ── */

  /* ─── Standalone data layer (no sensor package required) ──────── */

  // Extraction that can derive values the entity itself doesn't expose:
  // pressure/temperature changes from recorder history, thunderstorm from
  // the hourly forecast subscription.
  _extract(entity, key, def) {
    if (entity && (key === 'pressure_6h' || key === 'pressure_24h' || key === 'temperature_change')) {
      const mode = this._historyMode(entity, key);
      if (mode) {
        const unit = mode === 'pressure' ? 'hPa' : '°C';
        const hours = key === 'pressure_24h' ? 24 : 6;
        const current = this._currentMetric(entity, mode);
        if (current == null) return { score: null, display: null, unit: '' };
        const series = this._ensureHistory(entity.entity_id, mode);
        if (!series || !series.points) {
          // Distinguish a pending fetch from one that failed: a failed history
          // read must not leave the tile spinning on "…" until the cache expires
          const failed = series && series.failed;
          return { score: null, display: null, unit, pending: !failed, unavailable: !!failed };
        }
        // series.ts is when the history was sampled; anchoring the window to it
        // keeps the result stable between renders instead of drifting with the clock
        const val = mode === 'pressure'
          ? computeDropFromPeak(series.points, hours, current, series.ts)
          : computeChange(series.points, hours, current, series.ts);
        if (val == null) return { score: null, display: null, unit, pending: true };
        return { score: Math.abs(val), display: Math.round(val * 10) / 10, unit };
      }
    }
    if (entity && key === 'thunderstorm' && entity.entity_id.startsWith('weather.')) {
      const fc = this._ensureForecast(entity.entity_id, 'hourly');
      if (fc && fc.length) {
        const level = thunderLevelFromHourly(fc);
        return { score: level, display: level, unit: '' };
      }
      // No forecast (yet) — fall through to current-condition detection
    }
    return extractFactorValue(entity, key, def);
  }

  // Decides whether history-based computation applies to this entity/factor.
  _historyMode(entity, key) {
    const a = entity.attributes || {};
    const isWeather = entity.entity_id.startsWith('weather.');
    if (key === 'temperature_change') {
      if (isWeather) return a.temperature != null ? 'temperature' : null;
      // An absolute-temperature sensor (not a precomputed change)
      if (a.device_class === 'temperature') return 'temperature';
      return null;
    }
    // pressure_6h / pressure_24h
    if (isWeather) return a.pressure != null ? 'pressure' : null;
    // A sensor holding absolute pressure: no atmospheric *change* is >300 hPa
    const n = parseNum(entity.state);
    if (n != null && pressureToHpa(n, a.unit_of_measurement) > 300) return 'pressure';
    return null;
  }

  // Current metric-normalised value of the tracked quantity.
  _currentMetric(entity, mode) {
    const a = entity.attributes || {};
    if (entity.entity_id.startsWith('weather.')) {
      if (mode === 'pressure') return pressureToHpa(parseNum(a.pressure), a.pressure_unit);
      return tempToC(parseNum(a.temperature), a.temperature_unit);
    }
    const n = parseNum(entity.state);
    if (mode === 'pressure') return pressureToHpa(n, a.unit_of_measurement);
    return tempToC(n, a.unit_of_measurement);
  }

  // Fetches ~25h of recorder history for the entity, normalised to metric.
  // Cached for 15 minutes; triggers a re-render when data arrives.
  _ensureHistory(eid, mode) {
    const key = eid + '|' + mode;
    const cached = this._hist[key];
    const now = Date.now();
    if (cached && (cached.fetching || now - cached.ts < 15 * 60e3)) return cached;
    this._hist[key] = { ts: cached ? cached.ts : 0, points: cached ? cached.points : null, fetching: true };

    const start = new Date(now - 25 * 3600e3).toISOString();
    const end = new Date(now).toISOString();
    this._hass.callApi('GET',
      `history/period/${start}?end_time=${encodeURIComponent(end)}&filter_entity_id=${eid}`
    ).then(res => {
      const arr = (res && res[0]) || [];
      const points = [];
      for (const s of arr) {
        const t = new Date(s.last_changed || s.last_updated).getTime();
        if (isNaN(t)) continue;
        const at = s.attributes || {};
        let v;
        if (eid.startsWith('weather.')) {
          v = mode === 'pressure'
            ? pressureToHpa(parseNum(at.pressure), at.pressure_unit)
            : tempToC(parseNum(at.temperature), at.temperature_unit);
        } else {
          v = mode === 'pressure'
            ? pressureToHpa(parseNum(s.state), at.unit_of_measurement)
            : tempToC(parseNum(s.state), at.unit_of_measurement);
        }
        if (v != null) points.push({ t, v });
      }
      this._hist[key] = { ts: Date.now(), points, fetching: false };
      this._update();
    }).catch((err) => {
      // Keep stale points if we had them; retry after the cache window
      this._hist[key] = {
        ts: Date.now(),
        points: cached ? cached.points : null,
        fetching: false,
        failed: !(cached && cached.points),
      };
      console.warn(`[migraine-risk-card] history for ${eid} (${mode}) failed: ${err && (err.message || err)}`);
      // Re-render: without this the tile stays on "…" until some unrelated
      // entity changes and happens to alter the state hash.
      this._prevHash = '';
      this._update();
    });
    return this._hist[key];
  }

  // Live forecast via weather/subscribe_forecast (how the built-in weather
  // card works), with a one-shot weather.get_forecasts fallback.
  // Returns the current forecast array or null while pending.
  // Live forecast via weather/subscribe_forecast (how the built-in weather
  // card works). If the subscription fails or stays silent, fall back to a
  // one-shot execute_script call and keep retrying on a timer instead of
  // giving up after a single miss.
  // Returns the forecast array, or null while pending.
  _ensureForecast(eid, type) {
    const key = eid + '|' + type;
    const store = this._fc[key];
    if (store) return store.forecast;

    this._fc[key] = { forecast: null, tries: 0 };
    this._forecastAttempt(eid, type);
    return null;
  }

  _forecastAttempt(eid, type) {
    const key = eid + '|' + type;
    const store = this._fc[key];
    if (!store) return;
    store.tries = (store.tries || 0) + 1;

    // Watchdog: a silent subscription must not leave the card waiting forever
    store.timer = setTimeout(() => {
      const s = this._fc[key];
      if (!s || s.forecast != null) return;
      if (!s.fetched) {
        // Subscription is silent and no one-shot went out yet — ask directly
        this._forecastFetch(eid, type);
      } else {
        this._forecastFailed(eid, type, 'no data within ' + (FORECAST_TIMEOUT_MS / 1000) + 's');
      }
    }, FORECAST_TIMEOUT_MS);

    const conn = this._hass && this._hass.connection;
    if (conn && conn.subscribeMessage) {
      conn.subscribeMessage(
        (ev) => this._forecastReceived(eid, type, ev && ev.forecast),
        { type: 'weather/subscribe_forecast', entity_id: eid, forecast_type: type }
      ).then(unsub => {
        // The card may have been detached (or retried) while we awaited
        if (!this._fc[key]) { try { unsub(); } catch (e) { /* already closed */ } return; }
        this._fc[key].unsub = unsub;
      }).catch(err => {
        this._forecastLog(eid, type, 'subscribe_forecast failed', err);
        this._forecastFetch(eid, type);
      });
      // Subscribing only guarantees *future* pushes: the first one arrives when
      // the integration next refreshes, which can be half an hour away. Ask for
      // the current forecast right now so the card fills in immediately.
      this._forecastFetch(eid, type, true);
    } else {
      this._forecastFetch(eid, type);
    }
  }

  // Fallback: execute_script is the supported way for the frontend to call a
  // service and read its response (a raw call_service with return_response is
  // rejected by the server).
  // One-shot read of the current forecast. `opportunistic` means a live
  // subscription is also in flight, so a failure here is not fatal — it just
  // means we keep waiting for the subscription's first push.
  _forecastFetch(eid, type, opportunistic) {
    const key = eid + '|' + type;
    const store = this._fc[key];
    if (!store || store.fetching) return;
    if (store.fetched && opportunistic) return;   // never fetch twice per attempt
    const conn = this._hass && this._hass.connection;
    if (!conn || !conn.sendMessagePromise) {
      if (!opportunistic) this._forecastFailed(eid, type, 'no websocket connection');
      return;
    }
    store.fetching = true;
    store.fetched = true;
    conn.sendMessagePromise({
      type: 'execute_script',
      sequence: [{
        service: 'weather.get_forecasts',
        data: { type },
        target: { entity_id: eid },
        response_variable: 'result',
      }, {
        stop: 'done',
        response_variable: 'result',
      }],
    }).then(res => {
      const s = this._fc[key];
      if (s) s.fetching = false;
      // execute_script wraps the service response; shapes differ across HA
      // versions, so accept the documented one and the plain variants.
      const resp = (res && (res.response || res.result)) || {};
      const holder = resp[eid] || (resp.result && resp.result[eid]) || resp;
      const fc = (holder && holder.forecast) || null;
      if (fc && fc.length) this._forecastReceived(eid, type, fc);
      else if (!opportunistic) {
        this._forecastFailed(eid, type, 'get_forecasts returned no ' + type + ' forecast');
      } else {
        this._forecastLog(eid, type, 'no immediate ' + type + ' forecast, waiting for a subscription push');
      }
    }).catch(err => {
      const s = this._fc[key];
      if (s) s.fetching = false;
      if (!opportunistic) this._forecastFailed(eid, type, 'get_forecasts failed', err);
      else this._forecastLog(eid, type, 'immediate get_forecasts failed, waiting for a subscription push', err);
    });
  }

  _forecastReceived(eid, type, forecast) {
    const key = eid + '|' + type;
    const store = this._fc[key];
    if (!store) return;                       // card detached mid-flight
    if (store.timer) { clearTimeout(store.timer); store.timer = null; }
    if (store.retry) { clearTimeout(store.retry); store.retry = null; }
    store.forecast = forecast || [];
    store.failed = false;
    this._prevHash = '';                      // forecast is not part of the hash
    this._update();
  }

  _forecastFailed(eid, type, reason, err) {
    const key = eid + '|' + type;
    const store = this._fc[key];
    if (!store) return;
    if (store.timer) { clearTimeout(store.timer); store.timer = null; }
    store.failed = true;
    store.reason = reason;
    this._forecastLog(eid, type, reason, err);

    // Retry rather than staying stuck until the page is reloaded
    if ((store.tries || 0) < FORECAST_MAX_TRIES && !store.retry) {
      store.retry = setTimeout(() => {
        const s = this._fc[key];
        if (!s) return;
        s.retry = null;
        s.fetched = false;
        s.fetching = false;
        if (s.unsub) { try { s.unsub(); } catch (e) { /* already closed */ } s.unsub = null; }
        this._forecastAttempt(eid, type);
      }, FORECAST_RETRY_MS);
    }
    this._prevHash = '';
    this._update();
  }

  _forecastLog(eid, type, reason, err) {
    console.warn(
      `[migraine-risk-card] ${type} forecast for ${eid}: ${reason}` +
      (err ? ` (${err.message || err.code || err})` : '')
    );
  }

  _build() {
    const sr = this.shadowRoot;
    sr.innerHTML = '';
    const style = document.createElement('style');
    style.textContent = CARD_STYLES;
    sr.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-title"></div>
      <div class="gauge-wrap">
        <svg class="gauge-svg" viewBox="0 0 200 110">
          <path class="gauge-track" d="M 20 100 A 80 80 0 0 1 180 100"/>
          <path class="gauge-fill"  d="M 20 100 A 80 80 0 0 1 180 100"
                stroke-dasharray="251.33" stroke-dashoffset="251.33"/>
          <text class="gauge-score" x="100" y="90"></text>
          <text class="gauge-max"   x="100" y="108"></text>
        </svg>
        <div class="risk-label"></div>
      </div>
      <div class="factors-header"></div>
      <div class="factors-grid"></div>
    `;
    sr.appendChild(card);

    this._els = {
      card,
      gaugeFill:  card.querySelector('.gauge-fill'),
      gaugeScore: card.querySelector('.gauge-score'),
      gaugeMax:   card.querySelector('.gauge-max'),
      riskLabel:  card.querySelector('.risk-label'),
      title:      card.querySelector('.card-title'),
      factorsHdr: card.querySelector('.factors-header'),
      factorGrid: card.querySelector('.factors-grid'),
    };
    this._built = true;
  }

  _update() {
    if (!this._hass || !this._config) return;
    ensureFonts();
    if (!this._built) this._build();
    this._refresh();
  }

  _refresh() {
    const h = this._hass;
    const c = this._config;
    const el = this._els;
    const active = this._activeFactors();
    if (el.title) el.title.textContent = c.title || '';
    const theme = resolveTheme(h, c);
    this.setAttribute('data-theme', theme);

    const lang = this._lang || resolveLang(h, c);
    this._lang = lang;

    // Nothing configured at all
    if (active.length === 0 && !c.entity_risk_score) {
      el.factorsHdr.style.display = 'none';
      el.factorGrid.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'empty-msg';
      msg.textContent = tr(lang, 'empty');
      el.factorGrid.appendChild(msg);
      el.gaugeScore.textContent = '—';
      el.gaugeMax.textContent = '';
      el.riskLabel.textContent = tr(lang, 'no_data');
      el.card.style.setProperty('--risk-color', theme === 'light' ? '#9aa3b2' : '#555');
      el.card.style.setProperty('--risk-text', theme === 'light' ? '#6b7280' : '#555');
      el.gaugeFill.setAttribute('stroke-dashoffset', '251.33');
      return;
    }
    el.factorsHdr.style.display = '';
    el.factorsHdr.textContent = tr(lang, 'factors_header');

    // Compute per-factor points and total score
    let totalScore = 0;
    let maxScore = 0;
    const factorData = []; // { key, pts, value, entity }

    const useIntegration = this._hasIntegration();
    const riskScoreState = useIntegration ? h.states[c.entity_risk_score] : null;

    const th = resolveThresholds(h, c);
    for (const key of active) {
      const def = FACTORS[key];
      const eid = c[def.configKey];
      const entity = h.states[eid];
      const extracted = this._extract(entity, key, def);

      let pts;
      if (useIntegration && riskScoreState) {
        // Integration mode: read points from risk_score attributes
        pts = riskScoreState.attributes?.[key + '_points'] ?? computeFactorPoints(key, extracted.score, th);
      } else {
        // Standalone mode: compute from metric-normalised value
        pts = computeFactorPoints(key, extracted.score, th);
      }

      totalScore += pts;
      maxScore += def.maxPts;
      factorData.push({ key, pts, entity, def, extracted });
    }

    // If integration provides a pre-computed score, use that instead
    if (useIntegration && riskScoreState) {
      totalScore = parseNum(riskScoreState.state) ?? totalScore;
    }

    // Determine max_score — integration may have factors we don't show
    if (useIntegration && riskScoreState) {
      // Use configured max or sum of all possible factor maxPts
      maxScore = c.max_score || FACTOR_KEYS.reduce((sum, k) => sum + FACTORS[k].maxPts, 0);
    } else {
      maxScore = maxScore || 1; // Avoid division by zero
    }

    // Risk level
    let level;
    if (c.entity_risk_level && h.states[c.entity_risk_level]) {
      level = h.states[c.entity_risk_level].state;
    } else {
      level = scoreToLevel(totalScore);
    }

    const colour = riskColour(level);
    el.card.style.setProperty('--risk-color', colour);
    el.card.style.setProperty('--risk-text', riskTextColour(level, theme));

    // Gauge
    const pct = Math.min(totalScore / maxScore, 1);
    el.gaugeFill.setAttribute('stroke-dashoffset', 251.33 * (1 - pct));
    el.gaugeScore.textContent = Math.round(totalScore);
    el.gaugeMax.textContent = '/' + maxScore;
    el.riskLabel.textContent = String(tr(lang, 'level.' + level, level)).toUpperCase();

    // Factor grid
    this._refreshFactors(factorData);

    // Forecast
    this._refreshForecast(el.card);
  }

  _refreshFactors(factorData) {
    const grid = this._els.factorGrid;

    const newKeys = factorData.map(f => f.key).join(',');
    if (grid.dataset.keys !== newKeys) {
      grid.innerHTML = '';
      grid.dataset.keys = newKeys;
      factorData.forEach(() => {
        const tile = document.createElement('div');
        tile.className = 'factor';
        tile.innerHTML = `
          <div class="factor-icon"></div>
          <div class="factor-info">
            <div class="factor-name"></div>
            <div class="factor-value"></div>
          </div>`;
        grid.appendChild(tile);
      });
    }

    const tileTheme = resolveTheme(this._hass, this._config);
    factorData.forEach(({ key, pts, entity, def }, i) => {
      const tile = grid.children[i];
      const colour = pointColour(pts);
      tile.style.setProperty('--f-color', colour);
      tile.style.setProperty('--f-text', pointTextColour(pts, tileTheme));

      const iconEl = tile.querySelector('.factor-icon');
      if (!iconEl.querySelector('ha-icon')) {
        iconEl.innerHTML = '';
        const haIcon = document.createElement('ha-icon');
        haIcon.setAttribute('icon', def.icon);
        iconEl.appendChild(haIcon);
      } else {
        iconEl.querySelector('ha-icon').setAttribute('icon', def.icon);
      }

      tile.querySelector('.factor-name').textContent = tr(this._lang, 'factor.' + key + '.name', def.name);
      tile.querySelector('.factor-value').textContent = this._fmtFactor(entity, key, def, factorData[i].extracted);
    });
  }

  _fmtFactor(entity, key, def, extracted) {
    if (!entity) return '?';
    const st = entity.state;
    if (st === 'unavailable' || st === 'unknown') return '—';

    const ex = extracted || extractFactorValue(entity, key, def);

    if (ex.pending) return '…';
    if (ex.unavailable) return '—';

    if (key === 'thunderstorm') {
      const code = String(ex.score ?? st);
      return tr(this._lang, 'storm.' + code, STORM_DISPLAY[code] || code);
    }

    if (ex.score == null && ex.display == null) {
      // Non-numeric sensor state (or weather entity lacking the attribute)
      return entity.entity_id.startsWith('weather.') ? '—' : st;
    }

    const imperial = this._config.displayUnits === 'imperial';
    if (imperial && ex.score != null) {
      const conv = convertToImperial(key, ex.score); // score is metric-normalised
      if (conv) return fmtNum(conv.value) + conv.unit;
    }
    let unit = ex.unit || '';
    // "0AQI" → "0 AQI": letter-starting units get a separating space
    if (unit && !unit.startsWith(' ') && /^[a-zа-яё]/i.test(unit)) unit = ' ' + unit;
    return fmtNum(ex.display ?? ex.score) + unit;
  }

  _refreshForecast(card) {
    const fid = this._config.entity_forecast;
    if (!fid) {
      const existing = card.querySelector('.forecast');
      if (existing) existing.remove();
      return;
    }
    const entity = this._hass.states[fid];
    if (!entity) return;

    let bar = card.querySelector('.forecast');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'forecast';
      bar.innerHTML = `
        <div class="forecast-icon"></div>
        <div class="forecast-details">
          <div class="forecast-title"></div>
          <div class="forecast-risk"></div>
          <div class="forecast-meta"></div>
        </div>
        <div class="forecast-badge"></div>`;
      card.appendChild(bar);
    }
    bar.querySelector('.forecast-title').textContent = tr(this._lang, 'forecast_title');

    // Standalone mode: entity_forecast is a weather entity — compute
    // tomorrow's risk in-card from its forecast.
    if (fid.startsWith('weather.')) {
      this._refreshForecastFromWeather(bar, entity);
      return;
    }

    const attrs = entity.attributes || {};
    const fScore = parseNum(entity.state) ?? 0;
    const fLevel = attrs.risk_level || 'Low';
    const fColour = riskColour(fLevel);
    card.style.setProperty('--forecast-color', fColour);
    card.style.setProperty('--forecast-text', riskTextColour(fLevel, resolveTheme(this._hass, this._config)));

    const fIconEl = bar.querySelector('.forecast-icon');
    const RISK_ICONS = {
      'Low': 'mdi:weather-sunny',
      'Moderate': 'mdi:weather-partly-cloudy',
      'High': 'mdi:weather-cloudy',
      'Very High': 'mdi:weather-lightning',
    };
    const fIconName = WEATHER_ICONS[attrs.icon_descriptor]
      || WEATHER_ICONS[attrs.condition]
      || RISK_ICONS[fLevel]
      || 'mdi:weather-partly-cloudy';
    if (!fIconEl.querySelector('ha-icon')) {
      fIconEl.innerHTML = '';
      const hi = document.createElement('ha-icon');
      hi.setAttribute('icon', fIconName);
      fIconEl.appendChild(hi);
    } else {
      fIconEl.querySelector('ha-icon').setAttribute('icon', fIconName);
    }

    const fLevelText = tr(this._lang, 'level.' + fLevel, fLevel);
    bar.querySelector('.forecast-risk').textContent =
      `${fLevelText} (${Math.round(fScore)} ${tr(this._lang, 'pts')})`;
    const metaVal = (v) => {
      if (v == null) return '—';
      const s = String(v).trim();
      return (s === '' || s === 'N/A' || s === 'unknown' || s === 'unavailable' || s === 'None') ? '—' : s;
    };
    bar.querySelector('.forecast-meta').textContent =
      `${metaVal(attrs.temp_min)}–${metaVal(attrs.temp_max)} · UV ${metaVal(attrs.uv_index)} · ${tr(this._lang, 'rain')} ${metaVal(attrs.rain_chance)}`;
    bar.querySelector('.forecast-badge').textContent = Math.round(fScore);
  }

  // Tomorrow's risk computed in-card from a weather entity's forecast.
  _refreshForecastFromWeather(bar, entity) {
    const eid = entity.entity_id;
    let data = null;
    let daily = null;

    // Only ask for daily if the entity advertises it — subscribing to an
    // unsupported type can hang silently (hourly-only providers, e.g. Yandex).
    const canDaily = supportsForecast(entity, 'daily');
    const canHourly = supportsForecast(entity, 'hourly');

    if (canDaily) {
      daily = this._ensureForecast(eid, 'daily');
      if (daily && daily.length) data = tomorrowFromForecast(daily, false);
    }

    const dailyStore = this._fc[eid + '|daily'];
    const dailyUnusable = !canDaily
      || (dailyStore && dailyStore.failed)          // request failed or timed out
      || (daily && daily.length === 0)              // answered with nothing
      || (daily && !data);                          // answered, but no entry for tomorrow

    if (!data && dailyUnusable && canHourly) {
      // Aggregate tomorrow out of the hourly forecast instead
      const hourly = this._ensureForecast(eid, 'hourly');
      if (hourly && hourly.length) data = tomorrowFromForecast(hourly, true);
    }

    if (!data) {
      const hourlyStore = this._fc[eid + '|hourly'];
      const stillWaiting = (canDaily && !dailyStore?.failed && daily == null)
        || (canHourly && hourlyStore && !hourlyStore.failed && hourlyStore.forecast == null);
      // Distinguish "loading" from "this entity has no usable forecast",
      // and surface the reason so the failure is diagnosable from the card
      const reason = (dailyStore && dailyStore.reason) || (hourlyStore && hourlyStore.reason) || '';
      bar.querySelector('.forecast-risk').textContent = stillWaiting
        ? tr(this._lang, 'forecast_loading')
        : tr(this._lang, 'no_forecast');
      bar.querySelector('.forecast-meta').textContent = stillWaiting ? '—' : (reason || '—');
      bar.querySelector('.forecast-badge').textContent = '';
      return;
    }

    const a = entity.attributes || {};
    const pts = scoreTomorrow(data, a.wind_speed_unit, resolveThresholds(this._hass, this._config));
    const level = tomorrowLevel(pts);
    const colour = riskColour(level);
    const fCard = bar.closest('.card');
    fCard.style.setProperty('--forecast-color', colour);
    fCard.style.setProperty('--forecast-text', riskTextColour(level, resolveTheme(this._hass, this._config)));

    const iconName = WEATHER_ICONS[data.condition] || 'mdi:weather-partly-cloudy';
    const fIconEl = bar.querySelector('.forecast-icon');
    if (!fIconEl.querySelector('ha-icon')) {
      fIconEl.innerHTML = '';
      const hi = document.createElement('ha-icon');
      hi.setAttribute('icon', iconName);
      fIconEl.appendChild(hi);
    } else {
      fIconEl.querySelector('ha-icon').setAttribute('icon', iconName);
    }

    const levelText = tr(this._lang, 'level.' + level, level);
    bar.querySelector('.forecast-risk').textContent =
      `${levelText} (${pts} ${tr(this._lang, 'pts')})`;

    const tUnit = a.temperature_unit || '°C';
    const num = (v, suffix) => v == null ? '—' : fmtNum(Math.round(v * 10) / 10) + (suffix || '');
    bar.querySelector('.forecast-meta').textContent =
      `${num(data.temp_min)}–${num(data.temp_max, tUnit)} · UV ${num(data.uv)} · ${tr(this._lang, 'rain')} ${num(data.rain, '%')}`;
    bar.querySelector('.forecast-badge').textContent = pts;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   Config Editor — Platinum Weather Card style
   ═══════════════════════════════════════════════════════════════════ */

class MigraineRiskCardEditor extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._rendered = false;
  }

  set hass(hass) {
    const firstHass = !this._hass;
    this._hass = hass;
    if (this._rendered) {
      if (firstHass) {
        // Language comes from hass — re-render once it is known
        this._render();
      } else {
        this.shadowRoot.querySelectorAll('ha-entity-picker').forEach(p => {
          p.hass = hass;
        });
      }
    }
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  _t(path, fallback) {
    const lang = resolveLang(this._hass, this._config);
    loadTranslation(lang, this._config, () => { if (this._rendered) this._render(); });
    return tr(lang, path, fallback);
  }

  _render() {
    const sr = this.shadowRoot;
    sr.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; padding: 8px; }
      .section {
        margin-bottom: 16px;
        padding: 12px;
        background: var(--card-background-color, rgba(0,0,0,0.05));
        border-radius: 12px;
      }
      .section-title {
        font-weight: 700;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1px;
        color: var(--primary-text-color);
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .section-title ha-icon {
        --mdc-icon-size: 18px;
        color: var(--secondary-text-color);
      }
      .field {
        margin-bottom: 8px;
      }
      .field-label {
        font-size: 12px;
        font-weight: 500;
        color: var(--secondary-text-color);
        margin-bottom: 2px;
      }
      ha-entity-picker {
        display: block;
        width: 100%;
      }
      details.section > summary {
        cursor: pointer;
        list-style: none;
        user-select: none;
      }
      details.section > summary::-webkit-details-marker { display: none; }
      details.section > summary::after {
        content: '▸';
        margin-left: 6px;
        opacity: 0.6;
        font-size: 12px;
      }
      details.section[open] > summary::after { content: '▾'; }
      .th-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .th-step {
        flex: 1 1 70px;
        min-width: 70px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .th-cap {
        font-size: 11px;
        opacity: 0.65;
        text-transform: uppercase;
        letter-spacing: 0.4px;
      }
      .native-select, .native-input {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: 10px 12px;
        font: inherit;
        color: var(--primary-text-color);
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border: 1px solid var(--divider-color, rgba(127,127,127,0.4));
        border-radius: 8px;
        outline: none;
      }
      .native-select:focus, .native-input:focus {
        border-color: var(--primary-color, #03a9f4);
      }
      .native-select option {
        color: var(--primary-text-color);
        background: var(--card-background-color, #fff);
      }
      .hint {
        font-size: 11px;
        color: var(--secondary-text-color);
        font-style: italic;
        margin-top: 4px;
        opacity: 0.7;
      }
    `;
    sr.appendChild(style);

    const container = document.createElement('div');

    // ── Section: Integration (optional) ──
    container.appendChild(this._section(
      'mdi:connection', this._t('editor.integration'),
      this._t('editor.integration_hint'),
      [
        { key: 'entity_risk_score', label: this._t('editor.risk_score'), domains: ['sensor'] },
        { key: 'entity_risk_level', label: this._t('editor.risk_level'), domains: ['sensor'] },
        { key: 'entity_forecast',   label: this._t('editor.forecast'), domains: ['sensor', 'weather'] },
      ]
    ));

    // ── Section: Weather Sensors ──
    const factorDomains = ['sensor', 'weather', 'number', 'input_number'];
    const weatherFields = FACTOR_KEYS.map(k => ({
      key: FACTORS[k].configKey,
      label: this._t('factor.' + k + '.label', FACTORS[k].label),
      domains: factorDomains,
    }));
    container.appendChild(this._section(
      'mdi:weather-partly-cloudy', this._t('editor.weather'),
      this._t('editor.weather_hint'),
      weatherFields
    ));

    // ── Section: Display ──
    container.appendChild(this._displaySection());
    container.appendChild(this._calibrationSection());

    sr.appendChild(container);
    this._rendered = true;

    // Set hass on all pickers
    if (this._hass) {
      sr.querySelectorAll('ha-entity-picker').forEach(p => {
        p.hass = this._hass;
      });
    }
  }

  _displaySection() {
    const section = document.createElement('div');
    section.className = 'section';

    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', 'mdi:tune');
    titleEl.appendChild(icon);
    titleEl.appendChild(document.createTextNode(' ' + this._t('editor.display')));
    section.appendChild(titleEl);

    const hintEl = document.createElement('div');
    hintEl.className = 'hint';
    hintEl.textContent = this._t('editor.display_hint');
    hintEl.style.marginBottom = '12px';
    section.appendChild(hintEl);

    // Card title (optional)
    const titleField = document.createElement('div');
    titleField.className = 'field';
    const titleLbl = document.createElement('div');
    titleLbl.className = 'field-label';
    titleLbl.textContent = this._t('editor.title');
    titleField.appendChild(titleLbl);
    const titleInput = document.createElement('input');
    titleInput.className = 'native-input';
    titleInput.setAttribute('type', 'text');
    titleInput.placeholder = this._t('editor.title_hint');
    titleInput.value = this._config.title || '';
    titleInput.addEventListener('change', (e) => {
      const v = (e.target.value || '').trim();
      if (v) this._config.title = v; else delete this._config.title;
      this._fire();
    });
    titleField.appendChild(titleInput);
    section.appendChild(titleField);

    // Units select
    section.appendChild(this._selectField(
      this._t('editor.units'),
      [
        { value: 'metric',   text: this._t('editor.metric') },
        { value: 'imperial', text: this._t('editor.imperial') },
      ],
      this._config.displayUnits || 'metric',
      (val) => {
        if (val === 'metric') delete this._config.displayUnits;
        else this._config.displayUnits = val;
      }
    ));

    // Theme select
    section.appendChild(this._selectField(
      this._t('editor.theme'),
      [
        { value: 'auto',  text: this._t('editor.theme_auto') },
        { value: 'dark',  text: this._t('editor.theme_dark') },
        { value: 'light', text: this._t('editor.theme_light') },
      ],
      this._config.theme || 'auto',
      (val) => {
        if (val === 'auto') delete this._config.theme;
        else this._config.theme = val;
      }
    ));

    // Language select
    const langOptions = [{ value: 'auto', text: this._t('editor.lang_auto') }]
      .concat(AVAILABLE_LANGS.map(code => ({ value: code, text: code.toUpperCase() })));
    section.appendChild(this._selectField(
      this._t('editor.language'),
      langOptions,
      this._config.language || 'auto',
      (val) => {
        if (val === 'auto') delete this._config.language;
        else this._config.language = val;
        // Editor labels change with language too
        this._render();
      }
    ));

    // Max score override (integration mode)
    const msField = document.createElement('div');
    msField.className = 'field';
    const msLbl = document.createElement('div');
    msLbl.className = 'field-label';
    msLbl.textContent = this._t('editor.max_score');
    msField.appendChild(msLbl);
    const msInput = document.createElement('input');
    msInput.className = 'native-input';
    msInput.setAttribute('type', 'number');
    msInput.setAttribute('min', '1');
    msInput.placeholder = this._t('editor.max_score_hint');
    msInput.value = this._config.max_score != null ? String(this._config.max_score) : '';
    msInput.addEventListener('change', (e) => {
      const n = parseInt(e.target?.value, 10);
      if (!isNaN(n) && n > 0) this._config.max_score = n;
      else delete this._config.max_score;
      this._fire();
    });
    msField.appendChild(msInput);
    section.appendChild(msField);

    return section;
  }

  // Collapsible calibration panel. Empty field → helper → default.
  _calibrationSection() {
    const details = document.createElement('details');
    details.className = 'section';

    const summary = document.createElement('summary');
    summary.className = 'section-title';
    const icon = document.createElement('ha-icon');
    icon.setAttribute('icon', 'mdi:tune-variant');
    summary.appendChild(icon);
    summary.appendChild(document.createTextNode(' ' + this._t('editor.calibration')));
    details.appendChild(summary);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = this._t('editor.calibration_hint');
    hint.style.marginBottom = '12px';
    details.appendChild(hint);

    const cfg = this._config.thresholds || {};
    // Effective value if this field were left empty (helper, else default)
    const effective = (name, idx) => {
      const hid = THRESHOLD_HELPER_PREFIX + name + (idx != null ? '_' + (idx + 1) : '');
      const hv = parseNum(this._hass && this._hass.states && this._hass.states[hid] && this._hass.states[hid].state);
      if (hv != null) return hv;
      const d = THRESHOLD_DEFAULTS[name];
      return idx != null ? d[idx] : d;
    };

    const write = (name, idx, raw) => {
      const t = Object.assign({}, this._config.thresholds || {});
      const n = parseNum(raw);
      if (Array.isArray(THRESHOLD_DEFAULTS[name])) {
        const arr = Array.isArray(t[name]) ? t[name].slice() : new Array(THRESHOLD_DEFAULTS[name].length).fill(null);
        arr[idx] = (n != null ? n : null);
        // Drop the key entirely if every step was cleared
        if (arr.every(v => v == null)) delete t[name]; else t[name] = arr;
      } else {
        if (n != null) t[name] = n; else delete t[name];
      }
      if (Object.keys(t).length) this._config.thresholds = t;
      else delete this._config.thresholds;
      this._fire();
    };

    for (const [name, def] of Object.entries(THRESHOLD_DEFAULTS)) {
      const field = document.createElement('div');
      field.className = 'field';
      const lbl = document.createElement('div');
      lbl.className = 'field-label';
      lbl.textContent = this._t('editor.th.' + name, name);
      field.appendChild(lbl);

      const row = document.createElement('div');
      row.className = 'th-row';
      const steps = Array.isArray(def) ? def.length : 1;
      for (let i = 0; i < steps; i++) {
        const idx = Array.isArray(def) ? i : null;
        const wrap = document.createElement('label');
        wrap.className = 'th-step';
        if (Array.isArray(def)) {
          const cap = document.createElement('span');
          cap.className = 'th-cap';
          cap.textContent = (i + 1) + ' ' + this._t('editor.pts_step');
          wrap.appendChild(cap);
        }
        const inp = document.createElement('input');
        inp.className = 'native-input';
        inp.setAttribute('type', 'number');
        inp.setAttribute('step', 'any');
        inp.placeholder = String(effective(name, idx));
        const cur = Array.isArray(def) ? (Array.isArray(cfg[name]) ? cfg[name][i] : null) : cfg[name];
        inp.value = (cur == null || cur === '') ? '' : String(cur);
        inp.addEventListener('change', (e) => write(name, idx, e.target.value));
        wrap.appendChild(inp);
        row.appendChild(wrap);
      }
      field.appendChild(row);
      details.appendChild(field);
    }
    return details;
  }

  _selectField(label, options, current, apply) {
    const field = document.createElement('div');
    field.className = 'field';
    const lbl = document.createElement('div');
    lbl.className = 'field-label';
    lbl.textContent = label;
    field.appendChild(lbl);

    // Native <select>: immune to HA's lazy component loading, always
    // closes on click and fires a reliable change event.
    const select = document.createElement('select');
    select.className = 'native-select';
    for (const { value, text } of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = text;
      if (value === current) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === current) return;
      current = val;
      apply(val);
      this._fire();
    });
    field.appendChild(select);
    return field;
  }

  // Custom elements may be defined after we create them; properties set on
  // a not-yet-upgraded element shadow the class accessors and are silently
  // ignored. This assigns now AND re-assigns correctly after upgrade.
  _assignProps(el, props) {
    const assign = () => {
      for (const [k, v] of Object.entries(props)) {
        if (v !== undefined) el[k] = v;
      }
    };
    if (!customElements.get(el.localName)) {
      customElements.whenDefined(el.localName).then(() => {
        for (const k of Object.keys(props)) {
          if (Object.prototype.hasOwnProperty.call(el, k)) delete el[k];
        }
        assign();
      });
    }
    assign();
  }

  _section(icon, title, hint, fields) {
    const section = document.createElement('div');
    section.className = 'section';

    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.innerHTML = `<ha-icon icon="${icon}"></ha-icon> ${title}`;
    section.appendChild(titleEl);

    if (hint) {
      const hintEl = document.createElement('div');
      hintEl.className = 'hint';
      hintEl.textContent = hint;
      hintEl.style.marginBottom = '12px';
      section.appendChild(hintEl);
    }

    for (const { key, label, domains } of fields) {
      const field = document.createElement('div');
      field.className = 'field';

      const lbl = document.createElement('div');
      lbl.className = 'field-label';
      lbl.textContent = label;
      field.appendChild(lbl);

      const picker = document.createElement('ha-entity-picker');
      this._assignProps(picker, {
        hass: this._hass,
        allowCustomEntity: true,
        includeDomains: domains,
        value: this._config[key] || '',
        label,
      });
      picker.addEventListener('value-changed', (e) => {
        const val = e.detail?.value || '';
        if (val) {
          this._config[key] = val;
        } else {
          delete this._config[key];
        }
        this._fire();
      });
      field.appendChild(picker);

      section.appendChild(field);
    }

    return section;
  }

  _fire() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: { ...this._config } },
    }));
  }
}

/* ─── Register ───────────────────────────────────────────────────── */

customElements.define('migraine-risk-card', MigraineRiskCard);
customElements.define('migraine-risk-card-editor', MigraineRiskCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'migraine-risk-card',
  name: 'Migraine Risk Card',
  description: 'Science-backed migraine risk visualisation with real-time factor tracking and forecasting.',
  preview: false,
});
