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
   TIMEZONE HELPERS — GUARANTEED CORRECT TIME (WINDOWS SAFE)
   ============================================================ */

/**
 * Get the correct UTC offset in minutes for an IANA zone.
 * This forces Intl to compute offset properly even on Windows.
 */
function getOffsetMinutesFromIANA(tz) {
  const dt = new Date();

  // Format with timeZone and also without → compute difference
  const fLocal = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit"
  });

  // Get local-in-zone time as HH:MM
  const parts = fLocal.formatToParts(dt);
  const hh = Number(parts.find(p => p.type === "hour").value);
  const mm = Number(parts.find(p => p.type === "minute").value);

  // Convert that HH:MM back to minutes from midnight in the target zone
  const minsInZone = hh * 60 + mm;

  // Compute the same for UTC
  const dtUTC = new Date(dt.toLocaleString("en-US", { timeZone: "UTC" }));
  const hhUTC = dtUTC.getHours();
  const mmUTC = dtUTC.getMinutes();
  const minsUTC = hhUTC * 60 + mmUTC;

  // Offset = difference
  let off = minsInZone - minsUTC;

  // Normalize wrap-around at midnight
  if (off > 720) off -= 1440;
  else if (off < -720) off += 1440;

  return off;
}

/**
 * Absolute correct local time formatter regardless of OS bugs.
 */
window.formatLocalTime = function (wp) {
  const tz = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";
  if (!tz) return "Time unavailable";

  try {
    const now = new Date();
    const offsetMinutes = getOffsetMinutesFromIANA(tz);

    // Build corrected local time manually
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const local = new Date(utc + offsetMinutes * 60000);

    const weekday = new Intl.DateTimeFormat(locale, {
      weekday: "long"
    }).format(local);

    const dateStr = new Intl.DateTimeFormat(locale, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    }).format(local);

    let timeStr = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(local);

    timeStr = timeStr
      .replace(/\s?AM/i, "am")
      .replace(/\s?PM/i, "pm");

    return `${weekday}, ${dateStr} - ${timeStr}`;
  } catch (e) {
    console.error("formatLocalTime() failed:", e);
    return "Time unavailable";
  }
};

/**
 * Show IANA zone + correct offset (UTC±HH:MM)
 */
window.formatTimeZoneWithOffset = function (wp) {
  const tz = wp.meta?.timezone || "UTC";

  try {
    const offset = getOffsetMinutesFromIANA(tz);
    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");

    return `${tz} (UTC${sign}${hh}:${mm})`;
  } catch (e) {
    console.error("formatTimeZoneWithOffset() failed:", e);
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

