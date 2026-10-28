/**
 * WAYFARER AI - Phase 8 Test Suite
 * 
 * Verifies Useful, Controlled Notifications (P1 User Experience):
 * 1. Duplicate events do not produce duplicate notifications.
 * 2. Minor fluctuations do not repeatedly interrupt users.
 * 3. Critical warnings bypass ordinary notification cooldowns.
 * 4. Users can disable non-critical notifications.
 * 5. Failed delivery does not corrupt route state.
 * 6. Structured payload includes reason, timestamp, affected route, and available action.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  resetNotificationCache,
  shouldDeliverNotification,
  createNotificationPayload,
  dispatchNotification,
  processNotificationForReroute
} from '../server/engine/notificationEngine.js';
import { processEventAndReroute, ROUTE_LIFECYCLE, resetDeduplicationCache } from '../server/engine/reroutingEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 8 — Useful, Controlled Notifications Test Suite', () => {
  let baselineJourney;

  beforeEach(() => {
    resetDeduplicationCache();
    resetNotificationCache();
    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    baselineJourney = {
      id: 'journey-phase8-test',
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments,
      version: 1,
      lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
      notifications: [],
      eventHistory: [],
      routeTransitions: []
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Duplicate events do not produce duplicate notifications
  // ─────────────────────────────────────────────────────────────
  it('1. Duplicate events do not produce duplicate notifications', async () => {
    const event = {
      id: 'evt-notif-duplicate-1',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S1',
      delayMinutes: 35, // Meaningful delay (>10m)
      isVerified: true,
      reason: 'Signal maintenance at junction'
    };

    // First event processing: produces a notification
    const reroute1 = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    const result1 = await processNotificationForReroute({
      journeyState: baselineJourney,
      event,
      rerouteResult: reroute1
    });

    assert.strictEqual(result1.notificationDelivered, true, 'First event must deliver notification');
    assert.strictEqual(baselineJourney.notifications.length, 1);
    assert.strictEqual(result1.notification.level, 'WARNING');

    // Second event processing with identical event signature
    const reroute2 = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    const result2 = await processNotificationForReroute({
      journeyState: baselineJourney,
      event,
      rerouteResult: reroute2
    });

    assert.strictEqual(result2.notificationDelivered, false, 'Duplicate event must NOT deliver second notification');
    assert.strictEqual(result2.suppressedNotification.reason, 'DUPLICATE_NOTIFICATION');
    assert.strictEqual(baselineJourney.notifications.length, 1, 'Notifications count must remain unchanged');
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Minor fluctuations do not repeatedly interrupt users
  // ─────────────────────────────────────────────────────────────
  it('2. Minor fluctuations do not repeatedly interrupt users', async () => {
    const minorEvent = {
      id: 'evt-minor-3min',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S1',
      delayMinutes: 3, // Only +3 minutes: well below default 10-minute threshold
      isVerified: true,
      reason: 'Slight signal slowdown'
    };

    const rerouteMinor = await processEventAndReroute({
      journeyState: baselineJourney,
      event: minorEvent
    });

    const resultMinor = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: minorEvent,
      rerouteResult: rerouteMinor,
      userPreferences: {
        minEtaDeltaMinutes: 10,
        minRiskScoreDelta: 15
      }
    });

    assert.strictEqual(resultMinor.notificationDelivered, false, 'Minor fluctuation must be suppressed');
    assert.strictEqual(resultMinor.suppressedNotification.reason, 'MINOR_FLUCTUATION_SUPPRESSED');
    assert.strictEqual(baselineJourney.notifications.length, 0);

    // Conversely, a meaningful change (+25 mins) crosses the threshold and notifies
    const meaningfulEvent = {
      id: 'evt-major-25min',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S2',
      delayMinutes: 25,
      isVerified: true,
      reason: 'Corridor maintenance closure'
    };

    const rerouteMajor = await processEventAndReroute({
      journeyState: baselineJourney,
      event: meaningfulEvent
    });

    const resultMajor = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: meaningfulEvent,
      rerouteResult: rerouteMajor,
      userPreferences: {
        minEtaDeltaMinutes: 10,
        minRiskScoreDelta: 15
      }
    });

    assert.strictEqual(resultMajor.notificationDelivered, true, 'Meaningful change must deliver notification');
    assert.strictEqual(baselineJourney.notifications.length, 1);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Critical warnings bypass ordinary notification cooldowns
  // ─────────────────────────────────────────────────────────────
  it('3. Critical warnings bypass ordinary notification cooldowns', async () => {
    // Step A: Trigger an initial ordinary delay notification to start the 15-minute cooldown
    const delayEvent = {
      id: 'evt-ordinary-delay',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S3',
      delayMinutes: 20,
      isVerified: true,
      reason: 'Bridge toll gate congestion'
    };

    const rerouteA = await processEventAndReroute({
      journeyState: baselineJourney,
      event: delayEvent
    });

    const resultA = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: delayEvent,
      rerouteResult: rerouteA,
      userPreferences: { cooldownMinutes: 15 }
    });

    assert.strictEqual(resultA.notificationDelivered, true);
    assert.strictEqual(resultA.notification.isCritical, false);

    // Step B: Another ordinary non-critical event arrives immediately (within cooldown)
    const secondDelayEvent = {
      id: 'evt-ordinary-delay-2',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S3',
      delayMinutes: 15,
      isVerified: true,
      reason: 'Additional stop buffer'
    };

    const rerouteB = await processEventAndReroute({
      journeyState: baselineJourney,
      event: secondDelayEvent
    });

    const resultB = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: secondDelayEvent,
      rerouteResult: rerouteB,
      userPreferences: { cooldownMinutes: 15 }
    });

    assert.strictEqual(resultB.notificationDelivered, false, 'Non-critical alert must be suppressed by cooldown');
    assert.strictEqual(resultB.suppressedNotification.reason, 'COOLDOWN_ACTIVE');

    // Step C: A CRITICAL safety warning arrives (authoritative road closure on active corridor)
    const criticalClosureEvent = {
      id: 'evt-critical-sinkhole-s3',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      isCritical: true,
      reason: 'Catastrophic road sinkhole on Mandovi Promenade'
    };

    const rerouteC = await processEventAndReroute({
      journeyState: baselineJourney,
      event: criticalClosureEvent
    });

    const resultC = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: criticalClosureEvent,
      rerouteResult: rerouteC,
      userPreferences: { cooldownMinutes: 15 }
    });

    assert.strictEqual(resultC.notificationDelivered, true, 'Critical warning MUST bypass active cooldown');
    assert.strictEqual(resultC.notification.isCritical, true, 'Notification must be flagged as critical');
    assert.strictEqual(resultC.notification.level, 'CRITICAL');
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Users can disable non-critical notifications
  // ─────────────────────────────────────────────────────────────
  it('4. Users can disable non-critical notifications without muting critical hazards', async () => {
    const userPrefs = {
      enabled: true,
      allowNonCritical: false, // User disabled ordinary suggestions and warnings
      minEtaDeltaMinutes: 10
    };

    // Ordinary route alternative suggestion
    const ordinaryEvent = {
      id: 'evt-ordinary-suggestion',
      type: 'TRANSPORT_DELAY',
      segmentId: 'S1',
      delayMinutes: 20,
      isVerified: true,
      reason: 'Minor construction delay'
    };

    const rerouteOrdinary = await processEventAndReroute({
      journeyState: baselineJourney,
      event: ordinaryEvent
    });

    const resultOrdinary = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: ordinaryEvent,
      rerouteResult: rerouteOrdinary,
      userPreferences: userPrefs
    });

    assert.strictEqual(resultOrdinary.notificationDelivered, false, 'Non-critical notification must be silenced');
    assert.strictEqual(resultOrdinary.suppressedNotification.reason, 'NON_CRITICAL_DISABLED');

    // Critical safety hazard for wheelchair user (severe elevator outage on sole accessible path)
    const criticalEvent = {
      id: 'evt-wheelchair-barrier',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      isCritical: true,
      reason: 'Promenade ramp collapsed, zero wheelchair access'
    };

    const rerouteCritical = await processEventAndReroute({
      journeyState: baselineJourney,
      event: criticalEvent
    });

    const resultCritical = await processNotificationForReroute({
      journeyState: baselineJourney,
      event: criticalEvent,
      rerouteResult: rerouteCritical,
      userPreferences: userPrefs
    });

    assert.strictEqual(resultCritical.notificationDelivered, true, 'Critical warning MUST deliver even when non-critical is disabled');
    assert.strictEqual(resultCritical.notification.isCritical, true);
    assert.strictEqual(resultCritical.notification.level, 'CRITICAL');
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Failed delivery does not corrupt route state
  // ─────────────────────────────────────────────────────────────
  it('5. Failed delivery does not corrupt route state', async () => {
    // Failing push sender (e.g. network timeout or invalid push subscription)
    const failingPushSender = async () => {
      throw new Error('Push service socket closed unexpectedly (ECONNRESET)');
    };

    const event = {
      id: 'evt-push-fail-test',
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'B',
      isVerified: true,
      reason: 'Shoreline flooding'
    };

    const reroute = await processEventAndReroute({
      journeyState: baselineJourney,
      event
    });

    assert.strictEqual(reroute.newRecommendedRoute.id, 'C', 'Route C recommended before dispatch');

    const result = await processNotificationForReroute({
      journeyState: baselineJourney,
      event,
      rerouteResult: reroute,
      pushSubscription: { endpoint: 'https://push.example.com/sub/123' },
      mockPushSender: failingPushSender
    });

    // 1. In-app notification delivery succeeded
    assert.strictEqual(result.notificationDelivered, true);
    assert.strictEqual(result.browserPushDelivered, false);
    assert.ok(result.pushError.includes('ECONNRESET'));

    // 2. Crucial Invariant: Route state remains 100% intact and uncorrupted!
    assert.strictEqual(result.newRecommendedRoute.id, 'C', 'Recommended route must remain Route C');
    assert.strictEqual(result.lifecycleState, ROUTE_LIFECYCLE.ACCEPTED, 'Lifecycle remains ACCEPTED');
    assert.strictEqual(baselineJourney.segments.find(s => s.id === 'S3').recommendedRouteId, 'C');
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Structured payload includes reason, timestamp, affected route, and available action
  // ─────────────────────────────────────────────────────────────
  it('6. Structured payload includes reason, timestamp, affected route, and available action', () => {
    const payload = createNotificationPayload({
      event: {
        id: 'evt-structure-test',
        type: 'ROAD_CLOSURE',
        reason: 'Watermain breach at Old Goa crossing'
      },
      lifecycleState: 'PROPOSED',
      affectedRoute: { id: 'B', name: 'Heritage Ramp Corridor', score: 65 },
      suggestedRoute: { id: 'C', name: 'Inland Plateau Express', score: 88, durationMin: 45, distanceKm: 4.2 },
      durationDeltaMinutes: 12,
      scoreDelta: 23,
      journeyId: 'journey-123'
    });

    // Mandatory fields
    assert.ok(payload.id);
    assert.ok(payload.timestamp);
    assert.strictEqual(payload.reason, 'Watermain breach at Old Goa crossing');
    assert.strictEqual(payload.affectedRoute.id, 'B');
    assert.strictEqual(payload.affectedRoute.name, 'Heritage Ramp Corridor');
    assert.strictEqual(payload.suggestedRoute.id, 'C');
    assert.ok(payload.availableAction);
    assert.strictEqual(payload.availableAction.type, 'REVIEW_PROPOSAL');
    assert.strictEqual(payload.availableAction.routeId, 'C');
    assert.ok(payload.availableAction.label.includes('Route C'));
  });
});
