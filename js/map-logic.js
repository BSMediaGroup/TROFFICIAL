// =======================================================
// ===================== MAP LOGIC CORE ===================
// =======================================================

import {
  globalState,
  setCurrentWaypointIndex,
  setJourneyMode,
  setSpinning,
  AMENITY_CATEGORIES,
  AMENITY_SEARCH_RADIUS,
  AMENITY_RESULT_LIMIT,
  computeLightPresetFromLocalTime
} from "./map-config.js";

import { map, applyIdleBasemap, applyFocusBasemap } from "./map-style.js";
import { WAYPOINTS, TRIP_ORDER, LEG_DIST } from "./map-data.js";

// -------------------------------------------------------
// GLOBAL AMENITY CACHE
// -------------------------------------------------------
const amenityCache = {};

// -------------------------------------------------------
// MARKER STORAGE
// -------------------------------------------------------
let markers = [];

// -------------------------------------------------------
// WAIT FOR MAP READY EVENT
// -------------------------------------------------------
window.addEventListener("dc-map-ready", () => {
  createAllMarkers();
  createAllRoutes();
  enforceLayerOrder();
});

// =======================================================
// =============== MARKER CREATION ========================
// =======================================================
function createAllMarkers() {
  markers = [];

  for (const wp of WAYPOINTS) {
    const el = document.createElement("div");
    el.className = "dc-marker";

    if (wp.role === "minor") el.classList.add("marker-minor");
    if (wp.role === "major" || wp.role === "toronto") el.classList.add("marker-major");
    if (wp.role === "departure") el.classList.add("marker-departure");

    // icon
    const img = document.createElement("img");
    img.src = wp.icon;
    img.className = "dc-marker-img";
    el.appendChild(img);

    el.addEventListener("click", () => focusWaypoint(wp.id));

    const marker = new mapboxgl.Marker(el, { anchor: "center" })
      .setLngLat(wp.coords)
      .addTo(map);

    markers.push({ id: wp.id, marker, role: wp.role });
  }
}

// =======================================================
// =============== ROUTE CREATION =========================
// =======================================================
function createAllRoutes() {
  // Remove if exists
  if (map.getSource("dc-routes")) {
    map.removeLayer("dc-routes-flight");
    map.removeLayer("dc-routes-road");
    map.removeSource("dc-routes");
  }

  const features = [];

  for (let i = 0; i < TRIP_ORDER.length - 1; i++) {
    const a = WAYPOINTS.find((w) => w.id === TRIP_ORDER[i]);
    const b = WAYPOINTS.find((w) => w.id === TRIP_ORDER[i + 1]);

    if (!a || !b) continue;

    features.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [a.coords, b.coords]
      },
      properties: {
        mode: a.mode
      }
    });
  }

  map.addSource("dc-routes", {
    type: "geojson",
    data: {
      type: "FeatureCollection",
      features
    }
  });

  // FLIGHT ROUTES
  map.addLayer({
    id: "dc-routes-flight",
    type: "line",
    source: "dc-routes",
    filter: ["==", ["get", "mode"], "Plane"],
    paint: {
      "line-color": "#00aaff",
      "line-width": 3.0,
      "line-opacity": 0.85,
      "line-emissive-strength": 0.7
    }
  }, "road-label");

  // ROAD ROUTES
  map.addLayer({
    id: "dc-routes-road",
    type: "line",
    source: "dc-routes",
    filter: ["==", ["get", "mode"], "Car"],
    paint: {
      "line-color": "#ffaa00",
      "line-width": 3.0,
      "line-opacity": 0.8,
      "line-emissive-strength": 0.7
    }
  }, "dc-routes-flight");
}

// =======================================================
// =============== LAYER ORDER ENFORCEMENT ===============
// =======================================================
// Ensures your markers are ALWAYS above all Mapbox layers.
function enforceLayerOrder() {
  const topLayerId = findTopNonCustomLayer();

  // markers are DOM rendered via Marker(), so they are already above
  // but we ensure routes are above mapbox layers
  if (map.getLayer("dc-routes-flight")) {
    map.moveLayer("dc-routes-flight", topLayerId);
  }
  if (map.getLayer("dc-routes-road")) {
    map.moveLayer("dc-routes-road", topLayerId);
  }
}

function findTopNonCustomLayer() {
  const layers = map.getStyle().layers;
  return layers[layers.length - 1].id;
}

// =======================================================
// =============== WAYPOINT FOCUS LOGIC ===================
// =======================================================
export function focusWaypoint(id) {
  const index = TRIP_ORDER.indexOf(id);
  if (index < 0) return;

  const wp = WAYPOINTS.find((w) => w.id === id);
  if (!wp) return;

  setCurrentWaypointIndex(index);
  setJourneyMode(true);
  setSpinning(false);

  // LOCAL TIME → LIGHT PRESET
  const nowUTC = new Date();
  const localTime = new Date(
    nowUTC.toLocaleString("en-US", { timeZone: wp.meta.timezone })
  );
  const preset = computeLightPresetFromLocalTime(localTime);

  // Apply "focus mode" basemap
  applyFocusBasemap(preset);

  // Center
  map.flyTo({
    center: wp.coords,
    zoom: 8.5,
    pitch: 50,
    bearing: 0,
    duration: 2400
  });

  updateSidebar(wp);
  fetchWaypointAmenities(wp.id);
}

// =======================================================
// =============== SIDEBAR UPDATE =========================
// =======================================================
function updateSidebar(wp) {
  document.getElementById("sidebar-title").textContent = wp.names.display;
  document.getElementById("sidebar-description").textContent = wp.description;

  // Local time
  const nowUTC = new Date();
  const localTime = nowUTC.toLocaleString("en-US", {
    timeZone: wp.meta.timezone
  });

  document.getElementById("sidebar-local-time").textContent =
    "Local Time: " + localTime;
  document.getElementById("sidebar-timezone").textContent =
    "Timezone: " + wp.meta.timezone;

  document.getElementById("sidebar-weather").textContent =
    "Weather: (fetching)";

  document.getElementById("sidebar-currency").textContent =
    "Currency: " + wp.meta.countryCode;

  openSidebar();
}

// =======================================================
// =============== SIDEBAR OPEN/CLOSE =====================
// =======================================================
function openSidebar() {
  document.getElementById("sidebar").classList.remove("sidebar-closed");
  document.getElementById("sidebar").classList.add("sidebar-open");
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("sidebar-open");
  document.getElementById("sidebar").classList.add("sidebar-closed");
}

document.getElementById("sidebar-close").addEventListener("click", () => {
  closeSidebar();
  applyIdleBasemap();
  setJourneyMode(false);
  setSpinning(true);
});

// =======================================================
// =============== JOURNEY NAVIGATION =====================
// =======================================================

import {
  globalState,
  setCurrentWaypointIndex,
  setJourneyMode,
  setSpinning,
} from "./map-config.js";

import { map, applyIdleBasemap, applyFocusBasemap } from "./map-style.js";
import { WAYPOINTS, TRIP_ORDER } from "./map-data.js";
import { focusWaypoint } from "./map-logic.js"; // re-import safe in module systems


// =======================================================
// ============= BUTTON HANDLERS ==========================
// =======================================================
document.getElementById("btnPrev").addEventListener("click", () => {
  prevWaypoint();
});

document.getElementById("btnNext").addEventListener("click", () => {
  nextWaypoint();
});

document.getElementById("btnSpin").addEventListener("click", () => {
  const newState = !globalState.spinning;
  setSpinning(newState);
});

document.getElementById("btnReset").addEventListener("click", () => {
  resetJourneyView();
});


// =======================================================
// =============== NEXT / PREVIOUS WAYPOINTS ==============
// =======================================================
export function nextWaypoint() {
  let idx = globalState.currentWaypointIndex;
  idx = (idx + 1) % TRIP_ORDER.length;
  jumpToWaypointByIndex(idx);
}

export function prevWaypoint() {
  let idx = globalState.currentWaypointIndex;
  idx = (idx - 1 + TRIP_ORDER.length) % TRIP_ORDER.length;
  jumpToWaypointByIndex(idx);
}

function jumpToWaypointByIndex(idx) {
  const id = TRIP_ORDER[idx];
  setCurrentWaypointIndex(idx);
  setJourneyMode(true);
  setSpinning(false);
  focusWaypoint(id);
}


// =======================================================
// =============== RESET VIEW TO IDLE MODE ================
// =======================================================
function resetJourneyView() {
  closeSidebarSoft();

  setJourneyMode(false);
  setSpinning(true);

  applyIdleBasemap();

  map.flyTo({
    center: [0, 20],
    zoom: 1.8,
    pitch: 0,
    bearing: 0,
    duration: 2000
  });
}

function closeSidebarSoft() {
  const sb = document.getElementById("sidebar");
  sb.classList.remove("sidebar-open");
  sb.classList.add("sidebar-closed");
}


// =======================================================
// =============== SPINNING / IDLE ANIMATION ==============
// =======================================================
function idleSpinLoop() {
  if (globalState.spinning && !globalState.isJourneyMode) {
    const bearing = map.getBearing();
    map.setBearing(bearing + 0.08);
  }

  requestAnimationFrame(idleSpinLoop);
}

idleSpinLoop();


// =======================================================
// =============== CAMERA ORBIT DURING FLIGHT =============
// =======================================================
export function cameraOrbit(center, duration = 4500) {
  const start = performance.now();

  function frame(now) {
    const t = (now - start) / duration;
    if (t >= 1) return;

    const angle = map.getBearing() + 0.4;
    map.setBearing(angle);

    const p = map.getPitch();
    map.setPitch(p < 65 ? p + 0.15 : 65);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}


// =======================================================
// =============== FLY CAMERA ALONG ROUTE =================
// =======================================================
export function flyCameraTo(aId, bId) {
  const a = WAYPOINTS.find((w) => w.id === aId);
  const b = WAYPOINTS.find((w) => w.id === bId);
  if (!a || !b) return;

  setJourneyMode(true);
  setSpinning(false);

  map.flyTo({
    center: b.coords,
    zoom: 7.8,
    pitch: 55,
    bearing: 0,
    duration: 5000
  });

  cameraOrbit(b.coords, 5000);
}

// =======================================================
// ========== AMENITIES SEARCH + SIDEBAR RENDERING =========
// =======================================================

import {
  AMENITY_CATEGORIES,
  AMENITY_SEARCH_RADIUS,
  AMENITY_RESULT_LIMIT,
} from "./map-config.js";

import { map } from "./map-style.js";
import { WAYPOINTS } from "./map-data.js";


// -------------------------------------------------------
// AMENITY CACHE
// -------------------------------------------------------
const amenityCache = {};


// =======================================================
// ========== FETCH AMENITIES FOR A WAYPOINT ==============
// =======================================================
export async function fetchWaypointAmenities(id) {
  if (amenityCache[id]) {
    renderAmenities(id, amenityCache[id]);
    return;
  }

  const wp = WAYPOINTS.find((w) => w.id === id);
  if (!wp) return;

  const lng = wp.coords[0];
  const lat = wp.coords[1];

  const categories = Object.keys(AMENITY_CATEGORIES);
  const results = {};

  for (const cat of categories) {
    results[cat] = await fetchAmenityCategory(lat, lng, AMENITY_CATEGORIES[cat]);
  }

  amenityCache[id] = results;
  renderAmenities(id, results);
}


// =======================================================
// ========== FETCH SINGLE CATEGORY OF POIS ===============
// =======================================================
async function fetchAmenityCategory(lat, lng, catList) {
  try {
    const types = catList.join(",");
    const radius = AMENITY_SEARCH_RADIUS;

    const endpoint = `https://api.mapbox.com/search/searchbox/v1/search?` +
      `q=${encodeURIComponent(types)}` +
      `&proximity=${lng},${lat}` +
      `&limit=${AMENITY_RESULT_LIMIT}` +
      `&types=poi` +
      `&access_token=${mapboxgl.accessToken}`;

    const res = await fetch(endpoint);
    const data = await res.json();

    if (!data || !data.features) return [];

    return data.features.map((f) => ({
      name: f.properties.name || "(Unnamed)",
      distance: f.properties.distance || null,
      coords: f.geometry.coordinates || null,
    }));
  } catch (err) {
    console.error("Amenity fetch error:", err);
    return [];
  }
}


// =======================================================
// =============== RENDER AMENITIES TO SIDEBAR ============
// =======================================================
function renderAmenities(wpId, data) {
  const container = document.getElementById("amenities-container");
  container.innerHTML = ""; // reset

  const groups = Object.keys(data);

  for (const group of groups) {
    const items = data[group];

    const sec = document.createElement("div");
    sec.className = "amenity-block";

    const title = document.createElement("h4");
    title.textContent = formatGroupTitle(group);
    sec.appendChild(title);

    if (!items.length) {
      const none = document.createElement("div");
      none.className = "amenity-none";
      none.textContent = "No results found nearby.";
      sec.appendChild(none);
    } else {
      for (const item of items) {
        const row = document.createElement("div");
        row.className = "amenity-row";

        row.textContent = `${item.name} ${
          item.distance ? `– ${Math.round(item.distance)}m` : ""
        }`;

        row.addEventListener("click", () => {
          if (!item.coords) return;
          map.flyTo({
            center: item.coords,
            zoom: 15,
            pitch: 45,
            bearing: 0,
            duration: 2000,
          });
        });

        sec.appendChild(row);
      }
    }

    container.appendChild(sec);
  }
}


// =======================================================
// =============== CLEAN GROUP TITLES =====================
// =======================================================
function formatGroupTitle(k) {
  switch (k) {
    case "hotels":
      return "Hotels Nearby";
    case "toilets":
      return "Public Toilets";
    case "attractions":
      return "Attractions & Parks";
    default:
      return k;
  }
}
