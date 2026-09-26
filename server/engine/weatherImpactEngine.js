/**
 * WAYFARER AI - Weather Impact Engine & Multi-Entity Propagation
 * 
 * Continuously models physical and operational consequences of weather conditions:
 * - Surface wetness & waterlogging accumulation
 * - Flood probability modeling across spatial corridors
 * - Traffic friction & transit delay propagation
 * - Personalized traveler vulnerability (wheelchair, senior, standard)
 * - Multi-entity cascading effects (Routes -> Transport -> Hospitality -> Attractions)
 * - Directed Acyclic Graph (DAG) propagation of downstream disruptions
 */

import { haversineDistanceMeters } from "./evidenceFusionEngine.js";

// Micro-zone spatial characteristics in South Mumbai travel corridor
export const SPATIAL_CORRIDORS = {
  "S1": {
    name: "CSMT → Gateway Corridor",
    elevation: "LOW_MEDIUM",
    drainageEfficiency: 0.75,
    coastalExposure: 0.35,
    coveredFootpathPct: 40,
    transitTypes: ["WALKING", "BUS", "CAB"]
  },
  "S2": {
    name: "Gateway → Colaba Corridor",
    elevation: "MEDIUM",
    drainageEfficiency: 0.80,
    coastalExposure: 0.70,
    coveredFootpathPct: 55,
    transitTypes: ["WALKING", "HERITAGE_BUS"]
  },
  "S3": {
    name: "Colaba → Marine Drive Corridor",
    elevation: "LOW_COASTAL", // prone to high tide & sea surge
    drainageEfficiency: 0.50,
    coastalExposure: 0.95,
    coveredFootpathPct: 15, // highly exposed open promenade
    transitTypes: ["WALKING", "CAB", "SUBURBAN_RAIL"]
  }
};

/**
 * Calculates surface waterlogging and flood risk for a specific corridor
 * @param {Object} weather Normalized weather state
 * @param {string} segmentId Corridor identifier
 * @param {number} [durationHours=1] Duration of precipitation
 * @returns {Object} Physical surface state
 */
export function computeCorridorSurfaceState(weather, segmentId = "S1", durationHours = 1) {
  const corridor = SPATIAL_CORRIDORS[segmentId] || SPATIAL_CORRIDORS["S1"];
  const rainMmPerHour = Number(weather.precipitation ?? 0);
  const totalRainMm = rainMmPerHour * Math.max(0.5, durationHours);

  // Absorption vs accumulation based on drainage efficiency
  const accumulationRate = Math.max(0, 1.0 - corridor.drainageEfficiency);
  const waterAccumulationMm = Math.round(totalRainMm * accumulationRate * 10) / 10;

  // Surface status classification
  let surfaceWetness = "DRY";
  if (rainMmPerHour > 0.2 || waterAccumulationMm > 1) surfaceWetness = "DAMP";
  if (waterAccumulationMm >= 15 || rainMmPerHour >= 20) surfaceWetness = "WATERLOGGED";
  if (waterAccumulationMm >= 35 || rainMmPerHour >= 50) surfaceWetness = "FLOODED";

  // Deterministic Flood Probability (0 to 100%)
  // Factors: rain intensity, cumulative water, low elevation bonus, coastal high tide exposure
  let baseRisk = (rainMmPerHour / 60) * 55;
  if (corridor.elevation === "LOW_COASTAL") baseRisk += 25;
  if (corridor.elevation === "LOW_MEDIUM") baseRisk += 12;
  if (weather.windSpeed > 30) baseRisk += 8; // storm surge
  const floodProbability = Math.min(98, Math.max(3, Math.round(baseRisk)));

  // Road & Footpath friction factor (1.0 = completely dry, 0.40 = hydroplaning/slick)
  const roadFrictionFactor = Number(Math.max(0.40, 1.0 - (waterAccumulationMm / 80)).toFixed(2));

  // Traffic slowdown multiplier (1.0x to 2.4x)
  let trafficSlowdownMultiplier = 1.0;
  if (surfaceWetness === "DAMP") trafficSlowdownMultiplier = 1.15;
  if (surfaceWetness === "WATERLOGGED") trafficSlowdownMultiplier = 1.65;
  if (surfaceWetness === "FLOODED") trafficSlowdownMultiplier = 2.25;

  return {
    segmentId,
    corridorName: corridor.name,
    surfaceWetness,
    waterAccumulationMm,
    floodProbability,
    roadFrictionFactor,
    trafficSlowdownMultiplier,
    coastalExposure: corridor.coastalExposure,
    coveredFootpathPct: corridor.coveredFootpathPct
  };
}

/**
 * Evaluates Personalized Traveler Vulnerability given environmental and road surface conditions
 * 
 * Rules:
 * - Wheelchair / Limited Mobility:
 *   - Rain > 4mm/h or Waterlogging > 10mm makes footpaths slippery and hazardous.
 *   - Waterlogging > 25mm or Flooded = INACCESSIBLE / CRITICAL HAZARD (Route must adapt).
 * - Senior / Child:
 *   - Rain > 10mm/h or storm > 1.5h = HIGH impact (slip risk on wet basalt/cobblestones).
 * - Standard / Adventurous:
 *   - Moderate comfort drop, but low hazard unless severely flooded.
 * 
 * @param {Object} traveler Traveler profile
 * @param {Object} surfaceState Corridor surface state
 * @param {Object} weather Normalized weather state
 * @returns {Object} Personalized vulnerability evaluation
 */
export function evaluateTravelerWeatherImpact(traveler = {}, surfaceState = {}, weather = {}) {
  const mobility = (traveler.mobility || "standard").toLowerCase();
  const specialNeeds = Array.isArray(traveler.specialNeeds) ? traveler.specialNeeds : [];
  const isWheelchair = mobility.includes("wheelchair") || specialNeeds.includes("wheelchair");
  const isSenior = mobility.includes("senior") || mobility.includes("limited_walking") || (traveler.age && traveler.age >= 65);

  let vulnerabilityLevel = "LOW";
  let accessibilityImpact = 0.05; // 0.0 to 1.0 degradation
  let safetyScoreDrop = 5;
  let recommendedAction = "MONITOR";
  let advisoryMessage = "Normal environmental conditions. Proceed with standard journey flow.";

  if (isWheelchair) {
    if (surfaceState.surfaceWetness === "FLOODED" || surfaceState.floodProbability >= 65) {
      vulnerabilityLevel = "CRITICAL";
      accessibilityImpact = 0.85; // Massive accessibility destruction
      safetyScoreDrop = 55;
      recommendedAction = "ADAPT";
      advisoryMessage = `CRITICAL HAZARD: Route segment ${surfaceState.segmentId} is waterlogged (${surfaceState.waterAccumulationMm}mm). Ramps and curbs submerged. Immediate step-free rerouting required.`;
    } else if (surfaceState.surfaceWetness === "WATERLOGGED" || surfaceState.floodProbability >= 40) {
      vulnerabilityLevel = "HIGH";
      accessibilityImpact = 0.60;
      safetyScoreDrop = 38;
      recommendedAction = "ADAPT";
      advisoryMessage = `HIGH VULNERABILITY: Wet paving and puddle accumulation reduce electric wheelchair traction. Recommend sheltered inland alternative.`;
    } else if (surfaceState.surfaceWetness === "DAMP" || weather.isRaining) {
      vulnerabilityLevel = "MODERATE";
      accessibilityImpact = 0.25;
      safetyScoreDrop = 15;
      recommendedAction = "WARN";
      advisoryMessage = `Slick paving tiles reported along corridor. Wheelchair traction reduced. Proceed with care.`;
    }
  } else if (isSenior) {
    if (surfaceState.surfaceWetness === "FLOODED" || surfaceState.floodProbability >= 65) {
      vulnerabilityLevel = "HIGH";
      accessibilityImpact = 0.65;
      safetyScoreDrop = 45;
      recommendedAction = "ADAPT";
      advisoryMessage = `HIGH RISK: Walking surface submerged with uneven road curbs. Risk of slip and fall. Reroute via covered transit.`;
    } else if (surfaceState.surfaceWetness === "WATERLOGGED" || weather.rainIntensity === "HEAVY") {
      vulnerabilityLevel = "MODERATE";
      accessibilityImpact = 0.40;
      safetyScoreDrop = 25;
      recommendedAction = "WARN";
      advisoryMessage = `Heavy showers and wet basalt tiles. Pace slowed by 30%. Indoor shelter recommended.`;
    }
  } else {
    // Standard Traveler
    if (surfaceState.surfaceWetness === "FLOODED") {
      vulnerabilityLevel = "MODERATE";
      accessibilityImpact = 0.40;
      safetyScoreDrop = 25;
      recommendedAction = "ADAPT";
      advisoryMessage = `Corridor heavily waterlogged. Transit delays expected (+15-25m). Reroute suggested.`;
    } else if (surfaceState.surfaceWetness === "WATERLOGGED") {
      vulnerabilityLevel = "LOW_MODERATE";
      accessibilityImpact = 0.20;
      safetyScoreDrop = 12;
      recommendedAction = "WARN";
      advisoryMessage = `Traffic and pedestrian movement slowed due to surface water. Carry umbrella.`;
    }
  }

  return {
    travelerName: traveler.name || "Traveler",
    mobilityType: isWheelchair ? "Wheelchair User" : isSenior ? "Senior / Limited Mobility" : "Standard Traveler",
    vulnerabilityLevel, // LOW | MODERATE | HIGH | CRITICAL
    accessibilityImpact,
    safetyScoreDrop,
    recommendedAction, // MONITOR | WARN | ADAPT
    advisoryMessage
  };
}

/**
 * Propagates weather impact across Hospitality (Hotels, Cafes) and Attractions
 * @param {Object} weather Normalized weather state
 * @param {Object} surfaceState Corridor surface state
 * @returns {Object} Hospitality and Attraction entity impacts
 */
export function modelHospitalityAndAttractionImpacts(weather = {}, surfaceState = {}) {
  const isStorm = weather.rainIntensity === "HEAVY" || weather.rainIntensity === "TORRENTIAL" || surfaceState.surfaceWetness === "FLOODED";
  const isWet = weather.isRaining || surfaceState.surfaceWetness === "WATERLOGGED";

  // Hospitality: Hotels & Sheltered Cafes
  const hotels = [
    {
      id: "hotel-taj-mahal",
      name: "The Taj Mahal Palace Mumbai",
      location: "Colaba Waterfront",
      occupancySurgePct: isStorm ? 38 : isWet ? 18 : 0,
      amenities: ["Sheltered Lounge", "Full Accessibility Elevators", "Dry Zone"],
      shelterAvailability: isStorm ? "HIGH_DEMAND" : "OPEN"
    },
    {
      id: "cafe-mondegar",
      name: "Cafe Mondegar & Leopold Art Cafe",
      location: "Colaba Causeway",
      occupancySurgePct: isStorm ? 65 : isWet ? 35 : 5,
      amenities: ["Indoor Seating", "Power Outlets", "Weather Monitoring Screen"],
      shelterAvailability: "IDEAL_WAITING_SPOT"
    }
  ];

  // Attractions: Indoor vs Outdoor
  const attractions = [
    {
      id: "attr-gateway",
      name: "Gateway of India Promenade",
      type: "OUTDOOR",
      status: isStorm ? "SUSPENDED_ADVISORY" : isWet ? "SLICK_WALKWAY" : "OPTIMAL",
      crowdShiftPct: isStorm ? -85 : isWet ? -45 : 0,
      indoorAlternativeId: "attr-csmvs-museum",
      indoorAlternativeName: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya (CSMVS)",
      notes: isStorm ? "High waves and sea spray. Sea wall closed by civic marshals." : "Open promenade."
    },
    {
      id: "attr-csmvs-museum",
      name: "CSMVS Heritage Museum & Art Pavilion",
      type: "INDOOR_HERITAGE",
      status: "OPEN_SHELTERED",
      crowdShiftPct: isStorm ? +75 : isWet ? +40 : 0,
      isStepFree: true,
      notes: "100% climate-controlled, covered walkways, full wheelchair ramps."
    },
    {
      id: "attr-marine-drive",
      name: "Marine Drive Promenade",
      type: "OUTDOOR_COASTAL",
      status: isStorm ? "HIGH_FLOOD_ALERT" : isWet ? "WET_SURFACE" : "OPTIMAL",
      crowdShiftPct: isStorm ? -90 : isWet ? -50 : 0,
      notes: isStorm ? "Waves overtopping seawall; pedestrians advised to move inland." : "Scenic breeze."
    }
  ];

  // Transportation Corridor Statuses
  const transport = [
    {
      mode: "SUBURBAN_METRO_RAIL",
      route: "Churchgate - CSMT Spine",
      status: isStorm ? "DELAYED_15MIN" : "ON_SCHEDULE",
      delayMinutes: isStorm ? 18 : isWet ? 6 : 0,
      reliability: isStorm ? 0.72 : 0.96
    },
    {
      mode: "BUS_TRANSIT",
      route: "Colaba - Fort Electric Bus",
      status: surfaceState.surfaceWetness === "FLOODED" ? "DIVERTIED_ELEVATED" : "RUNNING",
      delayMinutes: surfaceState.surfaceWetness === "FLOODED" ? 24 : isWet ? 10 : 0,
      reliability: surfaceState.surfaceWetness === "FLOODED" ? 0.58 : 0.90
    },
    {
      mode: "FERRY_WATERWAYS",
      route: "Gateway to Mandwa/Elephanta",
      status: (weather.windSpeed > 35 || isStorm) ? "SUSPENDED_WEATHER" : "OPERATING",
      delayMinutes: (weather.windSpeed > 35 || isStorm) ? 999 : 0,
      reliability: (weather.windSpeed > 35 || isStorm) ? 0.0 : 0.92
    }
  ];

  return {
    hospitality: hotels,
    attractions,
    transport,
    shelterDemandIndex: isStorm ? 88 : isWet ? 54 : 15 // 0 to 100
  };
}

/**
 * Builds the Cascading Effect DAG (Directed Acyclic Graph)
 * Models chain of consequences:
 * [Weather Condition] -> [Road Surface Water] -> [Traffic Congestion & Delay]
 *   -> [Transit Disruption] -> [Outdoor Attraction Inviability] -> [Mitigation: Route Adaptation & Indoor Shift]
 * 
 * @param {Object} weather Normalized weather state
 * @param {Object} surfaceState Corridor surface state
 * @param {Object} travelerImpact Personalized traveler evaluation
 * @returns {Array<Object>} DAG nodes & causality links
 */
export function buildCascadingEffectDAG(weather = {}, surfaceState = {}, travelerImpact = {}) {
  const isDegraded = weather.precipitation > 5 || surfaceState.floodProbability > 30;

  const nodes = [
    {
      id: "node-1-weather",
      label: `Atmospheric Condition: ${weather.condition || "Precipitation"}`,
      details: `${weather.precipitation || 0} mm/h rain, ${weather.windSpeed || 0} km/h wind`,
      severity: weather.precipitation > 30 ? "HIGH" : weather.precipitation > 5 ? "MEDIUM" : "LOW",
      triggered: isDegraded
    },
    {
      id: "node-2-surface",
      label: `Surface State: ${surfaceState.surfaceWetness || "DAMP"}`,
      details: `Water accumulation: ${surfaceState.waterAccumulationMm || 0}mm | Flood risk: ${surfaceState.floodProbability || 0}%`,
      severity: surfaceState.floodProbability > 60 ? "HIGH" : "MEDIUM",
      triggered: surfaceState.surfaceWetness !== "DRY",
      dependsOn: ["node-1-weather"]
    },
    {
      id: "node-3-traffic",
      label: `Corridor Friction & Transit Delay`,
      details: `Traffic slowdown multiplier: ${surfaceState.trafficSlowdownMultiplier || 1.0}x (+12-25 min delay)`,
      severity: surfaceState.trafficSlowdownMultiplier > 1.5 ? "HIGH" : "MEDIUM",
      triggered: surfaceState.trafficSlowdownMultiplier > 1.1,
      dependsOn: ["node-2-surface"]
    },
    {
      id: "node-4-personal",
      label: `Traveler Profile Impact (${travelerImpact.mobilityType})`,
      details: travelerImpact.advisoryMessage || "Accessibility preserved",
      severity: travelerImpact.vulnerabilityLevel === "CRITICAL" ? "CRITICAL" : travelerImpact.vulnerabilityLevel === "HIGH" ? "HIGH" : "LOW",
      triggered: travelerImpact.vulnerabilityLevel !== "LOW",
      dependsOn: ["node-2-surface", "node-3-traffic"]
    },
    {
      id: "node-5-mitigation",
      label: `AI Adaptation Trigger`,
      details: travelerImpact.recommendedAction === "ADAPT" 
        ? "Switch to elevated sheltered route & indoor cultural anchor"
        : "Advisory active, monitoring corridor sensors",
      severity: travelerImpact.recommendedAction === "ADAPT" ? "ACTION_REQUIRED" : "MONITOR",
      triggered: travelerImpact.recommendedAction === "ADAPT",
      dependsOn: ["node-4-personal"]
    }
  ];

  return nodes;
}
