/* ==========================================================================
   MAP LOGIC MODULE — FINAL RECONSTRUCTED MONOLITH-ACCURATE VERSION
   ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* ————————————————————————————————————————————————
   GLOBAL STATE (shared with UI + CORE)
——————————————————————————————————————————————————— */
window.currentID    = null;
window.journeyMode  = false;

window.LEG_DIST     = {};
window.TRAVELLED_KM = {};
window.TRAVELLED_MI = {};
window.DRIVING_GEOM = [];
window.DRIVE_INDEX  = {};

window.spinning        = true;
window.userInterrupted = false;

let orbitTargetId   = null;
let orbitAnimFrame  = null;
let orbitEnterTimer = null;

/* Map accessor */
function MAP() { return window.__MAP; }

/* Fetch waypoint object */
function getWP(id) {
  return WAYPOINTS.find(w => w.id === id);
}

/* =======================================================================
   DISTANCE CALCULATIONS (1:1 FROM MONOLITH)
======================================================================= */

function toRad(d) { return d * Math.PI / 180; }

function haversine(a, b) {
  const R = 6371;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

window.computeAllLegDistances = function () {
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
};

/* ==========================================================================
   REQUIRED BY map-core.js — FIXED MISSING FUNCTION
   ========================================================================== */

window.initDistances = function () {
  console.log("initDistances(): computing distances…");
  if (typeof window.computeAllLegDistances === "function") {
    computeAllLegDistances();
  } else {
    console.error("computeAllLegDistances MISSING!");
  }
};

/* =======================================================================
   GREAT CIRCLE BUILDER — ZIGZAG FIX (1:1 FROM MONOLITH)
======================================================================= */

function normalizeCoord(lon, lat) {
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  lat = Math.max(-89.999999, Math.min(89.999999, lat));
  return [lon, lat];
}

window.buildGreatCircle = function (fromId, toId, steps = 220) {
  const A = getWP(fromId);
  const B = getWP(toId);
  if (!A || !B) return [];

  const [lon1d, lat1] = A.coords;
  const [lon2d, lat2] = B.coords;

  let λ1 = toRad(lon1d);
  let λ2 = toRad(lon2d);
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);

  let dλ = λ2 - λ1;

  if (Math.abs(dλ) > Math.PI) {
    if (dλ > 0) λ1 += 2 * Math.PI;
    else λ2 += 2 * Math.PI;
    dλ = λ2 - λ1;
  }

  const Δ = 2 * Math.asin(Math.sqrt(
    Math.sin((φ2 - φ1) / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2
  ));

  if (!Number.isFinite(Δ) || Δ === 0) {
    return [normalizeCoord(lon1d, lat1), normalizeCoord(lon2d, lat2)];
  }

  const out = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A1 = Math.sin((1 - f) * Δ) / Math.sin(Δ);
    const B1 = Math.sin(f * Δ) / Math.sin(Δ);

    const x = A1 * Math.cos(φ1) * Math.cos(λ1) + B1 * Math.cos(φ2) * Math.cos(λ2);
    const y = A1 * Math.cos(φ1) * Math.sin(λ1) + B1 * Math.cos(φ2) * Math.sin(λ2);
    const z = A1 * Math.sin(φ1) + B1 * Math.sin(φ2);

    const φ = Math.atan2(z, Math.sqrt(x * x + y * y));
    const λ = Math.atan2(y, x);

    out.push(normalizeCoord(λ * 180 / Math.PI, φ * 180 / Math.PI));
  }

  return out;
};

/* =======================================================================
   STATIC ROUTES (FLIGHT)
======================================================================= */

window.addStaticRoutes = function () {
  const SYD_LA = buildGreatCircle("sydney", "la");
  const LA_YTZ = buildGreatCircle("la", "toronto").slice(1);

  const allFlight = [...SYD_LA, ...LA_YTZ];

  MAP().addSource("flight-route", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: allFlight }
    }
  });

  MAP().addLayer({
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
};

/* =======================================================================
   DRIVING ROUTE (MAPBOX DIRECTIONS API)
======================================================================= */

window.buildDrivingRoute = async function () {
  const coords = DRIVE_ORDER.map(id => getWP(id).coords);
  if (coords.length < 2) return;

  const url =
    "https://api.mapbox.com/directions/v5/mapbox/driving/" +
    coords.map(c => c.join(",")).join(";") +
    `?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`;

  const res = await fetch(url);
  const json = await res.json();
  if (!json.routes?.length) return;

  window.DRIVING_GEOM = json.routes[0].geometry.coordinates;

  MAP().addSource("drive-route", {
    type: "geojson",
    data: json.routes[0].geometry
  });

  MAP().addLayer({
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
    let best = 0, bestDist = Infinity;

    window.DRIVING_GEOM.forEach((c, n) => {
      const d = haversine(wp, c);
      if (d < bestDist) {
        bestDist = d;
        best = n;
      }
    });

    window.DRIVE_INDEX[DRIVE_ORDER[i]] = best;
  });
};

function roadLeg(a, b) {
  const geom = window.DRIVING_GEOM;
  if (!geom.length) return [];

  let s = window.DRIVE_INDEX[a];
  let e = window.DRIVE_INDEX[b];

  if (s > e) [s, e] = [e, s];
  return geom.slice(s, e + 1);
}

/* ==========================================================================
   REQUIRED BY map-core.js — FIXED MISSING FUNCTION
   ========================================================================== */

window.addJourneySources = function () {
  const map = MAP();

  function ensureSource(id) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }}
      });
    }
  }

  ensureSource("journey-flight");
  ensureSource("journey-drive");
  ensureSource("journey-current");

  function ensureLayer(id, paint) {
    if (!map.getLayer(id)) {
      map.addLayer({
        id,
        type: "line",
        source: id,
        layout: { visibility: "none" },
        paint
      });
    }
  }

  ensureLayer("journey-flight", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  ensureLayer("journey-drive", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });

  ensureLayer("journey-current", {
    "line-color": "#FFFFFF",
    "line-width": 4,
    "line-opacity": 1
  });

  console.log("✓ addJourneySources(): journey layers ready");
};

/* =======================================================================
   ORBIT ENGINE (MATCHES MONOLITH)
======================================================================= */

window.stopOrbit = function () {
  if (orbitEnterTimer) {
    clearTimeout(orbitEnterTimer);
    orbitEnterTimer = null;
  }
  if (orbitAnimFrame) {
    cancelAnimationFrame(orbitAnimFrame);
    orbitAnimFrame = null;
  }
  orbitTargetId = null;
};

window.startOrbit = function (id) {
  orbitTargetId = id;
  orbitAnimFrame = requestAnimationFrame(orbitLoop);
};

function orbitLoop() {
  if (!orbitTargetId) return;

  const wp = getWP(orbitTargetId);
  if (!wp) return stopOrbit();

  const m = MAP();
  m.setBearing(m.getBearing() + 0.03);

  orbitAnimFrame = requestAnimationFrame(orbitLoop);
}

/* =======================================================================
   GLOBAL SPIN ENGINE — REQUIRED BY map-core.js
   (matches original monolith behaviour exactly)
======================================================================= */

window.spinGlobe = function () {
    if (!spinning || !MAP_READY) return;

    const map = MAP();
    if (!map) return;

    map.setBearing(map.getBearing() + ORBIT_ROTATION_SPEED);
    requestAnimationFrame(window.spinGlobe);
};

/* =======================================================================
   WAYPOINT ORBIT FOCUS
======================================================================= */

window.focusWaypointOrbit = function (id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  MAP().easeTo({
    center: wp.coords,
    zoom: 12.5,
    pitch: 75,
    bearing: MAP().getBearing(),
    duration: 900
  });

  orbitEnterTimer = setTimeout(() => startOrbit(id), 900);
};

window.focusJourneyOrbit = function (id) {
  const wp = getWP(id);
  if (!wp) return;

  stopOrbit();

  const isLATor = (id === "la" || id === "toronto");
  const zoom = isLATor ? 6.25 : 12.5;

  MAP().easeTo({
    center: wp.coords,
    zoom,
    pitch: 55,
    bearing: MAP().getBearing(),
    duration: 900
  });

  orbitEnterTimer = setTimeout(() => startOrbit(id), 900);
};

/* =======================================================================
   COMPLETED ROUTE BUILDER
======================================================================= */

window.buildCompleteUntil = function (id) {
  const out = { flight: [], drive: [] };

  const append = (arr, seg) => {
    if (seg.length) {
      if (!arr.length) arr.push(...seg);
      else arr.push(...seg.slice(1));
    }
  };

  const idx = TRIP_ORDER.indexOf(id);
  for (let i = 0; i < idx; i++) {
    const a = TRIP_ORDER[i];
    const b = TRIP_ORDER[i + 1];

    const isF = (a === "sydney" && b === "la") || (a === "la" && b === "toronto");

    if (isF) append(out.flight, buildGreatCircle(a, b));
    else append(out.drive, roadLeg(a, b));
  }

  return out;
};

/* =======================================================================
   JOURNEY ANIMATION — CINEMATIC
======================================================================= */

window.animateLeg = function (a, b) {
  if (a === b) return;

  const map = MAP();
  stopOrbit();

  const isF = (a === "sydney" && b === "la") || (a === "la" && b === "toronto");
  const seg = isF ? buildGreatCircle(a, b) : roadLeg(a, b);
  if (!seg.length) return;

  const comp = buildCompleteUntil(a);

  map.getSource("journey-flight").setData({ type: "Feature", geometry: { type: "LineString", coordinates: comp.flight }});
  map.getSource("journey-drive").setData({  type: "Feature", geometry: { type: "LineString", coordinates: comp.drive  }});
  map.getSource("journey-current").setData({type: "Feature", geometry: { type: "LineString", coordinates: [] }});

  const duration = isF ? 4200 : 1800;
  const total = seg.length;
  const start = performance.now();

  function animatePolyline(t) {
    const p = Math.min((t - start) / duration, 1);
    const count = Math.max(2, Math.floor(p * total));
    const partial = seg.slice(0, count);

    map.getSource("journey-current").setData({
      type: "Feature",
      geometry: { type: "LineString", coordinates: partial }
    });

    if (p < 1) {
      requestAnimationFrame(animatePolyline);
    } else {
      const after = buildCompleteUntil(b);

      map.getSource("journey-flight").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: after.flight }
      });

      map.getSource("journey-drive").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: after.drive }
      });

      map.getSource("journey-current").setData({
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] }
      });

      currentID = b;
      openPopupFor(b);
      focusJourneyOrbit(b);
      updateHUD();
    }
  }

  /* SPECIAL CINEMATIC — SYD → LA */
  if (a === "sydney" && b === "la") {
    const Syd = getWP(a);
    const LA  = getWP(b);

    const P1 = 1600;
    const P2 = 1600;
    const P3 = 2200;

    map.easeTo({
      center: Syd.coords,
      zoom: 3.5,
      pitch: 0,
      bearing: map.getBearing(),
      duration: P1,
      easing: t => t * t * (3 - 2 * t)
    });

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: 3.5,
        pitch: 0,
        bearing: map.getBearing(),
        duration: P2,
        easing: t => t * t * (3 - 2 * t)
      });
    }, P1);

    setTimeout(() => {
      map.easeTo({
        center: LA.coords,
        zoom: 6.25,
        pitch: 55,
        bearing: map.getBearing(),
        duration: P3,
        easing: t => t * t * (3 - 2 * t)
      });
    }, P1 + P2);

    setTimeout(() => {
      currentID = b;
      openPopupFor(b);
      startOrbit(b);
      updateHUD();
    }, P1 + P2 + P3);

    requestAnimationFrame(animatePolyline);
    return;
  }

  /* NORMAL JOURNEY BEHAVIOUR */
  const wp = getWP(b);

  map.easeTo({
    center: wp.coords,
    zoom: isF ? 3.0 : 10.0,
    pitch: 0,
    bearing: 0,
    duration: duration + 400
  });

  requestAnimationFrame(animatePolyline);
};

/* =======================================================================
   UNDO LEG
======================================================================= */

window.undoTo = function (id) {
  stopOrbit();

  const comp = buildCompleteUntil(id);

  MAP().getSource("journey-flight").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.flight }
  });

  MAP().getSource("journey-drive").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: comp.drive }
  });

  MAP().getSource("journey-current").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: [] }
  });

  currentID = id;
  openPopupFor(id);
  focusJourneyOrbit(id);
  updateHUD();
};

/* =======================================================================
   RESET JOURNEY
======================================================================= */

window.resetJourney = function () {
  const map = MAP();
  if (!window.MAP_READY) return;

  journeyMode = false;
  spinning = true;
  userInterrupted = false;
  currentID = null;

  closeAllPopups();
  stopOrbit();

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    const src = map.getSource(id);
    if (src) {
      src.setData({
        type:"Feature",
        geometry:{ type:"LineString", coordinates: [] }
      });
    }
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
  });

  map.setLayoutProperty("flight-route","visibility","visible");
  map.setLayoutProperty("drive-route","visibility","visible");

  map.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0
  });

  spinGlobe();
  updateHUD();
};

/* =======================================================================
   START JOURNEY
======================================================================= */

window.startJourney = function () {
  const map = MAP();
  if (!window.MAP_READY) return;

  journeyMode = true;
  spinning = false;
  userInterrupted = true;

  currentID = TRIP_ORDER[0];
  stopOrbit();

  map.setLayoutProperty("flight-route","visibility","none");
  map.setLayoutProperty("drive-route", "visibility","none");

  ["journey-flight","journey-drive","journey-current"].forEach(id => {
    map.setLayoutProperty(id, "visibility", "visible");
    map.getSource(id).setData({ type:"Feature", geometry:{ type:"LineString", coordinates: [] } });
  });

  openPopupFor(currentID);

  const wp = getWP(currentID);

  const START1 = 1800;
  const START2 = 2200;

  map.easeTo({
    center: wp.coords,
    zoom: 3.5,
    pitch: 0,
    bearing: map.getBearing(),
    duration: START1
  });

  setTimeout(() => {
    map.easeTo({
      center: wp.coords,
      zoom: 12.5,
      pitch: 55,
      bearing: map.getBearing(),
      duration: START2
    });
  }, START1);

  orbitEnterTimer = setTimeout(() => startOrbit(currentID), START1 + START2);

  updateHUD();
};

console.log("%cmap-logic.js fully loaded", "color:#00ff88;font-weight:bold;");

