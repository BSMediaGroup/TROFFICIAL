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
   TIMEZONE HELPERS
   ============================================================ */

/**
 * Internal helper: safely extract UTC offset minutes from waypoint meta.
 * Supports:
 *   - meta.utcOffsetMinutes (number, e.g. -300)
 *   - meta.utcOffset / meta.utc_offset / meta.utc (string, e.g. "UTC-05:00" or "-05:00")
 */
function getUtcOffsetMinutesFromMeta(meta) {
  if (!meta) return null;

  if (typeof meta.utcOffsetMinutes === "number" && isFinite(meta.utcOffsetMinutes)) {
    return meta.utcOffsetMinutes;
  }

  const raw =
    meta.utcOffset ??
    meta.utc_offset ??
    meta.utc ??
    null;

  if (!raw || typeof raw !== "string") return null;

  // Strip any leading "UTC" / "GMT"
  let s = raw.trim().toUpperCase();
  if (s.startsWith("UTC")) s = s.slice(3).trim();
  if (s.startsWith("GMT")) s = s.slice(3).trim();

  // Expect something like "+05:00" or "-03:30" or "05:00"
  const m = s.match(/^([+-])?(\d{1,2})(?::(\d{2}))?$/);
  if (!m) return null;

  const sign = m[1] === "-" ? -1 : 1;
  const hours = parseInt(m[2], 10);
  const mins  = m[3] ? parseInt(m[3], 10) : 0;

  if (!isFinite(hours) || !isFinite(mins)) return null;

  return sign * (hours * 60 + mins);
}

/**
 * Internal helper: convert "now" to a Date in the target offset.
 * Uses host clock only as a source of current UTC, then applies offset.
 */
function getLocalDateFromOffset(offsetMinutes) {
  const now = new Date();
  // Convert host local time → UTC
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  // Apply waypoint offset (minutes from UTC)
  const localMs = utcMs + offsetMinutes * 60000;
  return new Date(localMs);
}

window.formatLocalTime = function (wp) {
  if (!wp || !wp.meta) return "Time unavailable";

  const meta   = wp.meta;
  const tz     = meta.timezone;
  const locale = meta.locale || "en-US";

  // Try to use explicit UTC offset first (MOST RELIABLE)
  const offsetMinutes = getUtcOffsetMinutesFromMeta(meta);

  try {
    let weekday, dateStr, timeStr;

    if (offsetMinutes !== null && isFinite(offsetMinutes)) {
      // Use explicit offset → build a synthetic local Date
      const localDate = getLocalDateFromOffset(offsetMinutes);

      weekday = new Intl.DateTimeFormat(locale, {
        weekday: "long"
      }).format(localDate);

      dateStr = new Intl.DateTimeFormat(locale, {
        month: "2-digit",
        day:   "2-digit",
        year:  "numeric"
      }).format(localDate);

      timeStr = new Intl.DateTimeFormat(locale, {
        hour:   "numeric",
        minute: "2-digit",
        hour12: true
      }).format(localDate);
    } else if (tz) {
      // Fallback: use IANA timezone with Intl
      const now = new Date();

      weekday = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        weekday: "long"
      }).format(now);

      dateStr = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        month: "2-digit",
        day:   "2-digit",
        year:  "numeric"
      }).format(now);

      timeStr = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour:   "numeric",
        minute: "2-digit",
        hour12: true
      }).format(now);
    } else {
      // Last resort: host local time, no timezone data
      const now = new Date();

      weekday = new Intl.DateTimeFormat(locale, {
        weekday: "long"
      }).format(now);

      dateStr = new Intl.DateTimeFormat(locale, {
        month: "2-digit",
        day:   "2-digit",
        year:  "numeric"
      }).format(now);

      timeStr = new Intl.DateTimeFormat(locale, {
        hour:   "numeric",
        minute: "2-digit",
        hour12: true
      }).format(now);
    }

    // Normalise time to "1:45am" / "10:07pm" (no space, lowercase)
    timeStr = timeStr
      .replace(/\s?AM/i, "am")
      .replace(/\s?PM/i, "pm");

    // Final format: "Monday, 12/08/2025 - 1:45am"
    return `${weekday}, ${dateStr} - ${timeStr}`;
  } catch {
    return "Time unavailable";
  }
};

window.formatTimeZoneWithOffset = function (wp) {
  if (!wp || !wp.meta) return "N/A";

  const meta   = wp.meta;
  const tz     = meta.timezone || "UTC";
  const locale = meta.locale || "en-US";

  // Try to use the explicit UTC offset first
  const offsetMinutes = getUtcOffsetMinutesFromMeta(meta);

  try {
    let offsetLabel = "";

    if (offsetMinutes !== null && isFinite(offsetMinutes)) {
      const sign = offsetMinutes >= 0 ? "+" : "-";
      const abs  = Math.abs(offsetMinutes);
      const hh   = String(Math.floor(abs / 60)).padStart(2, "0");
      const mm   = String(abs % 60).padStart(2, "0");
      offsetLabel = `UTC${sign}${hh}:${mm}`;
    } else {
      // Fallback: derive from IANA timezone using Intl
      const now = new Date();

      const fmt = new Intl.DateTimeFormat(locale, {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "shortOffset"
      });

      const parts = fmt.formatToParts(now);
      let rawName = parts.find(p => p.type === "timeZoneName")?.value || "";

      if (rawName.toUpperCase().startsWith("GMT")) {
        rawName = "UTC" + rawName.slice(3);
      }
      offsetLabel = rawName || "UTC";
    }

    return `${tz} (${offsetLabel})`;
  } catch {
    // If anything explodes, at least show the timezone string
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
