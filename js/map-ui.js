// =======================================================
// ====================== MAP UI LOGIC ====================
// =======================================================

import {
  globalState,
  setSpinning,
  setJourneyMode
} from "./map-config.js";

import { map, applyIdleBasemap } from "./map-style.js";
import { TRIP_ORDER, WAYPOINTS } from "./map-data.js";
import { focusWaypoint, nextWaypoint, prevWaypoint } from "./map-logic.js";


// =======================================================
// =============== INITIAL UI SETUP =======================
// =======================================================
window.addEventListener("dc-map-ready", () => {
  attachHUDUpdates();
  attachSidebarButtons();
  runHUDClock();
});


// =======================================================
// ================== HUD CLOCK ===========================
// =======================================================
function runHUDClock() {
  function update() {
    const now = new Date();
    document.getElementById("hud-time").textContent =
      now.toUTCString().replace("GMT", "UTC");
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}


// =======================================================
// =============== SIMPLE WEATHER FETCH ===================
// =======================================================
// (OPTIONAL) Placeholder – real API can be added later.
// For now, we fake a simple weather string.
function attachHUDUpdates() {
  document.getElementById("hud-weather").textContent =
    "Weather: Updating…";

  setTimeout(() => {
    document.getElementById("hud-weather").textContent =
      "Weather: Clear Skies";
  }, 750);
}


// =======================================================
// ================= SIDEBAR BUTTONS ======================
// =======================================================
function attachSidebarButtons() {
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  btnPrev.addEventListener("click", () => prevWaypoint());
  btnNext.addEventListener("click", () => nextWaypoint());
}


// =======================================================
// ========= CLOSE SIDEBAR WHEN MAP CLICKED ===============
// =======================================================
map.on("click", (e) => {
  const sidebar = document.getElementById("sidebar");
  if (sidebar.classList.contains("sidebar-open")) {
    // user clicked empty map area
    sidebar.classList.remove("sidebar-open");
    sidebar.classList.add("sidebar-closed");

    setSpinning(true);
    setJourneyMode(false);
    applyIdleBasemap();

    map.flyTo({
      center: [0, 20],
      zoom: 1.9,
      pitch: 0,
      bearing: 0,
      duration: 1200
    });
  }
});


// =======================================================
// ========= HOVER TOOLTIP (OPTIONAL HOOK) ================
// =======================================================
// You may implement a custom HUD tooltip here later if desired.
// This module keeps the hook available.

map.on("mousemove", (e) => {
  // Reserved for future custom HUD overlays.
});


// =======================================================
// ========== HIGHLIGHT ACTIVE MARKER =====================
// =======================================================
export function highlightActiveMarker(id) {
  for (const wp of WAYPOINTS) {
    const el = document.querySelector(`.dc-marker-img[src="${wp.icon}"]`);
    if (!el) continue;

    if (wp.id === id) {
      el.classList.add("marker-active");
    } else {
      el.classList.remove("marker-active");
    }
  }
}


// =======================================================
// =========== UI TONE — DISABLE JOURNEY MODE =============
// =======================================================
export function resetUIState() {
  setSpinning(true);
  setJourneyMode(false);
  applyIdleBasemap();

  const sidebar = document.getElementById("sidebar");
  sidebar.classList.remove("sidebar-open");
  sidebar.classList.add("sidebar-closed");
}
