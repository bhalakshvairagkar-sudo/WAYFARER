/**
 * WAYFARER AI - Client Presets and Default Journey Data
 */

export const PRESET_JOURNEYS = [
  {
    id: "pune-goa-wheelchair",
    title: "♿ Pune to Goa (Wheelchair Solo - Master Demo)",
    badge: "Official Demo Scenario",
    prompt: "I'm traveling alone from Pune to Goa for 3 days. I'm using a wheelchair, cannot use stairs, prefer safer routes, dislike crowded places, and can take a longer route if it is more accessible. I want to visit Fort Aguada, a beach and a local market.",
    origin: "Pune Railway Station",
    destination: "Goa",
    durationDays: 3,
    travelerCount: 1,
    travelerName: "Aditi",
    mobility: "wheelchair"
  },
  {
    id: "jaipur-senior-family",
    title: "👨‍👩‍👧 Jaipur Cultural Tour (Senior Citizens)",
    badge: "Low Mobility & High Shade",
    prompt: "Family trip with senior parents with limited walking tolerance and walking sticks. Prefer well-shaded, barrier-free heritage sites in Jaipur for 2 days. Avoid long stairs and crowded bazaars.",
    origin: "Jaipur Airport",
    destination: "Jaipur",
    durationDays: 2,
    travelerCount: 3,
    travelerName: "Rajesh",
    mobility: "elderly"
  },
  {
    id: "coorg-nature-solo",
    title: "🌿 Bangalore to Coorg (Low-Crowd Solo)",
    badge: "Tranquil & Safe",
    prompt: "Solo retreat from Bangalore to Coorg for 2 days. Prioritize tranquil low-crowd viewpoints, well-lit safe routes, and moderate walking paths.",
    origin: "Bangalore",
    destination: "Coorg",
    durationDays: 2,
    travelerCount: 1,
    travelerName: "Kavya",
    mobility: "standard"
  }
];

export const INITIAL_DEFAULT_STATE = {
  trip: {
    origin: "Pune Railway Station",
    destination: "Goa",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    durationDays: 3,
    travelerCount: 1
  },
  traveler: {
    name: "Aditi",
    mobility: "wheelchair",
    stairsAllowed: false,
    rampsPreferred: true,
    crowdTolerance: "low",
    safetyPriority: "high",
    walkingTolerance: "medium",
    longerRouteAccepted: true,
    summary: "Solo traveler using a wheelchair, requires continuous step-free access, prefers high safety and low-crowd environments."
  },
  weights: {
    safety: 0.30,
    accessibility: 0.40,
    crowd: 0.20,
    convenience: 0.10
  },
  stops: [
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
      description: "Origin point with accessible platform ramps."
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
      description: "Wheelchair-accessible hotel with step-free entrance and elevators."
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
      description: "Historic cultural area with paved walking pathways along Mandovi river."
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
      description: "17th-century Portuguese fort with panoramic Arabian Sea views and elevator-assisted viewing deck."
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
      description: "Accessible coastal boardwalk with beach wheelchair matting and sunset deck."
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
      description: "Traditional vibrant Goan market for spices, handicrafts, and local delicacies."
    },
    {
      id: "stop-7",
      day: 3,
      name: "Goa Return Hub",
      type: "transport",
      city: "Goa",
      lat: 15.4989,
      lng: 73.8278,
      arrivalTime: "11:00",
      departureTime: "11:30",
      description: "Departure transit hub."
    },
    {
      id: "stop-8",
      day: 3,
      name: "Pune Railway Station",
      type: "transport",
      city: "Pune",
      lat: 18.5284,
      lng: 73.8744,
      arrivalTime: "18:30",
      departureTime: "19:00",
      description: "Final journey completion point."
    }
  ]
};
