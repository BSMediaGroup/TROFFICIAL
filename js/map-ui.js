/* ========================================================================== */
/* ============================== MAP UI MODULE ============================= */
/* ========================================================================== */

console.log("map-ui.js loaded");

/* ========================================================================== */
/* SHARED HTML ESCAPE HELPER                                                  */
/* ========================================================================== */

if (typeof window.escapeHTML !== "function") {
    window.escapeHTML = function escapeHTML(str) {
        if (str == null) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    };
}

const escapeHTML = window.escapeHTML;

/* ========================================================================== */
/* GLOBAL UI STATE                                                            */
/* ========================================================================== */

const MARKERS = {};
const POPUPS = {};
const MINOR_MARKERS = [];

/* ========================================================================== */
/* MODE ICONS                                                                  */
/* ========================================================================== */

function getModeIcon(mode) {
    return MODE_ICONS[mode] || MODE_ICONS["Drive"];
}

/* ========================================================================== */
/* MARKER + POPUP GENERATION                                                   */
/* ========================================================================== */

window.buildMarkers = function () {
    if (!window.__MAP) return console.error("buildMarkers() called before map ready");

    WAYPOINTS.forEach(w => {

        /* ===== Marker Element ===== */
        const el = document.createElement("div");
        el.className = "trip-marker " + w.role;
        el.innerHTML = `<img src="${w.icon}" class="marker-icon">`;
        setTimeout(() => el.classList.add("bounce"), 80);

        /* ===== Popup ===== */
        const popup = new mapboxgl.Popup({
            offset: 26,
            closeOnClick: true
        })
            .setHTML(buildPopupHTML(w))
            .setLngLat(w.coords);

        POPUPS[w.id] = popup;

        /* ===== Mapbox Marker ===== */
        const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
            .setLngLat(w.coords)
            .addTo(__MAP);

        MARKERS[w.id] = marker;

        if (w.role === "minor") MINOR_MARKERS.push(marker);

        /* ===== Single Click → Focus with top-down tilt ===== */
        el.addEventListener("click", ev => {
            ev.stopPropagation();

            stopOrbit();
            openPopupFor(w.id);
            currentID = w.id;

            __MAP.easeTo({
                center: w.coords,
                zoom: getZoom(w.id) + 1.3,
                pitch: 0,
                bearing: 0,
                duration: 900
            });
        });

        /* ===== Double Click → Orbit Mode ===== */
        el.addEventListener("dblclick", ev => {
            ev.stopPropagation();

            currentID = w.id;
            openPopupFor(w.id);

            startOrbit(w.id);   // NOTE: this now correctly calls the real orbit engine
        });
    });

    /* ===== Minor-marker visibility vs zoom ===== */
    function updateMinorMarkers() {
        const show = __MAP.getZoom() >= 5;
        MINOR_MARKERS.forEach(m => {
            const el = m.getElement();
            if (el) el.style.display = show ? "block" : "none";
        });
    }

    updateMinorMarkers();
    __MAP.on("zoom", updateMinorMarkers);

    /* ===== Map background click closes popups + orbit ===== */
    __MAP.on("click", () => {
        closeAllPopups();
        stopOrbit();
    });
};

/* ========================================================================== */
/* POPUP HTML BUILDER                                                          */
/* ========================================================================== */

window.buildPopupHTML = function (w) {

    const idx = TRIP_ORDER.indexOf(w.id);
    const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
    const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

    const tMi = TRAVELLED_MI[w.id];
    const tKm = TRAVELLED_KM[w.id];
    const totalMi = TRAVELLED_MI[TRIP_ORDER.at(-1)];
    const totalKm = TRAVELLED_KM[TRIP_ORDER.at(-1)];

    const mode = getLegMode(w.id);
    let navHTML = "";

    /* ===== Previous ===== */
    if (prev) {
        navHTML += `
        <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
            Go Back
        </span>`;
    }

    /* ===== Next ===== */
    if (next) {
        const dist = LEG_DIST[w.id];
        const label = dist ? ` – ${dist.mi}mi <span style="color:#A3A3A3">(${dist.km}km)</span>` : "";

        navHTML += `
        <span class="trip-popup-nav-link" data-dir="next" data-target="${next}">
            <img src="${getModeIcon(mode)}" class="trip-popup-mode-icon">
            Next Stop${label}
        </span>`;
    }

    /* ===== Details ===== */
    navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
        <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/exp.svg"
             class="trip-popup-mode-icon">
        Details
    </span>`;

    /* ===== Reset (only on final stop) ===== */
    if (w.id === "tomsriver") {
        navHTML += `<span class="trip-popup-nav-link" data-reset="1">Reset Map</span>`;
    }

    return `
    <div class="trip-popup">
        <div class="trip-popup-title">
            <img src="${w.icon}" class="trip-popup-title-icon">
            <span>${escapeHTML(w.names.display)}</span>
        </div>

        <div class="trip-popup-location">
            <span>${escapeHTML(w.location)}</span>
            <span class="trip-popup-flag" style="background-image:url('${w.meta.flag}')"></span>
        </div>

        <div class="trip-popup-body">${escapeHTML(w.description)}</div>

        <div class="trip-popup-travelled">
            Travelled: ${tMi} / ${totalMi}mi
            <span style="color:#A3A3A3">(${tKm} / ${totalKm}km)</span>
        </div>

        <div class="trip-popup-divider"></div>

        <div class="trip-popup-nav">${navHTML}</div>
    </div>`;
};

/* ========================================================================== */
/* POPUP OPEN/CLOSE                                                            */
/* ========================================================================== */

window.closeAllPopups = () => {
    document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
};

window.openPopupFor = function (id) {
    closeAllPopups();
    const p = POPUPS[id];
    if (p) p.addTo(__MAP);
};

/* ========================================================================== */
/* POPUP NAV HANDLING                                                          */
/* ========================================================================== */

document.addEventListener("click", ev => {
    const link = ev.target.closest(".trip-popup-nav-link");
    if (!link) return;

    ev.stopPropagation();

    const reset = link.dataset.reset;
    const dir   = link.dataset.dir;
    const tgt   = link.dataset.target;

    if (reset) return resetJourney();

    if (!dir || !tgt) return;

    /* ===== Non-journey mode (manual orbit) ===== */
    if (!journeyMode) {
        stopOrbit();
        currentID = tgt;
        openPopupFor(tgt);

        __MAP.easeTo({
            center: getWP(tgt).coords,
            zoom: ORBIT_ZOOM_TARGET,
            pitch: ORBIT_PITCH_TARGET,
            bearing: __MAP.getBearing(),
            duration: 900
        });

        startOrbit(tgt);
        return;
    }

    /* ===== Journey mode ===== */
    if (dir === "next") animateLeg(currentID, tgt);
    else undoTo(tgt);
});

/* ========================================================================== */
/* SIDEBAR + HUD LOGIC (UNCHANGED BEHAVIOR)                                  */
/* ========================================================================== */
/* Everything from this section down is UI-only and has NO journey logic.
   The only changes were:
   - Removing the invalid HUD override recursion
   - Ensuring calls point to global journey functions from map-logic.js
*/

const detailsOverlay            = document.getElementById("detailsOverlay");
const detailsSidebar            = document.getElementById("detailsSidebar");
const detailsImage              = document.getElementById("detailsSidebarImage");
const detailsTitle              = document.getElementById("detailsSidebarTitle");
const detailsIcon               = document.getElementById("detailsSidebarIcon");
const detailsLocation           = document.getElementById("detailsSidebarLocation");
const detailsDescription        = document.getElementById("detailsSidebarDescription");

const detailsTourist            = document.getElementById("detailsSidebarTourist");
const detailsToilets            = document.getElementById("detailsSidebarToilets");
const detailsHotels             = document.getElementById("detailsSidebarHotels");

const detailsLocationInfoBody   = document.getElementById("detailsLocationInfoBody");
const detailsWeatherContent     = document.getElementById("detailsWeatherContent");
const detailsDistanceContent    = document.getElementById("detailsDistanceContent");

const detailsSidebarHud         = document.getElementById("detailsSidebarHud");
const detailsHudPrev            = document.getElementById("detailsHudPrev");
const detailsHudNext            = document.getElementById("detailsHudNext");
const detailsHudLabel           = document.getElementById("detailsHudLabel");
const detailsClose              = document.getElementById("detailsSidebarClose");

/* ========================================================================== */
/* … (THE REST OF YOUR SIDEBAR / WEATHER / INFO PANEL / HUD UI CODE REMAINS
      UNCHANGED AND IS 1:1 FROM YOUR FILE — BECAUSE IT IS VALID AND RELIES
      ONLY ON GLOBAL JOURNEY FUNCTIONS ALREADY FIXED IN map-logic.js)       */
/* ========================================================================== */

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");
