/* ============================================================
   MAP DATA MODULE — v2
   Contains:
   - WAYPOINTS array (full structured waypoint dataset)
   - Any static metadata tied to the route
   - Future extension hooks for external/Wix CMS loading
   ============================================================ */

console.log("map-data.js loaded");

/* ============================================================
   WAYPOINTS ARRAY
   (Direct, unchanged migration from your original code)
   ============================================================ */

window.WAYPOINTS = [
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

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/sydney1.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Sydney+NSW",
      toilets: "https://www.google.com/maps/search/public+toilets/Sydney+NSW",
      hotels:  "https://www.google.com/maps/search/hotels/Sydney+NSW"
    },

    meta: {
      countryCode: "AU",
      timezone: "Australia/Sydney",
      locale: "en-AU",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/AU.png"
    }
  },

  /* =====================================================
     ADDITIONAL WAYPOINTS
     These are brought across EXACTLY as originally defined.
     ===================================================== */

  {
    id: "la",
    role: "arrival",
    mode: "Plane",
    coords: [-118.4085, 33.9416],

    location: "Los Angeles International Airport (LAX)",

    names: {
      display: "Arrival – Los Angeles",
      basic: "Los Angeles, CA",
      city: "Los Angeles",
      state: "CA",
      country: "United States"
    },

    description: "The first landing point in North America before connecting to Toronto.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/la.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Los+Angeles+CA",
      toilets: "https://www.google.com/maps/search/public+toilets/Los+Angeles+CA",
      hotels:  "https://www.google.com/maps/search/hotels/Los+Angeles+CA"
    },

    meta: {
      countryCode: "US",
      timezone: "America/Los_Angeles",
      locale: "en-US",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/US.png"
    }
  },

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
      state: "ON",
      country: "Canada"
    },

    description: "Primary Canadian arrival point before starting the cross-border road journey.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/toronto.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Toronto+ON",
      toilets: "https://www.google.com/maps/search/public+toilets/Toronto+ON",
      hotels:  "https://www.google.com/maps/search/hotels/Toronto+ON"
    },

    meta: {
      countryCode: "CA",
      timezone: "America/Toronto",
      locale: "en-CA",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/CA.png"
    }
  },

  /* =====================================================
     FULL ROAD TRIP WAYPOINTS
     ===================================================== */

  {
    id: "niagara",
    role: "minor",
    mode: "Drive",
    coords: [-79.0849, 43.0896],

    location: "Niagara Falls, Ontario",

    names: {
      display: "Niagara Falls",
      basic: "Niagara Falls, ON",
      city: "Niagara Falls",
      state: "ON",
      country: "Canada"
    },

    description: "Famous waterfall landmark on the border between Canada and the United States.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/minor.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/niagara.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Niagara+Falls+ON",
      toilets: "https://www.google.com/maps/search/public+toilets/Niagara+Falls+ON",
      hotels:  "https://www.google.com/maps/search/hotels/Niagara+Falls+ON"
    },

    meta: {
      countryCode: "CA",
      timezone: "America/Toronto",
      locale: "en-CA",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/CA.png"
    }
  },

  {
    id: "cleveland",
    role: "minor",
    mode: "Drive",
    coords: [-81.6944, 41.4993],

    location: "Cleveland, Ohio",

    names: {
      display: "Cleveland",
      basic: "Cleveland, OH",
      city: "Cleveland",
      state: "OH",
      country: "United States"
    },

    description: "A major city on the shores of Lake Erie, known for the Rock & Roll Hall of Fame.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/minor.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/cleveland.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Cleveland+OH",
      toilets: "https://www.google.com/maps/search/public+toilets/Cleveland+OH",
      hotels:  "https://www.google.com/maps/search/hotels/Cleveland+OH"
    },

    meta: {
      countryCode: "US",
      timezone: "America/New_York",
      locale: "en-US",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/US.png"
    }
  },

  {
    id: "pittsburgh",
    role: "minor",
    mode: "Drive",
    coords: [-79.9959, 40.4406],

    location: "Pittsburgh, Pennsylvania",

    names: {
      display: "Pittsburgh",
      basic: "Pittsburgh, PA",
      city: "Pittsburgh",
      state: "PA",
      country: "United States"
    },

    description: "Known for its steel industry history and famous sports teams.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/minor.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/pittsburgh.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Pittsburgh+PA",
      toilets: "https://www.google.com/maps/search/public+toilets/Pittsburgh+PA",
      hotels:  "https://www.google.com/maps/search/hotels/Pittsburgh+PA"
    },

    meta: {
      countryCode: "US",
      timezone: "America/New_York",
      locale: "en-US",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/US.png"
    }
  },

  {
    id: "philadelphia",
    role: "minor",
    mode: "Drive",
    coords: [-75.1652, 39.9526],

    location: "Philadelphia, Pennsylvania",

    names: {
      display: "Philadelphia",
      basic: "Philadelphia, PA",
      city: "Philadelphia",
      state: "PA",
      country: "United States"
    },

    description: "Historic American city and home of the Liberty Bell and Independence Hall.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/minor.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/philadelphia.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Philadelphia+PA",
      toilets: "https://www.google.com/maps/search/public+toilets/Philadelphia+PA",
      hotels:  "https://www.google.com/maps/search/hotels/Philadelphia+PA"
    },

    meta: {
      countryCode: "US",
      timezone: "America/New_York",
      locale: "en-US",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/US.png"
    }
  },

  {
    id: "tomsriver",
    role: "arrival",
    mode: "Drive",
    coords: [-74.1979, 39.9537],

    location: "Toms River, New Jersey",

    names: {
      display: "Toms River",
      basic: "Toms River, NJ",
      city: "Toms River",
      state: "NJ",
      country: "United States"
    },

    description: "Final destination of the cross-country trip.",

    icon: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/SVG/dcpin.svg",
    image: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/tomsriver.webp",

    links: {
      search:  "https://www.google.com/maps/search/tourist+places/Toms+River+NJ",
      toilets: "https://www.google.com/maps/search/public+toilets/Toms+River+NJ",
      hotels:  "https://www.google.com/maps/search/hotels/Toms+River+NJ"
    },

    meta: {
      countryCode: "US",
      timezone: "America/New_York",
      locale: "en-US",
      flag: "https://raw.githubusercontent.com/BSMediaGroup/Resources/master/IMG/FLAGS/US.png"
    }
  }
];

/* ============================================================
   EXPORT MODULE
   ============================================================ */

window.DATA = {
  WAYPOINTS
};

console.log("%cmap-data.js fully loaded", "color:#00e5ff;font-weight:bold;");
