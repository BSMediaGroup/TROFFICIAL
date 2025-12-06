/* ==========================================================================
   MAP CORE ORCHESTRATOR — v2 (HARD LOAD ORDER SAFE)
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* --------------------------------------------------------------------------
   HARD BLOCKER:
   Do NOT run ANYTHING until map-style.js has created window.__MAP.
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
   MAIN INITIALIZATION GATE
   ========================================================================== */

waitForMap(() => {
    console.log("%cmap-core.js: __MAP detected", "color:#00ffaa;");

    /* Sanity checks */
    [
        "WAYPOINTS",
        "TRIP_ORDER",
        "initializeStyleLayers",
        "buildMarkers",
        "updateHUD",
        "bindGlobalUI"
    ].forEach(name => {
        if (typeof window[name] === "undefined") {
            console.error(`❌ map-core: Missing global ${name}`);
            throw new Error(`Missing global: ${name}`);
        }
    });

    /* Wait for map load */
    window.__MAP.once("load", () => {
        console.log("%cmap-core: Map load event fired", "color:#00ffaa;");

        initializeStyleLayers();
        buildMarkers();
        updateHUD();
        bindGlobalUI();

        window.MAP_READY = true;
        console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
    });
});

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");


/* ==========================================================================
   MAIN BOOTSTRAP — map load event
   ========================================================================== */

window.__MAP.once("load", () => {
    console.log("%cmap-core: Map load event fired", "color:#00ffaa;");

    /* --- 1) STYLE INITIALIZATION (FOG, STARFIELD, NATION SHADING) --- */
    initializeStyleLayers();
    console.log("✓ Style layers initialized");

    /* --- 2) MARKERS --- */
    buildMarkers();
    console.log("✓ Markers built");

    /* --- 3) INITIAL HUD --- */
    updateHUD();
    console.log("✓ HUD initialized");

    /* --- 4) GLOBAL UI CONTROLS (journey buttons, legend toggle, etc.) --- */
    bindGlobalUI();
    console.log("✓ Global UI bound");

    /* --- 5) Application is now ready --- */
    window.MAP_READY = true;
    console.log("%c✓ MAP SYSTEM READY", "color:#00ffcc; font-weight:bold;");
});

/* ==========================================================================
   END
   ========================================================================== */

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
