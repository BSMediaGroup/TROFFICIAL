/* ========================================================================== */
/*                              MAP STYLE MODULE                               */
/*             FINAL MODULAR VERSION — COMPATIBLE WITH PATH-A                 */
/* ========================================================================== */

console.log("%cmap-style.js loaded", "color:#00eaff; font-weight:bold;");


/* ========================================================================== */
/* GLOBAL MAP SETTINGS (THESE MUST LIVE HERE — NOT IN OTHER FILES)            */
/* ========================================================================== */

window.DEFAULT_CENTER = [-100, 35];   // ⬅ your monolith default center
window.DEFAULT_ZOOM   = 2.45;         // ⬅ your monolith default zoom
window.ORBIT_ROTATION_SPEED = 0.015;  // ⬅ monolith-accurate spin speed


/* ========================================================================== */
/* MAPBOX TOKEN + BASE STYLE                                                   */
/* ========================================================================== */

mapboxgl.accessToken =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";


/* ========================================================================== */
/* CREATE MAP INSTANCE — MUST HAPPEN BEFORE ANY MODULE TOUCHES __MAP          */
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
/* GLOBE FOG + STARFIELD                                                       */
/* ========================================================================== */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;


/* ========================================================================== */
/* STYLE INITIALISATION                                                        */
/* ========================================================================== */

map.on("style.load", () => {
  console.log("%cmap-style.js: style.load fired", "color:#33ddff");

  /* Apply fog */
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  /* --------------------------------------------------------------
     REQUIRED PLACEHOLDER ROUTE SOURCES
     These MUST exist BEFORE map-core.js runs its initialisation.
  -------------------------------------------------------------- */

  function ensureSource(id) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: "geojson",
        data: { type: "Feature", geometry: { type: "LineString", coordinates: [] }}
      });
    }
  }

  ensureSource("flight-route");
  ensureSource("drive-route");


  /* --------------------------------------------------------------
     BASE STATIC LAYERS — ALWAYS VISIBLE UNTIL JOURNEY BEGINS
  -------------------------------------------------------------- */

  function ensureRouteLayer(id, src, paint, before = "waterway-label") {
    if (!map.getLayer(id)) {
      map.addLayer(
        {
          id,
          type: "line",
          source: src,
          layout: { visibility: "visible" },
          paint
        },
        before
      );
    }
  }

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

  console.log("%cmap-style.js: static placeholder layers ready", "color:#33ff33");
});


/* ========================================================================== */
/* NATION LAYERS                                                               */
/* ========================================================================== */

async function addNation(id, url, color, opacity) {
  if (map.getSource(id)) return;

  try {
    const data = await (await fetch(url)).json();

    map.addSource(id, { type: "geojson", data });

    map.addLayer(
      {
        id: `${id}-fill`,
        type: "fill",
        source: id,
        paint: {
          "fill-color": color,
          "fill-opacity": opacity
        }
      },
      "flight-route"   // <-- nations go BELOW route lines
    );

    map.addLayer({
      id: `${id}-outline`,
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 1.1
      }
    });

  } catch (err) {
    console.error("Nation load failed:", id, err);
  }
}


/* ========================================================================== */
/* STYLE LAYER INITIALISER — CALLED BY map-core.js AFTER MAP LOAD             */
/* ========================================================================== */

window.initializeStyleLayers = async function () {
  console.log("%cinitializeStyleLayers() running…", "color:#ffaa00");

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

  console.log("%cinitializeStyleLayers() complete", "color:#55ff55; font-weight:bold;");
};


/* ========================================================================== */

console.log("%cmap-style.js fully loaded", "color:#00ffaa; font-weight:bold;");
