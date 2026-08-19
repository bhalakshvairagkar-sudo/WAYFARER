/**
 * WAYFARER AI - Natural Language Journey Parser
 * Converts unstructured traveler descriptions into structured Trip, Traveler, and Stops JSON.
 * Supports Google Gemini API with honest fallback detection.
 */

import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS } from "../data/defaultJourney.js";
import { deriveTravelerWeights } from "./scoringEngine.js";

const GEMINI_SYSTEM_PROMPT = `
You are WAYFARER's Journey Understanding Engine.
Your task is to parse a natural-language journey description into a structured JSON object.

Extract:
1. "trip": origin, destination, startDate (YYYY-MM-DD), endDate (YYYY-MM-DD), durationDays, travelerCount.
2. "traveler": name, mobility ("wheelchair" | "cane" | "elderly" | "standard"), stairsAllowed (boolean), rampsPreferred (boolean), crowdTolerance ("low" | "medium" | "high"), safetyPriority ("high" | "medium" | "low"), walkingTolerance ("low" | "medium" | "high"), longerRouteAccepted (boolean).
3. "stops": array of chronological stops with day (number 1..N), name, type ("stay" | "attraction" | "experience" | "transport"), city, description.
4. "constraints": array of string constraints extracted from traveler's prompt.

You MUST reply ONLY with valid JSON conforming to this schema:
{
  "trip": {
    "origin": "string",
    "destination": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "durationDays": number,
    "travelerCount": number
  },
  "traveler": {
    "name": "string",
    "mobility": "string",
    "stairsAllowed": boolean,
    "rampsPreferred": boolean,
    "crowdTolerance": "low" | "medium" | "high",
    "safetyPriority": "high" | "medium" | "low",
    "walkingTolerance": "low" | "medium" | "high",
    "longerRouteAccepted": boolean,
    "summary": "string"
  },
  "stops": [
    {
      "day": number,
      "name": "string",
      "type": "stay" | "attraction" | "experience" | "transport",
      "city": "string",
      "description": "string"
    }
  ],
  "constraints": ["string"]
}
`;

function toTitleCase(str = "") {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Deterministic NLP Rule-Based Fallback Parser
 * Used when offline, API key missing, or on LLM rate-limit/error.
 */
export function fallbackJourneyParser(promptText = "", formData = {}) {
  const text = (promptText || "").toLowerCase();

  // Extract duration
  let durationDays = Number(formData.durationDays) || 3;
  const daysMatch = text.match(/(\d+)\s*(?:day|days)/);
  if (daysMatch) durationDays = parseInt(daysMatch[1], 10);

  // Extract origin & destination
  let origin = formData.origin || "Pune Railway Station";
  let destination = formData.destination || "Goa";

  const routeMatch = text.match(/from\s+([a-zA-Z\s]+?)\s+to\s+([a-zA-Z\s]+?)(?:\s+for|\.|\,|$)/i);
  if (routeMatch) {
    origin = toTitleCase(routeMatch[1].trim());
    destination = toTitleCase(routeMatch[2].trim());
  }

  // Extract traveler accessibility & preferences
  const isWheelchair = text.includes("wheelchair") || text.includes("power chair") || text.includes("mobility scooter");
  const avoidStairs = text.includes("cannot use stairs") || text.includes("avoid stairs") || text.includes("no stairs") || isWheelchair;
  const rampsPreferred = text.includes("ramp") || text.includes("ramps") || isWheelchair;
  const lowCrowd = text.includes("dislike crowd") || text.includes("avoid crowd") || text.includes("low crowd") || text.includes("quiet") || text.includes("dislike crowded");
  const highSafety = text.includes("safer") || text.includes("safety") || text.includes("secure") || text.includes("alone");
  const longerRouteAccepted = text.includes("longer route") || text.includes("longer distance") || text.includes("can take a longer");

  const traveler = {
    name: formData.travelerName || "Aditi",
    mobility: isWheelchair ? "wheelchair" : (text.includes("elderly") ? "elderly" : "standard"),
    stairsAllowed: !avoidStairs,
    rampsPreferred: rampsPreferred,
    crowdTolerance: lowCrowd ? "low" : "medium",
    safetyPriority: highSafety ? "high" : "medium",
    walkingTolerance: isWheelchair ? "medium" : "high",
    longerRouteAccepted: longerRouteAccepted,
    summary: `${isWheelchair ? "Wheelchair user" : "Traveler"}, ${avoidStairs ? "step-free paths required" : "standard paths"}, ${lowCrowd ? "low-crowd preference" : "standard crowd"}, ${highSafety ? "high safety priority" : "standard safety"}.`
  };

  const trip = {
    origin: origin,
    destination: destination,
    startDate: formData.startDate || "2026-09-10",
    endDate: formData.endDate || "2026-09-12",
    durationDays: durationDays,
    travelerCount: Number(formData.travelerCount) || 1
  };

  // Stops synthesis
  let stops = DEFAULT_STOPS;

  // Custom user stops override if provided
  if (formData.customStops && Array.isArray(formData.customStops) && formData.customStops.length > 0) {
    stops = formData.customStops.map((s, idx) => ({
      id: `stop-${idx + 1}`,
      day: s.day || Math.min(durationDays, Math.floor(idx / 2) + 1),
      name: s.name,
      type: s.type || "attraction",
      city: destination,
      lat: s.lat || 15.4989 + (idx * 0.015),
      lng: s.lng || 73.8278 + (idx * 0.01),
      arrivalTime: s.arrivalTime || "12:00",
      departureTime: s.departureTime || "14:00",
      description: s.description || `Destination point: ${s.name}`
    }));
  }

  const constraints = [];
  if (isWheelchair) constraints.push("Requires continuous step-free wheelchair access");
  if (avoidStairs) constraints.push("Avoid stairs and multi-level stepped transitions");
  if (rampsPreferred) constraints.push("Prioritize 1:12 or gentler ramps and elevator access");
  if (lowCrowd) constraints.push("Avoid peak congestion corridors & high crowd density");
  if (highSafety) constraints.push("Prioritize well-lit, actively monitored safe corridors");
  if (longerRouteAccepted) constraints.push("Accepts longer transit times for enhanced accessibility");

  const weights = deriveTravelerWeights(traveler);

  return {
    trip,
    traveler,
    stops,
    constraints,
    weights,
    source: "FALLBACK_PARSER",
    model: "Deterministic Rule-Based Parser (Offline Resilience)"
  };
}

/**
 * Main parser calling Gemini with Fallback
 */
export async function parseJourney(promptText = "", formData = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    // Honest offline fallback
    return fallbackJourneyParser(promptText, formData);
  }

  try {
    const combinedPrompt = `
User natural language journey input:
"${promptText}"

User form fields (if any):
${JSON.stringify(formData, null, 2)}
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: GEMINI_SYSTEM_PROMPT },
              { text: combinedPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      console.warn(`[Gemini API] Request failed with status ${response.status}. Using deterministic fallback.`);
      return fallbackJourneyParser(promptText, formData);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return fallbackJourneyParser(promptText, formData);
    }

    const parsedJson = JSON.parse(candidateText);

    // Validate structured fields
    if (!parsedJson.trip || !parsedJson.traveler || !Array.isArray(parsedJson.stops) || parsedJson.stops.length === 0) {
      return fallbackJourneyParser(promptText, formData);
    }

    // Merge coordinates if available in default database
    const mappedStops = parsedJson.stops.map((stop, idx) => {
      const matchDefault = DEFAULT_STOPS.find(ds => ds.name.toLowerCase().includes(stop.name.toLowerCase()) || stop.name.toLowerCase().includes(ds.name.toLowerCase()));
      return {
        id: `stop-${idx + 1}`,
        day: stop.day || 1,
        name: stop.name,
        type: stop.type || "attraction",
        city: stop.city || parsedJson.trip.destination || "Goa",
        lat: matchDefault ? matchDefault.lat : 15.4989 + (idx * 0.015),
        lng: matchDefault ? matchDefault.lng : 73.8278 + (idx * 0.01),
        arrivalTime: matchDefault?.arrivalTime || `${10 + (idx * 2)}:00`,
        departureTime: matchDefault?.departureTime || `${12 + (idx * 2)}:00`,
        description: stop.description || `Stop ${idx + 1}`
      };
    });

    const weights = deriveTravelerWeights(parsedJson.traveler);

    return {
      trip: parsedJson.trip,
      traveler: parsedJson.traveler,
      stops: mappedStops.length >= 2 ? mappedStops : DEFAULT_STOPS,
      constraints: parsedJson.constraints || [
        "Avoid stairs",
        "Ramp preferred",
        "Low crowd preference",
        "High safety priority"
      ],
      weights,
      source: "LIVE_GEMINI",
      model: "Gemini 1.5 Flash (Live API)"
    };
  } catch (err) {
    console.error("[JourneyParser Error]:", err.message);
    return fallbackJourneyParser(promptText, formData);
  }
}
