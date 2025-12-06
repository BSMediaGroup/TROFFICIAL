/* ============================================================
   MAP STYLE INITIALIZATION — v2
   This module loads:
   - Base Mapbox style
   - Globe projection
   - Fog & starfield
   - Terrain
   - 3D buildings
   - Nation shading layers
   - Sunlight system (scaffolding only)
   NOTE:
   All styling values are migrated from the original file.
   No UI or logic changes are made here.
   ============================================================ */

console.log("map-style.js loaded");

/* ============================================================
   MAP INSTANCE (style / projection only)
   ============================================================ */

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v11",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: 0,
  renderWorldCopies: false,
  projection: "globe"
});

/* Navigation controls identical to original */
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));


/* ============================================================
   FOG / STARFIELD — MIGRATED EXACTLY
   ============================================================ */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

map.on("style.load", () => {
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });
});


/* ============================================================
   TERRAIN + SKY (standard compatibility scaffolding)
   ============================================================ */
/* Your dark-v11 style supports globe & fog but does not include DEM by default.
   Terrain can be enabled after we add a DEM source, which we will do
   later once interactions are stable.
*/

function enableTerrain() {
  // Placeholder — DEM source will be added later if approved.
  // map.addSource("mapbox-dem", {
  //   type: "raster-dem",
  //   url: "mapbox://mapbox.terrain-rgb",
  //   tileSize: 512,
  //   maxzoom: 14
  // });
  // map.setTerrain({ source: "mapbox-dem", exaggeration: 1.0 });
}


/* ============================================================
   3D BUILDINGS — MIGRATED AS A TOGGLE SYSTEM
   (Off globally, activated during waypoint focus if approved)
   ============================================================ */

let buildingsEnabled = false;

function enable3DBuildings() {
  if (buildingsEnabled) return;
  buildingsEnabled = true;

  const layers = map.getStyle().layers;
  if (!layers) return;

  // Find label layer to insert buildings underneath
  let labelLayerId = null;
  for (const layer of layers) {
    if (layer.type === "symbol" && layer.layout["text-field"]) {
      labelLayerId = layer.id;
      break;
    }
  }

  map.addLayer(
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


/* ============================================================
   SUNLIGHT SYSTEM (stub — activated later)
   ============================================================ */

/**
 * Compute sun direction based on local time.
 * This is just a placeholder — the full model will be implemented
 * after all modules are loaded.
 */
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

    const altitude = Math.max(5, Math.min(60, (hour - 6) * 10)); // crude placeholder
    const azimuth  = hour * 15;

    return { altitude, azimuth };
  } catch {
    return { altitude: 45, azimuth: 180 };
  }
}

/**
 * Apply sunlight settings to the map.
 * Future detail: dynamic color temperature based on sun position.
 */
function applySunlightToWaypoint(wp) {
  const { altitude, azimuth } = computeSunDirectionForWaypoint(wp);

  map.setLight({
    anchor: "viewport",
    position: [azimuth, altitude],
    intensity: 0.6
  });
}


/* ============================================================
   NATION SHADING — EXACT DIRECT MIGRATION
   ============================================================ */

/**
 * Adds a polygon fill + outline for one nation.
 * Identical to your original implementation.
 */
async function addNation(id, url, color, opacity) {
  try {
    const res = await fetch(url);
    const geo = await res.json();

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
        "line-width": 1.2
      }
    });

  } catch (err) {
    console.error("Nation load error:", err);
  }
}


/* ============================================================
   STYLE INITIALIZATION ENTRYPOINT
   Called from map.on("load") in UI/logic modules
   ============================================================ */

async function initializeStyleLayers() {
  // Fog is already applied on style.load
  // Terrain optional — enable later if approved
  // enableTerrain();

  // National borders shading (identical to original)
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


/* ============================================================
   EXPOSE MAP OBJECT GLOBALLY
   ============================================================ */

window.__MAP = map; // other modules will use this reference
window.enable3DBuildings = enable3DBuildings;
window.applySunlightToWaypoint = applySunlightToWaypoint;
window.initializeStyleLayers = initializeStyleLayers;





