/* ========================================================================== */
/* ============================= MAP LOGIC CORE ============================= */
/* ========================================================================== */

console.log("%cmap-logic.js loaded", "color:#ffaa00;font-weight:bold;");

/* ========================================================================== */
/* IMPORTANT: NEVER TOUCH window.__MAP HERE                                   */
/* The map instance is created ONLY in map-style.js                           */
/* This module only provides helper logic — NO initialization                 */
/* ========================================================================== */

window.currentID   = null;
window.journeyMode = false;

/* ==========================================================================
   BASIC HELPERS
   ========================================================================== */

window.getWP = function (id) {
    return WAYPOINTS.find(w => w.id === id) || null;
};

window.getZoom = function (id) {
    if (["sydney", "la", "toronto"].includes(id)) return 6.7;
    return 9.4;
};

function isFlight(a, b) {
    return (
        (a === "sydney" && b === "la") ||
        (a === "la" && b === "toronto")
    );
}

window.getLegMode = function (id) {
    const idx = TRIP_ORDER.indexOf(id);
    const next = TRIP_ORDER[idx + 1];
    if (next && isFlight(id, next)) return "Plane";
    return getWP(id)?.mode || "Car";
};

/* ==========================================================================
   THIS MODULE DOES NOT DEFINE:
   - startOrbit / stopOrbit (handed by map-ui.js — monolith accurate)
   - animateLeg / undoTo / resetJourney (journey engine lives in map-ui.js)
   - HUD updates (map-ui.js)
   - popup triggering (map-ui.js)
   - marker building (map-ui.js or map-core)
   - static/driving route construction (map-data.js or map-core)
   - map load listeners (map-core only)
   ========================================================================== */

/* ==========================================================================
   THIS FILE PROVIDES ONLY SAFE LOGIC UTILITIES REQUIRED BY OTHER MODULES
   ========================================================================== */

console.log("%cmap-logic.js ready", "color:#00ff88;font-weight:bold;");
