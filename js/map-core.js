/* ==========================================================================
   MAP CORE ORCHESTRATOR — v2 (FINAL, MONOLITH-ACCURATE, SAFE)
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* --------------------------------------------------------------------------
   DO NOT RUN ANYTHING UNTIL map-style.js has created window.__MAP.
-------------------------------------------------------------------------- */

function waitForMap(callback) {
    if (window.__MAP) {
        callback();
        return;
    }
    console.warn("map-core.js: __MAP not ready — waiting...");
    setTimeout(() => waitForMap(callback), 30);
}

/* ==========================================================================
   MAIN INITIALIZATION
   ========================================================================== */

waitForMap(() => {
    const map = window.__MAP;

    console.log("%cmap-core.js: __MAP detected", "color:#00ffaa;");

    /* ----------------------------------------------------------------------
       Ensure globals exist before executing map.load
       ---------------------------------------------------------------------- */
    const required = [
        "WAYPOINTS",
        "TRIP_ORDER",
        "initializeStyleLayers",
        "computeAllLegDistances",
        "addStaticRoutes",
        "buildDrivingRoute",
        "addJourneySources",
        "buildMarkers",
        "updateHUD",
        "spinGlobe"
    ];

    required.forEach(name => {
        if (typeof window[name] === "undefined") {
            console.error(`❌ map-core.js: Missing global "${name}"`);
            throw new Error(`Missing global ${name}`);
        }
    });

    /* ----------------------------------------------------------------------
       SINGLE ENTRY POINT — Map LOAD EVENT
       ---------------------------------------------------------------------- */

    map.once("load", async () => {
        console.log("%cmap-core.js: map.load fired", "color:#00ffaa;");

        /* 1) STYLE */
        await initializeStyleLayers();
        console.log("✓ Style layers initialized");

        /* 2) DISTANCES */
        computeAllLegDistances();
        console.log("✓ Distances computed");

        /* 3) STATIC FLIGHT ROUTE */
        addStaticRoutes();
        console.log("✓ Static flight routes added");

        /* 4) DRIVING ROUTE (async Mapbox Directions call) */
        await buildDrivingRoute();
        console.log("✓ Driving route built");

        /* 5) JOURNEY POLYLINE SOURCES */
        addJourneySources();
        console.log("✓ Journey sources added");

        /* 6) MARKERS */
        buildMarkers();
        console.log("✓ Markers created");

        /* 7) HUD */
        updateHUD();
        console.log("✓ HUD ready");

        /* 8) ENABLE GLOBE SPIN */
        spinGlobe();
        console.log("✓ Globe spinning");

        /* 9) MAP READY FLAG */
        window.MAP_READY = true;
        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
