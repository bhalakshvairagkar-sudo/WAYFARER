/**
 * WAYFARER AI - Phase 9 Test Suite
 * 
 * Verifies Reliable What-If Digital Twin (P1 Advanced Capability):
 * 1. A scenario changes only its own results (strict state isolation).
 * 2. The active route remains unchanged unless a separate real-world decision is committed.
 * 3. Reset restores the baseline comparison.
 * 4. Scenario outputs are reproducible for identical inputs.
 * 5. Unsupported scenarios are rejected or clearly marked unavailable.
 * 6. Scenario object is linked to baseline journey version with explicit assumptions, data sources, and uncertainty.
 * 7. Simulation events NEVER enter the production community incident feed.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  SUPPORTED_SCENARIO_TYPES,
  runWhatIfSimulation,
  resetSimulationState,
  PREBAKED_SCENARIOS
} from '../server/engine/digitalTwinEngine.js';
import { evidenceStore } from '../server/engine/evidenceFusionEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 9 — Reliable What-If Digital Twin Test Suite', () => {
  let baselineJourney;

  beforeEach(() => {
    // Clear evidence store reports to ensure production community feed starts clean
    evidenceStore.clusters.clear();
    evidenceStore.reports = [];

    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    baselineJourney = {
      id: 'journey-phase9-baseline',
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments,
      version: 2,
      lifecycleState: 'ACTIVE',
      eventHistory: []
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. A scenario changes only its own results
  // ─────────────────────────────────────────────────────────────
  it('1. A scenario changes only its own results (strict state isolation)', async () => {
    const copyBefore = JSON.parse(JSON.stringify(baselineJourney));

    const scenarioRequest = {
      scenarioId: 'scen-monsoon-75mm',
      scenarioType: 'RAINFALL',
      name: 'Severe Monsoon Torrential Downpour',
      parameters: {
        rainfallMm: 75,
        stormDurationHours: 3.0,
        floodProbability: 90
      }
    };

    const simResult = await runWhatIfSimulation(baselineJourney, scenarioRequest);

    assert.strictEqual(simResult.success, true);
    assert.strictEqual(simResult.simulationMode, true);
    assert.strictEqual(simResult.isSimulation, true);
    assert.ok(simResult.scenario, 'Must produce a dedicated scenario object');
    assert.strictEqual(simResult.scenario.scenarioType, 'RAINFALL');

    // Scenario outputs contain hypothetical simulated degradation
    assert.ok(simResult.simulatedTwin.predictedImpacts.etaDelayMinutes > 0);
    assert.ok(simResult.simulatedTwin.surfaceState.floodProbability >= 85);

    // CRITICAL: The baselineJourney object passed into the call was NOT mutated!
    assert.deepStrictEqual(baselineJourney.trip, copyBefore.trip);
    assert.deepStrictEqual(baselineJourney.traveler, copyBefore.traveler);
    assert.strictEqual(baselineJourney.version, copyBefore.version);
    assert.strictEqual(baselineJourney.segments.length, copyBefore.segments.length);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. The active route remains unchanged unless committed
  // ─────────────────────────────────────────────────────────────
  it('2. The active route remains unchanged unless a separate real-world decision is committed', async () => {
    const s3Before = baselineJourney.segments.find(s => s.id === 'S3');
    const originalRecommendedRoute = s3Before.recommendedRouteId; // 'B'

    // Hypothetical road closure on Route B
    const closureScenario = {
      scenarioId: 'scen-closure-sim-s3',
      scenarioType: 'ROAD_CLOSURE',
      name: 'Hypothetical Mandovi Ramp Bridge Closure',
      parameters: {
        segmentId: 'S3',
        closedRouteId: 'B',
        closureReason: 'Simulated bridge engineering overhaul'
      }
    };

    const simResult = await runWhatIfSimulation(baselineJourney, closureScenario);

    assert.strictEqual(simResult.success, true);
    assert.strictEqual(simResult.scenario.scenarioType, 'ROAD_CLOSURE');

    // In simulation mode, the scenario comparison recommends Route C
    assert.strictEqual(simResult.comparison.scenario.recommendedRouteId, 'C');
    assert.strictEqual(simResult.comparison.deltas.routeChanged, true);

    // BUT the live baseline journey's active route remains strictly Route B!
    const s3After = baselineJourney.segments.find(s => s.id === 'S3');
    assert.strictEqual(
      s3After.recommendedRouteId,
      originalRecommendedRoute,
      'Active route must remain completely unmutated by What-If simulation'
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Reset restores the baseline comparison
  // ─────────────────────────────────────────────────────────────
  it('3. Reset restores the baseline comparison', () => {
    const resetResult = resetSimulationState(baselineJourney);

    assert.strictEqual(resetResult.success, true);
    assert.strictEqual(resetResult.status, 'BASELINE_RESTORED');
    assert.strictEqual(resetResult.simulationMode, false);
    assert.strictEqual(resetResult.isSimulation, false);
    assert.strictEqual(resetResult.activeScenario, null);
    assert.strictEqual(resetResult.baselineVersion, 2);
    assert.deepStrictEqual(resetResult.baselineJourney.trip, baselineJourney.trip);
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Scenario outputs are reproducible for identical inputs
  // ─────────────────────────────────────────────────────────────
  it('4. Scenario outputs are reproducible for identical inputs', async () => {
    const params = {
      scenarioType: 'RAINFALL',
      parameters: {
        rainfallMm: 50,
        stormDurationHours: 2.0,
        temperatureC: 26,
        floodProbability: 75
      }
    };

    const run1 = await runWhatIfSimulation(baselineJourney, params);
    const run2 = await runWhatIfSimulation(baselineJourney, params);

    assert.strictEqual(run1.success, true);
    assert.strictEqual(run2.success, true);

    // Deterministic match across metrics
    assert.strictEqual(
      run1.simulatedTwin.journeyHealth.overall,
      run2.simulatedTwin.journeyHealth.overall,
      'Overall simulated health must match deterministically'
    );
    assert.strictEqual(
      run1.comparison.deltas.etaDeltaMinutes,
      run2.comparison.deltas.etaDeltaMinutes,
      'ETA delay delta must be 100% reproducible'
    );
    assert.strictEqual(
      run1.comparison.scenario.recommendedRouteId,
      run2.comparison.scenario.recommendedRouteId,
      'Recommended scenario route must be identical'
    );
    assert.strictEqual(
      run1.simulatedTwin.surfaceState.floodProbability,
      run2.simulatedTwin.surfaceState.floodProbability,
      'Flood probability must be identical'
    );
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Unsupported scenarios are rejected or clearly marked unavailable
  // ─────────────────────────────────────────────────────────────
  it('5. Unsupported scenarios are rejected or clearly marked unavailable', async () => {
    const unsupportedScenario = {
      scenarioType: 'AVALANCHE_GLACIER_SURGE',
      parameters: {
        iceDepthMeters: 4.5
      }
    };

    const result = await runWhatIfSimulation(baselineJourney, unsupportedScenario);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'UNSUPPORTED_SCENARIO');
    assert.strictEqual(result.code, 'UNSUPPORTED_SCENARIO_TYPE');
    assert.strictEqual(result.isSupported, false);
    assert.ok(result.message.includes('AVALANCHE_GLACIER_SURGE'));
    assert.deepStrictEqual(result.supportedTypes, SUPPORTED_SCENARIO_TYPES);
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Scenario object is linked to baseline journey version with metadata
  // ─────────────────────────────────────────────────────────────
  it('6. Scenario object is linked to baseline journey version with explicit assumptions, data sources, and uncertainty', async () => {
    baselineJourney.version = 4;

    const request = {
      scenarioId: 'scen-crowd-heritage',
      scenarioType: 'CROWD_SURGE',
      name: 'Heritage District Festival Crowd',
      parameters: {
        segmentId: 'S2',
        crowdMultiplier: 2.5
      }
    };

    const result = await runWhatIfSimulation(baselineJourney, request);

    assert.strictEqual(result.success, true);
    assert.ok(result.scenario);
    assert.strictEqual(result.scenario.baselineVersion, 4, 'Must link to baseline journey version');
    assert.strictEqual(result.scenario.baselineJourneyId, 'journey-phase9-baseline');

    // Assumptions, Data Sources, and Uncertainty
    assert.ok(Array.isArray(result.scenario.assumptions));
    assert.ok(result.scenario.assumptions.length >= 2);
    assert.ok(Array.isArray(result.scenario.dataSources));
    assert.ok(result.scenario.dataSources.some(d => d.includes('Nugen')));
    assert.ok(result.scenario.uncertainty);
    assert.ok(['LOW', 'MODERATE', 'HIGH'].includes(result.scenario.uncertainty.level));
    assert.ok(result.scenario.uncertainty.confidenceInterval);

    // Comparison breakdown
    assert.ok(result.comparison.baseline);
    assert.ok(result.comparison.scenario);
    assert.ok(result.comparison.deltas);
    assert.ok(Array.isArray(result.comparison.eligibleAlternatives));
    assert.ok(Array.isArray(result.comparison.eliminatedAlternatives));
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Simulation events NEVER enter production community incident feed
  // ─────────────────────────────────────────────────────────────
  it('7. Simulation events NEVER enter the production community incident feed', async () => {
    const initialReportCount = evidenceStore.reports.length;
    const initialClusterCount = evidenceStore.clusters.size;

    // Run heavy simulation
    await runWhatIfSimulation(baselineJourney, {
      scenarioType: 'RAINFALL',
      parameters: { rainfallMm: 85, stormDurationHours: 4 }
    });

    await runWhatIfSimulation(baselineJourney, {
      scenarioType: 'ROAD_CLOSURE',
      parameters: { segmentId: 'S3', closedRouteId: 'B' }
    });

    // Check evidenceStore remains pristine
    assert.strictEqual(
      evidenceStore.reports.length,
      initialReportCount,
      'Production reports must not be polluted with simulation events'
    );
    assert.strictEqual(
      evidenceStore.clusters.size,
      initialClusterCount,
      'Production clusters must not be polluted with simulation events'
    );
  });
});
