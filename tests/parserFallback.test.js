import { describe, it } from "node:test";
import assert from "node:assert";
import { fallbackJourneyParser } from "../server/engine/journeyParser.js";

describe("Fallback Parser Tests", () => {
  it("accurately extracts constraints and profile from master prompt", () => {
    const prompt = "I'm traveling alone from Pune to Goa for 3 days. I'm using a wheelchair, cannot use stairs, prefer safer routes, dislike crowded places, and can take a longer route if it is more accessible. I want to visit Fort Aguada, a beach and a local market.";
    
    const parsed = fallbackJourneyParser(prompt);
    
    assert.strictEqual(parsed.trip.origin, "Pune");
    assert.strictEqual(parsed.trip.destination, "Goa");
    assert.strictEqual(parsed.trip.durationDays, 3);
    assert.strictEqual(parsed.traveler.mobility, "wheelchair");
    assert.strictEqual(parsed.traveler.stairsAllowed, false);
    assert.strictEqual(parsed.traveler.rampsPreferred, true);
    assert.strictEqual(parsed.traveler.crowdTolerance, "low");
    assert.strictEqual(parsed.traveler.safetyPriority, "high");
    assert.strictEqual(parsed.traveler.longerRouteAccepted, true);
    assert.strictEqual(parsed.source, "FALLBACK_PARSER");
  });

  it("handles empty or sparse inputs gracefully", () => {
    const parsed = fallbackJourneyParser("");
    assert.ok(parsed.trip);
    assert.ok(parsed.traveler);
    assert.ok(parsed.stops.length >= 2);
    assert.strictEqual(parsed.source, "FALLBACK_PARSER");
  });
});
