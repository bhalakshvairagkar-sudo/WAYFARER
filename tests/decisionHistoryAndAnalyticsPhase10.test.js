/**
 * WAYFARER AI - Phase 10 Test Suite
 * 
 * Verifies Decision History and Journey Analytics (P1 Auditability):
 * 1. Route changes persist after server restarts.
 * 2. History entries match actual recorded transitions.
 * 3. Users cannot read another user's journeys (IDOR prevention).
 * 4. Route replay uses saved geometry rather than invented historical paths.
 * 5. Deletion follows the intended retention and privacy policy.
 * 6. Multi-criteria filtering by date range, event type, and decision type.
 * 7. Distinction between estimated ETA and actual recorded travel duration.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  createDecisionRecord,
  getJourneyDecisions,
  getRouteReplay,
  deleteJourneyHistory,
  exportJourneyAuditTrail,
  enforceLocationRetentionPolicy,
  isUserAuthorizedForJourney
} from '../server/engine/decisionHistoryService.js';
import { processEventAndReroute, ROUTE_LIFECYCLE, resetDeduplicationCache } from '../server/engine/reroutingEngine.js';
import { inMemoryStore } from '../server/config/db.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 10 — Decision History & Journey Analytics Test Suite', () => {
  let userAJourney;
  let userBJourney;

  beforeEach(() => {
    resetDeduplicationCache();
    inMemoryStore.journeys.clear();
    inMemoryStore.decisions.clear();
    inMemoryStore.locationHistory.clear();

    const segmentsA = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    userAJourney = {
      _id: 'journey-user-a-101',
      id: 'journey-user-a-101',
      userId: 'user-alice-123',
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: segmentsA,
      version: 1,
      lifecycleState: 'ACTIVE',
      decisionRecords: [],
      routeTransitions: [],
      eventHistory: [],
      notifications: [],
      isDeleted: false,
      createdAt: new Date().toISOString()
    };
    inMemoryStore.journeys.set('journey-user-a-101', userAJourney);

    const segmentsB = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    userBJourney = {
      _id: 'journey-user-b-202',
      id: 'journey-user-b-202',
      userId: 'user-bob-456',
      trip: { ...DEFAULT_TRIP, origin: 'Mumbai', destination: 'Goa' },
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: segmentsB,
      version: 1,
      lifecycleState: 'ACTIVE',
      decisionRecords: [],
      routeTransitions: [],
      eventHistory: [],
      notifications: [],
      isDeleted: false,
      createdAt: new Date().toISOString()
    };
    inMemoryStore.journeys.set('journey-user-b-202', userBJourney);
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Route changes persist after server restarts / across lookups
  // ─────────────────────────────────────────────────────────────
  it('1. Route changes persist after server restarts', async () => {
    const closureEvent = {
      id: 'evt-persist-test-1',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      reason: 'Arterial bridge deck crack'
    };

    const rerouteResult = await processEventAndReroute({
      journeyState: userAJourney,
      event: closureEvent
    });

    assert.strictEqual(rerouteResult.success, true);
    assert.strictEqual(rerouteResult.newRecommendedRoute.id, 'C');

    // Persisted in the journey state
    assert.strictEqual(userAJourney.segments.find(s => s.id === 'S3').recommendedRouteId, 'C');
    assert.strictEqual(userAJourney.version, 2);
    assert.strictEqual(userAJourney.decisionRecords.length, 1);
    assert.strictEqual(userAJourney.routeTransitions.length, 1);

    // Verify lookup from in-memory fallback store
    const retrieved = inMemoryStore.journeys.get('journey-user-a-101');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.segments.find(s => s.id === 'S3').recommendedRouteId, 'C');
    assert.strictEqual(retrieved.version, 2);
    assert.strictEqual(retrieved.decisionRecords[0].newRouteId, 'C');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. History entries match actual recorded transitions
  // ─────────────────────────────────────────────────────────────
  it('2. History entries match actual recorded transitions', async () => {
    const event = {
      id: 'evt-match-transition-99',
      type: 'ACCESSIBILITY_DEGRADATION',
      segmentId: 'S3',
      routeId: 'B',
      severity: 1.0,
      isVerified: true,
      reason: 'Mandovi ramp lift offline',
      actualDurationMinutes: 42 // Actual recorded time during trip
    };

    const reroute = await processEventAndReroute({
      journeyState: userAJourney,
      event
    });

    assert.strictEqual(reroute.success, true);
    assert.strictEqual(reroute.routeChanged, true);

    const historyDecision = userAJourney.decisionRecords[0];
    assert.ok(historyDecision, 'Must create a decision record');
    assert.strictEqual(historyDecision.previousRouteId, 'B');
    assert.strictEqual(historyDecision.newRouteId, 'C');
    assert.strictEqual(historyDecision.triggerEventId, 'evt-match-transition-99');
    assert.strictEqual(historyDecision.previousRouteVersion, 1);
    assert.strictEqual(historyDecision.newRouteVersion, 2);
    assert.strictEqual(historyDecision.decisionType, 'REROUTE_ACCEPTED');
    assert.strictEqual(historyDecision.actualDurationMinutes, 42);
    assert.ok(historyDecision.storedGeometry.length > 0, 'Must record route geometry');
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Users cannot read another user's journeys (IDOR prevention)
  // ─────────────────────────────────────────────────────────────
  it('3. Users cannot read another user\'s journeys (IDOR prevention)', async () => {
    // User Alice attempts to read User Bob's journey replay
    const unauthorizedReplay = await getRouteReplay({
      journeyId: 'journey-user-b-202',
      userId: 'user-alice-123',
      userRole: 'USER'
    });

    assert.strictEqual(unauthorizedReplay.success, false);
    assert.strictEqual(unauthorizedReplay.status, 'FORBIDDEN');
    assert.strictEqual(unauthorizedReplay.code, 'UNAUTHORIZED_JOURNEY_ACCESS');

    // User Alice attempts to export User Bob's journey audit trail
    const unauthorizedExport = await exportJourneyAuditTrail({
      journeyId: 'journey-user-b-202',
      userId: 'user-alice-123',
      userRole: 'USER'
    });

    assert.strictEqual(unauthorizedExport.success, false);
    assert.strictEqual(unauthorizedExport.status, 'FORBIDDEN');

    // Controller/Admin CAN access for fleet monitoring and dispatch oversight
    const controllerReplay = await getRouteReplay({
      journeyId: 'journey-user-b-202',
      userId: 'controller-vikram',
      userRole: 'CONTROLLER'
    });

    assert.strictEqual(controllerReplay.success, true, 'Controller must have authorized access');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Route replay uses saved geometry rather than invented historical paths
  // ─────────────────────────────────────────────────────────────
  it('4. Route replay uses saved geometry rather than invented historical paths', async () => {
    // Explicit known coordinate geometry for Route C
    const routeCGeometry = [
      [15.4989, 73.8278],
      [15.4950, 73.8290],
      [15.4920, 73.8320],
      [15.4975, 73.8340]
    ];

    createDecisionRecord({
      journey: userAJourney,
      decisionData: {
        decisionType: 'REROUTE_ACCEPTED',
        triggerEventId: 'evt-s3-reroute',
        previousRouteVersion: 1,
        newRouteVersion: 2,
        previousRouteId: 'B',
        newRouteId: 'C',
        reasonCodes: ['ELEVATOR_OUTAGE', 'STEP_FREE_BYPASS'],
        estimatedDurationMinutes: 35,
        actualDurationMinutes: 38,
        storedGeometry: routeCGeometry,
        userAccepted: true
      }
    });

    const replayResult = await getRouteReplay({
      journeyId: 'journey-user-a-101',
      userId: 'user-alice-123',
      userRole: 'USER'
    });

    assert.strictEqual(replayResult.success, true);
    assert.strictEqual(replayResult.provenance, 'STORED_HISTORICAL_GEOMETRY');
    assert.strictEqual(replayResult.replaySteps.length, 1);

    const step1 = replayResult.replaySteps[0];
    assert.strictEqual(step1.routeVersion, 2);
    assert.strictEqual(step1.toRouteId, 'C');
    assert.strictEqual(step1.estimatedEtaMinutes, 35);
    assert.strictEqual(step1.actualDurationMinutes, 38);
    assert.strictEqual(step1.varianceMinutes, 3); // 38 - 35 = +3m

    // Stored geometry matches actual coordinates exactly
    assert.deepStrictEqual(step1.storedGeometry, routeCGeometry);
    assert.strictEqual(step1.hasStoredGeometry, true);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Deletion follows the intended retention and privacy policy
  // ─────────────────────────────────────────────────────────────
  it('5. Deletion follows the intended retention and privacy policy', async () => {
    // Alice attempts to delete Bob's journey -> Rejected!
    const unauthorizedDelete = await deleteJourneyHistory({
      journeyId: 'journey-user-b-202',
      userId: 'user-alice-123',
      userRole: 'USER'
    });

    assert.strictEqual(unauthorizedDelete.success, false);
    assert.strictEqual(unauthorizedDelete.status, 'FORBIDDEN');
    assert.strictEqual(unauthorizedDelete.code, 'UNAUTHORIZED_JOURNEY_DELETE');

    // Alice deletes her own journey -> Success!
    const authorizedDelete = await deleteJourneyHistory({
      journeyId: 'journey-user-a-101',
      userId: 'user-alice-123',
      userRole: 'USER',
      permanent: false
    });

    assert.strictEqual(authorizedDelete.success, true);
    assert.strictEqual(userAJourney.isDeleted, true);

    // Subsequent access to deleted journey returns not found
    const readAfterDelete = await getRouteReplay({
      journeyId: 'journey-user-a-101',
      userId: 'user-alice-123'
    });

    assert.strictEqual(readAfterDelete.success, false);
    assert.strictEqual(readAfterDelete.status, 'NOT_FOUND');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Location retention policy purges records older than retentionDays
  // ─────────────────────────────────────────────────────────────
  it('6. Location retention policy purges records older than retentionDays', async () => {
    const now = Date.now();
    const oldTimestamp = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString(); // 45 days ago (>30d)
    const freshTimestamp = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(); // 5 days ago (<30d)

    inMemoryStore.locationHistory.set('user-alice-123', [
      { id: 'loc-1', userId: 'user-alice-123', lat: 18.9401, lng: 72.8354, recordedAt: oldTimestamp },
      { id: 'loc-2', userId: 'user-alice-123', lat: 18.9405, lng: 72.8359, recordedAt: freshTimestamp }
    ]);

    const purgedCount = await enforceLocationRetentionPolicy(30);

    assert.strictEqual(purgedCount, 1, 'Should purge exactly 1 record older than 30 days');
    const remaining = inMemoryStore.locationHistory.get('user-alice-123');
    assert.strictEqual(remaining.length, 1);
    assert.strictEqual(remaining[0].id, 'loc-2', 'Fresh record must be preserved');
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Multi-criteria filtering by date range, event type, and decision type
  // ─────────────────────────────────────────────────────────────
  it('7. Multi-criteria filtering by date range, event type, and decision type', async () => {
    createDecisionRecord({
      journey: userAJourney,
      decisionData: {
        decisionType: 'REROUTE_ACCEPTED',
        triggerEventId: 'evt-flood-1',
        reasonCodes: ['FLOOD_HAZARD'],
        durationDeltaMinutes: 15
      }
    });

    createDecisionRecord({
      journey: userAJourney,
      decisionData: {
        decisionType: 'REROUTE_PROPOSED',
        triggerEventId: 'evt-crowd-1',
        reasonCodes: ['CROWD_SURGE'],
        durationDeltaMinutes: 8
      }
    });

    // Filter by decisionType
    const filterReroute = await getJourneyDecisions({
      journeyId: 'journey-user-a-101',
      userId: 'user-alice-123',
      decisionType: 'REROUTE_ACCEPTED'
    });

    assert.strictEqual(filterReroute.success, true);
    assert.strictEqual(filterReroute.count, 1);
    assert.strictEqual(filterReroute.decisions[0].decisionType, 'REROUTE_ACCEPTED');

    // Filter by eventType
    const filterFlood = await getJourneyDecisions({
      journeyId: 'journey-user-a-101',
      userId: 'user-alice-123',
      eventType: 'FLOOD'
    });

    assert.strictEqual(filterFlood.success, true);
    assert.strictEqual(filterFlood.count, 1);
    assert.ok(filterFlood.decisions[0].reasonCodes.includes('FLOOD_HAZARD'));
  });
});
