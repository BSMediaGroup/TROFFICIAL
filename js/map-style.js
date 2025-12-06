/* ============================================================
   MAP STYLE BOOTSTRAP — v2 (map-style.js)
   * Corrected full version — no duplicated static sources *
============================================================ */

console.log("map-style.js loaded");

/* Mapbox Style */
const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* Token */
mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* ============================================================
   CREATE THE ONE AND ONLY MAP INSTANCE
============================================================ */

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

/* ============================================================
   FOG + STARFIELD — STYLE.LOAD
============================================================ */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");

  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });
});

/* ============================================================
   NATION SHADING HELPERS
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
   JOURNEY ROUTE SOURCES ONLY (NOT STATIC ROUTES)
   Static routes now handled solely in map-logic.js
============================================================ */

map.on("load", () => {

  /* ---------------- JOURNEY COMPLETED FLIGHT ---------------- */
  map.addSource("journey-flight", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] }
    }
  });

  map.addLayer({
    id: "journey-flight",
    type: "line",
    source: "journey-flight",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#478ED3",
      "line-width": 3,
      "line-dasharray": [3, 2],
      "line-opacity": 0.9
    }
  });

  /* ---------------- JOURNEY COMPLETED DRIVING ---------------- */
  map.addSource("journey-drive", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] }
    }
  });

  map.addLayer({
    id: "journey-drive",
    type: "line",
    source: "journey-drive",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#FF9C57",
      "line-width": 4,
      "line-opacity": 0.95
    }
  });

  /* ---------------- JOURNEY CURRENT SEGMENT ---------------- */
  map.addSource("journey-current", {
    type: "geojson",
    data: {
      type: "Feature",
      geometry: { type: "LineString", coordinates: [] }
    }
  });

  map.addLayer({
    id: "journey-current",
    type: "line",
    source: "journey-current",
    layout: { visibility: "none" },
    paint: {
      "line-color": "#FFFFFF",
      "line-width": 4,
      "line-opacity": 1.0
    }
  });

  console.log("map-style.js: journey layers created (static routes removed)");
});

/* ============================================================
   GLOBAL INITIALIZER (called by map-core.js)
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

console.log(
  "%cmap-style.js fully loaded",
  "color:#00e5ff;font-weight:bold;"
);
