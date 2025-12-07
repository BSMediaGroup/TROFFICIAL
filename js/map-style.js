/* ========================================================================== */
/* MAP-STYLE.JS — HARD-PROTECTED SINGLETON INITIALIZER                        */
/* ========================================================================== */

if (window.__MAP_STYLE_INITIALIZED) {
  console.warn("⚠ map-style.js attempted to load twice — BLOCKED");
  return;
}
window.__MAP_STYLE_INITIALIZED = true;

console.log("%cmap-style.js loaded", "color:#00eaff; font-weight:bold;");

/* === DO NOT CHANGE ANYTHING BELOW HERE ================================== */

window.DEFAULT_CENTER = [-95, 23.7];
window.DEFAULT_ZOOM   = 2.45;
window.ORBIT_ROTATION_SPEED = 0.015;

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* === GLOBAL MAP SINGLETON ================================================= */

if (window.__MAP) {
  console.warn("⚠ Attempted double map creation — BLOCKED");
} else {
  window.__MAP = new mapboxgl.Map({
    container: "map",
    style: MAP_STYLE_URL,
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    renderWorldCopies: false,
    projection: "globe"
  });

  window.__MAP.addControl(new mapboxgl.NavigationControl({ showCompass: false }));
}

const map = window.__MAP;

/* ========================================================================== */
/* STYLE-DATA PERSISTENCE HANDLER                                             */
/* ========================================================================== */

map.on("styledata", () => {
  if (map.__STYLE_LOCK) return;
  map.__STYLE_LOCK = true;

  console.log("%cmap-style.js: styledata — persistent layer check", "color:#ffaa33");

  try {
    map.setFog({
      color: "rgba(5,10,20,0.9)",
      "high-color": "rgba(60,150,255,0.45)",
      "horizon-blend": 0.45,
      "space-color": "#02040A",
      "star-intensity": 0.65
    });

    ensureRouteSource("flight-route");
    ensureRouteSource("drive-route");

    ensureRouteLayer("flight-route", "flight-route", {
      "line-color": "#478ED3",
      "line-width": 3,
      "line-dasharray": [3, 2],
      "line-opacity": 0.9
    });

    ensureRouteLayer("drive-route", "drive-route", {
      "line-color": "#FF9C57",
      "line-width": 4,
      "line-opacity": 0.95
    });

  } finally {
    map.__STYLE_LOCK = false;
  }
});

function ensureRouteSource(id) {
  if (!map.getSource(id)) {
    map.addSource(id, {
      type: "geojson",
      data: { type:"Feature", geometry:{ type:"LineString", coordinates:[] }}
    });
  }
}

function ensureRouteLayer(id, src, paint) {
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: "line",
      source: src,
      layout: { visibility:"visible" },
      paint
    });
  }
}

/* ========================================================================== */
/* NATION LAYERS                                                              */
/* ========================================================================== */

async function addNation(id, url, color, opacity) {
  if (map.getSource(id)) return;
  try {
    const geo = await (await fetch(url)).json();

    map.addSource(id, { type: "geojson", data: geo });

    map.addLayer({
      id: id + "-fill",
      type: "fill",
      source: id,
      paint: { "fill-color": color, "fill-opacity": opacity }
    }, "flight-route");

    map.addLayer({
      id: id + "-outline",
      type: "line",
      source: id,
      paint: { "line-color": color, "line-width": 1.1 }
    });

  } catch (err) {
    console.error("Nation load failed:", id, err);
  }
}

window.initializeStyleLayers = async function () {
  console.log("initializeStyleLayers() running…");

  await addNation("aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF", 0.12);

  await addNation("can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424", 0.12);

  await addNation("usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF", 0.12);

  console.log("%cinitializeStyleLayers() complete", "color:#55ff55");
};

console.log("%cmap-style.js fully loaded (singleton active)", "color:#00ffaa; font-weight:bold;");
