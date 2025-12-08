/* ============================================================
   MAP CONFIG MODULE — v4 (FINAL, MONOLITH-ACCURATE, CLEAN)
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS (FIXED TO TRUE MONOLITH VALUES)
   ============================================================ */

window.DEFAULT_CENTER = [-100, 40];
window.DEFAULT_ZOOM   = 1.65;
window.DEFAULT_PITCH  = 42.7;     // Your confirmed exact pitch

/* ============================================================
   GLOBAL STATE FLAGS
   ============================================================ */

window.MAP_READY       = false;
window.spinning        = true;
window.userInterrupted = false;
window.journeyMode     = false;
window.currentID       = null;

/* ============================================================
   ORBIT CAMERA CONSTANTS (CORRECTED)
   ============================================================ */

window.ORBIT_ZOOM_TARGET    = 12.5;
window.ORBIT_PITCH_TARGET   = 75;

// FIX #1 — WRONG AXIS SPIN (0.03 was too fast & unstable)
// Correct monolith-accurate rotation speed = 0.015
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

   Duplicating TRIP_ORDER here was causing:
     - wrong leg distances
     - broken HUD
     - broken journey animations
     - wrong next/prev behaviour
     - broken sidebar HUD sync

   Therefore:
     We REMOVE TRIP_ORDER & DRIVE_ORDER from map-config.js
     and use the canonical versions from map-data.js.
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
   TIMEZONE HELPERS — FIXED (CORRECT DAY + DATE + LOCAL TIME)
   ============================================================ */

window.formatLocalTime = function (wp) {
  const tz = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";
  if (!tz) return "Time unavailable";

  try {
    const now = new Date(); // current universal moment

    // Weekday in target timezone
    const weekday = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      weekday: "long"
    }).format(now);

    // Date in MM/DD/YYYY
    const dateStr = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);

    // Correct 12h local time
    const timeStr = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(now);

    return `${weekday}, ${dateStr} — ${timeStr}`;

  } catch (err) {
    console.error("formatLocalTime() failed:", err);
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

    // Normalize GMT → UTC
    if (offset.startsWith("GMT")) {
      offset = "UTC" + offset.slice(3);
    }

    return `${tz} (${offset})`;

  } catch (err) {
    console.error("formatTimeZoneWithOffset() failed:", err);
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

