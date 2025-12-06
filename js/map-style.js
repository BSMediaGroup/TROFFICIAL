/* ============================================================
   MAP STYLE BOOTSTRAP — v2 (map-style.js)
   Single responsibility:
   - Configure Mapbox access token
   - Create the map instance (window.__MAP)
   - Hook into style.load and delegate layer setup to initializeStyleLayers()
   ============================================================ */

console.log("map-style.js loaded");

/* Mapbox style URL (single source of truth for other modules) */
const MAP_STYLE_URL = "mapbox://styles/mapbox/dark-v11";

/* Mapbox access token */
mapboxgl.accessToken = "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw";

/* ============================================================
   CREATE MAP INSTANCE
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

/* Expose globally so other modules (logic/UI) can use it */
window.__MAP = map;

/* Navigation controls identical to original */
map.addControl(new mapboxgl.NavigationControl({ showCompass: false }));

/* ============================================================
   STYLE LOAD → INITIALIZE LAYERS (FOG, SHADING, ETC.)
   initializeStyleLayers() is defined in map-core.js
   ============================================================ */

map.on("style.load", () => {
  console.log("map-style.js: style.load fired");
  if (typeof initializeStyleLayers === "function") {
    initializeStyleLayers();
  }
});

console.log("%cmap-style.js fully loaded", "color:#00e5ff;font-weight:bold;");
