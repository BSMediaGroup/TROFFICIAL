/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 1 — CORE STATE, SPIN LOGIC, DISTANCE SYSTEM
   ============================================================ */

console.log("map-logic.js loaded");

/* ============================================================
   GLOBAL STATE SHARED WITH OTHER MODULES
   ============================================================ */

let currentID = null;
let journeyMode = false;
let spinning = true;
let userInterrupted = false;
let MAP_READY = false;

/* The map object is provided by map-style.js as window.__MAP */
const map = window.__MAP;

/* Shared references updated later */
let orbitEnterTimer = null;
let orbitAnimFrame = null;
let orbitTargetId = null;

/* ============================================================
   SPINNING GLOBE — TRUE EARTH AXIS ROTATION
   ============================================================ */

function spinGlobe() {
  if (!spinning || journeyMode) return;

  const c = map.getCenter();
  const newLon = c.lng - 0.02;

  const t = Date.now() * 0.00005;
  const pitch = 10 + Math.sin(t) * 3;

  map.setCenter([newLon, c.lat]);
  map.setPitch(pitch);

  requestAnimationFrame(spinGlobe);
}

/* Stop spin on user interaction */
["mousedown","touchstart","wheel","keydown"].forEach(ev => {
  map.on(ev, e => {
    if (!e.originalEvent) return;
    spinning = false;
    userInterrupted = true;

    if (!journeyMode) {
      const btn = document.getElementById("resetStaticMap");
      if (btn) btn.style.display = "block";
    }

    stopOrbit();
  });
});

/* ============================================================
   DISTANCE STORAGE
   ============================================================ */

const LEG_DIST     = {};  // distance between successive trip order legs
const TRAVELLED_KM = {};  // cumulative
const TRAVELLED_MI = {};  // cumulative

/* Haversine (duplicate kept for logic compatibility) */
function haversine(a,b){
  const R=6371, toRad=d=>d*Math.PI/180;
  const dLat=toRad(b[1]-a[1]);
  const dLon=toRad(b[0]-a[0]);
  const lat1=toRad(a[1]);
  const lat2=toRad(b[1]);
  const h=Math.sin(dLat/2)**2 +
           Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

function getWP(id) {
  return WAYPOINTS.find(w => w.id === id);
}

/* ============================================================
   INITIALIZE TRIP DISTANCES
   ============================================================ */

function initDistances() {
  let kmSum = 0;
  let miSum = 0;

  TRIP_ORDER.forEach((id, i) => {
    if (i === 0) {
      TRAVELLED_KM[id] = 0;
      TRAVELLED_MI[id] = 0;
      return;
    }

    const prev = getWP(TRIP_ORDER[i - 1]);
    const cur  = getWP(id);
    const km   = haversine(prev.coords, cur.coords);
    const mi   = km * 0.621371;

    LEG_DIST[prev.id] = {
      km: +km.toFixed(1),
      mi: +mi.toFixed(1)
    };

    kmSum += km;
    miSum += mi;

    TRAVELLED_KM[id] = +kmSum.toFixed(1);
    TRAVELLED_MI[id] = +miSum.toFixed(1);
  });

  const last = TRIP_ORDER.at(-1);
  const legend = document.getElementById("legendTotalDistance");
  if (legend) {
    legend.textContent =
      `Total Distance: ${TRAVELLED_MI[last]}mi (${TRAVELLED_KM[last]}km)`;
  }
}

/* ============================================================
   UTILITY COPYING FROM ORIGINAL (for route building)
   ============================================================ */

function normalizeCoord(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  lat = Math.max(-89.999999, Math.min(89.999999, lat));
  return [lon, lat];
}

function toRad(deg){ return deg*Math.PI/180; }
function toDeg(rad){ return rad*180/Math.PI; }

/* EXPORT SECTION 1 FUNCTIONS GLOBALLY IF NEEDED */
window.spinGlobe = spinGlobe;
window.initDistances = initDistances;
window.getWP = getWP;
window.LEG_DIST = LEG_DIST;
window.TRAVELLED_KM = TRAVELLED_KM;
window.TRAVELLED_MI = TRAVELLED_MI;

/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 2 — ROUTING SYSTEM
   ============================================================ */

/* Great-circle routing with dateline fix */
function buildGreatCircle(fromId, toId, steps = 220) {
  const [lon1d, lat1] = getWP(fromId).coords;
  const [lon2d, lat2] = getWP(toId).coords;

  let λ1 = toRad(lon1d);
  let λ2 = toRad(lon2d);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  let dλ = λ2 - λ1;

  /* ZIGZAG FIX — ensure shortest Pacific path */
  if (Math.abs(dλ) > Math.PI) {
    if (dλ > 0) λ1 += 2 * Math.PI;
    else        λ2 += 2 * Math.PI;
    dλ = λ2 - λ1;
  }

  const Δ = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  ));

  if (!Number.isFinite(Δ) || Δ === 0) {
    const p1 = normalizeCoord(lon1d, lat1);
    const p2 = normalizeCoord(lon2d, lat2);
    return [p1, p2].filter(Boolean);
  }

  const coords = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * Δ) / Math.sin(Δ);
    const B = Math.sin(f * Δ) / Math.sin(Δ);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);

    const lon = toDeg(λ);
    const lat = toDeg(φ);

    const norm = normalizeCoord(lon, lat);
    if (norm) coords.push(norm);
  }

  return coords;
}

/* ============================================================
   STATIC FLIGHT ROUTE (Sydney → LA → Toronto)
   ============================================================ */

function addStaticRoutes() {
  const SYD_LA = buildGreatCircle("sydney", "la");
  const LA_TOR = buildGreatCircle("la", "toronto").slice(1);

  const allFlight = [...SYD_LA, ...LA_TOR];

  map.addSource("flight-route", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: allFlight },
      bbox: [-180, -90, 180, 90],
      wrap: false
    }
  });

  map.addLayer({
    id: "flight-route",
    type: "line",
    source: "flight-route",
    paint: {
      "line-color": "#478ED3",
      "line-width": 3,
      "line-dasharray": [3, 2],
      "line-opacity": 0.9
    }
  });
}

/* ============================================================
   DRIVING ROUTE (Mapbox Directions API)
   ============================================================ */

let DRIVING_GEOM = [];
let DRIVE_INDEX  = {};

async function buildDrivingRoute() {
  const coords = DRIVE_ORDER.map(id => getWP(id).coords);
  if (coords.length < 2) return;

  const url =
    "https://api.mapbox.com/directions/v5/mapbox/driving/" +
    coords.map(c => c.join(",")).join(";") +
    `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url);
  const json = await res.json();
  if (!json.routes || !json.routes.length) return;

  DRIVING_GEOM = json.routes[0].geometry.coordinates;

  map.addSource("drive-route", {
    type: "geojson",
    data: json.routes[0].geometry
  });

  map.addLayer({
    id: "drive-route",
    type: "line",
    source: "drive-route",
    paint: {
      "line-color": "#FF9C57",
      "line-width": 4,
      "line-opacity": 0.95
    }
  });

  coords.forEach((wp, i) => {
    let bestIndex = 0;
    let bestDist = Infinity;

    DRIVING_GEOM.forEach((c, n) => {
      const d = haversine(wp, c);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = n;
      }
    });

    DRIVE_INDEX[DRIVE_ORDER[i]] = bestIndex;
  });
}

/* ============================================================
   ROAD SEGMENT BUILDER
   ============================================================ */

function roadLeg(a, b) {
  if (!DRIVING_GEOM.length) return [];

  let s = DRIVE_INDEX[a];
  let e = DRIVE_INDEX[b];

  if (typeof s !== "number" || typeof e !== "number") return [];

  if (s > e) [s, e] = [e, s];

  return DRIVING_GEOM.slice(s, e + 1);
}

/* ============================================================
   FLIGHT vs DRIVE DECISION
   ============================================================ */

function isFlight(a, b) {
  return (a === "sydney" && b === "la") ||
         (a === "la" && b === "toronto");
}

/* ============================================================
   BUILD COMPLETED ROUTE UNTIL A GIVEN WAYPOINT
   ============================================================ */

function buildCompleteUntil(id) {
  const out = { flight: [], drive: [] };

  const append = (arr, seg) => {
    if (!seg.length) return;
    if (!arr.length) {
      arr.push(...seg);
    } else {
      /* Remove duplicate join point */
      arr.push(...seg.slice(1));
    }
  };

  const idx = TRIP_ORDER.indexOf(id);

  for (let i = 0; i < idx; i++) {
    const a = TRIP_ORDER[i];
    const b = TRIP_ORDER[i + 1];

    if (isFlight(a, b)) {
      append(out.flight, buildGreatCircle(a, b));
    } else {
      append(out.drive, roadLeg(a, b));
    }
  }

  return out;
}

/* EXPORT SECTION 2 FUNCTIONS GLOBALLY IF NEEDED */
window.buildGreatCircle = buildGreatCircle;
window.addStaticRoutes = addStaticRoutes;
window.buildDrivingRoute = buildDrivingRoute;
window.roadLeg = roadLeg;
window.isFlight = isFlight;
window.buildCompleteUntil = buildCompleteUntil;

/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 3 — JOURNEY ENGINE
   ============================================================ */

/* Wrap line coordinates into a GeoJSON feature */
function makeLineFeature(coords) {
  return {
    type: "Feature",
    geometry: {
      type: "LineString",
      coordinates: Array.isArray(coords) ? coords : []
    }
  };
}

/* ============================================================
   ANIMATE A LEG (Sydney → LA special case preserved)
   ============================================================ */

function animateLeg(a, b) {
  if (a === b) return;
  if (!map || !map.isStyleLoaded()) return;

  stopOrbit();

  const isF = isFlight(a, b);
  const seg = isF ? buildGreatCircle(a, b) : roadLeg(a, b);
  if (!Array.isArray(seg) || seg.length === 0) return;

  const srcF = map.getSource("journey-flight");
  const srcD = map.getSource("journey-drive");
  const srcC = map.getSource("journey-current");
  if (!srcF || !srcD || !srcC) return;

  const comp = buildCompleteUntil(a);

  srcF.setData(makeLineFeature(comp.flight));
  srcD.setData(makeLineFeature(comp.drive));
  srcC.setData(makeLineFeature([]));

  const partialColor = isF ? "#478ED3" : "#FF9C57";
  map.setPaintProperty("journey-current", "line-color", partialColor);
  map.setPaintProperty("journey-current", "line-width", isF ? 3 : 4);
  map.setPaintProperty("journey-current", "line-dasharray", isF ? [3, 2] : [1, 0]);

  const duration = isF ? 4200 : 1800;

  const FLIGHT_TRAVEL_ZOOM = 3.0;
  const ROAD_TRAVEL_ZOOM   = ORBIT_ZOOM_TARGET - 2.5;

  const sydneyToLA   = (a === "sydney" && b === "la");
  const laToToronto  = (a === "la" && b === "toronto");

  let travelZoom;

  if (isF) {
    if (laToToronto) {
      travelZoom = (FLIGHT_TRAVEL_ZOOM + JOURNEY_ZOOM_LA) / 2;
    } else {
      travelZoom = FLIGHT_TRAVEL_ZOOM;
    }
  } else {
    travelZoom = ROAD_TRAVEL_ZOOM;
  }

  /* ============================================================
     SPECIAL CASE: SYDNEY → LA (three-stage camera animation)
     ============================================================ */
  if (sydneyToLA) {
    const smooth = t => t * t * (3 - 2 * t);

    const Syd = getWP(a);
    const LA  = getWP(b);
    if (!Syd || !LA) return;

    const PHASE1 = 1600;
    const PHASE2 = 1600;
    const PHASE3 = 2200;
    const finalZoom = JOURNEY_ZOOM_LA;

    map.easeTo({
      center: Syd.coords,
      zoom: 3.5,
      pitch: 0,
      bearing: map.getBearing(),
      duration: PHASE1,
      easing: smooth
    });

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: 3.5,
        pitch: 0,
        bearing: map.getBearing(),
        duration: PHASE2,
        easing: smooth
      });
    }, PHASE1);

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: finalZoom,
        pitch: JOURNEY_PITCH_TARGET,
        bearing: map.getBearing(),
        duration: PHASE3,
        easing: smooth
      });
    }, PHASE1 + PHASE2);

    /* Finalize movement */
    setTimeout(() => {
      currentID = b;
      openPopupFor(b);
      startOrbit(b);
      updateHUD();

      if (detailsSidebar.classList.contains("open")) {
        openDetailsSidebar(b);
      }
    }, PHASE1 + PHASE2 + PHASE3);

    /* Polyline animator */
    const start = performance.now();
    const total = seg.length;

    function frame(t) {
      const prog = Math.min((t - start) / duration, 1);
      const count = Math.max(2, Math.floor(prog * total));
      const partial = seg.slice(0, count);

      srcC.setData(makeLineFeature(partial));

      if (prog < 1) {
        requestAnimationFrame(frame);
      } else {
        const after = buildCompleteUntil(b);
        srcF.setData(makeLineFeature(after.flight));
        srcD.setData(makeLineFeature(after.drive));
        srcC.setData(makeLineFeature([]));
      }
    }

    requestAnimationFrame(frame);
    return;
  }

  /* ============================================================
     STANDARD LEG ANIMATION
     ============================================================ */

  const targetWP = getWP(b);
  if (!targetWP) return;

  map.easeTo({
    center: targetWP.coords,
    zoom: travelZoom,
    pitch: 0,
    bearing: 0,
    duration: duration + 400,
    essential: false
  });

  const startTime = performance.now();
  const totalCount = seg.length;

  function frameStandard(t) {
    const prog = Math.min((t - startTime) / duration, 1);
    const count = Math.max(2, Math.floor(prog * totalCount));
    const partial = seg.slice(0, count);

    srcC.setData(makeLineFeature(partial));

    if (prog < 1) {
      requestAnimationFrame(frameStandard);
    } else {
      const after = buildCompleteUntil(b);
      srcF.setData(makeLineFeature(after.flight));
      srcD.setData(makeLineFeature(after.drive));
      srcC.setData(makeLineFeature([]));

      openPopupFor(b);
      currentID = b;
      focusJourneyOrbit(b);
      updateHUD();

      if (detailsSidebar.classList.contains("open")) {
        openDetailsSidebar(b);
      }
    }
  }

  requestAnimationFrame(frameStandard);
}

/* ============================================================
   UNDO LEG (step backward one waypoint)
   ============================================================ */

function undoTo(id) {
  stopOrbit();

  const srcF = map.getSource("journey-flight");
  const srcD = map.getSource("journey-drive");
  const srcC = map.getSource("journey-current");
  if (!srcF || !srcD || !srcC) return;

  const comp = buildCompleteUntil(id);

  srcF.setData(makeLineFeature(comp.flight));
  srcD.setData(makeLineFeature(comp.drive));
  srcC.setData(makeLineFeature([]));

  openPopupFor(id);
  currentID = id;

  focusJourneyOrbit(id);
  updateHUD();

  if (detailsSidebar.classList.contains("open")) {
    openDetailsSidebar(id);
  }
}

/* ============================================================
   RESET JOURNEY
   ============================================================ */

function resetJourney() {
  if (!MAP_READY) return;

  journeyMode = false;
  spinning = true;
  userInterrupted = false;
  currentID = null;

  document.getElementById("journeyToggle").textContent = "Start Journey";
  document.getElementById("resetStaticMap").style.display = "none";

  closeAllPopups();
  stopOrbit();

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "none");
      const src = map.getSource(id);
      if (src) src.setData(makeLineFeature([]));
    }
  });

  if (map.getLayer("flight-route"))
    map.setLayoutProperty("flight-route","visibility","visible");
  if (map.getLayer("drive-route"))
    map.setLayoutProperty("drive-route","visibility","visible");

  map.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0
  });

  spinGlobe();
  updateHUD();
}

/* ============================================================
   STATIC MAP RESET BUTTON
   ============================================================ */
document.getElementById("resetStaticMap").addEventListener("click", () => {
  if (journeyMode) return;

  userInterrupted = false;
  spinning = true;

  closeAllPopups();
  stopOrbit();

  map.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0
  });

  spinGlobe();
  document.getElementById("resetStaticMap").style.display = "none";
});

/* ============================================================
   JOURNEY TOGGLE BUTTON
   ============================================================ */

document.getElementById("journeyToggle").addEventListener("click", () => {
  if (journeyMode) resetJourney();
  else startJourney();
});

/* ============================================================
   START JOURNEY
   ============================================================ */

function startJourney() {
  if (!MAP_READY) return;

  journeyMode = true;
  spinning = false;
  userInterrupted = true;

  const journeyToggleBtn = document.getElementById("journeyToggle");
  const resetBtn = document.getElementById("resetStaticMap");

  if (journeyToggleBtn) journeyToggleBtn.textContent = "Reset Journey";
  if (resetBtn) resetBtn.style.display = "none";

  currentID = TRIP_ORDER[0];

  if (map.getLayer("flight-route"))
    map.setLayoutProperty("flight-route", "visibility", "none");
  if (map.getLayer("drive-route"))
    map.setLayoutProperty("drive-route", "visibility", "none");

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible");
    const src = map.getSource(id);
    if (src) src.setData(makeLineFeature([]));
  });

  openPopupFor(currentID);

  const wp = getWP(currentID);
  if (!wp) {
    updateHUD();
    return;
  }

  const START_PAN_DURATION   = 1800;
  const START_FOCUS_DURATION = 2200;

  const isLaOrToronto = (currentID === "la" || currentID === "toronto");
  const journeyZoom   = isLaOrToronto ? JOURNEY_ZOOM_LA : JOURNEY_ZOOM_DEFAULT;

  stopOrbit();

  map.easeTo({
    center: wp.coords,
    zoom: 3.5,
    pitch: 0,
    bearing: map.getBearing(),
    duration: START_PAN_DURATION,
    easing: t => t * t * (3 - 2 * t)
  });

  setTimeout(() => {
    map.easeTo({
      center: wp.coords,
      zoom: journeyZoom,
      pitch: JOURNEY_PITCH_TARGET,
      bearing: map.getBearing(),
      duration: START_FOCUS_DURATION,
      easing: t => t * t * (3 - 2 * t)
    });
  }, START_PAN_DURATION);

  if (orbitEnterTimer !== null) {
    clearTimeout(orbitEnterTimer);
    orbitEnterTimer = null;
  }
  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(currentID);
  }, START_PAN_DURATION + START_FOCUS_DURATION);

  updateHUD();
}

/* EXPORT SECTION 3 FUNCTIONS */
window.animateLeg = animateLeg;
window.undoTo = undoTo;
window.resetJourney = resetJourney;
window.startJourney = startJourney;
window.makeLineFeature = makeLineFeature;


/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 4 — ORBIT SYSTEM, HUD LOGIC, MAP INIT, EXPORTS
   ============================================================ */

/* ============================================================
   ORBIT CAMERA CONSTANTS
   ============================================================ */

const ORBIT_ZOOM_TARGET    = 12.5;
const ORBIT_PITCH_TARGET   = 75;
const ORBIT_ROTATION_SPEED = 0.03;
const ORBIT_ENTRY_DURATION = 900;

const JOURNEY_PITCH_TARGET = 55;
const JOURNEY_ZOOM_DEFAULT = ORBIT_ZOOM_TARGET;
const JOURNEY_ZOOM_LA      = ORBIT_ZOOM_TARGET * 0.5;

/* ============================================================
   ORBIT CONTROL
   ============================================================ */

function stopOrbit() {
  if (orbitEnterTimer !== null) {
    clearTimeout(orbitEnterTimer);
    orbitEnterTimer = null;
  }
  if (orbitAnimFrame !== null) {
    cancelAnimationFrame(orbitAnimFrame);
    orbitAnimFrame = null;
  }
  orbitTargetId = null;
}

function startOrbit(id) {
  orbitTargetId = id;
  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

function orbitLoop() {
  if (!orbitTargetId) return;

  const wp = getWP(orbitTargetId);
  if (!wp) {
    stopOrbit();
    return;
  }

  const newBearing = map.getBearing() + ORBIT_ROTATION_SPEED;
  map.setBearing(newBearing);

  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

function focusWaypointOrbit(id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  map.easeTo({
    center: wp.coords,
    zoom: ORBIT_ZOOM_TARGET,
    pitch: ORBIT_PITCH_TARGET,
    bearing: map.getBearing(),
    duration: ORBIT_ENTRY_DURATION
  });

  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(id);
  }, ORBIT_ENTRY_DURATION);
}

function focusJourneyOrbit(id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  const isLaOrToronto = (id === "la" || id === "toronto");
  const journeyZoom   = isLaOrOrToronto ? JOURNEY_ZOOM_LA : JOURNEY_ZOOM_DEFAULT;

  map.easeTo({
    center: wp.coords,
    zoom: journeyZoom,
    pitch: JOURNEY_PITCH_TARGET,
    bearing: map.getBearing(),
    duration: ORBIT_ENTRY_DURATION
  });

  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(id);
  }, ORBIT_ENTRY_DURATION);
}

/* Disable orbit on real user actions */
["mousedown","wheel","touchstart","dragstart"].forEach(ev => {
  map.on(ev, () => stopOrbit());
});

/* ============================================================
   HUD LOGIC (logic-only)
   ============================================================ */

const hud      = document.getElementById("journeyHud");
const hudPrev  = document.getElementById("hudPrev");
const hudNext  = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

function getZoom(id) {
  if (["sydney", "la", "toronto"].includes(id)) return 6.7;
  return 9.4;
}

function getLegMode(id) {
  const idx  = TRIP_ORDER.indexOf(id);
  const next = TRIP_ORDER[idx + 1];
  if (next && isFlight(id, next)) return "Plane";
  return getWP(id).mode;
}

function updateHUD() {
  if (!journeyMode) {
    hud.style.display = "none";
    return;
  }

  hud.style.display = "block";

  const idx  = TRIP_ORDER.indexOf(currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  hudPrev.disabled = !prev;

  if (next) {
    const d = LEG_DIST[currentID];
    let distLabel = "";
    if (d) distLabel = ` – ${d.mi}mi (${d.km}km)`;

    hudNext.textContent = "Next Stop" + distLabel;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  if (next) {
    const mode = getLegMode(currentID);
    const icon = MODE_ICONS[mode];
    const wp   = getWP(next);

    hudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="hud-mode-icon"> ${escapeHTML(wp.location)} ` +
      `<span class="hud-flag" style="background-image:url('${wp.meta.flag}')"></span>`;
  } else {
    hudLabel.textContent = "";
  }
}

/* HUD event listeners */
hudPrev.addEventListener("click", () => {
  if (!journeyMode) return;
  const idx = TRIP_ORDER.indexOf(currentID);
  if (idx > 0) undoTo(TRIP_ORDER[idx - 1]);
});

hudNext.addEventListener("click", () => {
  if (!journeyMode) return;
  const idx = TRIP_ORDER.indexOf(currentID);
  if (idx < TRIP_ORDER.length - 1) animateLeg(currentID, TRIP_ORDER[idx + 1]);
});

/* ============================================================
   MAP LOAD INITIALIZER
   ============================================================ */

map.on("load", async () => {
  initDistances();

  /* These now come from style module, NOT duplicated */
  await window.addNation("aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF", 0.12
  );
  await window.addNation("can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424", 0.12
  );
  await window.addNation("usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF", 0.12
  );

  addStaticRoutes();
  await buildDrivingRoute();
  addJourneySources();
  window.buildMarkers();

  MAP_READY = true;
  spinGlobe();
});

/* Add journey polyline source placeholders */
function addJourneySources() {
  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    map.addSource(id, {
      type: "geojson",
      data: { type:"Feature", geometry:{ type:"LineString", coordinates: [] }}
    });

    map.addLayer({
      id,
      type: "line",
      source: id,
      layout: { "visibility":"none", "line-cap":"round", "line-join":"round" },
      paint: {
        "line-color": "#FF9C57",
        "line-width": 4,
        "line-opacity": 0.95
      }
    });
  });

  map.setPaintProperty("journey-flight", "line-color", "#478ED3");
  map.setPaintProperty("journey-flight", "line-dasharray", [3, 2]);
  map.setPaintProperty("journey-flight", "line-width", 3);
}

/* ============================================================
   FINAL EXPORTS
   ============================================================ */

window.stopOrbit = stopOrbit;
window.startOrbit = startOrbit;
window.focusWaypointOrbit = focusWaypointOrbit;
window.focusJourneyOrbit = focusJourneyOrbit;
window.updateHUD = updateHUD;
window.ORBIT_ZOOM_TARGET = ORBIT_ZOOM_TARGET;
window.ORBIT_PITCH_TARGET = ORBIT_PITCH_TARGET;
window.JOURNEY_PITCH_TARGET = JOURNEY_PITCH_TARGET;
window.JOURNEY_ZOOM_DEFAULT = JOURNEY_ZOOM_DEFAULT;
window.JOURNEY_ZOOM_LA = JOURNEY_ZOOM_LA;
window.addJourneySources = addJourneySources;
