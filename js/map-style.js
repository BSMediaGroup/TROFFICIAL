// =======================================================
// =============== MAP STYLE & BASEMAP SETUP =============
// =======================================================

import {
  MAPBOX_TOKEN,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_PITCH,
  DEFAULT_BEARING,
  IDLE_LIGHT_PRESET,
  LIGHT_PRESETS,
  setMapInstance,
} from "./map-config.js";

// -------------------------------------
// ENSURE MAPBOX TOKEN
// -------------------------------------
mapboxgl.accessToken = MAPBOX_TOKEN;

// -------------------------------------
// MAP CREATION (MAPBOX STANDARD)
// -------------------------------------
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/standard",
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  pitch: DEFAULT_PITCH,
  bearing: DEFAULT_BEARING,
  projection: "globe",
  renderWorldCopies: false,
  config: {
    basemap: {
      // Dark, spacey idle look
      lightPreset: IDLE_LIGHT_PRESET, // "night"
      show3dObjects: true,
      showPlaceLabels: true, // keep city names visible
      showRoadLabels: false,
      showPointOfInterestLabels: false,
    },
  },
});

// we use this threshold to decide when to snap back to "planet mode"
const IDLE_ZOOM_THRESHOLD = 2.2;

// -------------------------------------
// APPLY BASEMAP MODES
// -------------------------------------
// These are called by map-logic.js when transitioning
// between idle globe + focused waypoint view.

export function applyIdleBasemap() {
  // Darker, minimal labels – "space HUD" vibe
  map.setConfigProperty("basemap", "lightPreset", IDLE_LIGHT_PRESET);
  map.setConfigProperty("basemap", "showPlaceLabels", true); // cities visible
  map.setConfigProperty("basemap", "showRoadLabels", false);
  map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
}

export function applyFocusBasemap(lightPreset = LIGHT_PRESETS.day) {
  // Cinematic "dive in" mode – waypoint-focused
  map.setConfigProperty("basemap", "lightPreset", lightPreset);
  map.setConfigProperty("basemap", "showPlaceLabels", true);
  map.setConfigProperty("basemap", "showRoadLabels", true);
  map.setConfigProperty("basemap", "showPointOfInterestLabels", true);
}

// -------------------------------------
// MAP EVENT WIRING
// -------------------------------------
map.once("load", () => {
  // Globe tweaks
  map.setFog({
    color: "rgba(11, 16, 35, 1.0)", // deep space blue
    "high-color": "rgba(36, 73, 124, 1.0)",
    "horizon-blend": 0.2,
    "space-color": "rgba(0, 0, 0, 1.0)",
    "star-intensity": 0.25,
  });

  // Initial idle basemap
  applyIdleBasemap();

  // Save global reference
  setMapInstance(map);

  // Notify other modules that the map is ready
  window.dispatchEvent(
    new CustomEvent("dc-map-ready", {
      detail: { map },
    }),
  );
});

// Whenever zoom changes, decide if we should flip back
// into "idle dark globe" mode.
map.on("zoomend", () => {
  const z = map.getZoom();
  if (z <= IDLE_ZOOM_THRESHOLD) {
    applyIdleBasemap();
  }
});

// Export the map so other modules can import it directly if needed
export { map };
