// =======================================================
// =============== MAP CONFIG & GLOBAL CONSTANTS =========
// =======================================================

// -------------------------------------
// MAPBOX TOKEN
// -------------------------------------
export const MAPBOX_TOKEN =
  "pk.eyJ1IjoiZGFuaWVsY2xhbmN5IiwiYSI6ImNtaW41d2xwNzJhYW0zZnB4bGR0eGNlZjYifQ.qTsXirOA9VxIE8TXHmihyw"; // <-- replace with your real token


// -------------------------------------
// MAP INITIAL SETTINGS
// -------------------------------------
export const DEFAULT_CENTER = [151.177222, -33.946111]; // Sydney Airport
export const DEFAULT_ZOOM = 1.6;
export const DEFAULT_PITCH = 0;
export const DEFAULT_BEARING = 0;


// -------------------------------------
// WAYPOINT VISIBILITY THRESHOLDS
// -------------------------------------
// These are imported by map-logic.js when deciding how/when to
// show minor vs major waypoints. Major ones ignore zoom.
export const MINOR_WAYPOINT_MIN_ZOOM = 3.2;


// -------------------------------------
// ANIMATION SETTINGS
// -------------------------------------
export const SPIN_ENABLED_START = true;
export const SPIN_SPEED = 0.07; // globe idle rotation speed
export const ORBIT_SPEED = 0.45; // camera orbit during flight legs
export const FLIGHT_DURATION = 5500; // camera flyTo between waypoints (ms)


// -------------------------------------
// LIGHTING PRESETS BEHAVIOUR
// -------------------------------------
// We set the default "zoomed out" vibe as NIGHT for the dark theme.
// When focusing a waypoint, map-style.js will call a function in map-logic
// that picks the appropriate preset based on its local time.
export const IDLE_LIGHT_PRESET = "night";

export const LIGHT_PRESETS = {
  dawn: "dawn",
  day: "day",
  dusk: "dusk",
  night: "night",
};


// -------------------------------------
// SECTION: AMENITIES SEARCH CONFIG
// -------------------------------------
// We avoid clutter by only fetching a limited set of POI categories.
// These are used in map-logic.js.
export const AMENITY_CATEGORIES = {
  hotels: ["lodging"],
  toilets: ["restroom", "toilet"],
  attractions: ["tourist_attraction", "park"],
};

// radius in meters for nearby POI search
export const AMENITY_SEARCH_RADIUS = 3500;

// how many amenities to show in the sidebar list
export const AMENITY_RESULT_LIMIT = 6;


// -------------------------------------
// GLOBAL STATE (MUTABLE)
// -------------------------------------
export let globalState = {
  spinning: SPIN_ENABLED_START,
  currentWaypointIndex: 0,
  isJourneyMode: false,
  mapInstance: null,
};

// STATE MUTATORS (used by modules)
export function setMapInstance(map) {
  globalState.mapInstance = map;
}

export function setSpinning(v) {
  globalState.spinning = v;
}

export function setCurrentWaypointIndex(i) {
  globalState.currentWaypointIndex = i;
}

export function setJourneyMode(v) {
  globalState.isJourneyMode = v;
}


// -------------------------------------
// SECTION: TIME → LIGHT PRESET LOGIC
// -------------------------------------
// Given a JS Date object with correct TZ applied,
// we choose the appropriate Standard lighting preset.
export function computeLightPresetFromLocalTime(localDate) {
  const hour = localDate.getHours();

  if (hour >= 5 && hour < 7) return LIGHT_PRESETS.dawn;
  if (hour >= 7 && hour < 18) return LIGHT_PRESETS.day;
  if (hour >= 18 && hour < 21) return LIGHT_PRESETS.dusk;

  return LIGHT_PRESETS.night;
}
