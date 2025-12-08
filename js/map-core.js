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
       REQUIRED GLOBALS — validated before system start
       -------------------------------------------------------- */

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

    /* 
    =======================================================================
       MAP LOAD — TRUE SYSTEM START
       ======================================================================= 
       NOTE:
       ⚠ MAP_READY is set to TRUE *earlier* now (before spinGlobe) to
         avoid UI/logic modules reading FALSE during static initialization.
    =======================================================================
    */

    map.once("load", async () => {
        console.log("%cmap-core.js: map.load fired", "color:#00ffaa;");

        /* ------------------------------------------------------------------
           CRITICAL FIX:
           Mark MAP_READY *before* calling layer builders so all modules 
           depending on guard conditions do not block or skip logic.
        ------------------------------------------------------------------ */
        window.MAP_READY = true;

        /* ----------------------------------------------------
           1) STYLE LAYERS (countries shading)
        ---------------------------------------------------- */
        await initializeStyleLayers();
        console.log("✓ Style layers initialized");

        /* ----------------------------------------------------
           2) DISTANCES (for popups, legend, HUD)
        ---------------------------------------------------- */
        computeAllLegDistances();
        console.log("✓ Distances computed");

        /* ----------------------------------------------------
           3) STATIC FLIGHT ROUTES
              (updates placeholder sources created in map-style.js)
        ---------------------------------------------------- */
        addStaticRoutes();
        console.log("✓ Static flight routes added");

        /* ----------------------------------------------------
           4) DRIVING ROUTE (Mapbox Directions API)
              Needs sources that already exist from map-style.js
        ---------------------------------------------------- */
        await buildDrivingRoute();
        console.log("✓ Driving route built");

        /* ----------------------------------------------------
           5) JOURNEY SOURCE LAYERS
        ---------------------------------------------------- */
        addJourneySources();
        console.log("✓ Journey sources added");

        /* ----------------------------------------------------
           6) MARKERS + POPUPS + EVENTS
        ---------------------------------------------------- */
        buildMarkers();
        console.log("✓ Markers created");

        /* ----------------------------------------------------
           7) INITIAL HUD SYNC
        ---------------------------------------------------- */
        updateHUD();
        console.log("✓ HUD ready");

        /* ----------------------------------------------------
           8) AUTO-SPIN (START ONLY AFTER MAP_READY SET)
        ---------------------------------------------------- */
        setTimeout(() => {
            if (!window.userInterrupted && window.spinning) {
                spinGlobe();
                console.log("✓ Globe spinning");
            }
        }, 150);

        /* ----------------------------------------------------
           9) SYSTEM READY
        ---------------------------------------------------- */
        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
