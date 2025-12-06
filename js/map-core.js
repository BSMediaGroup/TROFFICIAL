/* ==========================================================================
   MAP CORE ORCHESTRATOR — CLEAN REBUILD
   This module does:
   ✔ Ensures __MAP exists
   ✔ Runs style-layer initialization
   ✔ Builds markers
   ✔ Initializes HUD
   ✔ Binds all global UI controls
   NOTHING else initializes the map.
   ========================================================================== */

console.log("%cmap-core.js loaded", "color:#00d0ff; font-weight:bold;");


/* ==========================================================================
   WAIT FOR map-style.js TO CREATE window.__MAP
   ========================================================================== */

function waitForMapInstance(callback) {
    if (window.__MAP) {
        callback(window.__MAP);
        return;
    }
    const interval = setInterval(() => {
        if (window.__MAP) {
            clearInterval(interval);
            callback(window.__MAP);
        }
    }, 30);
}


/* ==========================================================================
   ENSURE REQUIRED GLOBALS EXIST
   ========================================================================== */

function requireGlobal(name) {
    if (typeof window[name] === "undefined") {
        console.error(`❌ map-core.js: Missing global ${name}`);
        throw new Error(`Missing global: ${name}`);
    }
}


/* ==========================================================================
   MAIN BOOTSTRAP SEQUENCE
   ========================================================================== */

waitForMapInstance((map) => {

    console.log("%cmap-core.js: Map found — continuing bootstrap", "color:#00ffaa;");

    // Required globals
    [
        "WAYPOINTS",
        "TRIP_ORDER",
        "buildMarkers",
        "updateHUD",
        "initializeStyleLayers",
        "openPopupFor",
        "undoTo",
        "animateLeg"
    ].forEach(requireGlobal);

    // Wait for Mapbox "load"
    map.once("load", async () => {

        console.log("%cmap-core.js: Map load event fired", "color:#00ffaa;");

        /* ----------------------------------------------------------
           1) Initialize Fog, Stars, Nation Shading
        ---------------------------------------------------------- */
        try {
            await initializeStyleLayers();
            console.log("✓ Style layers initialized");
        } catch (err) {
            console.error("❌ Style init error:", err);
        }

        /* ----------------------------------------------------------
           2) Load Markers
        ---------------------------------------------------------- */
        try {
            buildMarkers();
            console.log("✓ Markers built");
        } catch (err) {
            console.error("❌ Marker build error:", err);
        }

        /* ----------------------------------------------------------
           3) HUD INITIALIZATION
        ---------------------------------------------------------- */
        try {
            updateHUD();
            console.log("✓ HUD initialized");
        } catch (err) {
            console.error("❌ HUD init error:", err);
        }

        /* ----------------------------------------------------------
           4) BIND UI BUTTONS
        ---------------------------------------------------------- */
        bindGlobalUI();
    });
});


/* ==========================================================================
   UI BUTTON REGISTRATION — MATCH ORIGINAL MONOLITH
   ========================================================================== */

function bindGlobalUI() {

    console.log("✓ Binding global UI…");

    /* ---------------- Journey Toggle Button ---------------- */
    const journeyBtn = document.getElementById("journeyToggle");
    if (journeyBtn) {
        journeyBtn.addEventListener("click", () => {
            window.journeyMode = true;
            window.currentID = TRIP_ORDER[0];
            openPopupFor(window.currentID);
            updateHUD();
        });
    }

    /* ---------------- Reset Static Map ---------------- */
    const resetBtn = document.getElementById("resetStaticMap");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            if (typeof window.resetJourney === "function") {
                window.resetJourney();
            }
        });
    }

    /* ---------------- Legend Collapse ---------------- */
    const legendToggle = document.getElementById("legendToggle");
    const legendContainer = document.getElementById("legendContainer");
    if (legendToggle && legendContainer) {
        legendToggle.addEventListener("click", () => {
            legendContainer.classList.toggle("collapsed");
        });
    }

    /* ---------------- HUD Buttons ---------------- */
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

    /* ---------------- ESC Key Closes Sidebar ---------------- */
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
   FINAL LOG
   ========================================================================== */

console.log("%cmap-core.js fully loaded", "color:#00eaff; font-weight:bold;");
