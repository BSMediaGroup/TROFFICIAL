/* ============================================================
   MAP CONFIG MODULE — v2
   Contains:
   - Static constants used across all modules
   - Default zoom, rotation, pitch, and behaviour settings
   - Trip ordering & driving ordering
   - Mode icon mapping
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS
   ============================================================ */

window.DEFAULT_CENTER = [ -100, 40 ];        // unchanged from original
window.DEFAULT_ZOOM   = 1.65;

/* Used by reset, initial spin, journey start */
window.MAP_READY = false;

/* Global interaction state */
window.spinning         = true;
window.userInterrupted  = false;
window.journeyMode      = false;
window.currentID        = null;

/* ============================================================
   ORBIT CAMERA CONSTANTS
   ============================================================ */

window.ORBIT_ZOOM_TARGET    = 12.5;
window.ORBIT_PITCH_TARGET   = 75;   // manual orbit pitch
window.ORBIT_ROTATION_SPEED = 0.03; // deg per frame
window.ORBIT_ENTRY_DURATION = 900;

/* ============================================================
   JOURNEY CAMERA CONSTANTS
   ============================================================ */

window.JOURNEY_PITCH_TARGET = 55;

window.JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;  
window.JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

/* ============================================================
   TRIP ORDER (MAIN WAYPOINT SEQUENCE)
   ============================================================ */

window.TRIP_ORDER = [
  "sydney",
  "la",
  "toronto",
  "niagara",
  "cleveland",
  "pittsburgh",
  "philadelphia",
  "tomsriver"
];

/* ============================================================
   DRIVING ORDER (FOR MAPBOX DIRECTIONS API)
   ============================================================ */

window.DRIVE_ORDER = [
  "toronto",
  "niagara",
  "cleveland",
  "pittsburgh",
  "philadelphia",
  "tomsriver"
];

/* ============================================================
   MODE ICONS (USED IN HUD + POPUPS)
   ============================================================ */

window.MODE_ICONS = {
  "Plane":  "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  "Drive":  "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car.svg"
};

/* ============================================================
   CURRENCY MAP (REQUIRED BY LOCATION PANEL)
   ============================================================ */

window.CURRENCY_INFO = {
  "AU": { code: "AUD", name: "Australian Dollar",    symbol: "A$"  },
  "US": { code: "USD", name: "United States Dollar", symbol: "US$" },
  "CA": { code: "CAD", name: "Canadian Dollar",      symbol: "CA$" }
};

/* Helper used by details panel */
window.getCurrencyInfo = function (countryCode) {
  return CURRENCY_INFO[countryCode] ||
    { code: "—", name: "Unknown currency", symbol: "?" };
};

/* ============================================================
   TIMEZONE DISPLAY HELPERS
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
   WEATHER ICON MAPPING
   ============================================================ */

window.mapWeatherCodeToInfo = function (code) {
  const c = Number(code);

  if (isNaN(c)) return { label: "Unknown conditions", icon: "?" };

  if (c === 0) return { label: "Clear sky", icon: "☀️" };
  if (c === 1 || c === 2) return { label: "Mostly clear", icon: "🌤️" };
  if (c === 3) return { label: "Overcast", icon: "☁️" };

  if (c === 45 || c === 48) return { label: "Fog / low clouds", icon: "🌫️" };
  if (c >= 51 && c <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (c >= 61 && c <= 65) return { label: "Rain", icon: "🌧️" };

  if (c === 66 || c === 67) return { label: "Freezing rain", icon: "🌧️" };

  if (c >= 71 && c <= 75) return { label: "Snow", icon: "❄️" };
  if (c === 77) return { label: "Snow grains", icon: "❄️" };

  if (c >= 80 && c <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (c === 85 || c === 86) return { label: "Snow showers", icon: "🌨️" };

  if (c === 95) return { label: "Thunderstorm", icon: "⛈️" };
  if (c === 96 || c === 99) return { label: "Thunderstorm with hail", icon: "⛈️" };

  return { label: "Conditions unknown", icon: "?" };
};

/* ============================================================
   EXPORT CONFIG MODULE
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
