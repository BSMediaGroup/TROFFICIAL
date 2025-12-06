/* ==========================================================================
   MAP CORE ORCHESTRATOR — v3 (FINAL & MONOLITH-ACCURATE)
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* ------------------------------------------------------------
   WAIT FOR window.__MAP CREATED BY map-style.js
------------------------------------------------------------ */

function waitForMap(callback) {
    if (window.__MAP) {
        callback();
        return;
    }
    console.warn("map-core.js: __MAP not ready — waiting…");
    setTimeout(() => waitForMap(callback), 30);
}

/* ==========================================================================
   MAIN ORCHESTRATION
   ========================================================================== */

waitForMap(() => {
    const map = window.__MAP;

    console.log("%cmap-core.js: __MAP detected", "color:#00ffaa;");

    /* --------------------------------------------------------
       REQUIRED GLOBALS (NO LONGER CHECK addStaticRoutes TYPE)
       -------------------------------------------------------- */

    const required = [
        "WAYPOINTS",
        "TRIP_ORDER",
        "initializeStyleLayers",
        "computeAllLegDistances",
        "addStaticRoutes",       // updater only — not creator
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

    /* --------------------------------------------------------
       MAP LOAD (true system start)
       -------------------------------------------------------- */

    map.once("load", async () => {
        console.log("%cmap-core.js: map.load fired", "color:#00ffaa;");

        /* ----------------------------------------------------
           1) STYLE LAYERS (nations)
        ---------------------------------------------------- */
        await initializeStyleLayers();
        console.log("✓ Style layers initialized");

        /* ----------------------------------------------------
           2) DISTANCES (for legend, HUD, journey)
        ---------------------------------------------------- */
        computeAllLegDistances();
        console.log("✓ Distances computed");

        /* ----------------------------------------------------
           3) STATIC FLIGHT ROUTES
              (This now *updates* existing placeholders)
        ---------------------------------------------------- */
        addStaticRoutes();
        console.log("✓ Static flight routes added");

        /* ----------------------------------------------------
           4) DRIVING ROUTE (Mapbox Directions API)
        ---------------------------------------------------- */
        await buildDrivingRoute();
        console.log("✓ Driving route built");

        /* ----------------------------------------------------
           5) JOURNEY SOURCE LAYERS (flight/drive/current)
        ---------------------------------------------------- */
        addJourneySources();
        console.log("✓ Journey sources added");

        /* ----------------------------------------------------
           6) MARKERS + POPUPS + CLICK BEHAVIOUR
        ---------------------------------------------------- */
        buildMarkers();
        console.log("✓ Markers created");

        /* ----------------------------------------------------
           7) HUD INIT
        ---------------------------------------------------- */
        updateHUD();
        console.log("✓ HUD ready");

        /* ----------------------------------------------------
           8) AUTO-SPIN (disabled when journey begins)
        ---------------------------------------------------- */
        if (typeof window.MAP_READY === "undefined") {
            window.MAP_READY = false;
        }

        spinGlobe();  
        console.log("✓ Globe spinning");

        /* ----------------------------------------------------
           9) ALL SYSTEMS READY
        ---------------------------------------------------- */
        window.MAP_READY = true;
        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
