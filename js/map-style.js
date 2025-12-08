/* ============================================================
   MAP STYLE BOOTSTRAP — v4 (FINAL, FIXED AXIS + STYLERESET)
============================================================ */

console.log("map-style.js loaded");

/* ------------------------------------------------------------
   BASE MAPBOX STYLE
------------------------------------------------------------ */

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* Token */
mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* ------------------------------------------------------------
   CREATE MAP INSTANCE (CRITICAL FIX: DEFAULT_PITCH)
------------------------------------------------------------ */

const map = new mapboxgl.Map({
  container: "map",
  style: MAP_STYLE_URL,
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: DEFAULT_PITCH,        // ★ FIXED WRONG AXIS SPIN ★
  renderWorldCopies: false,
  projection: "globe"
});

window.__MAP = map;
console.log("map-style.js: __MAP created");

/* ★ FIX — Prevent Mapbox GL v3 globe projection spam errors */
map._renderTaskQueue = [];   // <-- REQUIRED PATCH, DO NOT REMOVE

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));



/* ------------------------------------------------------------
   USER INTERRUPTION → stop globe spin + show reset button
------------------------------------------------------------ */

function interruptSpin() {
  window.spinning = false;
  window.userInterrupted = true;

  const resetBtn = document.getElementById("resetStaticMap");
  if (resetBtn) resetBtn.style.display = "block";
}

["mousedown", "dragstart", "wheel", "touchstart"].forEach(evt => {
  map.on(evt, interruptSpin);
});

/* ------------------------------------------------------------
   FOG + STARFIELD (1:1 FROM MONOLITH)
------------------------------------------------------------ */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

/* ============================================================
   ENSURE PLACEHOLDER ROUTE SOURCES + LAYERS
============================================================ */

function ensureEmptySource(id) {
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "LineString", coordinates: [] }
      }
    });
  }
}

function ensureLayer(id, source, paint) {
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: "line",
      source,
      layout: { visibility: "visible" },
      paint
    });
  }
}

/* ============================================================
   STYLE.LOAD — first load of layers
============================================================ */

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");

  /* Atmosphere */
  map.setFog({
    color:           FOG_COLOR,
    "high-color":    FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color":   FOG_SPACE_COLOR,
    "star-intensity":FOG_STAR_INTENSITY
  });

  /* Placeholder route shells */
  ensureEmptySource("flight-route");
  ensureEmptySource("drive-route");

  ensureLayer("flight-route", "flight-route", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  ensureLayer("drive-route", "drive-route", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });

  console.log("map-style.js: static placeholder routes ready");
});

/* ============================================================
   FIX: MAPBOX v3 style reload wipes custom layers.
   We must reassert layers on styledata.
============================================================ */

map.on("styledata", () => {
  // Avoid flooding the console with spam every frame
  if (!map._staticReapplied) {
    console.log("map-style.js: styledata — ensuring persistent layers");
    map._staticReapplied = true;
    setTimeout(() => map._staticReapplied = false, 150);
  }

  ensureEmptySource("flight-route");
  ensureEmptySource("drive-route");

  ensureLayer("flight-route", "flight-route", {
    "line-color": "#478ED3",
    "line-width": 3,
    "line-dasharray": [3, 2],
    "line-opacity": 0.9
  });

  ensureLayer("drive-route", "drive-route", {
    "line-color": "#FF9C57",
    "line-width": 4,
    "line-opacity": 0.95
  });
});

/* ============================================================
   NATION SHADING — EXACT MONOLITH BEHAVIOUR
============================================================ */

async function addNation(id, url, color, opacity) {
  if (map.getSource(id)) return;

  try {
    const geo = await (await fetch(url)).json();

    map.addSource(id, { type: "geojson", data: geo });

    map.addLayer({
      id: id + "-fill",
      type: "fill",
      source: id,
      paint: {
        "fill-color": color,
        "fill-opacity": opacity
      }
    });

    map.addLayer({
      id: id + "-outline",
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 1.1
      }
    });

  } catch (e) {
    console.error("Nation load failed:", e);
  }
}

/* ============================================================
   initializer — called by map-core.js
============================================================ */

window.initializeStyleLayers = async function () {

  console.log("initializeStyleLayers() running...");

  await addNation(
    "aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF",
    0.12
  );

  await addNation(
    "can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424",
    0.12
  );

  await addNation(
    "usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF",
    0.12
  );

  console.log("initializeStyleLayers() complete.");
};

console.log("%cmap-style.js fully loaded", "color:#00e5ff;font-weight:bold;");

