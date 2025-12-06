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
/* MODE HELPERS                                                               */
/* ========================================================================== */

/**
 * In case MODE_ICONS is not defined for some reason, we guard.
 */
function getModeIcon(mode) {
  if (typeof MODE_ICONS === "undefined" || !MODE_ICONS) return "";
  return MODE_ICONS[mode] || MODE_ICONS["Car"] || Object.values(MODE_ICONS)[0];
}

/**
 * getLegMode / getZoom – if other modules already defined them, don't override.
 * This keeps behavior monolith-accurate but avoids double definitions.
 */
if (typeof window.getLegMode !== "function") {
  window.getLegMode = function (id) {
    // Monolith-style logic using next leg + isFlight if available,
    // otherwise fallback to waypoint.mode
    if (typeof TRIP_ORDER === "undefined" || !Array.isArray(TRIP_ORDER)) {
      return "Car";
    }

    const idx = TRIP_ORDER.indexOf(id);
    if (idx < 0) return "Car";

    const next = TRIP_ORDER[idx + 1];

    // Prefer global isFlight helper if it exists
    if (typeof window.isFlight === "function" && next) {
      if (isFlight(id, next)) return "Plane";
    } else {
      // Hard-coded flight segments fallback
      if ((id === "sydney" && next === "la") || (id === "la" && next === "toronto")) {
        return "Plane";
      }
    }

    if (typeof window.getWP === "function") {
      const wp = getWP(id);
      return (wp && wp.mode) || "Car";
    }

    return "Car";
  };
}

if (typeof window.getZoom !== "function") {
  window.getZoom = function (id) {
    // Matches monolith behavior
    if (["sydney", "la", "toronto"].includes(id)) return 6.7;
    return 9.4;
  };
}

/* ========================================================================== */
/* MARKERS + POPUPS                                                           */
/* ========================================================================== */

window.buildMarkers = function () {
  if (!window.__MAP) {
    console.error("buildMarkers() called before map ready");
    return;
  }

  WAYPOINTS.forEach(w => {
    /* ===== Marker Element ===== */
    const el = document.createElement("div");
    el.className = "trip-marker " + w.role;
    el.innerHTML = `<img src="${w.icon}" class="marker-icon">`;

    // Bounce in
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

      if (typeof window.stopOrbit === "function") {
        stopOrbit();
      }
      openPopupFor(w.id);
      window.currentID = w.id;

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

      window.currentID = w.id;
      openPopupFor(w.id);

      if (typeof window.focusWaypointOrbit === "function") {
        focusWaypointOrbit(w.id);
      }
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
    if (typeof window.stopOrbit === "function") {
      stopOrbit();
    }
  });
};

/* ========================================================================== */
/* POPUP HTML BUILDER                                                         */
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
  const locLabel = w.location || "";
  const flagUrl = w.meta?.flag || "";

  let navHTML = "";

  /* ===== Previous ===== */
  if (prev) {
    navHTML += `
      <span class="trip-popup-nav-link" data-dir="prev" data-target="${prev}">
        Go Back
      </span>
    `;
  }

  /* ===== Next ===== */
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

  /* ===== Details button (with expand icon prefix) ===== */
  navHTML += `
    <span class="trip-popup-nav-link details-btn" data-details="${w.id}">
      <img src="https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/exp.svg"
           class="trip-popup-mode-icon">
      Details
    </span>
  `;

  if (w.id === "tomsriver") {
    navHTML += `
      <span class="trip-popup-nav-link" data-reset="1">Reset Map</span>
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
};

/* ========================================================================== */
/* POPUP CONTROL                                                              */
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
/* POPUP NAVIGATION LOGIC                                                     */
/* ========================================================================== */

document.addEventListener("click", ev => {
  const link = ev.target.closest(".trip-popup-nav-link");
  if (!link) return;

  ev.stopPropagation();

  const reset = link.dataset.reset;
  const dir = link.dataset.dir;
  const tgt = link.dataset.target;

  if (reset) {
    if (typeof window.resetJourney === "function") {
      resetJourney();
    }
    return;
  }

  if (!dir || !tgt) return;

  // Non-journey mode: simple focus + orbit
  if (!window.journeyMode) {
    if (typeof window.stopOrbit === "function") {
      stopOrbit();
    }
    window.currentID = tgt;
    openPopupFor(tgt);

    const wp = typeof window.getWP === "function" ? getWP(tgt) : WAYPOINTS.find(w => w.id === tgt);

    if (wp) {
      __MAP.easeTo({
        center: wp.coords,
        zoom: getZoom(tgt) + 1.3,
        pitch: 0,
        bearing: __MAP.getBearing(),
        duration: 900
      });
    }

    if (typeof window.startOrbit === "function") {
      startOrbit(tgt);
    }
    return;
  }

  // Journey mode: drive the animation
  if (dir === "next") {
    if (typeof window.animateLeg === "function") {
      animateLeg(window.currentID, tgt);
    }
  } else if (dir === "prev") {
    if (typeof window.undoTo === "function") {
      undoTo(tgt);
    }
  }
});

/* ========================================================================== */
/* POPUP CLOSE BUTTON ARIA FIX                                                */
/* ========================================================================== */

document.addEventListener("DOMNodeInserted", e => {
  if (e.target.classList?.contains("mapboxgl-popup-close-button")) {
    e.target.removeAttribute("aria-hidden");
  }
});

/* ========================================================================== */
/* LEGEND COLLAPSE LOGIC (guarded, monolith-accurate)                         */
/* ========================================================================== */

(function initLegendUI() {
  if (window.__LEGEND_UI_INITIALIZED) return;

  const legendToggle = document.getElementById("legendToggle");
  const legendToggleIcon = document.getElementById("legendToggleIcon");
  const legendToggleLabel = document.getElementById("legendToggleLabel");
  const legendContainer = document.getElementById("legendContainer");

  if (!legendToggle || !legendToggleIcon || !legendToggleLabel || !legendContainer) {
    return;
  }

  const LEGEND_EXPAND_ICON =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/expand.svg";
  const LEGEND_COLLAPSE_ICON =
    "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/collapse.svg";

  let legendCollapsed = false;

  function updateLegendUI() {
    if (legendCollapsed) {
      legendContainer.classList.add("legend-collapsed");
      legendToggleIcon.src = LEGEND_EXPAND_ICON;
      legendToggleLabel.textContent = "EXPAND";
    } else {
      legendContainer.classList.remove("legend-collapsed");
      legendToggleIcon.src = LEGEND_COLLAPSE_ICON;
      legendToggleLabel.textContent = "COLLAPSE";
    }
  }

  legendToggle.addEventListener("click", () => {
    legendCollapsed = !legendCollapsed;
    updateLegendUI();
  });

  updateLegendUI();
  window.__LEGEND_UI_INITIALIZED = true;
})();

/* ========================================================================== */
/* HUD (BOTTOM JOURNEY CONTROLS)                                              */
/* ========================================================================== */

const hud = document.getElementById("journeyHud");
const hudPrev = document.getElementById("hudPrev");
const hudNext = document.getElementById("hudNext");
const hudLabel = document.getElementById("hudLabel");

/**
 * Safe wrappers in case higher-level helpers exist.
 */
function getHudLocationLabel(wp) {
  if (typeof window.getLocationLabel === "function") {
    return getLocationLabel(wp);
  }
  return wp?.location || "";
}

function getHudCountryCode(wp) {
  if (typeof window.getCountryCode === "function") {
    return getCountryCode(wp);
  }
  return wp?.meta?.countryCode || "";
}

window.updateHUD = function () {
  if (!hud || !hudPrev || !hudNext || !hudLabel) return;

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
    let distLabel = "";
    if (d) distLabel = ` – ${d.mi}mi (${d.km}km)`;

    hudNext.textContent = "Next Stop" + distLabel;
    hudNext.disabled = false;
  } else {
    hudNext.textContent = "Next Stop";
    hudNext.disabled = true;
  }

  if (next) {
    const mode = getLegMode(window.currentID);
    const icon = getModeIcon(mode);
    const wp = typeof window.getWP === "function" ? getWP(next) : WAYPOINTS.find(w => w.id === next);

    if (wp) {
      hudLabel.innerHTML =
        `Next Stop: <img src="${icon}" class="hud-mode-icon"> ${escapeHTML(getHudLocationLabel(wp))} ` +
        `<span class="hud-flag" style="background-image:url('${wp.meta.flag}')"></span>`;
    } else {
      hudLabel.textContent = "";
    }
  } else {
    hudLabel.textContent = "";
  }
};

if (hudPrev) {
  hudPrev.addEventListener("click", () => {
    if (!window.journeyMode) return;
    const idx = TRIP_ORDER.indexOf(window.currentID);
    if (idx > 0 && typeof window.undoTo === "function") {
      undoTo(TRIP_ORDER[idx - 1]);
    }
  });
}

if (hudNext) {
  hudNext.addEventListener("click", () => {
    if (!window.journeyMode) return;
    const idx = TRIP_ORDER.indexOf(window.currentID);
    if (idx < TRIP_ORDER.length - 1 && typeof window.animateLeg === "function") {
      animateLeg(window.currentID, TRIP_ORDER[idx + 1]);
    }
  });
}

/* ========================================================================== */
/* SIDEBAR + DETAILS PANEL                                                    */
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

/* Start-journey button inside sidebar */
const detailsSidebarStartJourney = document.getElementById("detailsSidebarStartJourney");

/* ========================================================================== */
/* CURRENCY / TIME / WEATHER HELPERS                                          */
/* ========================================================================== */

function getCurrencyInfo(countryCode) {
  const map = {
    AU: { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    US: { code: "USD", name: "United States Dollar", symbol: "US$" },
    CA: { code: "CAD", name: "Canadian Dollar", symbol: "CA$" }
  };
  return map[countryCode] || { code: "—", name: "Unknown currency", symbol: "?" };
}

function formatLocalTime(wp) {
  const tz = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";

  if (!tz) return "Time unavailable";

  try {
    const now = new Date();

    const weekday = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      weekday: "long"
    }).format(now);

    const time12h = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    }).format(now);

    return `${weekday}, ${time12h}`;
  } catch {
    return "Time unavailable";
  }
}

function formatTimeZoneWithOffset(wp) {
  const tz = wp.meta?.timezone;
  const locale = wp.meta?.locale || "en-US";

  if (!tz) return "N/A";

  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "shortOffset"
    });

    const parts = fmt.formatToParts(now);
    let offset = parts.find(p => p.type === "timeZoneName")?.value || "";

    if (offset.startsWith("GMT")) offset = "UTC" + offset.slice(3);

    return `${tz} (${offset})`;
  } catch {
    return tz;
  }
}

function mapWeatherCodeToInfo(code) {
  const c = Number(code);
  if (isNaN(c)) return { label: "Unknown conditions", icon: "?" };

  if (c === 0) return { label: "Clear sky", icon: "☀️" };
  if (c === 1 || c === 2) return { label: "Mostly clear", icon: "🌤️" };
  if (c === 3) return { label: "Overcast", icon: "☁️" };
  if (c === 45 || c === 48) return { label: "Fog / low clouds", icon: "🌫️" };
  if (c >= 51 && c <= 55) return { label: "Drizzle", icon: "🌦️" };
  if (c >= 61 && c <= 65) return { label: "Rain", icon: "🌧️" };
  if (c === 66 || c === 67) return { label: "Freezing rain", icon: "🌧️" };
  if (c >= 71 && c <= 75) return { label: "Snow", icon: "🌨️" };
  if (c === 77) return { label: "Snow grains", icon: "❄️" };
  if (c >= 80 && c <= 82) return { label: "Rain showers", icon: "🌦️" };
  if (c === 85 || c === 86) return { label: "Snow showers", icon: "🌨️" };
  if (c === 95) return { label: "Thunderstorm", icon: "⛈️" };
  if (c === 96 || c === 99) return { label: "Thunderstorm with hail", icon: "⛈️" };

  return { label: "Conditions unknown", icon: "?" };
}

/* ========================================================================== */
/* LOCATION INFO RENDER                                                       */
/* ========================================================================== */

function renderLocationInfo(wp) {
  if (!detailsLocationInfoBody || !wp) return;

  const city = wp.names?.city || "";
  const state = wp.names?.state || "";
  const country = wp.names?.country || "";
  const flagUrl = wp.meta?.flag || "";
  const currency = getCurrencyInfo(wp.meta?.countryCode);
  const localTime = formatLocalTime(wp);
  const tzDisplay = formatTimeZoneWithOffset(wp);

  const countryFlag = flagUrl
    ? `<img src="${flagUrl}" style="width:20px;height:14px;border-radius:2px;border:1px solid #fff;">`
    : "";

  detailsLocationInfoBody.innerHTML = `
    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">City</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'">${escapeHTML(city)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">State / Province</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'">${escapeHTML(state)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">Country</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'; display:flex; justify-content:flex-end; align-items:center; gap:6px;">
        ${countryFlag}
        ${escapeHTML(country)}
      </div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">Timezone</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'">
        <span class="details-pill">${escapeHTML(tzDisplay)}</span>
      </div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">Local Time</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'">${escapeHTML(localTime)}</div>
    </div>

    <div class="details-location-row">
      <div class="details-kv-label" style="font-family:'SuiGenerisRg'">Currency</div>
      <div class="details-kv-value" style="font-family:'SuiGenerisRg'">
        ${currency.code} – ${currency.name}
        <span class="details-pill">${currency.symbol}</span>
      </div>
    </div>
  `;
}

/* ========================================================================== */
/* DISTANCE RENDER                                                            */
/* ========================================================================== */

function renderDistance(wp) {
  if (!detailsDistanceContent || !wp) return;

  const idx = TRIP_ORDER.indexOf(wp.id);
  const lastIdx = TRIP_ORDER.length - 1;
  let html = "";

  if (idx === 0) {
    html += `<div style="font-family:'SuiGenerisRg'">Starting point of the journey.</div>`;
  } else {
    const prevId = TRIP_ORDER[idx - 1];
    const legPrev = LEG_DIST[prevId];

    if (legPrev) {
      html += `
        <div style="font-family:'SuiGenerisRg'">
          Distance from previous stop:<br>
          <strong style="color:#FFA50D">${legPrev.mi} mi</strong>
          <span style="color:#A3A3A3">(${legPrev.km} km)</span>
        </div>
      `;
    }
  }

  html += `<br><strong>Distance to Next</strong><br>`;

  if (idx === lastIdx) {
    html += `<div style="font-family:'SuiGenerisRg'">End of route.</div>`;
  } else {
    const legNext = LEG_DIST[wp.id];

    if (legNext) {
      html += `
        <div style="font-family:'SuiGenerisRg'">
          <strong style="color:#FFA50D">${legNext.mi} mi</strong>
          <span style="color:#A3A3A3">(${legNext.km} km)</span>
        </div>
      `;
    }
  }

  detailsDistanceContent.innerHTML = html;
}

/* ========================================================================== */
/* WEATHER RENDER                                                             */
/* ========================================================================== */

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
      if (!detailsSidebar || detailsSidebar.dataset.currentId !== requestId) return;

      const cw = data?.current_weather;
      if (!cw) throw new Error("Missing weather data");

      const info = mapWeatherCodeToInfo(cw.weathercode);

      const tempC = cw.temperature;
      const tempF = +(tempC * 9 / 5 + 32).toFixed(1);

      const windK = cw.windspeed;
      const windM = +(windK * 0.621371).toFixed(1);

      detailsWeatherContent.innerHTML = `
        <div class="details-weather-main">
          <div class="details-weather-icon">${info.icon}</div>

          <div class="details-weather-temp" style="font-family:'SuiGenerisRg'; color:#FFA50D;">
            ${tempF}°F 
            <span style="color:#A3A3A3">(${tempC.toFixed(1)}°C)</span>
          </div>
        </div>

        <div class="details-weather-meta">
          <div class="details-weather-label">${info.label}</div>

          <div class="details-weather-wind" style="font-family:'SuiGenerisRg'">
            Wind: ${windM} mi/h 
            <span style="color:#A3A3A3">(${windK} km/h)</span>
          </div>
        </div>
      `;
    })
    .catch(() => {
      if (!detailsSidebar || detailsSidebar.dataset.currentId !== requestId) return;
      detailsWeatherContent.innerHTML =
        `<div class="details-weather-error">Weather unavailable.</div>`;
    });
}

/* ========================================================================== */
/* SIDEBAR HUD SYNC                                                           */
/* ========================================================================== */

function updateDetailsHud() {
  if (!detailsSidebarHud || !detailsSidebarStartJourney) return;

  if (!window.journeyMode || !window.currentID) {
    // show start-journey button, hide HUD
    detailsSidebarHud.style.display = "none";
    detailsSidebarStartJourney.style.display = "block";

    detailsSidebarStartJourney.onclick = () => {
      if (typeof window.startJourney === "function") {
        startJourney();
      }
      if (typeof window.updateHUD === "function") updateHUD();
      if (detailsSidebar.dataset.currentId) {
        openDetailsSidebar(detailsSidebar.dataset.currentId);
      }
    };

    return;
  }

  // In journey mode – show sidebar HUD, hide start button
  detailsSidebarStartJourney.style.display = "none";
  detailsSidebarHud.style.display = "block";

  const idx = TRIP_ORDER.indexOf(window.currentID);
  const prev = idx > 0 ? TRIP_ORDER[idx - 1] : null;
  const next = idx < TRIP_ORDER.length - 1 ? TRIP_ORDER[idx + 1] : null;

  if (detailsHudPrev) {
    detailsHudPrev.disabled = !prev;
  }

  if (detailsHudNext) {
    detailsHudNext.textContent = "Next Stop";
    detailsHudNext.disabled = !next;
  }

  if (detailsHudLabel) {
    if (!next) {
      detailsHudLabel.textContent = "";
    } else {
      const wpNext = typeof window.getWP === "function" ? getWP(next) : WAYPOINTS.find(w => w.id === next);
      const mode = getLegMode(window.currentID);
      const icon = getModeIcon(mode);

      if (wpNext) {
        detailsHudLabel.innerHTML =
          `Next Stop: <img src="${icon}" class="details-sidebar-hud-mode-icon"> ${escapeHTML(wpNext.location)}
           <span class="details-sidebar-hud-flag" style="background-image:url('${wpNext.meta.flag}')"></span>`;
      } else {
        detailsHudLabel.textContent = "";
      }
    }
  }
}

/* ========================================================================== */
/* OPEN / CLOSE SIDEBAR                                                       */
/* ========================================================================== */

window.openDetailsSidebar = function (id) {
  if (!detailsSidebar) return;

  const w =
    (typeof window.getWP === "function" ? getWP(id) : null) ||
    WAYPOINTS.find(x => x.id === id);
  if (!w) return;

  // track which waypoint is active for async weather
  detailsSidebar.dataset.currentId = w.id;

  // Title + icon
  if (detailsTitle) {
    detailsTitle.textContent = w.names?.display || "Unknown Location";
  }
  if (detailsIcon) {
    detailsIcon.src = w.icon || "";
    detailsIcon.alt = w.names?.display || "Waypoint icon";
  }

  // Location line with flag suffix
  if (detailsLocation) {
    const locLabel = w.location || "";
    const flagUrl = w.meta?.flag || "";
    const flagSpan = flagUrl
      ? `<span class="details-location-flag-inline" style="background-image:url('${flagUrl}')"></span>`
      : "";
    detailsLocation.innerHTML =
      `<span class="details-location-header-line">${escapeHTML(locLabel)} ${flagSpan}</span>`;
  }

  // Description
  if (detailsDescription) {
    detailsDescription.textContent = w.description || "";
  }

  // Image
  if (detailsImage) {
    detailsImage.src = w.image || "";
    detailsImage.alt = w.names?.display || "Waypoint image";
  }

  // Explore links
  if (detailsTourist) detailsTourist.href = w.links?.search || "#";
  if (detailsToilets) detailsToilets.href = w.links?.toilets || "#";
  if (detailsHotels) detailsHotels.href = w.links?.hotels || "#";

  // Populate sections
  renderLocationInfo(w);
  renderWeather(w);
  renderDistance(w);

  // Sync HUD state
  updateDetailsHud();

  // Show UI
  detailsSidebar.classList.add("open");
  if (detailsOverlay) detailsOverlay.classList.add("open");
};

function closeDetailsSidebar() {
  if (!detailsSidebar) return;
  detailsSidebar.classList.remove("open");
  if (detailsOverlay) detailsOverlay.classList.remove("open");
  delete detailsSidebar.dataset.currentId;
}

/* Close via X button */
if (detailsClose) {
  detailsClose.addEventListener("click", closeDetailsSidebar);
}

/* Clicking on overlay closes the sidebar */
if (detailsOverlay) {
  detailsOverlay.addEventListener("click", () => {
    if (detailsSidebar.classList.contains("open")) {
      closeDetailsSidebar();
    }
  });
}

/* Click outside sidebar closes it (except clicks on Details buttons) */
document.addEventListener("click", e => {
  if (!detailsSidebar || !detailsSidebar.classList.contains("open")) return;

  if (e.target.closest(".details-btn")) return;
  if (detailsSidebar.contains(e.target)) return;

  closeDetailsSidebar();
});

/* ESC key closes sidebar */
document.addEventListener("keydown", e => {
  if (e.key === "Escape" && detailsSidebar && detailsSidebar.classList.contains("open")) {
    closeDetailsSidebar();
  }
});

/* Handle any "Details" button inside popups */
document.addEventListener("click", e => {
  const btn = e.target.closest(".details-btn");
  if (!btn) return;

  const id = btn.dataset.details;
  if (!id) return;

  openDetailsSidebar(id);
});

/* Sidebar HUD click handlers */
if (detailsHudPrev) {
  detailsHudPrev.addEventListener("click", () => {
    if (!window.journeyMode) return;
    const idx = TRIP_ORDER.indexOf(window.currentID);
    if (idx > 0 && typeof window.undoTo === "function") {
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
    if (!window.journeyMode) return;
    const idx = TRIP_ORDER.indexOf(window.currentID);
    if (idx < TRIP_ORDER.length - 1 && typeof window.animateLeg === "function") {
      const targetId = TRIP_ORDER[idx + 1];
      animateLeg(window.currentID, targetId);
      // animateLeg will call openDetailsSidebar at the end if coded that way,
      // but we keep sidebar in sync defensively:
      if (detailsSidebar.classList.contains("open")) {
        openDetailsSidebar(targetId);
      }
    }
  });
}

/* Make sure sidebar HUD stays in sync whenever main HUD updates */
if (typeof window.updateHUD === "function") {
  const _origUpdateHUD = window.updateHUD;
  window.updateHUD = function () {
    _origUpdateHUD();
    updateDetailsHud();
  };
}

/* ========================================================================== */
/* JOURNEY TOGGLE + STATIC RESET                                              */
/* ========================================================================== */

const journeyToggleBtn = document.getElementById("journeyToggle");
const resetStaticMapBtn = document.getElementById("resetStaticMap");

if (journeyToggleBtn) {
  journeyToggleBtn.addEventListener("click", () => {
    if (window.journeyMode) {
      if (typeof window.resetJourney === "function") resetJourney();
    } else {
      if (typeof window.startJourney === "function") startJourney();
    }
  });
}

if (resetStaticMapBtn) {
  resetStaticMapBtn.addEventListener("click", () => {
    if (window.journeyMode) return;

    // Reset static globe view – monolith logic adapted to __MAP.
    window.userInterrupted = false;
    window.spinning = true;

    if (typeof window.closeAllPopups === "function") {
      closeAllPopups();
    }
    if (typeof window.stopOrbit === "function") {
      stopOrbit();
    }

    if (window.__MAP && typeof window.DEFAULT_CENTER !== "undefined" && typeof window.DEFAULT_ZOOM !== "undefined") {
      __MAP.jumpTo({
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        pitch: 0,
        bearing: 0
      });
    }

    if (typeof window.spinGlobe === "function") {
      spinGlobe();
    }

    resetStaticMapBtn.style.display = "none";
  });
}

/* ========================================================================== */
/* END OF MODULE                                                              */
/* ========================================================================== */

console.log("%cmap-ui.js fully loaded", "color:#00e5ff;font-weight:bold;");
