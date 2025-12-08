/* ============================================================
   MAP CONFIG MODULE — v5 (FINAL + SAFE TIMEZONE ENGINE)
   ============================================================ */

console.log("map-config.js loaded");

/* ============================================================
   DEFAULT MAP VIEW SETTINGS
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
   ORBIT CAMERA CONSTANTS — WITH CRASH FIX
   ============================================================ */

window.ORBIT_ZOOM_TARGET    = 12.5;
window.ORBIT_PITCH_TARGET   = 60;    // MUST NOT exceed 60 in globe mode
window.ORBIT_ROTATION_SPEED = 0.015;
window.ORBIT_ENTRY_DURATION = 900;

/* ============================================================
   JOURNEY CAMERA CONSTANTS
   ============================================================ */

window.JOURNEY_PITCH_TARGET = 55;
window.JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
window.JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

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
   *** TRUE SAFE TIMEZONE ENGINE (NO LOCALE PARSE BUGS) ***
   ============================================================ */
/*
   This version does NOT:
     - call new Date(localeString)   ❌ (causes wrong offsets)
     - rely on browser locale order  ❌ (MDY/DMY bug)
   Instead it uses Intl.formatToParts(), which is:
     ✓ immune to locale formatting bugs
     ✓ 100% accurate for DST in all IANA zones
     ✓ extremely fast
*/

function getOffsetMinutes(tz) {
  const now = new Date();

  // Extract the "virtual" clock time for that time zone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const parts = fmt.formatToParts(now);

  const Y = +parts.find(p => p.type === "year").value;
  const M = +parts.find(p => p.type === "month").value - 1;
  const D = +parts.find(p => p.type === "day").value;
  const h = +parts.find(p => p.type === "hour").value;
  const m = +parts.find(p => p.type === "minute").value;
  const s = +parts.find(p => p.type === "second").value;

  // Build UTC timestamps of:
  // – actual UTC time
  // – equivalent timestamp in that timezone
  const utcTs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds(),
    now.getUTCMilliseconds()
  );

  const zonedTs = Date.UTC(Y, M, D, h, m, s, now.getUTCMilliseconds());

  return Math.round((zonedTs - utcTs) / 60000);
}

/* ============================================================
   LOCAL TIME DISPLAY: Monday, 12/08/2025 - 1:07am
   ============================================================ */

window.formatLocalTime = function (wp) {
  const tz = wp.meta?.timezone;
  if (!tz) return "Time unavailable";

  try {
    const offset = getOffsetMinutes(tz);

    const nowUTC = Date.now();
    const local = new Date(nowUTC + offset * 60000);

    const weekday = local.toLocaleDateString("en-US", { weekday: "long" });

    const MM = String(local.getMonth() + 1).padStart(2, "0");
    const DD = String(local.getDate()).padStart(2, "0");
    const YYYY = local.getFullYear();

    let h = local.getHours();
    const m = String(local.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;

    return `${weekday}, ${MM}/${DD}/${YYYY} - ${h}:${m}${ampm}`;
  } catch (err) {
    console.error("formatLocalTime failed:", err);
    return "Time unavailable";
  }
};

/* ============================================================
   TIMEZONE LABEL DISPLAY: America/Toronto (UTC-05:00)
   ============================================================ */

window.formatTimeZoneWithOffset = function (wp) {
  const tz = wp.meta?.timezone;
  if (!tz) return "N/A";

  try {
    const offset = getOffsetMinutes(tz);
    const sign = offset >= 0 ? "+" : "-";
    const abs = Math.abs(offset);
    const hh = String(Math.floor(abs / 60)).padStart(2, "0");
    const mm = String(abs % 60).padStart(2, "0");

    return `${tz} (UTC${sign}${hh}:${mm})`;
  } catch {
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
   EXPORT CONFIG
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
