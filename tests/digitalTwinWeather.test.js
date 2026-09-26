import { describe, it } from "node:test";
import assert from "node:assert";
import {
  classifyRainIntensity,
  normalizeWeatherData,
  generateSimulatedWeather
} from "../server/engine/weatherProvider.js";
import {
  normalizeSocialSignal,
  computeSignalTrustShield,
  getSocialSignals
} from "../server/engine/socialSignalProvider.js";
import {
  computeCorridorSurfaceState,
  evaluateTravelerWeatherImpact,
  modelHospitalityAndAttractionImpacts,
  buildCascadingEffectDAG
} from "../server/engine/weatherImpactEngine.js";
import {
  buildDigitalTwinState,
  runWhatIfSimulation,
  PREBAKED_SCENARIOS
} from "../server/engine/digitalTwinEngine.js";
import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS } from "../server/data/defaultJourney.js";
import { segmentJourney } from "../server/engine/journeySegmenter.js";

describe("Weather-Driven AI Digital Twin Test Suite (Midnight Task)", () => {
  const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
  const baselineJourney = {
    trip: DEFAULT_TRIP,
    traveler: DEFAULT_TRAVELER,
    stops: DEFAULT_STOPS,
    segments: initialSegments
  };

  // ─── 1. WEATHER PROVIDER & NORMALIZATION ───
  describe("1. Weather Provider & Atmospheric Normalization", () => {
    it("accurately classifies precipitation into standard meteorological intensity bands", () => {
      assert.strictEqual(classifyRainIntensity(0.0), "NONE");
      assert.strictEqual(classifyRainIntensity(0.05), "NONE");
      assert.strictEqual(classifyRainIntensity(1.5), "LIGHT");
      assert.strictEqual(classifyRainIntensity(5.0), "MODERATE");
      assert.strictEqual(classifyRainIntensity(32.0), "HEAVY");
      assert.strictEqual(classifyRainIntensity(75.0), "TORRENTIAL");
    });

    it("normalizes raw meteorological payload into canonical schema with LIVE provenance", () => {
      const rawPayload = {
        current: {
          time: "2026-09-27T03:00:00Z",
          temperature_2m: 29.4,
          apparent_temperature: 33.2,
          relative_humidity_2m: 82,
          precipitation: 5.0,
          weather_code: 63, // Moderate rain
          wind_speed_10m: 16.2,
          wind_direction_10m: 240,
          visibility: 7500
        }
      };

      const normalized = normalizeWeatherData(rawPayload, "LIVE");

      assert.strictEqual(normalized.provenance, "LIVE");
      assert.strictEqual(normalized.weatherCode, 63);
      assert.strictEqual(normalized.condition, "Moderate rain");
      assert.strictEqual(normalized.rainIntensity, "MODERATE");
      assert.strictEqual(normalized.isRaining, true);
      assert.strictEqual(normalized.temperature, 29.4);
      assert.strictEqual(normalized.humidity, 82);
      assert.strictEqual(normalized.visibilityKm, 7.5);
      assert.ok(normalized.source.includes("Open-Meteo"));
    });

    it("generates deterministic simulated weather with SIMULATED provenance", () => {
      const sim = generateSimulatedWeather({
        rainfallMm: 65,
        temperatureC: 24,
        stormDurationHours: 2.5,
        scenarioName: "Torrential Cloudburst"
      });

      assert.strictEqual(sim.provenance, "SIMULATED");
      assert.strictEqual(sim.rainIntensity, "TORRENTIAL");
      assert.strictEqual(sim.temperature, 24);
      assert.strictEqual(sim.precipitation, 65);
      assert.strictEqual(sim.scenarioName, "Torrential Cloudburst");
      assert.ok(sim.source.includes("Digital Twin"));
    });
  });

  // ─── 2. SOCIAL SIGNAL INGESTION & TRUSTSHIELD 3-TIER MODEL ───
  describe("2. Social Signal Ingestion & Evidence Fusion", () => {
    it("normalizes raw civic and crowdsourced signals", () => {
      const signal = normalizeSocialSignal({
        location: { name: "Marine Drive", lat: 18.943, lng: 72.823 },
        topic: "waterlogging",
        eventType: "FLOOD_RISK",
        sourceType: "MUMBAI_TRAFFIC_POLICE",
        text: "Water on road",
        confidence: 0.95
      });

      assert.ok(signal.id.startsWith("sig-"));
      assert.strictEqual(signal.sourceType, "MUMBAI_TRAFFIC_POLICE");
      assert.strictEqual(signal.eventType, "FLOOD_RISK");
      assert.strictEqual(signal.confidence, 0.95);
    });

    it("evaluates TrustShield 3-tier confidence: Evidence -> Impact -> Action", () => {
      // Signal in direct proximity to origin stop (Pune Railway Station: lat 18.5284, lng 73.8744)
      const signal = normalizeSocialSignal({
        timestamp: new Date().toISOString(),
        location: { name: "Station Approach Ramp", lat: 18.5285, lng: 73.8745 },
        topic: "waterlogging",
        eventType: "FLOOD_RISK",
        sourceType: "MUMBAI_TRAFFIC_POLICE",
        confidence: 0.96,
        verified: true,
        upvotes: 180
      });

      const trust = computeSignalTrustShield(signal, baselineJourney);

      assert.ok(trust.evidenceConfidence >= 0.85, `Evidence confidence was ${trust.evidenceConfidence}`);
      assert.ok(trust.impactConfidence >= 0.70, `Impact confidence was ${trust.impactConfidence}`);
      assert.ok(trust.actionConfidence >= 0.75, `Action confidence was ${trust.actionConfidence}`);
      assert.strictEqual(trust.recommendation, "ADAPT");
    });

    it("retrieves curated civic signals in proximity to journey stops", () => {
      const signals = getSocialSignals({ lat: 18.922, lng: 72.834, radiusMeters: 5000 }, baselineJourney);
      assert.ok(signals.length >= 3);
      assert.ok(signals.every(s => s.trustShield != null));
    });
  });

  // ─── 3. WEATHER IMPACT ENGINE ───
  describe("3. Weather Impact Engine & Multi-Entity Propagation", () => {
    it("models corridor surface waterlogging and flood probability", () => {
      const rainWeather = { precipitation: 25, windSpeed: 20, isRaining: true };
      const surface = computeCorridorSurfaceState(rainWeather, "S3", 1.0);

      assert.strictEqual(surface.surfaceWetness, "WATERLOGGED");
      assert.ok(surface.waterAccumulationMm >= 10);
      assert.ok(surface.floodProbability >= 45, `Flood risk was ${surface.floodProbability}`);
      assert.ok(surface.roadFrictionFactor < 0.90);
      assert.ok(surface.trafficSlowdownMultiplier >= 1.5);

      // Verify that torrential downpour transitions to FLOODED
      const extremeWeather = { precipitation: 55, windSpeed: 35, isRaining: true };
      const floodedSurface = computeCorridorSurfaceState(extremeWeather, "S3", 2.0);
      assert.strictEqual(floodedSurface.surfaceWetness, "FLOODED");
    });

    it("evaluates personalized vulnerability: CRITICAL & ADAPT for wheelchair user in flooded corridor", () => {
      const wheelchairTraveler = { ...DEFAULT_TRAVELER, mobility: "wheelchair" };
      const floodedSurface = { surfaceWetness: "FLOODED", floodProbability: 85, waterAccumulationMm: 40, segmentId: "S3" };
      const rainWeather = { precipitation: 65, rainIntensity: "TORRENTIAL", isRaining: true };

      const impact = evaluateTravelerWeatherImpact(wheelchairTraveler, floodedSurface, rainWeather);

      assert.strictEqual(impact.vulnerabilityLevel, "CRITICAL");
      assert.strictEqual(impact.recommendedAction, "ADAPT");
      assert.ok(impact.accessibilityImpact >= 0.80);
      assert.ok(impact.advisoryMessage.includes("CRITICAL HAZARD"));
    });

    it("evaluates personalized vulnerability: LOW_MODERATE & WARN for standard traveler", () => {
      const standardTraveler = { name: "Alex", mobility: "standard" };
      const wetSurface = { surfaceWetness: "WATERLOGGED", floodProbability: 45, waterAccumulationMm: 16 };
      const rainWeather = { precipitation: 12, rainIntensity: "MODERATE", isRaining: true };

      const impact = evaluateTravelerWeatherImpact(standardTraveler, wetSurface, rainWeather);

      assert.strictEqual(impact.vulnerabilityLevel, "LOW_MODERATE");
      assert.strictEqual(impact.recommendedAction, "WARN");
    });

    it("models hospitality and attraction shifts during storm", () => {
      const stormWeather = { rainIntensity: "TORRENTIAL", isRaining: true, windSpeed: 42, precipitation: 60 };
      const surface = { surfaceWetness: "FLOODED" };

      const shifts = modelHospitalityAndAttractionImpacts(stormWeather, surface);

      assert.ok(shifts.shelterDemandIndex >= 75);
      const outdoorGateway = shifts.attractions.find(a => a.id === "attr-gateway");
      assert.strictEqual(outdoorGateway.status, "SUSPENDED_ADVISORY");
      assert.ok(outdoorGateway.crowdShiftPct <= -70);

      const indoorMuseum = shifts.attractions.find(a => a.id === "attr-csmvs-museum");
      assert.strictEqual(indoorMuseum.status, "OPEN_SHELTERED");
      assert.ok(indoorMuseum.crowdShiftPct >= 50);

      const ferry = shifts.transport.find(t => t.mode === "FERRY_WATERWAYS");
      assert.strictEqual(ferry.status, "SUSPENDED_WEATHER");
    });

    it("builds the cascading DAG chain linking weather to AI adaptation", () => {
      const weather = { condition: "Thunderstorm", precipitation: 55, windSpeed: 38 };
      const surface = { surfaceWetness: "FLOODED", waterAccumulationMm: 35, floodProbability: 80, trafficSlowdownMultiplier: 2.1 };
      const travelerImpact = { mobilityType: "Wheelchair User", vulnerabilityLevel: "CRITICAL", recommendedAction: "ADAPT", advisoryMessage: "Submerged curbs" };

      const dag = buildCascadingEffectDAG(weather, surface, travelerImpact);

      assert.strictEqual(dag.length, 5);
      assert.strictEqual(dag[0].triggered, true); // Atmospheric condition
      assert.strictEqual(dag[1].triggered, true); // Surface state
      assert.strictEqual(dag[2].triggered, true); // Traffic friction
      assert.strictEqual(dag[3].triggered, true); // Personalized impact
      assert.strictEqual(dag[4].triggered, true); // AI Adaptation Trigger
      assert.strictEqual(dag[4].severity, "ACTION_REQUIRED");
    });
  });

  // ─── 4. DIGITAL TWIN ENGINE & STRICT ISOLATION ───
  describe("4. Digital Twin Engine & Strict Isolation Guarantees", () => {
    it("builds authoritative live Digital Twin state snapshot", async () => {
      const liveTwin = await buildDigitalTwinState({
        journeyState: baselineJourney,
        simulationMode: false
      });

      assert.ok(liveTwin.twinId.startsWith("twin-live-"));
      assert.strictEqual(liveTwin.simulationMode, false);
      assert.ok(["LIVE", "SIMULATED"].includes(liveTwin.provenance));
      assert.ok(liveTwin.weatherState != null);
      assert.ok(liveTwin.surfaceState != null);
      assert.ok(liveTwin.travelers.length > 0);
      assert.ok(liveTwin.routes.length > 0);
      assert.ok(liveTwin.cascadingEffects.length > 0);
      assert.ok(liveTwin.journeyHealth.overall > 0);
    });

    it("runs What-If simulation and demonstrates signature 91 -> 57 -> 86 health story", async () => {
      const whatIfParams = {
        rainfallMm: 65,
        stormDurationHours: 2.5,
        floodProbability: 88,
        temperatureC: 25
      };

      const result = await runWhatIfSimulation(baselineJourney, whatIfParams);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.simulationMode, true);
      assert.strictEqual(result.simulatedTwin.simulationMode, true);
      assert.strictEqual(result.simulatedTwin.provenance, "SIMULATED");

      // Verify health degradation during unmitigated simulated storm (~57)
      assert.ok(
        result.simulatedTwin.journeyHealth.overall <= 62,
        `Expected simulated health degradation <= 62, got ${result.simulatedTwin.journeyHealth.overall}`
      );

      // Verify recovery upon AI route adaptation (~86)
      assert.ok(
        result.adaptedHealth.overall >= 84,
        `Expected adapted recovered health >= 84, got ${result.adaptedHealth.overall}`
      );

      assert.ok(result.comparison.metrics.length >= 4);
      assert.ok(result.comparison.counterfactualExplanation.length > 20);
    });

    it("STRICT ISOLATION GUARANTEE: What-If simulation NEVER mutates the active journey state or routes", async () => {
      // Deep freeze / snapshot original baseline
      const originalSerialized = JSON.stringify(baselineJourney);

      const whatIfParams = {
        rainfallMm: 90,
        stormDurationHours: 4,
        floodProbability: 95
      };

      // Run multiple what-if simulations
      await runWhatIfSimulation(baselineJourney, whatIfParams);
      await runWhatIfSimulation(baselineJourney, { rainfallMm: 0, floodProbability: 0 });

      // Compare current baseline to original snapshot
      const currentSerialized = JSON.stringify(baselineJourney);
      assert.strictEqual(
        currentSerialized,
        originalSerialized,
        "CRITICAL BREACH: Baseline journey state was mutated by What-If simulation!"
      );
    });

    it("provides canonical pre-baked scenarios including Monsoon Cloudburst and Heatwave", () => {
      assert.ok(PREBAKED_SCENARIOS.length >= 4);
      const cloudburst = PREBAKED_SCENARIOS.find(s => s.id === "scenario-monsoon-cloudburst");
      assert.ok(cloudburst != null);
      assert.strictEqual(cloudburst.riskLevel, "CRITICAL");
      assert.strictEqual(cloudburst.params.rainfallMm, 65);
    });
  });
});
