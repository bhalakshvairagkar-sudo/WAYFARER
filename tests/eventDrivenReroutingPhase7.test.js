/**
 * WAYFARER AI - Phase 7 Test Suite
 * 
 * Verifies Event-Driven Automatic Rerouting (P0 Integration Milestone):
 * 1. A qualifying verified incident triggers reevaluation.
 * 2. Duplicate events do not cause repeated route transitions.
 * 3. An incident on a nearby but unrelated road does not cause an unjustified reroute.
 * 4. Invalid alternatives are rejected.
 * 5. A delayed response cannot overwrite a newer accepted route.
 * 6. A successful route transition is recorded in journey history.
 * 7. Failure preserves the last valid state and communicates any safety warning.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  ROUTE_LIFECYCLE,
  processEventAndReroute,
  isIncidentOnRouteCorridor,
  isDuplicateEvent,
  checkConcurrency,
  resetDeduplicationCache
} from '../server/engine/reroutingEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 7 — Event-Driven Automatic Rerouting Test Suite', () => {
  let baselineJourney;

  beforeEach(() => {
    resetDeduplicationCache();
    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    baselineJourney = {
      id: 'journey-phase7-test',
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments,
      version: 1,
      lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
      eventHistory: [],
      routeTransitions: []
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Qualifying verified incident triggers reevaluation
  // ─────────────────────────────────────────────────────────────
  it('1. A qualifying verified incident triggers reevaluation and transitions lifecycle to ACCEPTED', async () => {
    const s3Initial = baselineJourney.segments.find(s => s.id === 'S3');
    assert.strictEqual(s3Initial.recommendedRouteId, 'B', 'Baseline S3 recommendation is Route B');

    const verifiedClosureEvent = {
      id: 'evt-verified-closure-s3',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      verificationStatus: 'VERIFIED',
      reason: 'Verified arterial watermain rupture'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event: verifiedClosureEvent
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.recalculated, true);
    assert.strictEqual(result.lifecycleState, ROUTE_LIFECYCLE.ACCEPTED, 'Lifecycle must be ACCEPTED');
    assert.strictEqual(result.routeChanged, true, 'Route must change');
    assert.strictEqual(result.previousRecommendedId, 'B');
    assert.strictEqual(result.newRecommendedRoute.id, 'C', 'Route C must become new recommended route');
    assert.strictEqual(result.version, 2, 'Journey version must increment on committed route transition');

    // S3 segment state in updated segments
    const s3After = result.segments.find(s => s.id === 'S3');
    assert.strictEqual(s3After.recommendedRouteId, 'C');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Duplicate events do not cause repeated route transitions
  // ─────────────────────────────────────────────────────────────
  it('2. Duplicate events do not cause repeated route transitions (idempotency)', async () => {
    const event = {
      id: 'evt-idempotent-test-101',
      type: 'ACCESSIBILITY_DEGRADATION',
      segmentId: 'S3',
      routeId: 'B',
      severity: 1.0,
      isVerified: true,
      reason: 'Elevator outage at terminal'
    };

    // First application
    const firstResult = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(firstResult.success, true);
    assert.strictEqual(firstResult.recalculated, true);
    assert.strictEqual(firstResult.version, 2);

    // Second application with the same event ID
    const duplicateResult = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(duplicateResult.success, true);
    assert.strictEqual(duplicateResult.isDuplicate, true, 'Must be flagged as duplicate');
    assert.strictEqual(duplicateResult.recalculated, false, 'Must NOT recalculate routes');
    assert.strictEqual(duplicateResult.version, 2, 'Version must NOT increment on duplicate');
    assert.strictEqual(baselineJourney.routeTransitions.length, 1, 'Transitions log must not duplicate entry');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. An incident on a nearby but unrelated road does not cause an unjustified reroute
  // ─────────────────────────────────────────────────────────────
  it('3. An incident on a nearby but unrelated road does not cause an unjustified reroute', async () => {
    // S2 active route runs along Panjim Hotel (15.4989, 73.8278) -> Panjim Promenade (15.4975, 73.8340)
    const s2Before = baselineJourney.segments.find(s => s.id === 'S2');
    const prevRecId = s2Before.recommendedRouteId;

    // Incident reported at (15.5200, 73.8100), >2.5 km away on unrelated northern highway across the river
    const unrelatedRoadIncident = {
      id: 'evt-unrelated-road-1',
      type: 'ROAD_CLOSURE',
      segmentId: 'S2',
      coordinates: { lat: 15.5200, lng: 73.8100 },
      corridorToleranceMeters: 250,
      isVerified: true,
      reason: 'Construction blockage on northern highway'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event: unrelatedRoadIncident
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, 'OUTSIDE_CORRIDOR');
    assert.strictEqual(result.recalculated, false, 'Must NOT trigger route re-evaluation');
    assert.strictEqual(result.lifecycleState, ROUTE_LIFECYCLE.ACTIVE);

    const s2After = baselineJourney.segments.find(s => s.id === 'S2');
    assert.strictEqual(s2After.recommendedRouteId, prevRecId, 'Active route must remain completely unmutated');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Invalid alternatives are rejected
  // ─────────────────────────────────────────────────────────────
  it('4. Invalid alternatives are rejected due to mandatory accessibility constraints', async () => {
    // Wheelchair traveler prohibits stairs
    const traveler = {
      name: 'Aditi',
      mobility: 'wheelchair',
      stairsAllowed: false,
      stepFreeRequired: true
    };

    // Candidate routes for a segment:
    // Route A: Compromised by outage
    // Route B: Has known multi-step stairs (invalid)
    // Route C: Step-free ramp accessible bypass (valid)
    const candidates = [
      {
        id: 'A',
        name: 'Route A: Direct Passage',
        durationMin: 15,
        distanceKm: 1.0,
        safety: 90,
        accessibility: 10, // degraded
        stepFree: false,
        hasStairs: false,
        isClosed: true
      },
      {
        id: 'B',
        name: 'Route B: Short Stepped Shortcut',
        tagline: 'Has 24 steep stone steps without ramp',
        durationMin: 12,
        distanceKm: 0.8,
        safety: 88,
        accessibility: 40,
        stepFree: false,
        hasStairs: true
      },
      {
        id: 'C',
        name: 'Route C: Fully Accessible Promenade Ramp',
        tagline: 'Continuous step-free 1:15 gradient ramp with handrails',
        durationMin: 22,
        distanceKm: 1.4,
        safety: 94,
        accessibility: 95,
        stepFree: true,
        hasStairs: false
      }
    ];

    baselineJourney.traveler = traveler;
    baselineJourney.segments[0].candidateRoutes = candidates;
    baselineJourney.segments[0].recommendedRouteId = 'A';

    const event = {
      id: 'evt-closure-a',
      type: 'ROAD_CLOSURE',
      segmentId: baselineJourney.segments[0].id,
      routeId: 'A',
      isVerified: true,
      reason: 'Passage closed for repairs'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.newRecommendedRoute.id, 'C', 'Must select Route C (only compliant alternative)');

    // Route B with stairs must be marked as eliminated with rejection reason
    const routeB = result.affectedSegment.candidateRoutes.find(r => r.id === 'B');
    assert.strictEqual(routeB.isEliminated, true, 'Route with stairs must be eliminated');
    assert.ok(routeB.rejectionReasons.includes('KNOWN_STAIRS_PROHIBITED'));
  });

  // ─────────────────────────────────────────────────────────────
  // 5. A delayed response cannot overwrite a newer accepted route
  // ─────────────────────────────────────────────────────────────
  it('5. A delayed response cannot overwrite a newer accepted route (concurrency conflict)', async () => {
    // Current journey state is already at version 3
    baselineJourney.version = 3;
    baselineJourney.lifecycleState = ROUTE_LIFECYCLE.ACCEPTED;

    // A delayed asynchronous recalculation arrives that was calculated based on baseVersion: 1
    const delayedEvent = {
      id: 'evt-delayed-stale-99',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S1',
      delayMinutes: 20,
      isVerified: true,
      reason: 'Delayed report from 45 minutes ago'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event: delayedEvent,
      baseVersion: 1 // Outdated version!
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'CONFLICT');
    assert.strictEqual(result.code, 'OUTDATED_CALCULATION');
    assert.strictEqual(result.conflict, true);
    assert.strictEqual(result.version, 3, 'Version must remain 3');
    assert.strictEqual(result.lastValidStateRetained, true, 'Last valid route state must be protected');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. A successful route transition is recorded in journey history
  // ─────────────────────────────────────────────────────────────
  it('6. A successful route transition is recorded in journey history', async () => {
    const event = {
      id: 'evt-history-verify-1',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      reason: 'Flooding on shoreline road'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.transition, 'Must return transition record');
    assert.strictEqual(result.transition.lifecycleState, ROUTE_LIFECYCLE.ACCEPTED);
    assert.strictEqual(result.transition.previousRouteId, 'B');
    assert.strictEqual(result.transition.newRouteId, 'C');
    assert.strictEqual(typeof result.transition.durationDeltaMin, 'number');
    assert.strictEqual(typeof result.transition.scoreDelta, 'number');

    // Verified in journey state event history
    assert.strictEqual(baselineJourney.eventHistory.length, 1);
    assert.strictEqual(baselineJourney.routeTransitions.length, 1);
    assert.strictEqual(baselineJourney.routeTransitions[0].transitionId, result.transition.transitionId);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Failure preserves the last valid state and communicates safety warning
  // ─────────────────────────────────────────────────────────────
  it('7. Failure preserves the last valid state and communicates safety warning when no safe alternative exists', async () => {
    const traveler = {
      name: 'Aditi',
      mobility: 'wheelchair',
      stairsAllowed: false,
      stepFreeRequired: true
    };

    // Both alternatives violate mandatory accessibility constraints
    const nonCompliantCandidates = [
      {
        id: 'A',
        name: 'Route A: Direct Avenue',
        durationMin: 15,
        distanceKm: 1.0,
        safety: 90,
        accessibility: 10, // degraded / closed
        isClosed: true,
        stepFree: false,
        hasStairs: false
      },
      {
        id: 'B',
        name: 'Route B: Overpass with 40 Stairs',
        durationMin: 12,
        distanceKm: 0.8,
        safety: 85,
        accessibility: 20,
        hasStairs: true,
        stepFree: false
      },
      {
        id: 'C',
        name: 'Route C: Broken Elevator Tunnel',
        durationMin: 18,
        distanceKm: 1.2,
        safety: 70,
        accessibility: 15,
        hasStairs: true,
        stepFree: false
      }
    ];

    baselineJourney.traveler = traveler;
    baselineJourney.segments[0].candidateRoutes = nonCompliantCandidates;
    baselineJourney.segments[0].recommendedRouteId = 'A';

    const event = {
      id: 'evt-all-inaccessible-test',
      type: 'ROAD_CLOSURE',
      segmentId: baselineJourney.segments[0].id,
      routeId: 'A',
      isVerified: true,
      reason: 'Catastrophic corridor sinkhole'
    };

    const result = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(result.success, false, 'Must fail when no compliant alternative exists');
    assert.strictEqual(result.status, 'NO_SAFE_ALTERNATIVE');
    assert.strictEqual(result.code, 'NO_SAFE_ALTERNATIVE');
    assert.strictEqual(result.lifecycleState, ROUTE_LIFECYCLE.FAILED_NO_SAFE_ALTERNATIVE);
    assert.ok(result.safetyWarning, 'Must return explicit safety warning');
    assert.ok(result.safetyWarning.includes('No safe alternative'));
    assert.strictEqual(result.lastValidStateRetained, true, 'Must retain last valid route state');
    assert.strictEqual(result.preservedRoute.id, 'A', 'Preserves last valid route without silent constraint relaxation');
  });
});
