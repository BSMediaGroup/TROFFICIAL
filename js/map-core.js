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
       Ensure globals from map-data.js, map-style.js, map-logic.js, map-ui.js exist
       ---------------------------------------------------------------------- */
    const required = [
        "WAYPOINTS",
        "TRIP_ORDER",
        "initializeStyleLayers",
        "initDistances",
        "addStaticRoutes",
        "buildDrivingRoute",
        "addJourneySources",
        "buildMarkers",
        "updateHUD",
        "spinGlobe"
    ];

    required.forEach(name => {
        if (typeof window[name] === "undefined") {
            console.error(`❌ map-core: Missing global ${name}`);
            throw new Error(`Missing global: ${name}`);
        }
    });

    /* ----------------------------------------------------------------------
       SINGLE map.load ENTRY POINT — EXACTLY ONE
       ---------------------------------------------------------------------- */
    map.once("load", async () => {
        console.log("%cmap-core: map.load fired", "color:#00ffaa;");

        /* 1) STYLE INITIALIZATION (FOG handled in style.load) */
        await initializeStyleLayers();
        console.log("✓ Style layers initialized");

        /* 2) DISTANCES (required BEFORE popups / HUD) */
        initDistances();
        console.log("✓ Distances initialized");

        /* 3) STATIC ROUTES */
        addStaticRoutes();
        console.log("✓ Static flight routes added");

        /* 4) DRIVING ROUTE */
        await buildDrivingRoute();
        console.log("✓ Driving route built");

        /* 5) JOURNEY LINE SOURCES */
        addJourneySources();
        console.log("✓ Journey polyline sources added");

        /* 6) MARKERS */
        buildMarkers();
        console.log("✓ Markers built");

        /* 7) INITIAL HUD */
        updateHUD();
        console.log("✓ HUD initialized");

        /* 8) ENABLE SPIN */
        spinGlobe();
        console.log("✓ Globe spin started");

        /* 9) MAP READY FLAG */
        window.MAP_READY = true;
        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
