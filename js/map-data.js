/* ========================================================================== */
/* =============================== MAP DATA ================================= */
/* ========================================================================== */

console.log("%cmap-data.js loaded", "color:#00aaff;font-weight:bold;");

/* ==========================================================================
   FLAG ICON SOURCES — using your provided working SVGs (fallbacks)
   ========================================================================== */

const FLAG_AU = "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/AU.svg";
const FLAG_CA = "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/CA.svg";
const FLAG_US = "https://raw.githubusercontent.com/BSMediaGroup/Resources/refs/heads/master/IMG/SVG/USA.svg";

/* ==========================================================================
   MARKER ICON SOURCES — these paths MATCH the original working v1 map
   ========================================================================== */

const ICON_DEPARTURE = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg";
const ICON_FINAL     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/STARBARX.svg";
const ICON_MAJOR     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/MajorWP2.svg";
const ICON_MINOR     = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg";
const ICON_CANPIN    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/CANpin.svg";

/* ==========================================================================
   WAYPOINT IMAGE SOURCES — restored to EXACT file names used in the original
   ========================================================================== */

const IMG_SYDNEY    = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/sydney1.webp";
const IMG_LA        = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/la.webp";
const IMG_TORONTO   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/toronto.webp";
const IMG_NIAGARA   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/niagara.webp";
const IMG_BUFFALO   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/buffalo.webp";
const IMG_NYC       = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/nyc.webp";
const IMG_HOBOKEN   = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/hoboken.webp";
const IMG_TOMSRIVER = "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/tomsriver.webp";

/* ==========================================================================
   TRIP ORDER — currently identical to original version
   ========================================================================== */

const TRIP_ORDER = [
  "sydney",
  "la",
  "toronto",
  "niagara",
  "buffalo",
  "nyc",
  "hoboken",
  "tomsriver"
];

const DRIVE_ORDER = [
  "toronto",
  "niagara",
  "buffalo",
  "nyc",
  "hoboken",
  "tomsriver"
];

/* ==========================================================================
   WAYPOINT DEFINITIONS — COMPLETE, UPDATED, FIXED
   ========================================================================== */

const WAYPOINTS = [

  /* =========================== SYDNEY ============================ */
  {
    id: "sydney",
    role: "departure",
    mode: "Plane",
    coords: [151.177222, -33.946111],

    location: "Sydney Kingsford Smith Airport (SYD)",
    names: {
      display: "Departure – Sydney",
      basic: "Sydney, NSW",
      city: "Sydney",
      state: "NSW",
      country: "Australia"
    },

    description: "Starting point of the North America trip, departing from Sydney.",

    icon: ICON_DEPARTURE,
    image: IMG_SYDNEY,

    meta: {
      countryCode: "AU",
      flag: FLAG_AU,
      timezone: "Australia/Sydney",
      locale: "en-AU"
    }
  },

  /* =========================== LOS ANGELES ============================ */
  {
    id: "la",
    role: "major",
    mode: "Plane",
    coords: [-118.4085, 33.9416],

    location: "Los Angeles International Airport (LAX)",
    names: {
      display: "Arrival – Los Angeles",
      basic: "Los Angeles, CA",
      city: "Los Angeles",
      state: "California",
      country: "United States"
    },

    description: "First U.S. arrival point before continuing the flight to Toronto.",

    icon: ICON_MAJOR,
    image: IMG_LA,

    meta: {
      countryCode: "US",
      flag: FLAG_US,
      timezone: "America/Los_Angeles",
      locale: "en-US"
    }
  },

  /* =========================== TORONTO ============================ */
  {
    id: "toronto",
    role: "arrival",
    mode: "Plane",
    coords: [-79.6306, 43.6777],

    location: "Toronto Pearson International Airport (YYZ)",
    names: {
      display: "Arrival – Toronto",
      basic: "Toronto, ON",
      city: "Toronto",
      state: "Ontario",
      country: "Canada"
    },

    description: "Primary Canadian arrival point before starting the cross-border road journey.",

    icon: ICON_CANPIN,
    image: IMG_TORONTO,

    meta: {
      countryCode: "CA",
      flag: FLAG_CA,
      timezone: "America/Toronto",
      locale: "en-CA"
    }
  },

  /* =========================== NIAGARA FALLS ============================ */
  {
    id: "niagara",
    role: "major",
    mode: "Car",
    coords: [-79.0740, 43.0896],

    location: "Niagara Falls, Ontario",
    names: {
      display: "Niagara Falls",
      basic: "Niagara Falls",
      city: "Niagara Falls",
      state: "Ontario",
      country: "Canada"
    },

    description: "First major stop in the road trip leaving Toronto heading toward the U.S. border.",

    icon: ICON_MAJOR,
    image: IMG_NIAGARA,

    meta: {
      countryCode: "CA",
      flag: FLAG_CA,
      timezone: "America/Toronto",
      locale: "en-CA"
    }
  },

  /* =========================== BUFFALO ============================ */
  {
    id: "buffalo",
    role: "major",
    mode: "Car",
    coords: [-78.8784, 42.8864],

    location: "Buffalo, New York",
    names: {
      display: "Buffalo",
      basic: "Buffalo",
      city: "Buffalo",
      state: "New York",
      country: "United States"
    },

    description: "First U.S. stop after crossing the border from Canada.",

    icon: ICON_MAJOR,
    image: IMG_BUFFALO,

    meta: {
      countryCode: "US",
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US"
    }
  },

  /* =========================== NEW YORK CITY ============================ */
  {
    id: "nyc",
    role: "major",
    mode: "Car",
    coords: [-73.9857, 40.7484],

    location: "New York City, NY",
    names: {
      display: "New York City",
      basic: "NYC",
      city: "New York",
      state: "New York",
      country: "United States"
    },

    description: "Major waypoint on the journey through New York City.",

    icon: ICON_MAJOR,
    image: IMG_NYC,

    meta: {
      countryCode: "US",
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US"
    }
  },

  /* =========================== HOBOKEN ============================ */
  {
    id: "hoboken",
    role: "minor",
    mode: "Car",
    coords: [-74.0324, 40.7433],

    location: "Hoboken, NJ",
    names: {
      display: "Hoboken",
      basic: "Hoboken",
      city: "Hoboken",
      state: "New Jersey",
      country: "United States"
    },

    description: "Passing through Hoboken on the way to Toms River.",

    icon: ICON_MINOR,
    image: IMG_HOBOKEN,

    meta: {
      countryCode: "US",
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US"
    }
  },

  /* =========================== TOMS RIVER ============================ */
  {
    id: "tomsriver",
    role: "final",
    mode: "Car",
    coords: [-74.2000, 39.9537],

    location: "Toms River, New Jersey",
    names: {
      display: "Final Destination – Toms River",
      basic: "Toms River",
      city: "Toms River",
      state: "New Jersey",
      country: "United States"
    },

    description: "Final stop of the North America trip completing the journey.",

    icon: ICON_FINAL,
    image: IMG_TOMSRIVER,

    meta: {
      countryCode: "US",
      flag: FLAG_US,
      timezone: "America/New_York",
      locale: "en-US"
    }
  }

];

/* ==========================================================================
   EXPORT
   ========================================================================== */

console.log("%cmap-data.js fully loaded", "color:#00ff88;font-weight:bold;");
