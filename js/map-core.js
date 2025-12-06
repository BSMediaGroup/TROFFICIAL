/* ==========================================================================
   MAP CORE ORCHESTRATOR — extracted from original monolith
   This file ensures all modules load in correct order.
   NOTHING ELSE SHOULD INITIALIZE THE MAP.
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* ==========================================================================
   LOAD ORDER GUARANTEE
   --------------------------------------------------------------------------
   - map-config.js   → defines MAPBOX_TOKEN, DEFAULT_CENTER, DEFAULT_ZOOM etc.
   - map-style.js    → defines window.__MAP style instance + fog/stars system
   - map-data.js     → defines WAYPOINTS, TRIP_ORDER, etc.
   - map-logic.js    → defines animation, orbit, journey functions
   - map-ui.js       → defines markers, popups, HUD, sidebar
   - map-core.js     → orchestrates everything in the correct sequence
   ========================================================================== */


/* ==========================================================================
   SAFETY CHECKS — ensure essential globals exist
   ========================================================================== */

function requireGlobal(name) {
    if (typeof window[name] === "undefined") {
        console.error(`❌ map-core.js: Missing global ${name}`);
        throw new Error(`Missing global: ${name}`);
    }
}

[
    "__MAP",
    "WAYPOINTS",
    "TRIP_ORDER",
    "buildMarkers",
    "updateHUD",
    "initializeStyleLayers"
].forEach(requireGlobal);


/* ==========================================================================
   ENFORCE CORRECT INITIALIZATION
   ========================================================================== */

window.__MAP.once("load", () => {
    console.log("%cmap-core.js: Map load event fired", "color:#00ffaa;");

    /* ----------------------------------------------------------
       1) INITIALIZE TERRAIN / FOG / NATION SHADING
       ---------------------------------------------------------- */
    if (typeof initializeStyleLayers === "function") {
        initializeStyleLayers();
    }

    /* ----------------------------------------------------------
       2) BUILD MARKERS
       ---------------------------------------------------------- */
    if (typeof buildMarkers === "function") {
        buildMarkers();
        console.log("✓ Markers built");
    }

    /* ----------------------------------------------------------
       3) INITIAL HUD STATE
       ---------------------------------------------------------- */
    if (typeof updateHUD === "function") {
        updateHUD();
        console.log("✓ HUD initialized");
    }

    /* ----------------------------------------------------------
       4) BIND ALL UI BUTTONS (Journey Start / HUD buttons / Legend)
       ---------------------------------------------------------- */
    bindGlobalUI();
});


/* ==========================================================================
   UI BUTTON REGISTRATION — matches the original monolith exactly
   ========================================================================== */

function bindGlobalUI() {

    console.log("✓ Binding global UI...");

    /* ------------------ Journey Start Button ------------------ */
    const startBtn = document.getElementById("startJourneyBtn");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            window.journeyMode = true;
            window.currentID = TRIP_ORDER[0];
            openPopupFor(TRIP_ORDER[0]);
            updateHUD();
        });
    }

    /* ------------------ Legend Collapse ------------------ */
    const legendToggle = document.getElementById("legendToggle");
    const legendBox = document.getElementById("legendBox");
    if (legendToggle && legendBox) {
        legendToggle.addEventListener("click", () => {
            legendBox.classList.toggle("collapsed");
        });
    }

    /* ------------------ Top HUD Buttons ------------------ */
    const hudPrev = document.getElementById("hudPrev");
    const hudNext = document.getElementById("hudNext");

    if (hudPrev) {
        hudPrev.addEventListener("click", () => {
            const idx = TRIP_ORDER.indexOf(window.currentID);
            if (idx > 0) undoTo(TRIP_ORDER[idx - 1]);
        });
    }

    if (hudNext) {
        hudNext.addEventListener("click", () => {
            const idx = TRIP_ORDER.indexOf(window.currentID);
            if (idx < TRIP_ORDER.length - 1) animateLeg(window.currentID, TRIP_ORDER[idx + 1]);
        });
    }

    /* ------------------ ESC Key closes sidebar ------------------ */
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (typeof closeDetailsSidebar === "function") {
                closeDetailsSidebar();
            }
        }
    });

    console.log("✓ Global UI fully bound");
}


/* ==========================================================================
   SANITY LOG
   ========================================================================== */

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
