/* ==========================================================================
   MAP CORE ORCHESTRATOR — v2 (REBUILT CLEAN)
   Single responsibility:
   - Validate module load order
   - Wait for map-style.js to create window.__MAP
   - Run full initialization sequence when map loads
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* ==========================================================================
   SAFETY VALIDATION — ensure essential globals exist
   ========================================================================== */

function requireGlobal(name) {
    if (typeof window[name] === "undefined") {
        console.error(`❌ map-core: Missing global ${name}`);
        throw new Error(`Missing global ${name}`);
    }
}

[
    "__MAP",
    "WAYPOINTS",
    "TRIP_ORDER",
    "initializeStyleLayers",
    "buildMarkers",
    "updateHUD",
    "bindGlobalUI"
].forEach(requireGlobal);

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
