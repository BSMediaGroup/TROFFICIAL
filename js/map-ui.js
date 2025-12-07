/* ========================================================================== */
/* ============================== MAP UI MODULE ============================= */
/* ========================================================================== */

console.log("%cmap-ui.js loaded", "color:#00e5ff;font-weight:bold;");

/* ========================================================================== */
/* UTILITIES                                                                   */
/* ========================================================================== */

if (typeof window.escapeHTML !== "function") {
  window.escapeHTML = function (str) {
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
/* GLOBALS                                                                     */
/* ========================================================================== */

const MARKERS = {};
const POPUPS = {};
const MINOR_MARKERS = [];

/* ========================================================================== */
/* MODE HELPERS                                                                */
/* ========================================================================== */

function getModeIcon(mode) {
  if (typeof MODE_ICONS === "undefined" || !MODE_ICONS) return "";
  return MODE_ICONS[mode] || MODE_ICONS["Car"] || Object.values(MODE_ICONS)[0];
}

if (typeof window.getLegMode !== "function") {
  window.getLegMode = function (id) {
    const idx = TRIP_ORDER.indexOf(id);
    if (idx < 0) return "Car";

    const next = TRIP_ORDER[idx + 1];

    if (typeof window.isFlight === "function" && next) {
      if (isFlight(id, next)) return "Plane";
    } else {
      if ((id === "sydney" && next === "la") ||
          (id === "la" && next === "toronto"))
        return "Plane";
    }

    const wp = getWP(id);
    return wp?.mode || "Car";
  };
}

if (typeof window.getZoom !== "function") {
  window.getZoom = function (id) {
    if (["sydney", "la", "toronto"].includes(id)) return 6.7;
    return 9.4;
  };
}

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

  const distLabel = LEG_DIST[w.id]
    ? ` – ${LEG_DIST[w.id].mi}mi <span style="color:#A3A3A3">(${LEG_DIST[w.id].km}km)</span>`
    : "";

  let navHTML = "";

  if (prev) {
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
        Go Back
      </span>`;
  }

  if (next) {
    const mode = getLegMode(w.id);
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="next" data-target="${next}">
        <img src="${getModeIcon(mode)}" class="trip-popup-mode-icon">
        Next Stop${distLabel}
      </span>`;
  }

  navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
      <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/exp.svg"
           class="trip-popup-mode-icon">
      Details
    </span>
  `;

  if (w.id === "tomsriver") {
    navHTML += `<span class="trip-popup-nav-link" data-reset="1">Reset Map</span>`;
  }

  return `
    <div class="trip-popup">
      <div class="trip-popup-title">
        <img src="${w.icon}" class="trip-popup-title-icon">
        <span>${escapeHTML(w.names?.display || w.id)}</span>
      </div>

      <div class="trip-popup-location">
        <span>${escapeHTML(w.location || "")}</span>
        <span class="trip-popup-flag" style="background-image:url('${w.meta?.flag || ""}')"></span>
      </div>

      <div class="trip-popup-body">${escapeHTML(w.description || "")}</div>

      <div class="trip-popup-travelled">
        Travelled: ${tMi} / ${totalMi}mi
        <span style="color:#A3A3A3">(${tKm} / ${totalKm}km)</span>
      </div>

      <div class="trip-popup-divider"></div>

      <div class="trip-popup-nav">${navHTML}</div>
    </div>
  `;
};

/* ========================================================================== */
/* POPUP CONTROL                                                               */
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
/* MARKERS                                                                     */
/* ========================================================================== */

window.buildMarkers = function () {
  if (!window.__MAP) return console.error("buildMarkers(): map missing");

  WAYPOINTS.forEach(w => {
    const el = document.createElement("div");
    el.className = "trip-marker " + w.role;
    el.innerHTML = `<img src="${w.icon}" class="marker-icon">`;

    setTimeout(() => el.classList.add("bounce"), 80);

    const popup = new mapboxgl.Popup({ offset: 26, closeOnClick: true })
      .setHTML(buildPopupHTML(w))
      .setLngLat(w.coords);

    POPUPS[w.id] = popup;

    const marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
      .setLngLat(w.coords)
      .addTo(__MAP);

    MARKERS[w.id] = marker;
    if (w.role === "minor") MINOR_MARKERS.push(marker);

    el.addEventListener("click", ev => {
      ev.stopPropagation();
      stopOrbit();
      window.currentID = w.id;

      openPopupFor(w.id);

      __MAP.easeTo({
        center: w.coords,
        zoom: getZoom(w.id) + 1.3,
        pitch: 0,
        bearing: 0,
        duration: 900
      });
    });

    el.addEventListener("dblclick", ev => {
      ev.stopPropagation();
      window.currentID = w.id;
      openPopupFor(w.id);
      focusWaypointOrbit(w.id);
    });
  });

  function updateMinorMarkers() {
    const show = __MAP.getZoom() >= 5;
    MINOR_MARKERS.forEach(m => {
      const el = m.getElement();
      if (el) el.style.display = show ? "block" : "none";
    });
  }

  updateMinorMarkers();
  __MAP.on("zoom", updateMinorMarkers);

  __MAP.on("click", () => {
    closeAllPopups();
    stopOrbit();
  });
};

/* ========================================================================== */
/* POPUP NAVIGATION                                                            */
/* ========================================================================== */

document.addEventListener("click", ev => {
  const link = ev.target.closest(".trip-popup-nav-link");
  if (!link) return;

  ev.stopPropagation();

  if (link.dataset.reset) {
    resetJourney();
    return;
  }

  const dir = link.dataset.dir;
  const tgt = link.dataset.target;

  if (!dir || !tgt) return;

  if (!window.journeyMode) {
    stopOrbit();
    window.currentID = tgt;

    const wp = getWP(tgt);
    openPopupFor(tgt);

    if (wp) {
      __MAP.easeTo({
        center: wp.coords,
        zoom: getZoom(tgt) + 1.3,
        pitch: 0,
        bearing: __MAP.getBearing(),
        duration: 900
      });
    }

    startOrbit(tgt);
    return;
  }

  if (dir === "next") animateLeg(window.currentID, tgt);
  else if (dir === "prev") undoTo(tgt);
});

/* ========================================================================== */
/* LEGEND                                                                     */
/* ========================================================================== */

(function () {
  if (window.__LEGEND_UI_INITIALIZED) return;

  const toggle = document.getElementById("legendToggle");
  const icon = document.getElementById("legendToggleIcon");
  const label = document.getElementById("legendToggleLabel");
  const container = document.getElementById("legendContainer");

  if (!toggle || !icon || !label || !container) return;

  const EXPAND =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/expand.svg";
  const COLLAPSE =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/collapse.svg";

  let collapsed = false;

  function update() {
    if (collapsed) {
      container.classList.add("legend-collapsed");
      icon.src = EXPAND;
      label.textContent = "EXPAND";
    } else {
      container.classList.remove("legend-collapsed");
      icon.src = COLLAPSE;
      label.textContent = "COLLAPSE";
    }
  }

  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    update();
  });

  update();
  window.__LEGEND_UI_INITIALIZED = true;
})();

/* ========================================================================== */
/* HUD                                                                        */
/* ========================================================================== */

const hud = document.getElementById("journeyHud");
const hudPrev = document.getElementById("hudPrev");
const hudNext = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

window.updateHUD = function () {
  if (!hud) return;

  if (!window.journeyMode) {
    hud.style.display = "none";
    return;
  }

  hud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(window.currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  hudPrev.disabled = !prev;

  if (next) {
    const d = LEG_DIST[window.currentID];
    const lbl = d ? ` – ${d.mi}mi (${d.km}km)` : "";
    hudNext.textContent = "Next Stop" + lbl;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  if (next) {
    const mode = getLegMode(window.currentID);
    const icon = getModeIcon(mode);
    const wp = getWP(next);

    hudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="hud-mode-icon"> ${escapeHTML(wp.location)}
       <span class="hud-flag" style="background-image:url('${wp.meta.flag}')"></span>`;
  } else {
    hudLabel.textContent = "";
  }
};

hudPrev?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx > 0) undoTo(TRIP_ORDER[idx - 1]);
});

hudNext?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx < TRIP_ORDER.length - 1) animateLeg(window.currentID, TRIP_ORDER[idx + 1]);
});

/* ========================================================================== */
/* SIDEBAR                                                                    */
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
const detailsClose = document.getElementById("detailsSidebarClose");
const detailsLocationInfoBody = document.getElementById("detailsLocationInfoBody");
const detailsWeatherContent = document.getElementById("detailsWeatherContent");
const detailsDistanceContent = document.getElementById("detailsDistanceContent");

const detailsSidebarHud = document.getElementById("detailsSidebarHud");
const detailsHudPrev = document.getElementById("detailsHudPrev");
const detailsHudNext = document.getElementById("detailsHudNext");
const detailsHudLabel = document.getElementById("detailsHudLabel");
const detailsStart = document.getElementById("detailsSidebarStartJourney");

/* ----- SIDEBAR STATE ----- */

function updateDetailsHud() {
  if (!detailsSidebarHud || !detailsStart) return;

  if (!window.journeyMode || !window.currentID) {
    detailsSidebarHud.style.display = "none";
    detailsStart.style.display = "block";

    detailsStart.onclick = () => {
      startJourney();
      updateHUD();
      if (detailsSidebar.dataset.currentId)
        openDetailsSidebar(detailsSidebar.dataset.currentId);
    };
    return;
  }

  detailsStart.style.display = "none";
  detailsSidebarHud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(window.currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  detailsHudPrev.disabled = !prev;
  detailsHudNext.disabled = !next;

  if (next) {
    const wpNext = getWP(next);
    const icon = getModeIcon(getLegMode(window.currentID));
    detailsHudLabel.innerHTML =
      `Next Stop: <img src="${icon}" class="details-sidebar-hud-mode-icon"> ${escapeHTML(wpNext.location)}
       <span class="details-sidebar-hud-flag" style="background-image:url('${wpNext.meta.flag}')"></span>`;
  } else {
    detailsHudLabel.textContent = "";
  }
}

/* ----- RENDERERS ----- */

function renderLocationInfo(wp) {
  if (!detailsLocationInfoBody || !wp) return;

  const city = escapeHTML(wp.names.city);
  const state = escapeHTML(wp.names.state);
  const country = escapeHTML(wp.names.country);
  const flagUrl = wp.meta.flag;

  const currency = getCurrencyInfo(wp.meta.countryCode);
  const localTime = escapeHTML(formatLocalTime(wp));
  const tzDisplay = escapeHTML(formatTimeZoneWithOffset(wp));

  detailsLocationInfoBody.innerHTML = `
    <div class="details-location-row">
      <div class="details-kv-label">City</div>
      <div class="details-kv-value">${city}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">State / Province</div>
      <div class="details-kv-value">${state}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Country</div>
      <div class="details-kv-value" style="display:flex; justify-content:flex-end; gap:6px;">
        <img src="${flagUrl}" class="country-flag"> ${country}
      </div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Timezone</div>
      <div class="details-kv-value">
        <span class="details-pill">${tzDisplay}</span>
      </div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Local Time</div>
      <div class="details-kv-value">${localTime}</div>
    </div>
    <div class="details-location-row">
      <div class="details-kv-label">Currency</div>
      <div class="details-kv-value">
        ${currency.code} – ${currency.name}
        <span class="details-pill">${currency.symbol}</span>
      </div>
    </div>`;
}

function renderDistance(wp) {
  if (!detailsDistanceContent) return;

  const idx = TRIP_ORDER.indexOf(wp.id);
  const lastIdx = TRIP_ORDER.length - 1;

  let html = "";

  if (idx === 0) {
    html += `<div>Starting point of the journey.</div>`;
  } else {
    const legPrev = LEG_DIST[TRIP_ORDER[idx - 1]];
    if (legPrev) {
      html += `<div>Distance from previous stop:<br>
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
      html += `<div><strong style="color:#FFA50D">${legNext.mi} mi</strong>
               <span style="color:#A3A3A3">(${legNext.km} km)</span></div>`;
    }
  }

  detailsDistanceContent.innerHTML = html;
}

function renderWeather(wp) {
  if (!detailsWeatherContent) return;

  detailsWeatherContent.innerHTML = `<div>Loading current weather…</div>`;

  const [lon, lat] = wp.coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    detailsWeatherContent.innerHTML = `<div>Weather unavailable.</div>`;
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
      if (!cw) throw Error();

      const info = mapWeatherCodeToInfo(cw.weathercode);

      const tempC = cw.temperature;
      const tempF = (tempC * 9) / 5 + 32;
      const windM = cw.windspeed * 0.621371;

      detailsWeatherContent.innerHTML = `
        <div class="details-weather-main">
          <div class="details-weather-icon">${info.icon}</div>
          <div class="details-weather-temp" style="color:#FFA50D;">
            ${tempF.toFixed(1)}°F 
            <span style="color:#A3A3A3">(${tempC.toFixed(1)}°C)</span>
          </div>
        </div>
        <div class="details-weather-meta">
          <div>${info.label}</div>
          <div>Wind: ${windM.toFixed(1)} mi/h 
            <span style="color:#A3A3A3">(${cw.windspeed} km/h)</span>
          </div>
        </div>`;
    })
    .catch(() => {
      if (detailsSidebar.dataset.currentId === requestId)
        detailsWeatherContent.innerHTML = `<div>Weather unavailable.</div>`;
    });
}

/* ----- SIDEBAR OPEN/CLOSE ----- */

window.openDetailsSidebar = function (id) {
  if (!detailsSidebar) return;

  const w = getWP(id);
  if (!w) return;

  detailsSidebar.dataset.currentId = w.id;

  detailsTitle.textContent = w.names.display;
  detailsIcon.src = w.icon;
  detailsIcon.alt = w.names.display;

  const flag = w.meta.flag
    ? `<span class="details-location-flag-inline" style="background-image:url('${w.meta.flag}')"></span>`
    : "";

  detailsLocation.innerHTML =
    `<span class="details-location-header-line">${escapeHTML(w.location)} ${flag}</span>`;

  detailsDescription.textContent = w.description;
  detailsImage.src = w.image;

  detailsTourist.href = w.links?.search || "#";
  detailsToilets.href = w.links?.toilets || "#";
  detailsHotels.href = w.links?.hotels || "#";

  renderLocationInfo(w);
  renderWeather(w);
  renderDistance(w);

  updateDetailsHud();

  detailsSidebar.classList.add("open");
  detailsOverlay?.classList.add("open");
};

function closeDetailsSidebar() {
  if (!detailsSidebar) return;
  detailsSidebar.classList.remove("open");
  detailsOverlay?.classList.remove("open");
  delete detailsSidebar.dataset.currentId;
}

detailsClose?.addEventListener("click", closeDetailsSidebar);

detailsOverlay?.addEventListener("click", () => {
  if (detailsSidebar.classList.contains("open")) closeDetailsSidebar();
});

document.addEventListener("click", e => {
  if (!detailsSidebar.classList.contains("open")) return;

  if (e.target.closest(".details-btn")) return;
  if (detailsSidebar.contains(e.target)) return;

  closeDetailsSidebar();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && detailsSidebar.classList.contains("open"))
    closeDetailsSidebar();
});

document.addEventListener("click", e => {
  const btn = e.target.closest(".details-btn");
  if (!btn) return;

  const id = btn.dataset.details;
  if (id) openDetailsSidebar(id);
});

/* HUD INSIDE SIDEBAR */

detailsHudPrev?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx > 0) {
    const target = TRIP_ORDER[idx - 1];
    undoTo(target);
    openDetailsSidebar(target);
  }
});

detailsHudNext?.addEventListener("click", () => {
  if (!window.journeyMode) return;
  const idx = TRIP_ORDER.indexOf(window.currentID);
  if (idx < TRIP_ORDER.length - 1) {
    const target = TRIP_ORDER[idx + 1];
    animateLeg(window.currentID, target);
    openDetailsSidebar(target);
  }
});

/* Make HUD auto-sync */
if (typeof window.updateHUD === "function") {
  const original = window.updateHUD;
  window.updateHUD = function () {
    original();
    updateDetailsHud();
  };
}

/* ========================================================================== */
/* JOURNEY TOGGLE + STATIC RESET                                              */
/* ========================================================================== */

const journeyToggleBtn = document.getElementById("journeyToggle");
const resetStaticMapBtn = document.getElementById("resetStaticMap");

journeyToggleBtn?.addEventListener("click", () => {
  if (window.journeyMode) resetJourney();
  else startJourney();
});

resetStaticMapBtn?.addEventListener("click", () => {
  if (window.journeyMode) return;

  window.userInterrupted = false;
  window.spinning = true;

  closeAllPopups();
  stopOrbit();

  __MAP.jumpTo({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    pitch: 0,
    bearing: 0
  });

  spinGlobe();

  resetStaticMapBtn.style.display = "none";
});

/* ========================================================================== */

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");
