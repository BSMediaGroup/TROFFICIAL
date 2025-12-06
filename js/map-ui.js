/* ============================================================
   SHARED HTML ESCAPE HELPER
   ============================================================ */

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

/* ============================================================
   MAP UI MODULE — v2
   SECTION 1 — MARKERS & POPUPS
   ============================================================ */

console.log("map-ui.js loaded");

/* ============================================================
   MAP UI MODULE — CLEAN FULL REBUILD (EXPORT STYLE A)
   ============================================================ */

/* ========================================================================== */
/* GLOBAL UI STATE                                                             */
/* ========================================================================== */

const MARKERS = {};
const POPUPS = {};
const MINOR_MARKERS = [];

/* ========================================================================== */
/* TRAVEL MODE ICONS (RESTORED + FUTURE-PROOFED)                              */
/* ========================================================================== */

const MODE_ICONS = {
  Plane: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/plane.svg",
  Car: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/car1.svg",
  Boat: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/boat.svg",
  Bike: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/bike.svg",
  Transport: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/commute.svg",
  Train: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/train.svg",
  Tram: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/tram.svg",
  Van: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/van.svg"
};

const MODE_ICON_FALLBACK =
  "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg";

function getModeIcon(mode) {
  return MODE_ICONS[mode] || MODE_ICON_FALLBACK;
}

/* ========================================================================== */
/* MARKER + POPUP CREATION                                                     */
/* ========================================================================== */

function buildMarkers() {
  WAYPOINTS.forEach(w => {
    const el = document.createElement("div");
    el.className = "trip-marker " + w.role;
    el.innerHTML = `<img src="${w.icon}" class="marker-icon">`;

    // Bounce animation
    setTimeout(() => el.classList.add("bounce"), 80);

    // Popup instance
    const popup = new mapboxgl.Popup({
      offset: 28,
      closeOnClick: true
    })
      .setHTML(buildPopupHTML(w))
      .setLngLat(w.coords);

    POPUPS[w.id] = popup;

    // Mapbox marker
    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(w.coords)
      .addTo(window.__MAP);

    MARKERS[w.id] = marker;

    if (w.role === "minor") MINOR_MARKERS.push(marker);

    /* ========================== SINGLE CLICK ========================== */
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

    /* ========================== DOUBLE CLICK ========================== */
    el.addEventListener("dblclick", ev => {
      ev.stopPropagation();
      openPopupFor(w.id);
      currentID = w.id;
      focusWaypointOrbit(w.id);
    });
  });

  /* ========================== MINOR MARKER VISIBILITY ========================== */
  function updateMinorMarkers() {
    const show = window.__MAP.getZoom() >= 5;
    MINOR_MARKERS.forEach(m => {
      const e = m.getElement();
      if (e) e.style.display = show ? "block" : "none";
    });
  }

  updateMinorMarkers();
  window.__MAP.on("zoom", updateMinorMarkers);

  /* ========================== MAP CLICK TO CLOSE ========================== */
  window.__MAP.on("click", () => {
    closeAllPopups();
    stopOrbit();
  });
}

/* ========================================================================== */
/* POPUP BUILDER                                                               */
/* ========================================================================== */

function buildPopupHTML(w) {
  const idx = TRIP_ORDER.indexOf(w.id);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  const tMi = TRAVELLED_MI[w.id];
  const tKm = TRAVELLED_KM[w.id];
  const totalMi = TRAVELLED_MI[TRIP_ORDER.at(-1)];
  const totalKm = TRAVELLED_KM[TRIP_ORDER.at(-1)];

  const mode = getLegMode(w.id);

  let navHTML = "";

  /* Previous */
  if (prev) {
    navHTML += `
        <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
            Go Back
        </span>`;
  }

  /* Next */
  if (next) {
    const dist = LEG_DIST[w.id];
    const label = dist
      ? ` – ${dist.mi}mi <span style="color:#A3A3A3">(${dist.km}km)</span>`
      : "";

    navHTML += `
        <span class="trip-popup-nav-link" data-dir="next" data-target="${next}">
            <img src="${getModeIcon(mode)}" class="trip-popup-mode-icon">
            Next Stop${label}
        </span>`;
  }

  /* Details */
  navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
        <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/exp.svg"
             class="trip-popup-mode-icon">
        Details
    </span>`;

  /* Reset on final */
  if (w.id === "tomsriver") {
    navHTML += `
        <span class="trip-popup-nav-link" data-reset="1">
            Reset Map
        </span>`;
  }

  return `
    <div class="trip-popup">
        <div class="trip-popup-title">
            <img src="${w.icon}" class="trip-popup-title-icon">
            <span>${window.escapeHTML(w.names.display)}</span>
        </div>

        <div class="trip-popup-location">
            <span>${window.escapeHTML(w.location)}</span>
            <span class="trip-popup-flag" style="background-image:url('${w.meta.flag}')"></span>
        </div>

        <div class="trip-popup-body">
            ${window.escapeHTML(w.description)}
        </div>

        <div class="trip-popup-travelled">
            Travelled: ${tMi} / ${totalMi}mi
            <span style="color:#A3A3A3">(${tKm} / ${totalKm}km)</span>
        </div>

        <div class="trip-popup-divider"></div>

        <div class="trip-popup-nav">
            ${navHTML}
        </div>
    </div>`;
}

/* ========================================================================== */
/* POPUP OPEN/CLOSE                                                            */
/* ========================================================================== */

function closeAllPopups() {
  document.querySelectorAll(".mapboxgl-popup").forEach(p => p.remove());
}

function openPopupFor(id) {
  closeAllPopups();
  const p = POPUPS[id];
  if (p) p.addTo(window.__MAP);
}

/* Fix Mapbox ARIA glitch */
document.addEventListener("DOMNodeInserted", e => {
  if (e.target.classList?.contains("mapboxgl-popup-close-button")) {
    e.target.removeAttribute("aria-hidden");
  }
});

/* ========================================================================== */
/* POPUP NAV HANDLER                                                           */
/* ========================================================================== */

document.addEventListener("click", ev => {
  const link = ev.target.closest(".trip-popup-nav-link");
  if (!link) return;

  ev.stopPropagation();

  const reset = link.dataset.reset;
  const dir = link.dataset.dir;
  const tgt = link.dataset.target;

  if (reset) return resetJourney();
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
  else undoTo(tgt);
});

/* ========================================================================== */
/* DETAILS SIDEBAR UI                                                          */
/* ========================================================================== */

const detailsOverlay = document.getElementById("detailsOverlay");
const detailsSidebar = document.getElementById("detailsSidebar");
const detailsImage = document.getElementById("detailsSidebarImage");
const detailsTitle = document.getElementById("detailsSidebarTitle");
const detailsIcon = document.getElementById("detailsSidebarIcon");
const detailsLocation = document.getElementById("detailsSidebarLocation");
const detailsDescription = document.getElementById("detailsSidebarDescription");

const detailsTourist = document.getElementById("detailsSidebarTourist");
const detailsToilets = document.getElementById("detailsSidebarToilets");
const detailsHotels = document.getElementById("detailsSidebarHotels");

const detailsLocationInfoBody = document.getElementById("detailsLocationInfoBody");
const detailsWeatherContent = document.getElementById("detailsWeatherContent");
const detailsDistanceContent = document.getElementById("detailsDistanceContent");

const detailsSidebarHud = document.getElementById("detailsSidebarHud");
const detailsHudPrev = document.getElementById("detailsHudPrev");
const detailsHudNext = document.getElementById("detailsHudNext");
const detailsHudLabel = document.getElementById("detailsHudLabel");
const detailsClose = document.getElementById("detailsSidebarClose");

/* LOCATION INFO PANEL ------------------------------------------------------ */

function renderLocationInfo(wp) {
  if (!detailsLocationInfoBody) return;

  const flagUrl = wp.meta.flag;

  detailsLocationInfoBody.innerHTML = `
    <div class="details-location-row">
        <div class="details-kv-label">City</div>
        <div class="details-kv-value">${window.escapeHTML(wp.names.city)}</div>
    </div>

    <div class="details-location-row">
        <div class="details-kv-label">State / Province</div>
        <div class="details-kv-value">${window.escapeHTML(wp.names.state)}</div>
    </div>

    <div class="details-location-row">
        <div class="details-kv-label">Country</div>
        <div class="details-kv-value" style="display:flex;align-items:center;justify-content:flex-end;gap:6px;">
            <img src="${flagUrl}" style="width:20px;height:14px;border-radius:2px;border:1px solid #fff;">
            ${window.escapeHTML(wp.names.country)}
        </div>
    </div>`;
}

/* WEATHER PANEL ------------------------------------------------------------ */

function renderWeather(wp) {
  if (!detailsWeatherContent) return;

  detailsWeatherContent.innerHTML =
    `<div class="details-weather-status">Loading current weather…</div>`;

  const [lon, lat] = wp.coords;

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;

  const requestId = wp.id;

  fetch(url)
    .then(r => r.json())
    .then(data => {
      if (detailsSidebar.dataset.currentId !== requestId) return;

      const cw = data?.current_weather;
      if (!cw) throw new Error("Missing data");

      const tempC = cw.temperature;
      const tempF = +(tempC * 9 / 5 + 32).toFixed(1);

      detailsWeatherContent.innerHTML = `
            <div class="details-weather-main">
                <div class="details-weather-icon">☀️</div>
                <div class="details-weather-temp">
                    ${tempF}°F <span style="color:#A3A3A3">(${tempC}°C)</span>
                </div>
            </div>`;
    })
    .catch(() => {
      if (detailsSidebar.dataset.currentId !== requestId) return;
      detailsWeatherContent.innerHTML =
        `<div class="details-weather-error">Weather unavailable.</div>`;
    });
}

/* DISTANCE PANEL ----------------------------------------------------------- */

function renderDistance(wp) {
  if (!detailsDistanceContent) return;

  const idx = TRIP_ORDER.indexOf(wp.id);
  const lastIdx = TRIP_ORDER.length - 1;

  let html = "";

  if (idx === 0) {
    html = `<div>Starting point of the journey.</div>`;
  } else {
    const prevId = TRIP_ORDER[idx - 1];
    const legPrev = LEG_DIST[prevId];

    if (legPrev) {
      html = `
            <div>
                Distance from previous stop:<br>
                <strong style="color:#FFA50D">${legPrev.mi} mi</strong>
                <span style="color:#A3A3A3">(${legPrev.km} km)</span>
            </div>`;
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
            </div>`;
    }
  }

  detailsDistanceContent.innerHTML = html;
}

/* ========================================================================== */
/* SIDEBAR HUD                                                                */
/* ========================================================================== */

function updateDetailsHud() {
  const btnStart = document.getElementById("detailsSidebarStartJourney");
  if (!btnStart) return;

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
    detailsHudNext.disabled = !next;
    detailsHudNext.textContent = "Next Stop";
  }

  if (detailsHudLabel) {
    if (!next) {
      detailsHudLabel.textContent = "";
    } else {
      const wpNext = getWP(next);
      const mode = getLegMode(currentID);

      detailsHudLabel.innerHTML =
        `Next Stop: <img src="${getModeIcon(mode)}" class="details-sidebar-hud-mode-icon"> ` +
        `${window.escapeHTML(wpNext.location)} ` +
        `<span class="details-sidebar-hud-flag" style="background-image:url('${wpNext.meta.flag}')"></span>`;
    }
  }
}

/* ========================================================================== */
/* SIDEBAR OPEN/CLOSE                                                         */
/* ========================================================================== */

function openDetailsSidebar(id) {
  const wp = WAYPOINTS.find(x => x.id === id);
  if (!wp) return;

  detailsSidebar.dataset.currentId = wp.id;

  detailsTitle.textContent = wp.names.display;
  detailsIcon.src = wp.icon;
  detailsLocation.innerHTML =
    `<span class="details-location-header-line">
            ${window.escapeHTML(wp.location)}
            <span class="details-location-flag-inline"
                  style="background-image:url('${wp.meta.flag}')"></span>
        </span>`;

  detailsDescription.textContent = wp.description;
  detailsImage.src = wp.image;

  detailsTourist.href = wp.links.search;
  detailsToilets.href = wp.links.toilets;
  detailsHotels.href = wp.links.hotels;

  renderLocationInfo(wp);
  renderWeather(wp);
  renderDistance(wp);
  updateDetailsHud();

  detailsSidebar.classList.add("open");
  detailsOverlay.classList.add("open");
}

function closeDetailsSidebar() {
  detailsSidebar.classList.remove("open");
  detailsOverlay.classList.remove("open");
  delete detailsSidebar.dataset.currentId;
}

/* Close buttons */
detailsClose.addEventListener("click", closeDetailsSidebar);
detailsOverlay.addEventListener("click", closeDetailsSidebar);

/* ========================================================================== */
/* MAIN HUD (TOP SCREEN)                                                      */
/* ========================================================================== */

const hud = document.getElementById("journeyHud");
const hudPrev = document.getElementById("hudPrev");
const hudNext = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

/* ========================================================================== */
/* HUD UPDATE                                                                  */
/* ========================================================================== */

function updateHUD() {
  if (!journeyMode) {
    hud.style.display = "none";
    return;
  }

  hud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  hudPrev.disabled = !prev;

  if (next) {
    const d = LEG_DIST[currentID];
    const distLabel = d ? ` – ${d.mi}mi (${d.km}km)` : "";
    hudNext.textContent = `Next Stop${distLabel}`;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  /* HUD LABEL */
  if (next) {
    const wp = getWP(next);
    const mode = getLegMode(currentID);

    hudLabel.innerHTML =
      `Next Stop: <img src="${getModeIcon(mode)}" class="hud-mode-icon"> ` +
      `${window.escapeHTML(wp.location)} ` +
      `<span class="hud-flag" style="background-image:url('${wp.meta.flag}')"></span>`;
  } else {
    hudLabel.textContent = "";
  }
}

/* ========================================================================== */
/* HUD EVENTS                                                                  */
/* ========================================================================== */

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

/* ========================================================================== */
/* EXPORT REQUIRED GLOBALS (EXPORT STYLE A)                                   */
/* ========================================================================== */

window.buildMarkers = buildMarkers;
window.buildPopupHTML = buildPopupHTML;
window.openPopupFor = openPopupFor;
window.closeAllPopups = closeAllPopups;
window.openDetailsSidebar = openDetailsSidebar;
window.closeDetailsSidebar = closeDetailsSidebar;
window.updateHUD = updateHUD;

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");
