/* ============================================================
   MAP CONFIG MODULE — v3 (FINAL, MONOLITH-ACCURATE)
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS
   ============================================================ */

window.DEFAULT_CENTER = [-100, 40];
window.DEFAULT_ZOOM   = 1.65;

window.MAP_READY       = false;
window.spinning        = true;
window.userInterrupted = false;
window.journeyMode     = false;
window.currentID       = null;

/* ============================================================
   ORBIT CAMERA CONSTANTS
   ============================================================ */

window.ORBIT_ZOOM_TARGET    = 12.5;
window.ORBIT_PITCH_TARGET   = 75;
window.ORBIT_ROTATION_SPEED = 0.03;
window.ORBIT_ENTRY_DURATION = 900;

/* ============================================================
   JOURNEY CAMERA CONSTANTS
   ============================================================ */

window.JOURNEY_PITCH_TARGET = 55;
window.JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
window.JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

/* ============================================================
   TRIP ORDER — MUST MATCH EXACT WAYPOINT ORDER FROM map-data.js
   ============================================================ */

window.TRIP_ORDER = [
  "sydney",
  "la",
  "toronto",
  "hamilton",
  "niagarafalls",
  "buffalo",
  "batavia",
  "rochester",
  "geneva",
  "syracuse",
  "utica",
  "albany",
  "kingston",
  "newburgh",
  "whiteplains",
  "nyc",
  "hoboken",
  "newark",
  "tomsriver"
];

/* ============================================================
   DRIVING ORDER — EVERYTHING *AFTER* TORONTO (correct)
   ============================================================ */

window.DRIVE_ORDER = [
  "toronto",
  "hamilton",
  "niagarafalls",
  "buffalo",
  "batavia",
  "rochester",
  "geneva",
  "syracuse",
  "utica",
  "albany",
  "kingston",
  "newburgh",
  "whiteplains",
  "nyc",
  "hoboken",
  "newark",
  "tomsriver"
];

/* ============================================================
   MODE ICONS
   ============================================================ */

window.MODE_ICONS = {
  "Plane": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  "Drive": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car.svg"
};

/* ============================================================
   CURRENCY MAP
   ============================================================ */

window.CURRENCY_INFO = {
  "AU": { code: "AUD", name: "Australian Dollar",    symbol: "A$"  },
  "US": { code: "USD", name: "United States Dollar", symbol: "US$" },
  "CA": { code: "CAD", name: "Canadian Dollar",      symbol: "CA$" }
};

window.getCurrencyInfo = function (code) {
  return CURRENCY_INFO[code] || { code: "—", name: "Unknown", symbol: "?" };
};

/* ============================================================
   TIMEZONE HELPERS
   ============================================================ */

window.formatLocalTime = function (wp) {
  const tz = wp.meta?.timezone;
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
};

window.formatTimeZoneWithOffset = function (wp) {
  const tz = wp.meta?.timezone;
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
};

/* ============================================================
   WEATHER MAPPING
   ============================================================ */

window.mapWeatherCodeToInfo = function (code) {
  const c = Number(code);
  if (isNaN(c)) return { label: "Unknown", icon: "?" };

  if (c === 0) return { label: "Clear sky", icon: "☀️" };
  if (c === 1 || c === 2) return { label: "Mostly clear", icon: "🌤️" };
  if (c === 3) return { label: "Overcast", icon: "☁️" };
  if (c === 45 || c === 48) return { label: "Fog", icon: "🌫️" };
  if (c >= 51 && c <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (c >= 61 && c <= 65) return { label: "Rain", icon: "🌧️" };
  if (c === 66 || c === 67) return { label: "Freezing rain", icon: "🌧️" };
  if (c >= 71 && c <= 75) return { label: "Snow", icon: "❄️" };
  if (c === 77) return { label: "Snow grains", icon: "❄️" };
  if (c >= 80 && c <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (c === 85 || c === 86) return { label: "Snow showers", icon: "🌨️" };
  if (c === 95) return { label: "Thunderstorm", icon: "⛈️" };
  if (c === 96 || c === 99) return { label: "Storm w/ hail", icon: "⛈️" };

  return { label: "Unknown", icon: "?" };
};

/* ============================================================
   EXPORT
   ============================================================ */

window.CONFIG = {
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  ORBIT_ZOOM_TARGET,
  ORBIT_PITCH_TARGET,
  ORBIT_ROTATION_SPEED,
  ORBIT_ENTRY_DURATION,
  JOURNEY_PITCH_TARGET,
  JOURNEY_ZOOM_DEFAULT,
  JOURNEY_ZOOM_LA,
  TRIP_ORDER,
  DRIVE_ORDER,
  MODE_ICONS,
  CURRENCY_INFO
};

console.log("%cmap-config.js fully loaded", "color:#00e5ff;font-weight:bold;");
