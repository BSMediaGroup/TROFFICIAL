/* ======================================================================= */
/* ============================= MAP STYLE ================================ */
/* ======================================================================= */

console.log("map-style.js loaded");

/* ======================================================================= */
/* ===================== FOG + STARFIELD (STATIC) ======================== */
/* ======================================================================= */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;

/* ======================================================================= */
/* =========================== NATION SHADING ============================ */
/* ======================================================================= */

async function addNation(id, url, color, opacity) {
  const map = window.__MAP;
  if (!map) {
    console.error(`map-style.js: ❌ window.__MAP missing when adding nation "${id}"`);
    return;
  }

  try {
    // Safety: don't re-add if the source already exists
    if (map.getSource(id)) {
      console.warn(`map-style.js: Skipped duplicate source '${id}'`);
      return;
    }

    const res = await fetch(url);
    const geo = await res.json();

    map.addSource(id, {
      type: "geojson",
      data: geo
    });

    map.addLayer({
      id: `${id}-fill`,
      type: "fill",
      source: id,
      paint: {
        "fill-color": color,
        "fill-opacity": opacity
      }
    });

    map.addLayer({
      id: `${id}-outline`,
      type: "line",
      source: id,
      paint: {
        "line-color": color,
        "line-width": 1.2
      }
    });

  } catch (err) {
    console.error("Nation load error:", err);
  }
}

/* ======================================================================= */
/* ========== SINGLE ENTRY POINT CALLED BY map-core.js ON LOAD =========== */
/* ======================================================================= */

window.initializeStyleLayers = async function () {
  const map = window.__MAP;
  if (!map) {
    console.error("map-style.js: ❌ window.__MAP is missing inside initializeStyleLayers()");
    return;
  }

  console.log("map-style.js: initializeStyleLayers()");

  // 1) Fog + starfield on the current style
  map.setFog({
    color: FOG_COLOR,
    "high-color": FOG_HIGH_COLOR,
    "horizon-blend": FOG_HORIZON_BLEND,
    "space-color": FOG_SPACE_COLOR,
    "star-intensity": FOG_STAR_INTENSITY
  });

  // 2) Nation shading – AU, CA, USA
  await addNation(
    "aus",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/AUS.geo.json",
    "#1561CF",
    0.12
  );

  await addNation(
    "can",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/CAN.geo.json",
    "#CE2424",
    0.12
  );

  await addNation(
    "usa",
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries/USA.geo.json",
    "#FFFFFF",
    0.12
  );
};

console.log("map-style.js fully loaded");
