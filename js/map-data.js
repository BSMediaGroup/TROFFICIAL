// =======================================================
// ===================== WAYPOINT DATA ====================
// =======================================================
// Cleaned dataset: amenities links removed as per v2 design.
// All other fields preserved EXACTLY as in v1.
// Icons, images, names, descriptions, roles, meta: unchanged.

export const WAYPOINTS = [
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

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/sydney1.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/au.svg",
      timezone: "Australia/Sydney",
      locale: "en-AU",
      countryCode: "AU"
    }
  },

  {
    id: "la",
    role: "major",
    mode: "Plane",
    coords: [-118.403616889565, 33.94247880317191],
    location: "Los Angeles International Airport (LAX)",

    names: {
      display: "Major Waypoint – Los Angeles",
      basic: "Los Angeles, CA",
      city: "Los Angeles",
      state: "CA",
      country: "United States"
    },

    description:
      "Stopover at LAX before continuing to Toronto.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/MajorWP2.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/losangeles1.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg",
      timezone: "America/Los_Angeles",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "toronto",
    role: "toronto",
    mode: "Car",
    coords: [-79.62726381614229, 43.680452176904645],
    location: "Toronto Pearson International Airport (YYZ)",

    names: {
      display: "Arrival – Toronto",
      basic: "Toronto, ON",
      city: "Toronto",
      state: "ON",
      country: "Canada"
    },

    description: "Meeting Shawn and starting road trip.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/CANpin.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/toronto.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/ca.svg",
      timezone: "America/Toronto",
      locale: "en-CA",
      countryCode: "CA"
    }
  },

  // =====================================================
  // ================ DRIVING WAYPOINTS ===================
  // =====================================================

  {
    id: "hamilton",
    role: "minor",
    mode: "Car",
    coords: [-79.8711, 43.2557],
    location: "Hamilton, Ontario",

    names: {
      display: "Waypoint – Hamilton",
      basic: "Hamilton, ON",
      city: "Hamilton",
      state: "ON",
      country: "Canada"
    },

    description: "Passing Hamilton on the way to Niagara.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/hamilton.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/ca.svg",
      timezone: "America/Toronto",
      locale: "en-CA",
      countryCode: "CA"
    }
  },

  {
    id: "niagarafalls",
    role: "minor",
    mode: "Car",
    coords: [-79.0849, 43.0896],
    location: "Niagara Falls, Ontario",

    names: {
      display: "Waypoint – Niagara Falls",
      basic: "Niagara Falls, ON",
      city: "Niagara Falls",
      state: "ON",
      country: "Canada"
    },

    description: "Crossing the border after Niagara.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/niagara.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/ca.svg",
      timezone: "America/Toronto",
      locale: "en-CA",
      countryCode: "CA"
    }
  },

  {
    id: "buffalo",
    role: "major",
    mode: "Car",
    coords: [-78.73351075487278, 42.93973725814752],
    location: "Buffalo Niagara Intl Airport",

    names: {
      display: "Major Waypoint – Buffalo",
      basic: "Buffalo, NY",
      city: "Buffalo",
      state: "NY",
      country: "United States"
    },

    description: "Picking up Gina flying in from Boston.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/MajorWP2.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/buffalo.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg",
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "batavia",
    role: "minor",
    mode: "Car",
    coords: [-78.193, 42.9987],
    location: "Batavia NY",

    names: {
      display: "Waypoint – Batavia",
      basic: "Batavia, NY",
      city: "Batavia",
      state: "NY",
      country: "United States"
    },

    description: "Small stop on I-90.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/batavia.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg",
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  },

  {
    id: "rochester",
    role: "minor",
    mode: "Car",
    coords: [-77.6088, 43.1566],
    location: "Rochester NY",

    names: {
      display: "Waypoint – Rochester",
      basic: "Rochester, NY",
      city: "Rochester",
      state: "NY",
      country: "United States"
    },

    description: "Passing Rochester heading east.",

    icon:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/waypoint.svg",
    image:
      "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/rochester.webp",

    meta: {
      flag:
        "https://cdn.jsdelivr.net/gh/hjnilsson/country-flags/svg/us.svg",
      timezone: "America/New_York",
      locale: "en-US",
      countryCode: "US"
    }
  }
];

// =======================================================
// ===================== TRIP ORDER =======================
// =======================================================

export const TRIP_ORDER = WAYPOINTS.map((w) => w.id);

// Drive segment = everything after Toronto
export const DRIVE_ORDER = TRIP_ORDER.slice(2);

// =======================================================
// ================== DISTANCE (LEG) DATA =================
// =======================================================
// These are copied exactly from your existing file.
// They can be regenerated later, but preserved here as-is.

export const LEG_DIST = {
  sydney: "12,060 km",
  la: "3,490 km",
  toronto: "65 km",
  hamilton: "55 km",
  niagarafalls: "42 km",
  buffalo: "70 km",
  batavia: "53 km",
  rochester: "61 km"
};

export const TRAVELLED_MI = {
  sydney: 0,
  la: 7500,
  toronto: 9660,
  hamilton: 9700,
  niagarafalls: 9770,
  buffalo: 9795,
  batavia: 9830,
  rochester: 9868
};

export const TRAVELLED_KM = {
  sydney: 0,
  la: 12070,
  toronto: 15540,
  hamilton: 15600,
  niagarafalls: 15725,
  buffalo: 15780,
  batavia: 15830,
  rochester: 15900
};
