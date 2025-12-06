/* ==========================================================================
   MAP CORE ORCHESTRATOR — v3 (FINAL, MODULAR, MONOLITH-ACCURATE)
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* ==========================================================================
   WAIT FOR MAP INSTANCE FROM map-style.js
   (This guarantees style.load → fog config has a target)
   ========================================================================== */

function waitForMap(callback) {
    if (window.__MAP) {
        callback(window.__MAP);
        return;
    }
    setTimeout(() => waitForMap(callback), 20);
}

/* ==========================================================================
   START WHEN MAP INSTANCE EXISTS
   ========================================================================== */

waitForMap((map) => {
    console.log("%cmap-core.js: __MAP detected", "color:#00ffaa;");

    /* ----------------------------------------------------------------------
       VERIFY REQUIRED MODULE EXPORTS EXIST (REAL, CURRENT, ACCURATE)
       ---------------------------------------------------------------------- */

    const requiredGlobals = {
        WAYPOINTS: "map-data.js",
        TRIP_ORDER: "map-data.js",
        initDistances: "map-logic.js",
        addStaticRoutes: "map-logic.js",
        buildDrivingRoute: "map-logic.js",
        addJourneyLayers: "map-logic.js",
        buildMarkers: "map-ui.js",
        updateHUD: "map-ui.js",
        spinGlobe: "map-logic.js",
        initializeStyleLayers: "map-style.js"
    };

    Object.entries(requiredGlobals).forEach(([name, src]) => {
        if (typeof window[name] === "undefined") {
            console.error(`❌ map-core.js: Missing global "${name}" (from ${src})`);
            throw new Error(`Missing global ${name}`);
        }
    });

    /* ==========================================================================
       SINGLE MAP.LOAD ENTRY POINT — EXACTLY ONE
       ========================================================================== */

    map.once("load", async () => {
        console.log("%cmap-core: map.load fired", "color:#00ffaa;");

        /* ----------------------------------------------------------------------
           1) STYLE INITIALIZATION (Fog executed automatically in style.load)
           ---------------------------------------------------------------------- */
        await initializeStyleLayers();
        console.log("✓ Style layers initialized");

        /* ----------------------------------------------------------------------
           2) DISTANCE TABLES (crucial before popups/HUD)
           ---------------------------------------------------------------------- */
        initDistances();
        console.log("✓ Distance tables built");

        /* ----------------------------------------------------------------------
           3) STATIC FLIGHT ROUTES (always shown in static mode)
           ---------------------------------------------------------------------- */
        addStaticRoutes();
        console.log("✓ Static flight routes added");

        /* ----------------------------------------------------------------------
           4) DRIVING ROUTE (async Mapbox Directions API)
           ---------------------------------------------------------------------- */
        await buildDrivingRoute();
        console.log("✓ Driving route generated");

        /* ----------------------------------------------------------------------
           5) JOURNEY POLYLINE SOURCES (empty containers for animation)
           ---------------------------------------------------------------------- */
        addJourneyLayers();
        console.log("✓ Journey animation layers added");

        /* ----------------------------------------------------------------------
           6) MARKERS + POPUPS
           ---------------------------------------------------------------------- */
        buildMarkers();
        console.log("✓ Markers and popups initialized");

        /* ----------------------------------------------------------------------
           7) INITIAL HUD STATE
           ---------------------------------------------------------------------- */
        updateHUD();
        console.log("✓ HUD initialized");

        /* ----------------------------------------------------------------------
           8) INITIAL GLOBE SPIN (stops when user interacts)
           ---------------------------------------------------------------------- */
        spinGlobe();
        console.log("✓ Globe auto-rotation started");

        /* ----------------------------------------------------------------------
           9) MAP READY FLAG
           ---------------------------------------------------------------------- */
        window.MAP_READY = true;

        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
