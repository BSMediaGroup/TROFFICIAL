/* ==========================================================================
   MAP CORE ORCHESTRATOR — FIXED & STABLE
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");

/* ==========================================================================
   REQUIRED GLOBALS — BUT DO NOT CHECK __MAP HERE
   ========================================================================== */

function requireGlobal(name) {
    if (typeof window[name] === "undefined") {
        console.error(`❌ map-core.js: Missing global ${name}`);
        throw new Error(`Missing global: ${name}`);
    }
}

[
    "WAYPOINTS",
    "TRIP_ORDER",
    "buildMarkers",
    "updateHUD",
    "initializeStyleLayers"
].forEach(requireGlobal);

/* ==========================================================================
   WAIT FOR MAP INSTANCE (CREATED IN map-style.js)
   ========================================================================== */

function waitForMap() {
    return new Promise(resolve => {
        if (window.__MAP) {
            resolve(window.__MAP);
            return;
        }

        const check = setInterval(() => {
            if (window.__MAP) {
                clearInterval(check);
                resolve(window.__MAP);
            }
        }, 10);
    });
}

/* ==========================================================================
   MAIN ORCHESTRATION
   ========================================================================== */

waitForMap().then(map => {

    console.log("%cmap-core.js: Map instance detected", "color:#00ffaa;");

    map.once("load", async () => {

        console.log("%cmap-core.js: Map load event fired", "color:#00ffaa;");

        /* ----------------------------------------------------------
           1) STYLE LAYERS (fog, stars, nations)
           ---------------------------------------------------------- */
        try {
            await initializeStyleLayers();
        } catch (e) {
            console.error("initializeStyleLayers() error:", e);
        }

        /* ----------------------------------------------------------
           2) BUILD MARKERS
           ---------------------------------------------------------- */
        try {
            buildMarkers();
            console.log("✓ Markers built");
        } catch (e) {
            console.error("Marker build error:", e);
        }

        /* ----------------------------------------------------------
           3) INITIAL HUD
           ---------------------------------------------------------- */
        try {
            updateHUD();
            console.log("✓ HUD initialized");
        } catch (e) {
            console.error("HUD init error:", e);
        }

        /* ----------------------------------------------------------
           4) GLOBAL UI BINDINGS
           ---------------------------------------------------------- */
        try {
            bindGlobalUI();
        } catch (e) {
            console.error("UI bind error:", e);
        }

        console.log("%cmap-core.js orchestration complete", "color:#00eaff;");
    });
});

/* ==========================================================================
   GLOBAL UI BINDINGS — unchanged except stabilized
   ========================================================================== */

function bindGlobalUI() {

    console.log("✓ Binding global UI...");

    /* Journey Start Button */
    const startBtn = document.getElementById("startJourneyBtn");
    if (startBtn) {
        startBtn.addEventListener("click", () => {
            window.journeyMode = true;
            window.currentID = TRIP_ORDER[0];
            openPopupFor(TRIP_ORDER[0]);
            updateHUD();
        });
    }

    /* Legend Toggle */
    const legendToggle = document.getElementById("legendToggle");
    const legendBox = document.getElementById("legendBox");
    if (legendToggle && legendBox) {
        legendToggle.addEventListener("click", () => {
            legendBox.classList.toggle("collapsed");
        });
    }

    /* HUD Prev/Next */
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

    /* Escape closes Details Panel */
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (typeof closeDetailsSidebar === "function") {
                closeDetailsSidebar();
            }
        }
    });

    console.log("✓ Global UI fully bound");
}

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
