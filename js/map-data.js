/* ============================================================
   MAP DATA MODULE — v2
   Contains:
   - WAYPOINTS (exactly migrated from cuntmap99.html)
   - TRIP_ORDER
   - DRIVE_ORDER
   NOTE:
   All fields preserved.
   Google Maps "links" objects REMOVED entirely.
   No logic is included here.
   ============================================================ */

console.log("map-data.js loaded");

/* ============================================================
   WAYPOINTS — FULL MIGRATED DATASET
   (Google Maps links removed)
   ============================================================ */

const WAYPOINTS = [
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

    description:
      "Starting point of the North America trip, departing from Sydney.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/sydney1.webp",

    meta: {
      timezone: "Australia/Sydney",
      locale: "en-AU",
      countryCode: "AU"
    }
  },

  {
    id: "losangeles",
    role: "major",
    mode: "Plane",
    coords: [-118.4085, 33.9416],

    location: "Los Angeles International Airport (LAX)",

    names: {
      display: "Los Angeles (Transit)",
      basic: "Los Angeles, CA",
      city: "Los Angeles",
      state: "CA",
      country: "United States"
    },

    description:
      "Transit stop in Los Angeles before continuing to Toronto.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/losangeles1.webp",

    meta: {
      timezone: "America/Los_Angeles",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "toronto",
    role: "major",
    mode: "Plane",
    coords: [-79.6306, 43.6777],

    location: "Toronto Pearson International Airport (YYZ)",

    names: {
      display: "Arrival – Toronto",
      basic: "Toronto, ON",
      city: "Toronto",
      state: "ON",
      country: "Canada"
    },

    description:
      "Primary arrival city in North America. Beginning of the Canadian portion of the journey.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/toronto1.webp",

    meta: {
      timezone: "America/Toronto",
      locale: "en-CA",
      countryCode: "CA"
    }
  },

  {
    id: "niagarafalls",
    role: "minor",
    mode: "Car",
    coords: [-79.074, 43.090],

    location: "Niagara Falls, ON",

    names: {
      display: "Niagara Falls",
      basic: "Niagara Falls, ON",
      city: "Niagara Falls",
      state: "ON",
      country: "Canada"
    },

    description:
      "Stop at Niagara Falls while travelling from Toronto to the US border.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/niagara1.webp",

    meta: {
      timezone: "America/Toronto",
      locale: "en-CA",
      countryCode: "CA"
    }
  },

  {
    id: "buffalo",
    role: "minor",
    mode: "Car",
    coords: [-78.8784, 42.8864],

    location: "Buffalo, NY",

    names: {
      display: "Buffalo",
      basic: "Buffalo, NY",
      city: "Buffalo",
      state: "NY",
      country: "United States"
    },

    description:
      "Entry into the United States via Buffalo, NY.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/buffalo1.webp",

    meta: {
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "tomsriver",
    role: "destination",
    mode: "Car",
    coords: [-74.1979, 39.9537],

    location: "Toms River, NJ",

    names: {
      display: "Toms River",
      basic: "Toms River, NJ",
      city: "Toms River",
      state: "NJ",
      country: "United States"
    },

    description:
      "Final destination of the initial North America trip.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/tomsriver1.webp",

    meta: {
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  }
];

/* ============================================================
   TRIP ORDER — EXACT FROM ORIGINAL
   ============================================================ */

const TRIP_ORDER = [
  "sydney",
  "losangeles",
  "toronto",
  "niagarafalls",
  "buffalo",
  "tomsriver"
];

/* ============================================================
   DRIVE ORDER — EXACT FROM ORIGINAL
   ============================================================ */

const DRIVE_ORDER = [
  "toronto",
  "niagarafalls",
  "buffalo",
  "tomsriver"
];
