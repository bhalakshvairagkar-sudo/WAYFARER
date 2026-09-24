/**
 * WAYFARER AI - Default Journey & Geospatial Prototype Dataset
 * Realistic coordinates, waypoints, and candidate route properties for Pune -> Goa 3-Day Journey
 */

export const DEFAULT_TRIP = {
  origin: "Pune Railway Station",
  destination: "Goa",
  startDate: "2026-09-10",
  endDate: "2026-09-12",
  durationDays: 3,
  travelerCount: 1
};

export const DEFAULT_TRAVELER = {
  name: "Aditi",
  mobility: "wheelchair",
  stairsAllowed: false,
  rampsPreferred: true,
  crowdTolerance: "low",
  safetyPriority: "high",
  walkingTolerance: "medium",
  longerRouteAccepted: true,
  summary: "Solo traveler using a wheelchair, requires step-free access, prefers high safety and low-crowd environments."
};

export const DEFAULT_STOPS = [
  {
    id: "stop-1",
    day: 1,
    name: "Pune Railway Station",
    type: "transport",
    city: "Pune",
    lat: 18.5284,
    lng: 73.8744,
    arrivalTime: "10:00",
    departureTime: "10:30",
    description: "Journey origin point with accessible platform ramps.",
    durationMin: 30,
    minDurationMin: 30,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '00:00', close: '23:59' },
    accessibility: { score: 95, wheelchairAccess: true, elevatorRequired: true, stepFree: true },
    isStrictDeadline: false
  },
  {
    id: "stop-2",
    day: 1,
    name: "Grand Panjim Hotel",
    type: "stay",
    city: "Panjim, Goa",
    lat: 15.4989,
    lng: 73.8278,
    arrivalTime: "14:30",
    departureTime: "16:00",
    description: "Wheelchair-accessible hotel with step-free entrance and elevators.",
    durationMin: 90,
    minDurationMin: 30,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '00:00', close: '23:59' },
    accessibility: { score: 90, wheelchairAccess: true, elevatorRequired: true, stepFree: true },
    isStrictDeadline: false
  },
  {
    id: "stop-3",
    day: 1,
    name: "Panjim Promenade & Fontainhas",
    type: "experience",
    city: "Panjim, Goa",
    lat: 15.4920,
    lng: 73.8320,
    arrivalTime: "16:30",
    departureTime: "19:00",
    description: "Historic cultural area with paved walking pathways along Mandovi river.",
    durationMin: 150,
    minDurationMin: 60,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '06:00', close: '22:00' },
    accessibility: { score: 85, wheelchairAccess: true, elevatorRequired: false, stepFree: true },
    isStrictDeadline: false
  },
  {
    id: "stop-4",
    day: 2,
    name: "Fort Aguada",
    type: "attraction",
    city: "Candolim, Goa",
    lat: 15.4927,
    lng: 73.7737,
    arrivalTime: "10:30",
    departureTime: "13:00",
    description: "17th-century Portuguese fort with panoramic Arabian Sea views and elevator-assisted viewing deck.",
    durationMin: 150,
    minDurationMin: 60,
    bufferMin: 45,
    cost: { estimated: 200, currency: 'INR' },
    openingHours: { open: '08:30', close: '17:30' },
    accessibility: { score: 80, wheelchairAccess: true, elevatorRequired: true, stepFree: false },
    isStrictDeadline: false
  },
  {
    id: "stop-5",
    day: 2,
    name: "Candolim Beach Promenade",
    type: "attraction",
    city: "Candolim, Goa",
    lat: 15.5180,
    lng: 73.7630,
    arrivalTime: "14:00",
    departureTime: "16:30",
    description: "Accessible coastal boardwalk with beach wheelchair matting and sunset deck.",
    durationMin: 150,
    minDurationMin: 60,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '06:00', close: '19:00' },
    accessibility: { score: 95, wheelchairAccess: true, elevatorRequired: false, stepFree: true },
    isStrictDeadline: false
  },
  {
    id: "stop-6",
    day: 2,
    name: "Mapusa Local Market",
    type: "experience",
    city: "Mapusa, Goa",
    lat: 15.5925,
    lng: 73.8150,
    arrivalTime: "17:30",
    departureTime: "19:30",
    description: "Traditional vibrant Goan market for spices, handicrafts, and local delicacies.",
    durationMin: 120,
    minDurationMin: 45,
    bufferMin: 45,
    cost: { estimated: 500, currency: 'INR' },
    openingHours: { open: '09:00', close: '20:30' },
    accessibility: { score: 75, wheelchairAccess: true, elevatorRequired: false, stepFree: false },
    isStrictDeadline: false
  },
  {
    id: "stop-7",
    day: 2,
    name: "Grand Panjim Hotel (Return)",
    type: "stay",
    city: "Panjim, Goa",
    lat: 15.4989,
    lng: 73.8278,
    arrivalTime: "20:00",
    departureTime: "21:30",
    description: "Evening return to hotel accommodation.",
    durationMin: 90,
    minDurationMin: 30,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '00:00', close: '23:59' },
    accessibility: { score: 90, wheelchairAccess: true, elevatorRequired: true, stepFree: true },
    isStrictDeadline: false
  },
  {
    id: "stop-8",
    day: 3,
    name: "Pune Railway Station (Completion)",
    type: "transport",
    city: "Pune",
    lat: 18.5284,
    lng: 73.8744,
    arrivalTime: "18:30",
    departureTime: "19:00",
    description: "Final journey completion point.",
    durationMin: 30,
    minDurationMin: 30,
    bufferMin: 45,
    cost: { estimated: 0, currency: 'INR' },
    openingHours: { open: '00:00', close: '23:59' },
    accessibility: { score: 95, wheelchairAccess: true, elevatorRequired: true, stepFree: true },
    isStrictDeadline: true
  }
];

export const CANDIDATE_ROUTES_DATABASE = {
  "S1": [
    {
      id: "A",
      name: "NH48 Express Transit",
      tagline: "Fastest Highway Corridor",
      distanceKm: 448,
      durationMin: 480,
      safety: 85,
      accessibility: 80,
      crowd: 70,
      convenience: 92,
      cost: { estimated: 1200, currency: 'INR' },
      accessibleFeatures: ["Accessible expressway rest stops every 60km", "Ramped washrooms"],
      coordinates: [
        [18.5284, 73.8744],
        [17.6805, 74.0183],
        [16.7050, 74.2433],
        [15.8497, 74.4977],
        [15.4989, 73.8278]
      ]
    },
    {
      id: "B",
      name: "Scenic Coastal Ghats Transit",
      tagline: "High Safety & Assisted Transit",
      distanceKm: 462,
      durationMin: 510,
      safety: 90,
      accessibility: 90,
      crowd: 85,
      convenience: 90,
      cost: { estimated: 1400, currency: 'INR' },
      accessibleFeatures: ["Continuous low-gradient paved route", "Priority assistance fuel stations"],
      coordinates: [
        [18.5284, 73.8744],
        [17.9234, 73.6587],
        [16.9902, 73.3000],
        [15.8600, 73.7400],
        [15.4989, 73.8278]
      ]
    },
    {
      id: "C",
      name: "Chorla Bypass Transit",
      tagline: "Low Traffic Corridor",
      distanceKm: 475,
      durationMin: 530,
      safety: 85,
      accessibility: 78,
      crowd: 90,
      convenience: 75,
      cost: { estimated: 1100, currency: 'INR' },
      accessibleFeatures: ["Low traffic density", "Smooth tarmac"],
      coordinates: [
        [18.5284, 73.8744],
        [17.3000, 74.1500],
        [16.1000, 74.3000],
        [15.6500, 74.1200],
        [15.4989, 73.8278]
      ]
    }
  ],
  "S2": [
    {
      id: "A",
      name: "Direct City Avenue",
      tagline: "Fastest Direct Line",
      distanceKm: 2.1,
      durationMin: 8,
      safety: 84,
      accessibility: 72,
      crowd: 65,
      convenience: 92,
      cost: { estimated: 50, currency: 'INR' },
      accessibleFeatures: ["Standard curbs", "Occasional pavers"],
      coordinates: [
        [15.4989, 73.8278],
        [15.4950, 73.8300],
        [15.4920, 73.8320]
      ]
    },
    {
      id: "B",
      name: "Mandovi Riverside Boardwalk",
      tagline: "100% Step-Free & Wide Path",
      distanceKm: 2.8,
      durationMin: 12,
      safety: 92,
      accessibility: 96,
      crowd: 90,
      convenience: 90,
      cost: { estimated: 80, currency: 'INR' },
      accessibleFeatures: ["Zero steps", "Tactile paving", "Continuous safety railing"],
      coordinates: [
        [15.4989, 73.8278],
        [15.5010, 73.8310],
        [15.4960, 73.8335],
        [15.4920, 73.8320]
      ]
    },
    {
      id: "C",
      name: "Old Latin Heritage Path",
      tagline: "Quiet Cultural Stroll",
      distanceKm: 3.0,
      durationMin: 15,
      safety: 90,
      accessibility: 88,
      crowd: 92,
      convenience: 80,
      cost: { estimated: 60, currency: 'INR' },
      accessibleFeatures: ["Gentle slopes", "Low vehicular traffic"],
      coordinates: [
        [15.4989, 73.8278],
        [15.4940, 73.8260],
        [15.4910, 73.8290],
        [15.4920, 73.8320]
      ]
    }
  ],
  "S3": [
    {
      id: "A",
      name: "Route A: Coastal Highway",
      tagline: "Fastest Direct Route",
      distanceKm: 15.2,
      durationMin: 28,
      safety: 82,
      accessibility: 45,
      crowd: 61,
      convenience: 92,
      cost: { estimated: 150, currency: 'INR' },
      accessibleFeatures: ["Cobblestone stairs near lower bastion", "Narrow curbs"],
      coordinates: [
        [15.4920, 73.8320],
        [15.5050, 73.8180],
        [15.5120, 73.7950],
        [15.5030, 73.7780],
        [15.4927, 73.7737]
      ]
    },
    {
      id: "B",
      name: "Route B: Mandovi Promenade & Heritage Ramp",
      tagline: "Most Accessible (Elevator + Ramped Way)",
      distanceKm: 18.5,
      durationMin: 37,
      safety: 90,
      accessibility: 96,
      crowd: 85,
      convenience: 86,
      cost: { estimated: 200, currency: 'INR' },
      accessibleFeatures: [
        "Step-free ramped access (1:12 slope)",
        "Elevator-assisted viewing deck access",
        "Dedicated wheelchair shuttle bay",
        "Even asphalt surface throughout"
      ],
      coordinates: [
        [15.4920, 73.8320],
        [15.5180, 73.8220],
        [15.5250, 73.7900],
        [15.5100, 73.7750],
        [15.4927, 73.7737]
      ]
    },
    {
      id: "C",
      name: "Route C: Inland Plateau Express",
      tagline: "Lower Crowd & Upper Plateau Ramp Bypass",
      distanceKm: 19.8,
      durationMin: 40,
      safety: 88,
      accessibility: 91,
      crowd: 85,
      convenience: 82,
      cost: { estimated: 180, currency: 'INR' },
      accessibleFeatures: [
        "Step-free upper plateau bypass (slope 1:15)",
        "Wide paved path (2.2m width)",
        "Rest benches with shade every 100m",
        "Low pedestrian congestion"
      ],
      coordinates: [
        [15.4920, 73.8320],
        [15.5350, 73.8150],
        [15.5300, 73.7800],
        [15.5050, 73.7680],
        [15.4927, 73.7737]
      ]
    }
  ],
  "S4": [
    {
      id: "A",
      name: "Sinquerim Shoreline Link",
      tagline: "Shortest Beachway",
      distanceKm: 4.2,
      durationMin: 12,
      safety: 82,
      accessibility: 65,
      crowd: 60,
      convenience: 90,
      cost: { estimated: 80, currency: 'INR' },
      accessibleFeatures: ["Soft sand crossing at entry", "Moderate slope"],
      coordinates: [
        [15.4927, 73.7737],
        [15.5020, 73.7680],
        [15.5180, 73.7630]
      ]
    },
    {
      id: "B",
      name: "Candolim Accessible Deck Corridor",
      tagline: "Rubberized Beach Mat & Smooth Path",
      distanceKm: 5.1,
      durationMin: 15,
      safety: 88,
      accessibility: 90,
      crowd: 80,
      convenience: 86,
      cost: { estimated: 120, currency: 'INR' },
      accessibleFeatures: ["Full Mobi-Mat beach wheelchair access", "Step-free deck connector"],
      coordinates: [
        [15.4927, 73.7737],
        [15.5080, 73.7720],
        [15.5150, 73.7660],
        [15.5180, 73.7630]
      ]
    },
    {
      id: "C",
      name: "Fort Road Tree-Canopy Bypass",
      tagline: "Shaded & Low Congestion",
      distanceKm: 5.6,
      durationMin: 17,
      safety: 85,
      accessibility: 85,
      crowd: 90,
      convenience: 80,
      cost: { estimated: 100, currency: 'INR' },
      accessibleFeatures: ["Continuous shade canopy", "Smooth sidewalk with curb ramps"],
      coordinates: [
        [15.4927, 73.7737],
        [15.5120, 73.7760],
        [15.5200, 73.7690],
        [15.5180, 73.7630]
      ]
    }
  ],
  "S5": [
    {
      id: "A",
      name: "Calangute-Mapusa Main Artery",
      tagline: "Fastest Direct Transit",
      distanceKm: 14.5,
      durationMin: 32,
      safety: 78,
      accessibility: 65,
      crowd: 55,
      convenience: 90,
      cost: { estimated: 200, currency: 'INR' },
      accessibleFeatures: ["High traffic density", "Standard sidewalks"],
      coordinates: [
        [15.5180, 73.7630],
        [15.5450, 73.7650],
        [15.5700, 73.7900],
        [15.5925, 73.8150]
      ]
    },
    {
      id: "B",
      name: "Pilerne Accessible Green Corridor",
      tagline: "Dedicated Wide Lanes & Step-Free Stalls",
      distanceKm: 16.8,
      durationMin: 38,
      safety: 84,
      accessibility: 85,
      crowd: 80,
      convenience: 80,
      cost: { estimated: 250, currency: 'INR' },
      accessibleFeatures: ["Designated accessible parking stall", "Barrier-free market entrance #2"],
      coordinates: [
        [15.5180, 73.7630],
        [15.5280, 73.7850],
        [15.5600, 73.8050],
        [15.5925, 73.8150]
      ]
    },
    {
      id: "C",
      name: "Saligao Valley Scenic Bypass",
      tagline: "Low Crowd & Off-Peak Flow",
      distanceKm: 17.5,
      durationMin: 41,
      safety: 82,
      accessibility: 82,
      crowd: 88,
      convenience: 75,
      cost: { estimated: 220, currency: 'INR' },
      accessibleFeatures: ["Bypasses market central congestion", "Direct drop-off at craft courtyard"],
      coordinates: [
        [15.5180, 73.7630],
        [15.5350, 73.7800],
        [15.5750, 73.8100],
        [15.5925, 73.8150]
      ]
    }
  ],
  "S6": [
    {
      id: "A",
      name: "NH66 Bridge Direct",
      tagline: "Fastest Return Route",
      distanceKm: 13.0,
      durationMin: 25,
      safety: 80,
      accessibility: 75,
      crowd: 65,
      convenience: 92,
      cost: { estimated: 180, currency: 'INR' },
      accessibleFeatures: ["Direct highway bridge with smooth ramps"],
      coordinates: [
        [15.5925, 73.8150],
        [15.5450, 73.8200],
        [15.4989, 73.8278]
      ]
    },
    {
      id: "B",
      name: "Mandovi River Crossing & Ramped Hotel Access",
      tagline: "Highest Safety & Assisted Access",
      distanceKm: 14.2,
      durationMin: 28,
      safety: 88,
      accessibility: 90,
      crowd: 80,
      convenience: 86,
      cost: { estimated: 200, currency: 'INR' },
      accessibleFeatures: ["Well-lit arterial road", "Zero stairs to hotel lobby entrance"],
      coordinates: [
        [15.5925, 73.8150],
        [15.5350, 73.8300],
        [15.5050, 73.8320],
        [15.4989, 73.8278]
      ]
    },
    {
      id: "C",
      name: "Porvorim Hill Bypass",
      tagline: "Low Traffic Return",
      distanceKm: 15.0,
      durationMin: 32,
      safety: 85,
      accessibility: 84,
      crowd: 88,
      convenience: 80,
      cost: { estimated: 190, currency: 'INR' },
      accessibleFeatures: ["Bypasses commercial strip", "Continuous flat asphalt"],
      coordinates: [
        [15.5925, 73.8150],
        [15.5500, 73.8400],
        [15.5100, 73.8380],
        [15.4989, 73.8278]
      ]
    }
  ],
  "S7": [
    {
      id: "A",
      name: "NH48 Northern Return Corridor",
      tagline: "Direct Return",
      distanceKm: 448,
      durationMin: 480,
      safety: 85,
      accessibility: 85,
      crowd: 75,
      convenience: 92,
      cost: { estimated: 1200, currency: 'INR' },
      accessibleFeatures: ["Assisted rest hubs", "Accessible toll lanes"],
      coordinates: [
        [15.4989, 73.8278],
        [15.8497, 74.4977],
        [16.7050, 74.2433],
        [17.6805, 74.0183],
        [18.5284, 73.8744]
      ]
    },
    {
      id: "B",
      name: "Dedicated Barrier-Free Return Hub",
      tagline: "100% Step-Free Return with Priority Assistance",
      distanceKm: 455,
      durationMin: 495,
      safety: 92,
      accessibility: 93,
      crowd: 90,
      convenience: 92,
      cost: { estimated: 1500, currency: 'INR' },
      accessibleFeatures: ["Full barrier-free boarding ramp", "Reserved accessible carriage"],
      coordinates: [
        [15.4989, 73.8278],
        [15.8600, 73.7400],
        [16.9902, 73.3000],
        [17.9234, 73.6587],
        [18.5284, 73.8744]
      ]
    },
    {
      id: "C",
      name: "Western Express Scenic Route",
      tagline: "Tranquil Low-Traffic Return",
      distanceKm: 470,
      durationMin: 520,
      safety: 88,
      accessibility: 86,
      crowd: 92,
      convenience: 80,
      cost: { estimated: 1100, currency: 'INR' },
      accessibleFeatures: ["Low traffic density", "Scenic vistas"],
      coordinates: [
        [15.4989, 73.8278],
        [16.1000, 74.3000],
        [17.3000, 74.1500],
        [18.5284, 73.8744]
      ]
    }
  ]
};

export const ALTERNATIVE_ACTIVITIES = [
  {
    id: 'alt-1',
    name: 'Pilerne Barrier-Free Art Courtyard',
    type: 'experience',
    city: 'Pilerne, Goa',
    lat: 15.5350, lng: 73.8050,
    openingHours: { open: '09:00', close: '20:30' },
    durationMin: 90, minDurationMin: 45,
    cost: { estimated: 150, currency: 'INR' },
    accessibility: { score: 92, wheelchairAccess: true, elevatorRequired: false, stepFree: true },
    description: 'Open-air art gallery with wheelchair-accessible paths and shaded seating.',
    replacesTypes: ['experience', 'attraction']
  },
  {
    id: 'alt-2',
    name: 'Dona Paula Accessible Jetty Viewpoint',
    type: 'attraction',
    city: 'Dona Paula, Goa',
    lat: 15.4560, lng: 73.8040,
    openingHours: { open: '06:00', close: '19:30' },
    durationMin: 75, minDurationMin: 30,
    cost: { estimated: 50, currency: 'INR' },
    accessibility: { score: 88, wheelchairAccess: true, elevatorRequired: false, stepFree: true },
    description: 'Panoramic ocean viewpoint with ramped walkway and accessible parking.',
    replacesTypes: ['attraction', 'experience']
  },
  {
    id: 'alt-3',
    name: 'Calangute Heritage Craft Market',
    type: 'experience',
    city: 'Calangute, Goa',
    lat: 15.5437, lng: 73.7554,
    openingHours: { open: '10:00', close: '21:00' },
    durationMin: 90, minDurationMin: 40,
    cost: { estimated: 300, currency: 'INR' },
    accessibility: { score: 85, wheelchairAccess: true, elevatorRequired: false, stepFree: true },
    description: 'Accessible local crafts market with wide aisles and step-free stalls.',
    replacesTypes: ['experience']
  }
];
