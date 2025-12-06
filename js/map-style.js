/* ======================================================================= */
/* =========================== MAP STYLE MODULE ========================== */
/* ======================================================================= */

console.log("map-style.js loaded");

/*
   IMPORTANT:
   - This is the ONLY place the Mapbox map is constructed.
   - Other modules (logic, UI, core) use window.__MAP.
*/

/* ======================================================================= */
/* ========================= MAP INITIALIZATION ========================== */
/* ======================================================================= */

/* Access token MUST be set before this file:
   e.g. in your HTML:

   <script>
     mapboxgl.accessToken = "pk.XXXXXXXXXXXX";
   </script>
*/

window.__MAP = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: 0,
  renderWorldCopies: false,
  projection: "globe"
});

window.__MAP.addControl(new mapboxgl.NavigationControl({ showCompass: false }));


/* ======================================================================= */
/* ===================== GLOBE ATMOSPHERE & STARS ======================== */
/* ======================================================================= */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";      // darker, closer to space
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";  // subtle blue edge glow
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;                        // static brightness

window.__MAP.on("style.load", () => {
  window.__MAP.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });
});


/* ======================================================================= */
/* ======================= TERRAIN (OPTIONAL STUB) ======================= */
/* ======================================================================= */

function enableTerrain() {
  // If you want DEM terrain later, add the DEM source here and call setTerrain.
  // Left as a stub so we don't introduce any new behaviour yet.
  // window.__MAP.addSource("mapbox-dem", { ... });
  // window.__MAP.setTerrain({ source: "mapbox-dem", exaggeration: 1.0 });
}


/* ======================================================================= */
/* ========================== 3D BUILDINGS TOGGLE ======================== */
/* ======================================================================= */

let buildingsEnabled = false;

function enable3DBuildings() {
  if (buildingsEnabled) return;
  buildingsEnabled = true;

  const style = window.__MAP.getStyle();
  if (!style || !style.layers) return;

  let labelLayerId = null;
  for (const layer of style.layers) {
    if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
      labelLayerId = layer.id;
      break;
    }
  }

  window.__MAP.addLayer(
    {
      id: "3d-buildings",
      source: "composite",
      "source-layer": "building",
      type: "fill-extrusion",
      minzoom: 14,
      paint: {
        "fill-extrusion-color": "#aaa",
        "fill-extrusion-height": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 0,
          15, ["get", "height"]
        ],
        "fill-extrusion-base": [
          "interpolate",
          ["linear"],
          ["zoom"],
          14, 0,
          15, ["get", "min_height"]
        ],
        "fill-extrusion-opacity": 0.6
      }
    },
    labelLayerId
  );
}


/* ======================================================================= */
/* ======================== SUNLIGHT (SIMPLE STUB) ======================= */
/* ======================================================================= */

function computeSunDirectionForWaypoint(wp) {
  try {
    const now = new Date();
    const tz = wp.meta?.timezone;

    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        hour12: false
      }).format(now)
    );

    const altitude = Math.max(5, Math.min(60, (hour - 6) * 10)); // very crude
    const azimuth  = hour * 15;

    return { altitude, azimuth };
  } catch {
    return { altitude: 45, azimuth: 180 };
  }
}

function applySunlightToWaypoint(wp) {
  const { altitude, azimuth } = computeSunDirectionForWaypoint(wp);

  window.__MAP.setLight({
    anchor: "viewport",
    position: [azimuth, altitude],
    intensity: 0.6
  });
}


/* ======================================================================= */
/* ========================== NATION SHADING ============================= */
/* ======================================================================= */

async function addNation(id, url, color, opacity) {
  try {
    const res = await fetch(url);
    const geo = await res.json();

    if (window.__MAP.getSource(id)) {
      // Avoid "There is already a source with ID" errors
      return;
    }

    window.__MAP.addSource(id, { type: "geojson", data: geo });

    window.__MAP.addLayer({
      id: id + "-fill",
      type: "fill",
      source: id,
      paint: {
        "fill-color": color,
        "fill-opacity": opacity
      }
    });

    window.__MAP.addLayer({
      id: id + "-outline",
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 1.2
      }
    });

  } catch (err) {
    console.error("Nation load error:", err);
  }
}

async function initializeStyleLayers() {
  // Terrain left disabled by default
  // enableTerrain();

  // National shading – same three countries as original
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
}


/* ======================================================================= */
/* ======================= EXPORTS TO GLOBAL SCOPE ======================= */
/* ======================================================================= */

window.enable3DBuildings       = enable3DBuildings;
window.applySunlightToWaypoint = applySunlightToWaypoint;
window.initializeStyleLayers   = initializeStyleLayers;

console.log("%cmap-style.js fully loaded", "color:#00e5ff;font-weight:bold;");
