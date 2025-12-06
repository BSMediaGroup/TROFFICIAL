/* ========================================================================== */
/* ============================= MAP LOGIC CORE ============================= */
/* ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* 
   This module ONLY:
   - Creates the Mapbox map
   - Provides orbit, journey, and camera-animation logic
   - Exposes functions required by map-ui.js and map-core.js

   It DOES NOT:
   - Build markers
   - Build popups
   - Attach UI listeners
   - Initialize style layers
   - Read map load events directly
*/

/* ========================================================================== */
/* GLOBAL STATE — SHARED ACROSS MODULES                                       */
/* ========================================================================== */

window.__MAP = null;
window.currentID = null;
window.journeyMode = false;

/* Orbit animation state */
let orbitInterval = null;

/* Distance accumulation */
window.TRAVELLED_MI = {};
window.TRAVELLED_KM = {};
window.LEG_DIST = {};

/* Guard to prevent animations before ready */
window.MAP_READY = false;


/* ========================================================================== */
/* WAYPOINT LOOKUP                                                            */
/* ========================================================================== */

window.getWP = function (id) {
  return WAYPOINTS.find(w => w.id === id);
};


/* ========================================================================== */
/* ZOOM LOGIC                                                                  */
/* ========================================================================== */

window.getZoom = function (id) {
  if (["sydney", "la", "toronto"].includes(id)) return 6.7;
  return 9.4;
};


/* ========================================================================== */
/* MODE DETECTION                                                              */
/* ========================================================================== */

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


/* ========================================================================== */
/* ORBIT CAMERA                                                                */
/* ========================================================================== */

window.startOrbit = function (id) {
  stopOrbit();
  if (!MAP_READY) return;

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
/* DISTANCE CALCULATION                                                        */
/* ========================================================================== */

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


/* ========================================================================== */
/* JOURNEY ANIMATION                                                           */
/* ========================================================================== */

window.animateLeg = function (fromID, toID) {
  if (!MAP_READY) return;
  stopOrbit();

  const A = getWP(fromID);
  const B = getWP(toID);

  const mode = getLegMode(fromID);
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
      if (typeof updateHUD === "function") updateHUD();
    }
  }

  requestAnimationFrame(frame);
};


/* ========================================================================== */
/* JOURNEY BACKTRACK                                                           */
/* ========================================================================== */

window.undoTo = function (targetID) {
  if (!MAP_READY) return;
  stopOrbit();
  currentID = targetID;

  const wp = getWP(targetID);
  __MAP.easeTo({
    center: wp.coords,
    zoom: getZoom(targetID),
    pitch: 0,
    bearing: 0,
    duration: 800
  });

  if (typeof openPopupFor === "function") openPopupFor(targetID);
  if (typeof updateHUD === "function") updateHUD();
};


/* ========================================================================== */
/* RESET JOURNEY                                                               */
/* ========================================================================== */

window.resetJourney = function () {
  if (!MAP_READY) return;
  stopOrbit();
  journeyMode = false;
  currentID = null;

  __MAP.easeTo({
    center: WAYPOINTS[0].coords,
    zoom: getZoom(WAYPOINTS[0].id),
    pitch: 0,
    bearing: 0,
    duration: 900
  });

  if (typeof closeAllPopups === "function") closeAllPopups();
  if (typeof updateHUD === "function") updateHUD();
};


/* ========================================================================== */
/* MAP INITIALIZATION — ONLY PLACE MAP IS CREATED                              */
/* ========================================================================== */

window.addEventListener("DOMContentLoaded", () => {
  computeAllLegDistances();

  window.__MAP = new mapboxgl.Map({
    container: "map",
    style: MAP_STYLE_URL,
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0,
    antialias: true
  });

  console.log("map-logic.js: Map constructed");

  __MAP.once("load", () => {
    console.log("%cmap-logic.js fully loaded", "color:#00ff88;font-weight:bold;");
    MAP_READY = true;
  });
});
