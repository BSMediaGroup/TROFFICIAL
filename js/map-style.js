/* ============================================================
   MAP STYLE INITIALIZATION — v2 (defensive)
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
   FOG / STARFIELD
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
   TERRAIN (stub – can be enabled later)
   ============================================================ */

function enableTerrain() {
  // Placeholder for DEM source / terrain.
  // Left disabled for stability.
}

/* ============================================================
   3D BUILDINGS TOGGLE
   ============================================================ */

let buildingsEnabled = false;

function enable3DBuildings() {
  if (buildingsEnabled) return;
  buildingsEnabled = true;

  const style = map.getStyle();
  if (!style || !style.layers) return;

  let labelLayerId = null;
  for (const layer of style.layers) {
    if (layer.type === "symbol" && layer.layout && layer.layout["text-field"]) {
      labelLayerId = layer.id;
      break;
    }
  }

  if (map.getLayer("3d-buildings")) return;

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
   SUNLIGHT SYSTEM (stub)
   ============================================================ */

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

    const altitude = Math.max(5, Math.min(60, (hour - 6) * 10));
    const azimuth  = hour * 15;

    return { altitude, azimuth };
  } catch {
    return { altitude: 45, azimuth: 180 };
  }
}

function applySunlightToWaypoint(wp) {
  const { altitude, azimuth } = computeSunDirectionForWaypoint(wp);

  map.setLight({
    anchor: "viewport",
    position: [azimuth, altitude],
    intensity: 0.6
  });
}

/* ============================================================
   NATION SHADING — SAFE / IDEMPOTENT
   ============================================================ */

/**
 * Adds a polygon fill + outline for one nation.
 * Now idempotent: if the source or layers already exist, it logs a
 * warning and returns instead of throwing.
 */
async function addNation(id, url, color, opacity) {
  try {
    // HARD CHECK: prevent duplicate sources
    if (map.getSource(id)) {
      console.warn(`⚠️ Nation source "${id}" already exists – skipping addNation()`);
      return;
    }

    const res = await fetch(url);
    const geo = await res.json();

    map.addSource(id, { type: "geojson", data: geo });

    // Fill layer (safe)
    const fillId = id + "-fill";
    if (!map.getLayer(fillId)) {
      map.addLayer({
        id: fillId,
        type: "fill",
        source: id,
        paint: {
          "fill-color": color,
          "fill-opacity": opacity
        }
      });
    }

    // Outline layer (safe)
    const outlineId = id + "-outline";
    if (!map.getLayer(outlineId)) {
      map.addLayer({
        id: outlineId,
        type: "line",
        source: id,
        paint: {
          "line-color": color,
          "line-width": 1.2
        }
      });
    }
  } catch (err) {
    console.error("Nation load error (id=" + id + "):", err);
  }
}

/* ============================================================
   STYLE INITIALIZATION ENTRYPOINT
   Called from map-core.js AFTER map.on("load")
   ============================================================ */

let nationsInitialized = false;

async function initializeStyleLayers() {
  // Make this safe to call multiple times
  if (nationsInitialized) {
    return;
  }
  nationsInitialized = true;

  // Optional terrain:
  // enableTerrain();

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
   EXPORTS
   ============================================================ */

window.__MAP = map; // main map reference
window.enable3DBuildings = enable3DBuildings;
window.applySunlightToWaypoint = applySunlightToWaypoint;
window.initializeStyleLayers = initializeStyleLayers;

console.log("map-style.js fully loaded");
