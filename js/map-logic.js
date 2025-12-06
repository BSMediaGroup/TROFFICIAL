/* ========================================================================== */
/* ============================= MAP LOGIC CORE ============================= */
/* ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* ==========================================================================
   GLOBAL STATE (NO REDECLARATIONS — SAFE WITH map-ui.js)
   ========================================================================== */

window.currentID   = null;
window.journeyMode = false;

window.__MAP = window.__MAP || null;

/* Orbit animation state */
let orbitInterval        = null;
const ORBIT_SPEED        = 0.08;
const ORBIT_ZOOM_TARGET  = 6.5;
const ORBIT_PITCH_TARGET = 60;

/* Distance accumulation */
window.TRAVELLED_MI = window.TRAVELLED_MI || {};
window.TRAVELLED_KM = window.TRAVELLED_KM || {};
window.LEG_DIST     = window.LEG_DIST     || {};

/* ==========================================================================
   GET WAYPOINT OBJECT
   ========================================================================== */
window.getWP = function (id) {
  return WAYPOINTS.find(w => w.id === id);
};

/* ==========================================================================
   ZOOM LOGIC
   ========================================================================== */

window.getZoom = function (id) {
  if (["sydney", "la", "toronto"].includes(id)) return 6.7;
  return 9.4;
};

/* ==========================================================================
   FLIGHT vs DRIVING MODE DETECTION
   ========================================================================== */

function isFlight(a, b) {
  return (
    (a === "sydney" && b === "la") ||
    (a === "la" && b === "toronto")
  );
}

window.getLegMode = function (id) {
  const idx  = TRIP_ORDER.indexOf(id);
  const next = TRIP_ORDER[idx + 1];
  if (next && isFlight(id, next)) return "Plane";
  return getWP(id)?.mode || "Car";
};

/* ==========================================================================
   ORBIT CAMERA CONTROL
   ========================================================================== */

window.startOrbit = function (id) {
  window.stopOrbit();

  const wp = getWP(id);
  if (!wp || !window.__MAP) return;

  window.__MAP.easeTo({
    center: wp.coords,
    zoom:   ORBIT_ZOOM_TARGET,
    pitch:  ORBIT_PITCH_TARGET,
    duration: 900
  });

  orbitInterval = setInterval(() => {
    const b = window.__MAP.getBearing() + ORBIT_SPEED;
    window.__MAP.setBearing(b);
  }, 30);
};

window.stopOrbit = function () {
  if (orbitInterval) clearInterval(orbitInterval);
  orbitInterval = null;
};

/* ==========================================================================
   LEG DISTANCES (MI + KM)
   ========================================================================== */

function computeDistance(a, b) {
  const R    = 6371;
  const dLat = (b[1] - a[1]) * Math.PI / 180;
  const dLon = (b[0] - a[0]) * Math.PI / 180;

  const lat1 = a[1] * Math.PI / 180;
  const lat2 = b[1] * Math.PI / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;

  const km = 2 * R * Math.asin(Math.sqrt(h));
  const mi = km * 0.621371;
  return { km: Math.round(km), mi: Math.round(mi) };
}

function computeAllLegDistances() {
  TRIP_ORDER.forEach((id, i) => {
    if (i === TRIP_ORDER.length - 1) return;
    const wpA = getWP(id);
    const wpB = getWP(TRIP_ORDER[i + 1]);
    if (!wpA || !wpB) return;
    LEG_DIST[id] = computeDistance(wpA.coords, wpB.coords);
  });

  let totalKM = 0;
  let totalMI = 0;

  TRIP_ORDER.forEach(id => {
    totalKM += LEG_DIST[id]?.km || 0;
    totalMI += LEG_DIST[id]?.mi || 0;
    TRAVELLED_KM[id] = totalKM;
    TRAVELLED_MI[id] = totalMI;
  });
}

/* ==========================================================================
   JOURNEY ANIMATION
   ========================================================================== */

window.animateLeg = function (fromID, toID) {
  window.stopOrbit();

  const A = getWP(fromID);
  const B = getWP(toID);
  if (!A || !B || !window.__MAP) return;

  const mode     = getLegMode(fromID);
  const duration = mode === "Plane" ? 5000 : 3500;

  const start = performance.now();

  function frame(t) {
    const p = Math.min((t - start) / duration, 1);

    const lng = A.coords[0] + (B.coords[0] - A.coords[0]) * p;
    const lat = A.coords[1] + (B.coords[1] - A.coords[1]) * p;

    window.__MAP.easeTo({
      center: [lng, lat],
      duration: 0
    });

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      currentID = toID;
      if (typeof openPopupFor === "function") {
        openPopupFor(toID);
      }
      if (typeof updateHUD === "function") {
        updateHUD();
      }
    }
  }

  requestAnimationFrame(frame);
};

/* ==========================================================================
   UNDO LEG
   ========================================================================== */

window.undoTo = function (targetID) {
  window.stopOrbit();
  currentID = targetID;

  const wp = getWP(targetID);
  if (!wp || !window.__MAP) return;

  window.__MAP.easeTo({
    center:  wp.coords,
    zoom:    getZoom(targetID),
    pitch:   0,
    bearing: 0,
    duration: 800
  });

  if (typeof openPopupFor === "function") {
    openPopupFor(targetID);
  }
  if (typeof updateHUD === "function") {
    updateHUD();
  }
};

/* ==========================================================================
   RESET JOURNEY
   ========================================================================== */

window.resetJourney = function () {
  window.stopOrbit();
  journeyMode = false;
  currentID   = null;

  if (!window.__MAP || !WAYPOINTS?.length) return;

  window.__MAP.easeTo({
    center:  WAYPOINTS[0].coords,
    zoom:    getZoom(WAYPOINTS[0].id),
    pitch:   0,
    bearing: 0,
    duration: 900
  });

  if (typeof closeAllPopups === "function") {
    closeAllPopups();
  }
  if (typeof updateHUD === "function") {
    updateHUD();
  }
};

/* ==========================================================================
   MAP INITIALISATION — THE ONLY PLACE THIS FILE CREATES / CONFIGS THE MAP
   ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
  computeAllLegDistances();

  // Safe style URL: use MAP_STYLE_URL if it exists, otherwise fall back.
  const STYLE_URL =
    (typeof MAP_STYLE_URL !== "undefined" && MAP_STYLE_URL) ||
    "mapbox://styles/mapbox/dark-v11";

  // If some other file (e.g. map-style.js) already created a map, reuse it.
  if (!window.__MAP) {
    window.__MAP = new mapboxgl.Map({
      container: "map",
      style:     STYLE_URL,
      center:    DEFAULT_CENTER,
      zoom:      DEFAULT_ZOOM,
      pitch:     DEFAULT_PITCH,
      bearing:   DEFAULT_BEARING,
      antialias: true
    });
  } else {
    // Map already exists; try to align its style with STYLE_URL
    try {
      window.__MAP.setStyle(STYLE_URL);
    } catch (err) {
      console.warn("Could not set style on existing map:", err);
    }
  }

  window.__MAP.on("load", () => {
    console.log("%cmap-logic.js fully loaded", "color:#00ff88;font-weight:bold;");

    if (typeof initializeStyleLayers === "function") {
      initializeStyleLayers();
    }
    if (typeof buildMarkers === "function") {
      buildMarkers();
    }
    if (typeof updateHUD === "function") {
      updateHUD();
    }
  });
});
