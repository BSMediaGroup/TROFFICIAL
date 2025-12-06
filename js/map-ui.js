/* ============================================================
   MAP UI MODULE — v2
   SECTION 1 — MARKERS & POPUPS
   ============================================================ */

console.log("map-ui.js loaded");

const MARKERS = {};
const POPUPS  = {};
const MINOR_MARKERS = [];

/* ==========================================================================
   TRAVEL MODE ICONS — Full, restored, and future-proofed
   ========================================================================== */

const MODE_ICONS = {
  Plane:      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  Car:        "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car1.svg",
  Boat:       "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/boat.svg",
  Bike:       "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/bike.svg",
  Transport:  "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/commute.svg",
  Train:      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/train.svg",
  Tram:       "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/tram.svg",
  Van:        "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/van.svg"
};

/* Fallback icon (prevents undefined → broken image)
   Used automatically if a waypoint specifies a future mode not yet added */
const MODE_ICON_FALLBACK =
  "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg";

/* Helper to safely retrieve a mode icon */
function getModeIcon(mode) {
  return MODE_ICONS[mode] || MODE_ICON_FALLBACK;
}

/* ============================================================
   MARKER CREATION
   ============================================================ */

function buildMarkers() {
  WAYPOINTS.forEach(w => {

    /* Marker DOM element */
    const el = document.createElement("div");
    el.className = "trip-marker " + w.role;
    el.innerHTML = `<img src="${w.icon}">`;

    setTimeout(() => el.classList.add("bounce"), 80);

    /* POPUP INSTANCE */
    const popup = new mapboxgl.Popup({
      offset: 28,
      closeOnClick: true
    })
      .setHTML(buildPopupHTML(w))
      .setLngLat(w.coords);

    POPUPS[w.id] = popup;

    /* MAPBOX MARKER */
    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(w.coords)
      .addTo(window.__MAP);

    MARKERS[w.id] = marker;

    if (w.role === "minor") MINOR_MARKERS.push(marker);

    /* ========================================================
       SINGLE CLICK — TOP-DOWN FOCUS
       ======================================================== */
    el.addEventListener("click", ev => {
      ev.stopPropagation();
      stopOrbit();

      openPopupFor(w.id);
      currentID = w.id;

      window.__MAP.easeTo({
        center: w.coords,
        zoom: getZoom(w.id) + 1.5,
        pitch: 0,
        bearing: 0,
        duration: 900
      });
    });

    /* ========================================================
       DOUBLE CLICK — ORBIT FOCUS
       ======================================================== */
    el.addEventListener("dblclick", ev => {
      ev.stopPropagation();
      openPopupFor(w.id);
      currentID = w.id;
      focusWaypointOrbit(w.id);
    });

  });

  /* Clicking on map background closes popups + orbit */
  window.__MAP.on("click", () => {
    closeAllPopups();
    stopOrbit();
  });

  /* ========================================================
     MINOR MARKER VISIBILITY BY ZOOM
     ======================================================== */
  function updateMinorMarkers() {
    const show = window.__MAP.getZoom() >= 5;
    MINOR_MARKERS.forEach(m => {
      const e = m.getElement();
      if (e) e.style.display = show ? "block" : "none";
    });
  }

  updateMinorMarkers();
  window.__MAP.on("zoom", updateMinorMarkers);
}

/* ============================================================
   POPUP HTML BUILDER
   ============================================================ */

function buildPopupHTML(w) {
  const idx  = TRIP_ORDER.indexOf(w.id);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  const tMi     = TRAVELLED_MI[w.id];
  const tKm     = TRAVELLED_KM[w.id];
  const totalMi = TRAVELLED_MI[TRIP_ORDER.at(-1)];
  const totalKm = TRAVELLED_KM[TRIP_ORDER.at(-1)];

  const mode     = getLegMode(w.id);
  const locLabel = w.location || "";
  const flagUrl  = w.meta?.flag || "";

  let navHTML = "";

  /* Previous button */
  if (prev) {
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
        Go Back
      </span>
    `;
  }

  /* Next button */
  if (next) {
    const dist = LEG_DIST[w.id];
    let label = "";
    if (dist) {
      label = ` – ${dist.mi}mi <span style="color:#A3A3A3">(${dist.km}km)</span>`;
    }

    navHTML += `
      <span class="trip-popup-nav-link" data-dir="next" data-target="${next}">
        <img src="${getModeIcon(mode)}" class="trip-popup-mode-icon">
        Next Stop${label}
      </span>
    `;
  }

  /* Details button */
  navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
      <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/exp.svg"
           class="trip-popup-mode-icon">
      Details
    </span>
  `;

  /* Reset option on final destination */
  if (w.id === "tomsriver") {
    navHTML += `
      <span class="trip-popup-nav-link" data-reset="1">
        Reset Map
      </span>
    `;
  }

  return `
    <div class="trip-popup">
      <div class="trip-popup-title">
        <img src="${w.icon}" class="trip-popup-title-icon">
        <span>${escapeHTML(w.names?.display || w.id)}</span>
      </div>

      <div class="trip-popup-location">
        <span>${escapeHTML(locLabel)}</span>
        <span class="trip-popup-flag" style="background-image:url('${flagUrl}')"></span>
      </div>

      <div class="trip-popup-body">
        ${escapeHTML(w.description || "")}
      </div>

      <div class="trip-popup-travelled">
        Travelled: ${tMi} / ${totalMi}mi
        <span style="color:#A3A3A3">(${tKm} / ${totalKm}km)</span>
      </div>

      <div class="trip-popup-divider"></div>

      <div class="trip-popup-nav">
        ${navHTML}
      </div>
    </div>
  `;
}

/* ============================================================
   POPUP OPEN/CLOSE LOGIC
   ============================================================ */

function closeAllPopups() {
  document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
}

function openPopupFor(id) {
  closeAllPopups();
  const p = POPUPS[id];
  if (p) p.addTo(window.__MAP);
}

/* Fix ARIA glitch */
document.addEventListener("DOMNodeInserted", e => {
  if (e.target.classList?.contains("mapboxgl-popup-close-button")) {
    e.target.removeAttribute("aria-hidden");
  }
});

/* ============================================================
   POPUP NAVIGATION CLICK HANDLING
   ============================================================ */

document.addEventListener("click", function (ev) {
  const link = ev.target.closest(".trip-popup-nav-link");
  if (!link) return;

  ev.stopPropagation();

  const reset = link.dataset.reset;
  const dir   = link.dataset.dir;
  const tgt   = link.dataset.target;

  if (reset) {
    resetJourney();
    return;
  }
  if (!dir || !tgt) return;

  if (!journeyMode) {
    stopOrbit();
    openPopupFor(tgt);
    currentID = tgt;

    window.__MAP.easeTo({
      center: getWP(tgt).coords,
      zoom: ORBIT_ZOOM_TARGET,
      pitch: ORBIT_PITCH_TARGET,
      bearing: window.__MAP.getBearing(),
      duration: 900
    });

    startOrbit(tgt);
    return;
  }

  if (dir === "next") animateLeg(currentID, tgt);
  else if (dir === "prev") undoTo(tgt);
});

/* EXPORT SECTION 1 */
window.buildMarkers = buildMarkers;
window.buildPopupHTML = buildPopupHTML;
window.openPopupFor = openPopupFor;
window.closeAllPopups = closeAllPopups;


/* ============================================================
   MAP UI MODULE — v2
   SECTION 2 — DETAILS SIDEBAR UI
   ============================================================ */

/* ============================================================
   SIDEBAR DOM ELEMENTS
   ============================================================ */

const detailsOverlay          = document.getElementById("detailsOverlay");
const detailsSidebar          = document.getElementById("detailsSidebar");
const detailsImage            = document.getElementById("detailsSidebarImage");
const detailsTitle            = document.getElementById("detailsSidebarTitle");
const detailsIcon             = document.getElementById("detailsSidebarIcon");
const detailsLocation         = document.getElementById("detailsSidebarLocation");
const detailsDescription      = document.getElementById("detailsSidebarDescription");

const detailsTourist          = document.getElementById("detailsSidebarTourist");
const detailsToilets          = document.getElementById("detailsSidebarToilets");
const detailsHotels           = document.getElementById("detailsSidebarHotels");

const detailsLocationInfoBody = document.getElementById("detailsLocationInfoBody");
const detailsWeatherContent   = document.getElementById("detailsWeatherContent");
const detailsDistanceContent  = document.getElementById("detailsDistanceContent");

const detailsSidebarHud       = document.getElementById("detailsSidebarHud");
const detailsHudPrev          = document.getElementById("detailsHudPrev");
const detailsHudNext          = document.getElementById("detailsHudNext");
const detailsHudLabel         = document.getElementById("detailsHudLabel");
const detailsClose            = document.getElementById("detailsSidebarClose");

/* ============================================================
   LOCATION INFO PANEL
   ============================================================ */

function renderLocationInfo(wp) {
  if (!detailsLocationInfoBody || !wp) return;

  const city     = wp.names?.city    || "";
  const state    = wp.names?.state   || "";
  const country  = wp.names?.country || "";
  const flagUrl  = wp.meta?.flag     || "";

  const currency  = getCurrencyInfo(wp.meta?.countryCode);
  const localTime = formatLocalTime(wp);
  const tzDisplay = formatTimeZoneWithOffset(wp);

  const countryFlag = flagUrl
    ? `<img src="${flagUrl}" style="width:20px;height:14px;border-radius:2px;border:1px solid #fff;">`
    : "";

  detailsLocationInfoBody.innerHTML = `
    <div class="details-location-row">
      <div class="details-kv-label">City</div>
      <div class="details-kv-value">${escapeHTML(city)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label">State / Province</div>
      <div class="details-kv-value">${escapeHTML(state)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label">Country</div>
      <div class="details-kv-value" style="display:flex; justify-content:flex-end; gap:6px; align-items:center;">
        ${countryFlag}
        ${escapeHTML(country)}
      </div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label">Timezone</div>
      <div class="details-kv-value">
        <span class="details-pill">${escapeHTML(tzDisplay)}</span>
      </div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label">Local Time</div>
      <div class="details-kv-value">${escapeHTML(localTime)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label">Currency</div>
      <div class="details-kv-value">
        ${currency.code} – ${currency.name}
        <span class="details-pill">${currency.symbol}</span>
      </div>
    </div>
  `;
}

/* ============================================================
   WEATHER PANEL
   ============================================================ */

function renderWeather(wp) {
  if (!detailsWeatherContent || !wp) return;

  detailsWeatherContent.innerHTML =
    `<div class="details-weather-status">Loading current weather…</div>`;

  const [lon, lat] = wp.coords || [];

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    detailsWeatherContent.innerHTML =
      `<div class="details-weather-error">Weather unavailable.</div>`;
    return;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const requestId = wp.id;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (detailsSidebar.dataset.currentId !== requestId) return;

      const cw = data?.current_weather;
      if (!cw) throw new Error("Missing weather");

      const info = mapWeatherCodeToInfo(cw.weathercode);

      const tempC = cw.temperature;
      const tempF = +(tempC * 9/5 + 32).toFixed(1);

      const windK = cw.windspeed;
      const windM = +(windK * 0.621371).toFixed(1);

      detailsWeatherContent.innerHTML = `
        <div class="details-weather-main">
          <div class="details-weather-icon">${info.icon}</div>

          <div class="details-weather-temp">
            ${tempF}°F 
            <span style="color:#A3A3A3">(${tempC.toFixed(1)}°C)</span>
          </div>
        </div>

        <div class="details-weather-meta">
          <div class="details-weather-label">${info.label}</div>

          <div class="details-weather-wind">
            Wind: ${windM} mi/h 
            <span style="color:#A3A3A3">(${windK} km/h)</span>
          </div>
        </div>
      `;
    })

    .catch(() => {
      if (detailsSidebar.dataset.currentId !== requestId) return;
      detailsWeatherContent.innerHTML =
        `<div class="details-weather-error">Weather unavailable.</div>`;
    });
}

/* ============================================================
   DISTANCE PANEL
   ============================================================ */

function renderDistance(wp) {
  if (!detailsDistanceContent || !wp) return;

  const idx     = TRIP_ORDER.indexOf(wp.id);
  const lastIdx = TRIP_ORDER.length - 1;

  let html = "";

  if (idx === 0) {
    html += `<div>Starting point of the journey.</div>`;
  } else {
    const prevId = TRIP_ORDER[idx - 1];
    const legPrev = LEG_DIST[prevId];

    if (legPrev) {
      html += `
        <div>
          Distance from previous stop:<br>
          <strong style="color:#FFA50D">${legPrev.mi} mi</strong>
          <span style="color:#A3A3A3">(${legPrev.km} km)</span>
        </div>
      `;
    }
  }

  html += `<br><strong>Distance to Next</strong><br>`;

  if (idx === lastIdx) {
    html += `<div>End of route.</div>`;
  } else {
    const legNext = LEG_DIST[wp.id];

    if (legNext) {
      html += `
        <div>
          <strong style="color:#FFA50D">${legNext.mi} mi</strong>
          <span style="color:#A3A3A3">(${legNext.km} km)</span>
        </div>
      `;
    }
  }

  detailsDistanceContent.innerHTML = html;
}

/* ============================================================
   SIDEBAR HUD LOGIC
   ============================================================ */

function updateDetailsHud() {
  const btnStart = document.getElementById("detailsSidebarStartJourney");
  if (!detailsSidebarHud || !btnStart) return;

  if (!journeyMode || !currentID) {
    detailsSidebarHud.style.display = "none";
    btnStart.style.display = "block";

    btnStart.onclick = () => {
      journeyMode = true;
      currentID = TRIP_ORDER[0];
      updateHUD();
      openDetailsSidebar(currentID);
    };

    return;
  }

  btnStart.style.display = "none";
  detailsSidebarHud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  if (detailsHudPrev) detailsHudPrev.disabled = !prev;

  if (detailsHudNext) {
    detailsHudNext.textContent = "Next Stop";
    detailsHudNext.disabled = !next;
  }

  if (detailsHudLabel) {
    if (!next) {
      detailsHudLabel.textContent = "";
    } else {
      const wpNext = getWP(next);
      const mode = getLegMode(currentID);
      const icon = getModeIcon(mode);

      detailsHudLabel.innerHTML =
        `Next Stop: <img src="${getModeIcon(mode)}" class="details-sidebar-hud-mode-icon"> ${escapeHTML(wpNext.location)}
         <span class="details-sidebar-hud-flag" style="background-image:url('${wpNext.meta.flag}')"></span>`;
    }
  }
}

/* ============================================================
   SIDEBAR OPEN FUNCTION
   ============================================================ */

function openDetailsSidebar(id) {
  const w = WAYPOINTS.find(x => x.id === id);
  if (!w) return;

  detailsSidebar.dataset.currentId = w.id;

  detailsTitle.textContent = w.names?.display || "Unknown Location";

  if (detailsIcon) {
    detailsIcon.src = w.icon || "";
    detailsIcon.alt = w.names?.display || "Waypoint icon";
  }

  const locLabel = w.location || "";
  const flagUrl  = w.meta?.flag || "";
  const flagSpan = flagUrl
    ? `<span class="details-location-flag-inline" style="background-image:url('${flagUrl}')"></span>`
    : "";

  detailsLocation.innerHTML =
    `<span class="details-location-header-line">${escapeHTML(locLabel)} ${flagSpan}</span>`;

  detailsDescription.textContent = w.description || "";

  detailsImage.src = w.image || "";
  detailsImage.alt = w.names?.display || "Waypoint image";

  detailsTourist.href = w.links?.search  || "#";
  detailsToilets.href = w.links?.toilets || "#";
  detailsHotels.href  = w.links?.hotels  || "#";

  renderLocationInfo(w);
  renderWeather(w);
  renderDistance(w);

  updateDetailsHud();

  // NEW
  fetchPOIs(id);

  // show sidebar
  detailsSidebar.classList.add("open");
  if (detailsOverlay) detailsOverlay.classList.add("open");
}

/* ============================================================
   SIDEBAR CLOSE
   ============================================================ */

function closeDetailsSidebar() {
  detailsSidebar.classList.remove("open");
  if (detailsOverlay) detailsOverlay.classList.remove("open");
  delete detailsSidebar.dataset.currentId;
}

detailsClose.addEventListener("click", closeDetailsSidebar);

if (detailsOverlay) {
  detailsOverlay.addEventListener("click", () => {
    if (detailsSidebar.classList.contains("open")) {
      closeDetailsSidebar();
    }
  });
}

/* Close sidebar if clicking outside it */
document.addEventListener("click", (e) => {
  if (!detailsSidebar.classList.contains("open")) return;

  if (e.target.closest(".details-btn")) return;

  if (detailsSidebar.contains(e.target)) return;

  closeDetailsSidebar();
});

/* ESC key closes the sidebar */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && detailsSidebar.classList.contains("open")) {
    closeDetailsSidebar();
  }
});

/* “Details” buttons inside popups */
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".details-btn");
  if (!btn) return;

  const id = btn.dataset.details;
  if (!id) return;

  openDetailsSidebar(id);
});

/* ============================================================
   SIDEBAR PREV/NEXT BUTTONS
   ============================================================ */

if (detailsHudPrev) {
  detailsHudPrev.addEventListener("click", () => {
    if (!journeyMode) return;
    const idx = TRIP_ORDER.indexOf(currentID);
    if (idx > 0) {
      const targetId = TRIP_ORDER[idx - 1];
      undoTo(targetId);
      if (detailsSidebar.classList.contains("open")) {
        openDetailsSidebar(targetId);
      }
    }
  });
}

if (detailsHudNext) {
  detailsHudNext.addEventListener("click", () => {
    if (!journeyMode) return;
    const idx = TRIP_ORDER.indexOf(currentID);
    if (idx < TRIP_ORDER.length - 1) {
      const targetId = TRIP_ORDER[idx + 1];
      animateLeg(currentID, targetId);
    }
  });
}

/* Ensure sidebar HUD stays synced with main HUD */
const _origUpdateHUD = updateHUD;
updateHUD = function () {
  _origUpdateHUD();
  updateDetailsHud();
};

/* EXPORT SECTION 2 */
window.openDetailsSidebar = openDetailsSidebar;
window.closeDetailsSidebar = closeDetailsSidebar;
window.renderWeather = renderWeather;
window.renderDistance = renderDistance;
window.renderLocationInfo = renderLocationInfo;


/* ============================================================
   MAP UI MODULE — v2
   SECTION 3 — HUD + GLOBAL UI CONTROLS
   ============================================================ */

/* ============================================================
   MAIN JOURNEY HUD ELEMENTS
   ============================================================ */

const hud      = document.getElementById("journeyHud");
const hudPrev  = document.getElementById("hudPrev");
const hudNext  = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

/* ============================================================
   HELPER: Get simplified location label (matches original)
   ============================================================ */

function getHudLocationLabel(wp) {
  return getLocationLabel(wp);   // Provided in your original code
}

function getHudCountryCode(wp) {
  return getCountryCode(wp);     // Provided in your original code
}

/* ============================================================
   MAIN HUD UPDATE LOGIC
   ============================================================ */

function updateHUD() {
  if (!journeyMode) {
    hud.style.display = "none";
    return;
  }

  hud.style.display = "block";

  const idx  = TRIP_ORDER.indexOf(currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  /* Previous button */
  hudPrev.disabled = !prev;

  /* Next button */
  if (next) {
    const d = LEG_DIST[currentID];
    let distLabel = "";
    if (d) distLabel = ` – ${d.mi}mi (${d.km}km)`;

    hudNext.textContent = "Next Stop" + distLabel;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  /* HUD label content */
  if (next) {
    const mode = getLegMode(currentID);
    const icon = getModeIcon(mode);     // SAFE lookup with fallback
    const wp   = getWP(next);

    const flagUrl = wp?.meta?.flag || "";

    hudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="hud-mode-icon"> ` +
      `${escapeHTML(wp.location)} ` +
      `<span class="hud-flag" style="background-image:url('${flagUrl}')"></span>`;
  } else {
    hudLabel.textContent = "";
  }
}   // ← ← ← THIS LINE FIXES YOUR ENTIRE MAP


/* ============================================================
   HUD EVENT LISTENERS
   ============================================================ */

hudPrev.addEventListener("click", () => {
  if (!journeyMode) return;
  const idx = TRIP_ORDER.indexOf(currentID);
  if (idx > 0) undoTo(TRIP_ORDER[idx - 1]);
});

hudNext.addEventListener("click", () => {
  if (!journeyMode) return;
  const idx = TRIP_ORDER.indexOf(currentID);
  if (idx < TRIP_ORDER.length - 1) animateLeg(currentID, TRIP_ORDER[idx + 1]);
});

/* ============================================================
   JOURNEY BUTTON VISIBILITY STATE
   ============================================================ */

function updateSidebarJourneyState() {
  const journeyToggle = document.getElementById("journeyToggle");
  if (!detailsSidebarHud || !journeyToggle) return;

  if (journeyMode) {
    detailsSidebarHud.style.display = "block";
    journeyToggle.style.display = "none";
  } else {
    detailsSidebarHud.style.display = "none";
    journeyToggle.style.display = "block";
  }
}

/* ============================================================
   RESET / STATIC MAP UI BEHAVIOUR
   ============================================================ */

function showResetButton() {
  if (!journeyMode) {
    const resetBtn = document.getElementById("resetStaticMap");
    if (resetBtn) resetBtn.style.display = "block";
  }
}

function hideResetButton() {
  const resetBtn = document.getElementById("resetStaticMap");
  if (resetBtn) resetBtn.style.display = "none";
}

/* Hook: Stop spin on click also shows reset button
   — this mirrors original behaviour from map-logic.js */
window.__MAP.on("mousedown", () => {
  if (!journeyMode) showResetButton();
});

/* ============================================================
   UI GLUE — WHEN HUD UPDATES, SIDEBAR HUD MUST FOLLOW
   ============================================================ */

const _originalHUD = updateHUD;
updateHUD = function () {
  _originalHUD();
  if (typeof updateDetailsHud === "function") {
    updateDetailsHud();
  }
};

/* EXPORT SECTION 3 */
window.updateHUD = updateHUD;
window.updateSidebarJourneyState = updateSidebarJourneyState;
window.showResetButton = showResetButton;
window.hideResetButton = hideResetButton;


/* ============================================================
   MAP UI MODULE — v2
   SECTION 4 — POI HOOKS + MODULE EXPORTS
   ============================================================ */

/* ============================================================
   MAPBOX POI LOOKUP (STUB IMPLEMENTATION)
   ============================================================ */
/*
   These functions prepare for fully-native Mapbox amenity data.

   DO NOT ENABLE until approved.

   Once approved, we will:
   - Hit Mapbox Search API (forward & category endpoints)
   - Fetch hotels, toilets, attractions dynamically per waypoint
   - Populate collapsible sections or "More" links
   - Remove the old Google Maps fallback entirely

   For now these functions safely NO-OP.
*/

async function fetchMapboxPOI(wp, category) {
  // Future: Mapbox Search API integration
  // Example categories: "hotel", "toilet", "tourist_attraction"
  return null;
}

async function updateSidebarPOISections(wp) {
  // Called on every openDetailsSidebar()
  // Will populate POI collapsibles once enabled.
  return;
}

/* ============================================================
   OVERRIDE THE DETAILS SIDEBAR HOOK TO PREP FOR POI
   ============================================================ */

const _origOpenDetailsSidebar = openDetailsSidebar;

openDetailsSidebar = async function (id) {
  _origOpenDetailsSidebar(id);

  const wp = WAYPOINTS.find(x => x.id === id);
  if (!wp) return;

  // POI hook — currently does nothing until we activate Mapbox Search API
  await updateSidebarPOISections(wp);
};

/* ============================================================
   FINAL EXPORTS FOR map-ui.js
   ============================================================ */

window.UI = {
  /* Section 1 */
  buildMarkers,
  buildPopupHTML,
  openPopupFor,
  closeAllPopups,

  /* Section 2 */
  openDetailsSidebar,
  closeDetailsSidebar,
  renderWeather,
  renderDistance,
  renderLocationInfo,

  /* Section 3 */
  updateHUD,
  updateSidebarJourneyState,
  showResetButton,
  hideResetButton,

  /* Section 4 (future POI features) */
  fetchMapboxPOI,
  updateSidebarPOISections
};

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");



