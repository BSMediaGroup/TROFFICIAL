/* ========================================================================== */
/*                              MAP STYLE MODULE                               */
/*                     FINAL STABLE VERSION — PATH-A FIXED                     */
/* ========================================================================== */

console.log("%cmap-style.js loaded", "color:#00eaff; font-weight:bold;");


/* ========================================================================== */
/* GLOBAL DEFAULT MAP SETTINGS — MUST MATCH YOUR ORIGINAL MONOLITH             */
/* ========================================================================== */

window.DEFAULT_CENTER = [-95.0, 23.7];   // ⬅ REQUIRED for correct spin axis
window.DEFAULT_ZOOM   = 2.45;
window.ORBIT_ROTATION_SPEED = 0.015;


/* ========================================================================== */
/* TOKEN + BASE STYLE                                                          */
/* ========================================================================== */

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";


/* ========================================================================== */
/* CREATE MAP INSTANCE                                                         */
/* ========================================================================== */

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


/* ========================================================================== */
/* GLOBE FOG                                                                   */
/* ========================================================================== */

const FOG_COLOR          = "rgba(5,10,20,0.9)";
const FOG_HIGH_COLOR     = "rgba(60,150,255,0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;


/* ========================================================================== */
/* ENSURE ROUTE SOURCES + LAYERS PERSIST THROUGH STYLE RELOADS                */
/* ========================================================================== */

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
/* STYLEDATA — THE **CORRECT** WAY TO GUARANTEE PERSISTENT LAYERS             */
/* ========================================================================== */

map.on("styledata", () => {
  console.log("%cmap-style.js: styledata — persistent layer check", "color:#ffaa33");

  /* Fog re-apply (styledata wipes it) */
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  /* PERSISTENT PLACEHOLDER SOURCES */
  ensureRouteSource("flight-route");
  ensureRouteSource("drive-route");

  /* PERSISTENT ROUTE LAYERS */
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
});


/* ========================================================================== */
/* NATION LAYER LOADER                                                         */
/* ========================================================================== */

async function addNation(id, url, color, opacity) {
  if (map.getSource(id)) return;

  try {
    const geo = await (await fetch(url)).json();

    map.addSource(id, { type:"geojson", data: geo });

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


/* ========================================================================== */
/* INITIALIZER FOR map-core.js                                                 */
/* ========================================================================== */

window.initializeStyleLayers = async function () {
  console.log("initializeStyleLayers() running…");

  await addNation(
    "aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF", 0.12
  );

  await addNation(
    "can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424", 0.12
  );

  await addNation(
    "usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF", 0.12
  );

  console.log("%cinitializeStyleLayers() complete", "color:#55ff55");
};


console.log("%cmap-style.js fully loaded", "color:#00ffaa; font-weight:bold;");
