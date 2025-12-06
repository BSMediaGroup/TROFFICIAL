/* ========================================================================== */
/* ============================= MAP LOGIC CORE ============================= */
/* ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* ========================================================================== */
/* IMPORTANT: NEVER TOUCH window.__MAP HERE                                  */
/* The map instance is created in map-style.js                                */
/* DO NOT overwrite it, DO NOT set it to null                                 */
/* ========================================================================== */

window.currentID   = null;
window.journeyMode = false;

/* Orbit animation state */
let orbitInterval = null;
const ORBIT_SPEED = 0.08;
const ORBIT_ZOOM_TARGET = 6.5;
const ORBIT_PITCH_TARGET = 60;

/* Distance accumulation */
window.TRAVELLED_MI = {};
window.TRAVELLED_KM = {};
window.LEG_DIST = {};


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
  const idx = TRIP_ORDER.indexOf(id);
  const next = TRIP_ORDER[idx + 1];
  if (next && isFlight(id, next)) return "Plane";
  return getWP(id)?.mode || "Car";
};

/* ==========================================================================
   ORBIT CAMERA CONTROL
   ========================================================================== */

window.startOrbit = function (id) {
  stopOrbit();

  const wp = getWP(id);
  if (!wp || !window.__MAP) return;

  window.__MAP.easeTo({
    center: wp.coords,
    zoom: ORBIT_ZOOM_TARGET,
    pitch: ORBIT_PITCH_TARGET,
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
  const R = 6371;
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
  stopOrbit();
  if (!window.__MAP) return;

  const A = getWP(fromID);
  const B = getWP(toID);
  if (!A || !B) return;

  const mode = getLegMode(fromID);
  const dist = LEG_DIST[fromID];
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
      openPopupFor(toID);
      updateHUD();
    }
  }

  requestAnimationFrame(frame);
};

/* ==========================================================================
   UNDO LEG
   ========================================================================== */

window.undoTo = function (targetID) {
  stopOrbit();
  if (!window.__MAP) return;

  currentID = targetID;

  const wp = getWP(targetID);
  window.__MAP.easeTo({
    center: wp.coords,
    zoom: getZoom(targetID),
    pitch: 0,
    bearing: 0,
    duration: 800
  });

  openPopupFor(targetID);
  updateHUD();
};

/* ==========================================================================
   RESET JOURNEY
   ========================================================================== */

window.resetJourney = function () {
  stopOrbit();
  journeyMode = false;
  currentID = null;
  if (!window.__MAP) return;

  window.__MAP.easeTo({
    center: WAYPOINTS[0].coords,
    zoom: getZoom(WAYPOINTS[0].id),
    pitch: 0,
    bearing: 0,
    duration: 900
  });

  closeAllPopups();
  updateHUD();
};

/* ========================================================================== */
/* MAP INITIALIZATION — ATTACH TO EXISTING MAP                                */
/* ========================================================================== */

(function initMapLogic() {
  const map = window.__MAP;

  if (!map || typeof map.once !== "function") {
    console.error("map-logic.js: __MAP is not ready. Ensure map-style.js loads before map-logic.js.");
    return;
  }

  // Precompute all leg distances once the module is evaluated
  computeAllLegDistances();

  // When the base map style has finished loading, wire UI pieces
  map.once("load", () => {
    console.log("%cmap-logic.js fully loaded", "color:#00ff88;font-weight:bold;");

    if (typeof buildMarkers === "function") {
      buildMarkers();
    }

    if (typeof updateHUD === "function") {
      updateHUD();
    }
  });
})();

