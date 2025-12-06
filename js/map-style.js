/* ============================================================
   MAP STYLE BOOTSTRAP — v3 (FINAL MONOLITH-ACCURATE VERSION)
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
   CREATE MAP INSTANCE
------------------------------------------------------------ */

const map = new mapboxgl.Map({
  container: "map",
  style: MAP_STYLE_URL,
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: 0,
  renderWorldCopies: false,
  projection: "globe"
});

window.__MAP = map;

map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

/* ------------------------------------------------------------
   FOG + STARFIELD (1:1 FROM MONOLITH)
------------------------------------------------------------ */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

/* ============================================================
   STYLE.LOAD — ALL PLACEHOLDER ROUTES + VISIBILITY
============================================================ */

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");

  /* Atmosphere */
  map.setFog({
    color:          FOG_COLOR,
    "high-color":   FOG_HIGH_COLOR,
    "horizon-blend":FOG_HORIZON_BLEND,
    "space-color":  FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  /* --------------------------------------------------------
     PLACEHOLDER STATIC ROUTE SOURCES
     These MUST exist, be empty, and be visible.
     map-logic.js later REPLACES THEIR DATA.
  -------------------------------------------------------- */

  function ensureEmptySource(id) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: { type:"Feature", geometry:{ type:"LineString", coordinates:[] } }
      });
    }
  }

  /* Required empty shells: */
  ensureEmptySource("flight-route");
  ensureEmptySource("drive-route");

  /* --------------------------------------------------------
     LAYERS ATTACHED TO PLACEHOLDER ROUTES
     These MUST exist BEFORE journey layers.
  -------------------------------------------------------- */

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

  console.log("map-style.js: placeholder route layers ready");
});

/* ============================================================
   NATION SHADING — EXACT BEHAVIOUR FROM MONOLITH
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

  console.log("initializeStyleLayers() running…");

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
