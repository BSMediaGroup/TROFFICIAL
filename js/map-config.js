/* ============================================================
   MAPBOX CONFIG / CONSTANTS / GLOBAL HELPERS — v2
   This module contains ONLY:
   - Access token
   - Base constants
   - Utility functions (string escaping, haversine, rad↔deg, normalization, etc.)
   - Shared mappings (mode icons, currencies)
   NOTE:
   No UI or map style logic belongs here.
   No journey logic belongs here.
   ============================================================ */

/* ========================= ACCESS TOKEN ========================= */
mapboxgl.accessToken = "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* ========================= GLOBAL CONSTANTS ========================= */

const DEFAULT_CENTER = [245, 20];   // Australia visible
const DEFAULT_ZOOM   = 2.8;

let spinning        = true;
let userInterrupted = false;
let journeyMode     = false;
let currentID       = null;
let MAP_READY       = false;

/* Orbit globals used everywhere */
let orbitingId      = null;
let orbitAnim       = null;
let orbitEnterTimer = null;

/* Set of markers always visible regardless of zoom */
const ALWAYS_VISIBLE = new Set(["sydney", "toronto", "tomsriver"]);

/* Icons for travel modes */
const MODE_ICONS = {
  Plane: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  Car:   "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car1.svg"
};

/* Legend toggle icons */
const LEGEND_EXPAND_ICON =
  "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/expand.svg";
const LEGEND_COLLAPSE_ICON =
  "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/collapse.svg";

/* Orbit & camera config */
const ORBIT_ZOOM_TARGET    = 12.5;
const ORBIT_PITCH_TARGET   = 75;
const ORBIT_ROTATION_SPEED = 0.03;
const ORBIT_ENTRY_DURATION = 900;

const JOURNEY_PITCH_TARGET = 55;
const JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
const JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

/* ============================================
   UTILITY: SAFE STRING ESCAPE
   ============================================ */
function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ============================================
   UTILITY: NORMALIZE COORDINATE
   Keeps lon within [-180,180], clamps latitude
   ============================================ */
function normalizeCoord(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  lat = Math.max(-89.999999, Math.min(89.999999, lat));

  return [lon, lat];
}

/* ============================================
   UTILITY: DEG ↔ RAD
   ============================================ */
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

/* ============================================
   HAVERSINE DISTANCE (km)
   Identical to original implementation
   ============================================ */
function haversine(a, b) {
  const R = 6371;
  const toR = d => d * Math.PI / 180;

  const dLat = toR(b[1] - a[1]);
  const dLon = toR(b[0] - a[0]);
  const lat1 = toR(a[1]);
  const lat2 = toR(b[1]);

  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ============================================
   CURRENCY MAP
   Identical to original behaviour
   ============================================ */
function getCurrencyInfo(countryCode) {
  const map = {
    "AU": { code: "AUD", name: "Australian Dollar",      symbol: "A$" },
    "US": { code: "USD", name: "United States Dollar",   symbol: "US$" },
    "CA": { code: "CAD", name: "Canadian Dollar",        symbol: "CA$" }
  };
  return map[countryCode] || { code: "—", name: "Unknown currency", symbol: "?" };
}

/* ============================================
   LOCAL TIME FORMATTER
   ============================================ */
function formatLocalTime(wp) {
  const tz     = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";

  if (!tz) return "Time unavailable";

  try {
    const now = new Date();

    const weekday = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      weekday: "long"
    }).format(now);

    const time12h = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(now);

    return `${weekday}, ${time12h}`;
  } catch {
    return "Time unavailable";
  }
}

/* ============================================
   TIMEZONE + UTC OFFSET FORMATTER
   ============================================ */
function formatTimeZoneWithOffset(wp) {
  const tz     = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";

  if (!tz) return "N/A";

  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "shortOffset"
    });

    const parts = fmt.formatToParts(now);
    let offset = parts.find(p => p.type === "timeZoneName")?.value || "";

    if (offset.startsWith("GMT")) offset = "UTC" + offset.slice(3);

    return `${tz} (${offset})`;
  } catch {
    return tz;
  }
}

/* ============================================
   WEATHER CODE → LABEL + ICON
   Direct from original implementation
   ============================================ */
function mapWeatherCodeToInfo(code) {
  const c = Number(code);
  if (isNaN(c)) return { label: "Unknown conditions", icon: "?" };

  if (c === 0) return { label: "Clear sky", icon: "☀️" };
  if (c === 1 || c === 2) return { label: "Mostly clear", icon: "🌤️" };
  if (c === 3) return { label: "Overcast", icon: "☁️" };
  if (c === 45 || c === 48) return { label: "Fog / low clouds", icon: "🌫️" };
  if (c >= 51 && c <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (c >= 61 && c <= 65) return { label: "Rain", icon: "🌧️" };
  if (c === 66 || c === 67) return { label: "Freezing rain", icon: "🌧️" };
  if (c >= 71 && c <= 75) return { label: "Snow", icon: "🌨️" };
  if (c === 77) return { label: "Snow grains", icon: "❄️" };
  if (c >= 80 && c <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (c === 85 || c === 86) return { label: "Snow showers", icon: "🌨️" };
  if (c === 95) return { label: "Thunderstorm", icon: "⛈️" };
  if (c === 96 || c === 99) return { label: "Thunderstorm with hail", icon: "⛈️" };

  return { label: "Conditions unknown", icon: "?" };
}

/* ============================================
   EXPORT-SAFE GLOBALS (if future ES modules)
   ============================================ */
console.log("map-config.js loaded");
