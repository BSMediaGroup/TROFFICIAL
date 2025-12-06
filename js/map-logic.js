/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 1 — MAP INIT, SPIN ENGINE, INTERACTION HOOKS
   ============================================================ */

console.log("map-logic.js loaded");

/* ============================================================
   MAP READY HOOK
   ============================================================ */

window.__MAP.on("load", () => {
  MAP_READY = true;
});

/* ============================================================
   TRUE EARTH AXIS SPIN (WEST → EAST)
   Matches original behaviour exactly.
   ============================================================ */

function spinGlobe() {
  if (!spinning || journeyMode) return;

  const c = window.__MAP.getCenter();
  const newLon = c.lng - 0.02;

  const t = Date.now() * 0.00005;
  const pitch = 10 + Math.sin(t) * 3;

  window.__MAP.setCenter([newLon, c.lat]);
  window.__MAP.setPitch(pitch);

  requestAnimationFrame(spinGlobe);
}

/* ============================================================
   STOP SPIN ON USER INTERACTION
   (original behaviour preserved exactly)
   ============================================================ */

["mousedown","touchstart","wheel","keydown"].forEach(ev => {
  window.__MAP.on(ev, e => {
    if (!e.originalEvent) return;

    spinning = false;
    userInterrupted = true;

    if (!journeyMode) {
      const btn = document.getElementById("resetStaticMap");
      if (btn) btn.style.display = "block";
    }

    stopOrbit(); // orbit engine comes later
  });
});

/* ============================================================
   UTILITY — GET WAYPOINT BY ID
   ============================================================ */

function getWP(id) {
  return WAYPOINTS.find(w => w.id === id);
}

/* ============================================================
   UTILITY — ESCAPE HTML FOR SAFE INJECTION
   ============================================================ */

function escapeHTML(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ============================================================
   EXPORTS (SECTION 1)
   ============================================================ */

window.spinGlobe = spinGlobe;
window.getWP = getWP;
window.escapeHTML = escapeHTML;

console.log("%cmap-logic.js (section 1) loaded", "color:#00e5ff;font-weight:bold;");


/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 2 — DISTANCE ENGINE + GREAT CIRCLE GENERATOR
   ============================================================ */

/* ============================================================
   STORAGE FOR LEG DISTANCES + TRAVELLED DISTANCE MAPS
   ============================================================ */

window.LEG_DIST     = {};
window.TRAVELLED_KM = {};
window.TRAVELLED_MI = {};

/* ============================================================
   HAVERSINE DISTANCE
   ============================================================ */

function haversine(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;

  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h = Math.sin(dLat/2)**2 +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon/2)**2;

  return 2 * R * Math.asin(Math.sqrt(h)); // km
}

/* ============================================================
   INIT DISTANCES (TRIP ORDER)
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

    const km = haversine(prev.coords, cur.coords);
    const mi = km * 0.621371;

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
  const el = document.getElementById("legendTotalDistance");
  if (el) {
    el.textContent = `Total Distance: ${TRAVELLED_MI[last]}mi (${TRAVELLED_KM[last]}km)`;
  }
}

/* ============================================================
   NORMALIZE COORDINATES
   Keeps longitude in [-180,180], clamps latitude
   ============================================================ */

function normalizeCoord(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  lat = Math.max(-89.999999, Math.min(89.999999, lat));
  return [lon, lat];
}

/* ============================================================
   DEGREES <-> RADIANS HELPERS
   ============================================================ */

function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }

/* ============================================================
   GREAT CIRCLE — ZIGZAG-FIXED VERSION
   EXACT COPY OF YOUR PROVEN FIXED IMPLEMENTATION
   ============================================================ */

function buildGreatCircle(fromId, toId, steps = 220) {
  const [lon1d, lat1] = getWP(fromId).coords;
  const [lon2d, lat2] = getWP(toId).coords;

  let λ1 = toRad(lon1d);
  let λ2 = toRad(lon2d);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  let dλ = λ2 - λ1;

  /* ------------------------------------------------------------
     ZIGZAG FIX
     If the longitude separation > 180°, wrap around
     ------------------------------------------------------------ */
  if (Math.abs(dλ) > Math.PI) {
    if (dλ > 0) λ1 += 2 * Math.PI;
    else        λ2 += 2 * Math.PI;
    dλ = λ2 - λ1;
  }

  /* Central angle */
  const Δ = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2)**2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2)**2
  ));

  /* Identical coords fallback */
  if (!Number.isFinite(Δ) || Δ === 0) {
    const p1 = normalizeCoord(lon1d, lat1);
    const p2 = normalizeCoord(lon2d, lat2);
    return [p1, p2].filter(Boolean);
  }

  const coords = [];

  /* Interpolate great circle positions */
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;

    const A = Math.sin((1 - f) * Δ) / Math.sin(Δ);
    const B = Math.sin(f * Δ) / Math.sin(Δ);

    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1)              + B * Math.sin(φ2);

    const φ = Math.atan2(z, Math.sqrt(x*x + y*y));
    const λ = Math.atan2(y, x);

    const lon = toDeg(λ);
    const lat = toDeg(φ);

    const norm = normalizeCoord(lon, lat);
    if (norm) coords.push(norm);
  }

  return coords;
}

/* ============================================================
   EXPORT SECTION 2
   ============================================================ */

window.haversine = haversine;
window.initDistances = initDistances;
window.normalizeCoord = normalizeCoord;
window.buildGreatCircle = buildGreatCircle;

console.log("%cmap-logic.js (section 2) loaded", "color:#00e5ff;font-weight:bold;");


/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 3 — STATIC ROUTES + DRIVING ROUTE ENGINE
   ============================================================ */

/* ============================================================
   DRIVING ROUTE STORAGE
   ============================================================ */

window.DRIVING_GEOM = [];
window.DRIVE_INDEX  = {};

/* ============================================================
   STATIC FLIGHT ROUTE LAYER
   (Uses great-circle generator)
   ============================================================ */

function addStaticRoutes() {
  const SYD_LA = buildGreatCircle("sydney", "la");
  const LA_YTZ = buildGreatCircle("la", "toronto").slice(1);

  const allFlight = [...SYD_LA, ...LA_YTZ];

  window.__MAP.addSource("flight-route", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: allFlight },
      bbox: [-180, -90, 180, 90],
      wrap: false
    }
  });

  window.__MAP.addLayer({
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
   DRIVING ROUTE (MAPBOX DIRECTIONS API)
   ============================================================ */

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

  /* Push layer + source */
  window.__MAP.addSource("drive-route", {
    type: "geojson",
    data: json.routes[0].geometry
  });

  window.__MAP.addLayer({
    id: "drive-route",
    type: "line",
    source: "drive-route",
    paint: {
      "line-color": "#FF9C57",
      "line-width": 4,
      "line-opacity": 0.95
    }
  });

  /* ========================================================
     BUILD DRIVE_INDEX (closest geometry point per waypoint)
     ======================================================== */

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
   EXPORT SECTION 3
   ============================================================ */

window.addStaticRoutes = addStaticRoutes;
window.buildDrivingRoute = buildDrivingRoute;
window.roadLeg = roadLeg;

console.log("%cmap-logic.js (section 3) loaded", "color:#00e5ff;font-weight:bold;");


/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 4 — ORBIT CAMERA ENGINE
   ============================================================ */

/* ============================================================
   ORBIT ENGINE STATE
   ============================================================ */

let orbitTargetId   = null;
let orbitAnimFrame  = null;
let orbitEnterTimer = null;

/* ============================================================
   STOP ANY ACTIVE ORBIT
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

/* ============================================================
   START CONTINUOUS ORBIT
   ============================================================ */

function startOrbit(id) {
  orbitTargetId = id;
  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

/* ============================================================
   ORBIT LOOP — BEARING ROTATION
   ============================================================ */

function orbitLoop() {
  if (!orbitTargetId) return;

  const wp = getWP(orbitTargetId);
  if (!wp) {
    stopOrbit();
    return;
  }

  const newBearing = window.__MAP.getBearing() + ORBIT_ROTATION_SPEED;
  window.__MAP.setBearing(newBearing);

  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

/* ============================================================
   MANUAL / DOUBLE-CLICK FOCUS (PITCH 75°)
   ============================================================ */

function focusWaypointOrbit(id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  window.__MAP.easeTo({
    center: wp.coords,
    zoom: ORBIT_ZOOM_TARGET,
    pitch: ORBIT_PITCH_TARGET,  // 75°
    bearing: window.__MAP.getBearing(),
    duration: ORBIT_ENTRY_DURATION
  });

  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(id);
  }, ORBIT_ENTRY_DURATION);
}

/* ============================================================
   JOURNEY-MODE ORBIT (PITCH 55°)
   ============================================================ */

function focusJourneyOrbit(id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  const isLaOrToronto = (id === "la" || id === "toronto");
  const journeyZoom   = isLaOrToronto ? JOURNEY_ZOOM_LA : JOURNEY_ZOOM_DEFAULT;

  window.__MAP.easeTo({
    center: wp.coords,
    zoom: journeyZoom,
    pitch: JOURNEY_PITCH_TARGET,   // 55°
    bearing: window.__MAP.getBearing(),
    duration: ORBIT_ENTRY_DURATION
  });

  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(id);
  }, ORBIT_ENTRY_DURATION);
}

/* ============================================================
   STOP ORBIT ON REAL USER INPUT (IDENTICAL TO ORIGINAL)
   ============================================================ */

["mousedown", "wheel", "touchstart", "dragstart"].forEach(ev => {
  window.__MAP.on(ev, () => {
    stopOrbit();
  });
});

/* ============================================================
   EXPORT SECTION 4
   ============================================================ */

window.stopOrbit = stopOrbit;
window.startOrbit = startOrbit;
window.focusWaypointOrbit = focusWaypointOrbit;
window.focusJourneyOrbit  = focusJourneyOrbit;

console.log("%cmap-logic.js (section 4) loaded", "color:#00e5ff;font-weight:bold;");


/* ============================================================
   MAP LOGIC MODULE — v2
   SECTION 5 — JOURNEY ENGINE + ROUTE ANIMATIONS + INIT HOOK
   ============================================================ */

/* ============================================================
   BASIC GEOJSON LINE FEATURE MAKER
   ============================================================ */

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
   ANIMATE LEG (FLIGHT OR ROAD)
   ============================================================ */

function animateLeg(a, b) {
  if (a === b) return;
  if (!window.__MAP || !window.__MAP.isStyleLoaded()) return;

  stopOrbit();

  const isF = isFlight(a, b);
  const seg = isF ? buildGreatCircle(a, b) : roadLeg(a, b);
  if (!Array.isArray(seg) || seg.length === 0) return;

  const srcF = window.__MAP.getSource("journey-flight");
  const srcD = window.__MAP.getSource("journey-drive");
  const srcC = window.__MAP.getSource("journey-current");

  if (!srcF || !srcD || !srcC) return;

  /* Completed segments up to A */
  const comp = buildCompleteUntil(a);

  srcF.setData(makeLineFeature(comp.flight));
  srcD.setData(makeLineFeature(comp.drive));
  srcC.setData(makeLineFeature([]));

  const partialColor = isF ? "#478ED3" : "#FF9C57";

  window.__MAP.setPaintProperty("journey-current", "line-color", partialColor);
  window.__MAP.setPaintProperty("journey-current", "line-width", isF ? 3 : 4);
  window.__MAP.setPaintProperty(
    "journey-current",
    "line-dasharray",
    isF ? [3, 2] : [1, 0]
  );

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
     SPECIAL 3-PHASE SYD → LA ANIMATION
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

    /* PHASE 1 */
    window.__MAP.easeTo({
      center: Syd.coords,
      zoom: 3.5,
      pitch: 0,
      bearing: window.__MAP.getBearing(),
      duration: PHASE1,
      easing: smooth
    });

    /* PHASE 2 */
    setTimeout(() => {
      window.__MAP.easeTo({
        center: LA.coords,
        zoom: 3.5,
        pitch: 0,
        bearing: window.__MAP.getBearing(),
        duration: PHASE2,
        easing: smooth
      });
    }, PHASE1);

    /* PHASE 3 */
    setTimeout(() => {
      window.__MAP.easeTo({
        center: LA.coords,
        zoom: finalZoom,
        pitch: JOURNEY_PITCH_TARGET,
        bearing: window.__MAP.getBearing(),
        duration: PHASE3,
        easing: smooth
      });
    }, PHASE1 + PHASE2);

    /* Finalize (open popup + start orbit) */
    setTimeout(() => {
      currentID = b;
      openPopupFor(b);
      startOrbit(b);
      updateHUD();

      if (detailsSidebar.classList.contains("open")) {
        openDetailsSidebar(b);
      }
    }, PHASE1 + PHASE2 + PHASE3);

    /* Polyline animation */
    const start = performance.now();
    const total = seg.length;

    function frame(t) {
      const prog = Math.min((t - start) / duration, 1);
      const count = Math.max(2, Math.floor(prog * total));
      const partial = seg.slice(0, count);

      srcC.setData(makeLineFeature(partial));

      if (prog < 1) requestAnimationFrame(frame);
      else {
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
     NORMAL JOURNEY ANIMATION
     ============================================================ */

  const targetWP = getWP(b);
  if (!targetWP) return;

  window.__MAP.easeTo({
    center: targetWP.coords,
    zoom: travelZoom,
    pitch: 0,
    bearing: 0,
    duration: duration + 400,
    essential: false
  });

  const startStandard = performance.now();
  const totalStandard = seg.length;

  function frameStandard(t) {
    const prog = Math.min((t - startStandard) / duration, 1);
    const count = Math.max(2, Math.floor(prog * totalStandard));
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
   UNDO LEG (STEP BACKWARD)
   ============================================================ */

function undoTo(id) {
  stopOrbit();

  const srcF = window.__MAP.getSource("journey-flight");
  const srcD = window.__MAP.getSource("journey-drive");
  const srcC = window.__MAP.getSource("journey-current");

  if (!srcF || !srcD || !srcC) return;

  const comp = buildCompleteUntil(id);

  srcF.setData({ type:"Feature", geometry:{ type:"LineString", coordinates: comp.flight }});
  srcD.setData({ type:"Feature", geometry:{ type:"LineString", coordinates: comp.drive }});
  srcC.setData({ type:"Feature", geometry:{ type:"LineString", coordinates: [] }});

  openPopupFor(id);
  currentID = id;

  focusJourneyOrbit(id);
  updateHUD();

  if (detailsSidebar.classList.contains("open")) {
    openDetailsSidebar(id);
  }
}

/* ============================================================
   BUILD COMPLETED ROUTE UP TO A GIVEN WAYPOINT
   ============================================================ */

function buildCompleteUntil(id) {
  const out = { flight: [], drive: [] };

  const append = (arr, seg) => {
    if (!seg.length) return;
    if (!arr.length) arr.push(...seg);
    else arr.push(...seg.slice(1));
  };

  const idx = TRIP_ORDER.indexOf(id);

  for (let i = 0; i < idx; i++) {
    const a = TRIP_ORDER[i];
    const b = TRIP_ORDER[i + 1];

    if (isFlight(a, b)) append(out.flight, buildGreatCircle(a, b));
    else append(out.drive, roadLeg(a, b));
  }

  return out;
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
    if (window.__MAP.getLayer(id)) {
      window.__MAP.setLayoutProperty(id, "visibility", "none");
      const src = window.__MAP.getSource(id);
      if (src) src.setData(makeLineFeature([]));
    }
  });

  if (window.__MAP.getLayer("flight-route"))
    window.__MAP.setLayoutProperty("flight-route","visibility","visible");
  if (window.__MAP.getLayer("drive-route"))
    window.__MAP.setLayoutProperty("drive-route","visibility","visible");

  window.__MAP.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0
  });

  spinGlobe();
  updateHUD();
}

/* Reset static map (non-journey) */
document.getElementById("resetStaticMap").addEventListener("click", () => {
  if (journeyMode) return;

  userInterrupted = false;
  spinning = true;

  closeAllPopups();
  stopOrbit();

  window.__MAP.jumpTo({
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
   START JOURNEY (FROM SYDNEY)
   ============================================================ */

function startJourney() {
  if (!MAP_READY) return;

  journeyMode = true;
  spinning = false;
  userInterrupted = true;

  const journeyToggleBtn = document.getElementById("journeyToggle");
  const resetStaticMapBtn = document.getElementById("resetStaticMap");

  if (journeyToggleBtn) journeyToggleBtn.textContent = "Reset Journey";
  if (resetStaticMapBtn) resetStaticMapBtn.style.display = "none";

  currentID = TRIP_ORDER[0];

  if (window.__MAP.getLayer("flight-route"))
    window.__MAP.setLayoutProperty("flight-route","visibility","none");
  if (window.__MAP.getLayer("drive-route"))
    window.__MAP.setLayoutProperty("drive-route","visibility","none");

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    if (window.__MAP.getLayer(id))
      window.__MAP.setLayoutProperty(id, "visibility", "visible");
    const src = window.__MAP.getSource(id);
    if (src)
      src.setData(makeLineFeature([]));
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
  const journeyZoom = isLaOrToronto ? JOURNEY_ZOOM_LA : JOURNEY_ZOOM_DEFAULT;

  stopOrbit();

  window.__MAP.easeTo({
    center: wp.coords,
    zoom: 3.5,
    pitch: 0,
    bearing: window.__MAP.getBearing(),
    duration: START_PAN_DURATION,
    easing: t => t * t * (3 - 2 * t)
  });

  setTimeout(() => {
    window.__MAP.easeTo({
      center: wp.coords,
      zoom: journeyZoom,
      pitch: JOURNEY_PITCH_TARGET,
      bearing: window.__MAP.getBearing(),
      duration: START_FOCUS_DURATION,
      easing: t => t * t * (3 - 2 * t)
    });
  }, START_PAN_DURATION);

  orbitEnterTimer = setTimeout(() => {
    orbitEnterTimer = null;
    startOrbit(currentID);
  }, START_PAN_DURATION + START_FOCUS_DURATION);

  updateHUD();
}

/* ============================================================
   MAP LOAD — BOOTSTRAP ENTIRE SYSTEM
   ============================================================ */

window.__MAP.on("load", async () => {
  initDistances();

  await addNation("aus","https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json","#1561CF",0.12);
  await addNation("can","https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json","#CE2424",0.12);
  await addNation("usa","https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json","#FFFFFF",0.12);

  addStaticRoutes();
  await buildDrivingRoute();
  addJourneySources();
  buildMarkers();

  MAP_READY = true;

  spinGlobe();
});

/* ============================================================
   ADD EMPTY JOURNEY LAYERS
   ============================================================ */

function addJourneySources() {
  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    window.__MAP.addSource(id, {
      type: "geojson",
      data: makeLineFeature([])
    });

    window.__MAP.addLayer({
      id,
      type: "line",
      source: id,
      layout: { "visibility": "none", "line-cap":"round", "line-join":"round" },
      paint: {
        "line-color": "#FF9C57",
        "line-width": 4,
        "line-opacity": 0.95
      }
    });
  });

  window.__MAP.setPaintProperty("journey-flight", "line-color", "#478ED3");
  window.__MAP.setPaintProperty("journey-flight", "line-dasharray", [3, 2]);
  window.__MAP.setPaintProperty("journey-flight", "line-width", 3);
}

/* ============================================================
   MAPBOX POI SEARCH ENGINE
   ============================================================ */

async function fetchPOIs(id) {
  const wp = getWP(id);
  if (!wp || !Array.isArray(wp.coords)) return;

  const [lon, lat] = wp.coords;
  const types = {
    tourist: "tourism",
    toilets: "public_restroom,restroom,toilet",
    hotels:  "lodging,hotel,motel,guest_house,hostel"
  };

  // Clear old results
  document.getElementById("detailsSidebarTouristList").innerHTML = "Loading…";
  document.getElementById("detailsSidebarToiletsList").innerHTML = "Loading…";
  document.getElementById("detailsSidebarHotelsList").innerHTML  = "Loading…";

  const limit = 5;

  async function searchCategory(typeList) {
    const url =
      `https://api.mapbox.com/search/geocode/v6/forward` +
      `?types=poi` +
      `&proximity=${lon},${lat}` +
      `&limit=${limit}` +
      `&q=${encodeURIComponent(typeList)}` +
      `&access_token=${mapboxgl.accessToken}`;

    try {
      const r = await fetch(url);
      const j = await r.json();

      if (!j.features || !j.features.length) return [];

      return j.features.map(f => ({
        name: f.properties.name || "Unnamed",
        distance: f.properties.distance || 0,
        address: f.properties.full_address || "",
        coords: f.geometry.coordinates
      }));
    }
    catch (err) {
      console.error("POI search error:", err);
      return [];
    }
  }

  const [tourist, toilets, hotels] = await Promise.all([
    searchCategory(types.tourist),
    searchCategory(types.toilets),
    searchCategory(types.hotels)
  ]);

  renderPOIResults("detailsSidebarTouristList", tourist);
  renderPOIResults("detailsSidebarToiletsList", toilets);
  renderPOIResults("detailsSidebarHotelsList", hotels);
}

/* ============================================================
   RENDER POI RESULTS IN SIDEBAR
   ============================================================ */

function renderPOIResults(containerId, results) {
  const el = document.getElementById(containerId);
  if (!el) return;

  if (!results || results.length === 0) {
    el.innerHTML = `<div class="poi-empty">No results found nearby.</div>`;
    return;
  }

  el.innerHTML = results
    .map(r => `
      <div class="poi-item">
        <div class="poi-name">${escapeHTML(r.name)}</div>
        <div class="poi-distance">${r.distance.toFixed(0)} m away</div>
        <div class="poi-address">${escapeHTML(r.address)}</div>
      </div>
    `)
    .join("");
}


/* ============================================================
   EXPORT SECTION 5 (FINAL)
   ============================================================ */

window.animateLeg = animateLeg;
window.undoTo = undoTo;
window.buildCompleteUntil = buildCompleteUntil;
window.resetJourney = resetJourney;
window.startJourney = startJourney;
window.addJourneySources = addJourneySources;
// Ensure UI module sees required helper functions
window.getLegMode = getLegMode;
window.isFlight = isFlight;
window.getZoom = getZoom;


console.log("%cmap-logic.js (section 5) loaded — COMPLETE", "color:#00ff88;font-weight:bold;");


