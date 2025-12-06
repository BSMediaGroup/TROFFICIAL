/* ======================================================================= */
/* ============================= MAP STYLE =============================== */
/* ======================================================================= */

console.log("map-style.js loaded");

/* ======================================================================= */
/*  IMPORTANT: THIS MODULE DOES NOT CREATE THE MAP INSTANCE                */
/*  The map is created in map-logic.js and exposed as window.__MAP        */
/* ======================================================================= */


/* ======================================================================= */
/*  GLOBE FOG + STARFIELD CONFIGURATION                                    */
/* ======================================================================= */

const FOG_COLOR          = "rgba(5, 10, 20, 0.9)";
const FOG_HIGH_COLOR     = "rgba(60, 150, 255, 0.45)";
const FOG_HORIZON_BLEND  = 0.45;
const FOG_SPACE_COLOR    = "#02040A";
const FOG_STAR_INTENSITY = 0.65;


/* ======================================================================= */
/*  TERRAIN (future activation)                                            */
/* ======================================================================= */

function enableTerrain() {
    if (!window.__MAP) return;

    // DEM source can be added later when approved
}


/* ======================================================================= */
/*  3D BUILDINGS (off by default)                                          */
/* ======================================================================= */

let buildingsEnabled = false;

function enable3DBuildings() {
    if (!window.__MAP || buildingsEnabled) return;
    buildingsEnabled = true;

    const map = window.__MAP;
    const layers = map.getStyle().layers;
    if (!layers) return;

    let labelLayerId = null;
    for (const layer of layers) {
        if (layer.type === "symbol" && layer.layout["text-field"]) {
            labelLayerId = layer.id;
            break;
        }
    }

    map.addLayer(
        {
            id: "3d-buildings",
            source: "composite",
            "source-layer": "building",
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
                "fill-extrusion-color": "#aaa",
                "fill-extrusion-height": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    14, 0,
                    15, ["get", "height"]
                ],
                "fill-extrusion-base": [
                    "interpolate",
                    ["linear"],
                    ["zoom"],
                    14, 0,
                    15, ["get", "min_height"]
                ],
                "fill-extrusion-opacity": 0.6
            }
        },
        labelLayerId
    );
}


/* ======================================================================= */
/* NATION SHADING — w/ DUPLICATE PROTECTION                                */
/* ======================================================================= */

async function addNation(id, url, color, opacity) {
    const map = window.__MAP;
    if (!map) return;

    if (map.getSource(id)) {
        console.warn(`Nation source '${id}' already exists — skipping`);
        return;
    }

    try {
        const res = await fetch(url);
        const geo = await res.json();

        map.addSource(id, { type: "geojson", data: geo });

        map.addLayer({
            id: id + "-fill",
            type: "fill",
            source: id,
            paint: {
                "fill-color": color,
                "fill-opacity": opacity
            }
        });

        map.addLayer({
            id: id + "-outline",
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
/*  MAIN STYLE INITIALIZER — called ONLY by map-core.js after map.load     */
/* ======================================================================= */

window.initializeStyleLayers = async function () {
    const map = window.__MAP;

    if (!map) {
        console.error("initializeStyleLayers() called before map exists");
        return;
    }

    /* ---------------- Fog + Stars ---------------- */
    map.setFog({
        color: FOG_COLOR,
        "high-color": FOG_HIGH_COLOR,
        "horizon-blend": FOG_HORIZON_BLEND,
        "space-color": FOG_SPACE_COLOR,
        "star-intensity": FOG_STAR_INTENSITY
    });

    /* ---------------- Nation Shading ---------------- */
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

console.log("%cmap-style.js fully loaded", "color:#00e5ff;font-weight:bold;");
