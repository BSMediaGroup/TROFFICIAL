/* ============================================================
   MAP CONFIG MODULE — v5 (FINAL, CLEAN, CONSISTENT TIMEZONE)
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS (TRUE MONOLITH VALUES)
   ============================================================ */

window.DEFAULT_CENTER = [-100, 40];
window.DEFAULT_ZOOM   = 1.65;
window.DEFAULT_PITCH  = 42.7;

/* ============================================================
   GLOBAL STATE FLAGS
   ============================================================ */

window.MAP_READY       = false;
window.spinning        = true;
window.userInterrupted = false;
window.journeyMode     = false;
window.currentID       = null;

/* ============================================================
   ORBIT CAMERA CONSTANTS
   ============================================================ */

window.ORBIT_ZOOM_TARGET    = 12.5;
window.ORBIT_PITCH_TARGET   = 60;    // keep ≤ 60 for globe stability
window.ORBIT_ROTATION_SPEED = 0.015;
window.ORBIT_ENTRY_DURATION = 900;

/* ============================================================
   JOURNEY CAMERA CONSTANTS
   ============================================================ */

window.JOURNEY_PITCH_TARGET = 55;
window.JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
window.JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

/* ============================================================
   IMPORTANT NOTE ABOUT TRIP ORDER
   ============================================================ */
/*
   TRIP_ORDER **must ONLY be defined in map-data.js**, because the waypoint
   list is the single source of truth.

   Therefore:
     We DO NOT define TRIP_ORDER or DRIVE_ORDER here.
*/

/* ============================================================
   MODE ICONS
   ============================================================ */

window.MODE_ICONS = {
  "Plane": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  "Drive": "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car.svg"
};

/* ============================================================
   CURRENCY MAP + HELPERS
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
   TIMEZONE HELPERS — SINGLE SOURCE = Intl
   ============================================================ */
/*
   The key rule now:

     - We do NOT try to build offsets manually
     - We do NOT parse locale strings back into Dates
     - We let Intl do *all* the heavy lifting

   That way:
     - The "local time" display and
     - The "UTC±hh:mm" label

   are both derived from the same engine, so they cannot diverge.
*/

/** Local time string: "Monday, 12/08/2025 - 1:07am" */
window.formatLocalTime = function (wp) {
  const tz     = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";
  if (!tz) return "Time unavailable";

  try {
    const now = new Date();

    // We use formatToParts so we can build your exact layout.
    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });

    const parts = fmt.formatToParts(now);

    const weekday   = parts.find(p => p.type === "weekday")?.value || "";
    const month     = parts.find(p => p.type === "month")?.value || "";
    const day       = parts.find(p => p.type === "day")?.value || "";
    const year      = parts.find(p => p.type === "year")?.value || "";
    const hour      = parts.find(p => p.type === "hour")?.value || "";
    const minute    = parts.find(p => p.type === "minute")?.value || "";
    const dayPeriod = (parts.find(p => p.type === "dayPeriod")?.value || "").toLowerCase();

    // Force MM/DD/YYYY & "am"/"pm" style regardless of locale quirks
    const dateStr = `${month}/${day}/${year}`;
    return `${weekday}, ${dateStr} - ${hour}:${minute}${dayPeriod}`;
  } catch (err) {
    console.error("formatLocalTime failed:", err);
    return "Time unavailable";
  }
};

/** Timezone label: "America/Toronto (UTC-05:00)" */
window.formatTimeZoneWithOffset = function (wp) {
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
    let offset  = parts.find(p => p.type === "timeZoneName")?.value || "";

    // Normalise GMT→UTC just for aesthetics
    if (offset.startsWith("GMT")) offset = "UTC" + offset.slice(3);

    return `${tz} (${offset})`;
  } catch (err) {
    console.error("formatTimeZoneWithOffset failed:", err);
    return tz;
  }
};

/* ============================================================
   WEATHER CODE MAP
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
  DEFAULT_PITCH,
  ORBIT_ZOOM_TARGET,
  ORBIT_PITCH_TARGET,
  ORBIT_ROTATION_SPEED,
  ORBIT_ENTRY_DURATION,
  JOURNEY_PITCH_TARGET,
  JOURNEY_ZOOM_DEFAULT,
  JOURNEY_ZOOM_LA,
  MODE_ICONS,
  CURRENCY_INFO
};

console.log("%cmap-config.js fully loaded", "color:#00e5ff;font-weight:bold;");
