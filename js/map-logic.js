/* ========================================================================== */
/* ============================= MAP LOGIC CORE ============================= */
/* ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/*
   This module:
   - Computes leg distances
   - Provides orbit, journey, and camera-animation logic
   - Uses the map instance created in map-style.js (window.__MAP)

   It does NOT:
   - Create the Mapbox map
   - Attach markers / popups / HUD (that’s map-ui.js)
*/

/* ========================================================================== */
/* GLOBAL STATE — SHARED ACROSS MODULES                                       */
/* ========================================================================== */

window.__MAP       = window.__MAP || null;
window.currentID   = window.currentID || null;
window.journeyMode = window.journeyMode || false;

/* Orbit animation state */
let orbitInterval = null;

/* Distance accumulation */
window.TRAVELLED_MI = window.TRAVELLED_MI || {};
window.TRAVELLED_KM = window.TRAVELLED_KM || {};
window.LEG_DIST     = window.LEG_DIST     || {};

/* Guard to prevent animations before ready (also defined in map-config.js) */
if (typeof window.MAP_READY === "undefined") {
  window.MAP_READY = false;
}


/* ========================================================================== */
/* WAYPOINT LOOKUP                                                            */
/* ========================================================================== */

window.getWP = function (id) {
  return WAYPOINTS.find(w => w.id === id);
};


/* ========================================================================== */
/* ZOOM LOGIC                                                                 */
/* ========================================================================== */

window.getZoom = function (id) {
  if (["sydney", "la", "toronto"].includes(id)) return 6.7;
  return 9.4;
};


/* ========================================================================== */
/* MODE DETECTION                                                             */
/* ========================================================================== */

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


/* ========================================================================== */
/* ORBIT CAMERA                                                               */
/* ========================================================================== */

window.startOrbit = function (id) {
  stopOrbit();
  if (!MAP_READY || !window.__MAP) return;

  const wp = getWP(id);
  if (!wp) return;

  __MAP.easeTo({
    center: wp.coords,
    zoom: ORBIT_ZOOM_TARGET,
    pitch: ORBIT_PITCH_TARGET,
    duration: ORBIT_ENTRY_DURATION
  });

  orbitInterval = setInterval(() => {
    const b = __MAP.getBearing() + ORBIT_ROTATION_SPEED;
    __MAP.setBearing(b);
  }, 30);
};

window.stopOrbit = function () {
  if (orbitInterval) clearInterval(orbitInterval);
  orbitInterval = null;
};


/* ========================================================================== */
/* DISTANCE CALCULATION                                                       */
/* ========================================================================== */

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


/* ========================================================================== */
/* JOURNEY ANIMATION                                                          */
/* ========================================================================== */

window.animateLeg = function (fromID, toID) {
  if (!MAP_READY || !window.__MAP) return;
  stopOrbit();

  const A = getWP(fromID);
  const B = getWP(toID);
  if (!A || !B) return;

  const mode     = getLegMode(fromID);
  const duration = mode === "Plane" ? 5000 : 3500;

  const start = performance.now();

  function frame(t) {
    if (!journeyMode) return; // HARD STOP if user exits journey

    const p = Math.min((t - start) / duration, 1);

    const lng = A.coords[0] + (B.coords[0] - A.coords[0]) * p;
    const lat = A.coords[1] + (B.coords[1] - A.coords[1]) * p;

    __MAP.easeTo({
      center: [lng, lat],
      duration: 0
    });

    if (p < 1) {
      requestAnimationFrame(frame);
    } else {
      currentID = toID;
      if (typeof openPopupFor === "function") openPopupFor(toID);
      if (typeof updateHUD === "function")     updateHUD();
    }
  }

  requestAnimationFrame(frame);
};


/* ========================================================================== */
/* JOURNEY BACKTRACK                                                          */
/* ========================================================================== */

window.undoTo = function (targetID) {
  if (!MAP_READY || !window.__MAP) return;
  stopOrbit();
  currentID = targetID;

  const wp = getWP(targetID);
  if (!wp) return;

  __MAP.easeTo({
    center: wp.coords,
    zoom: getZoom(targetID),
    pitch: 0,
    bearing: 0,
    duration: 800
  });

  if (typeof openPopupFor === "function")  openPopupFor(targetID);
  if (typeof updateHUD === "function")     updateHUD();
};


/* ========================================================================== */
/* RESET JOURNEY                                                              */
/* ========================================================================== */

window.resetJourney = function () {
  if (!MAP_READY || !window.__MAP) return;
  stopOrbit();
  journeyMode = false;
  currentID   = null;

  const first = WAYPOINTS[0];
  __MAP.easeTo({
    center: first.coords,
    zoom: getZoom(first.id),
    pitch: 0,
    bearing: 0,
    duration: 900
  });

  if (typeof closeAllPopups === "function") closeAllPopups();
  if (typeof updateHUD === "function")      updateHUD();
};


/* ========================================================================== */
/* BOOTSTRAP: DISTANCES + MAP LOAD HOOK                                      */
/* ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
  computeAllLegDistances();

  if (window.__MAP && typeof window.__MAP.once === "function") {
    window.__MAP.once("load", () => {
      console.log("%cmap-logic.js fully ready", "color:#00ff88;font-weight:bold;");
      window.MAP_READY = true;
    });
  } else {
    console.error("map-logic.js: __MAP is not ready. Ensure map-style.js loads before map-logic.js.");
  }
});
