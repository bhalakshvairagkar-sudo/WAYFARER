import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  extractHardConstraints,
  determineRouteAccessibilityStatus,
  validateRouteConstraints,
  filterValidRoutes,
  rankSegmentRoutes,
  deriveTravelerWeights,
  generateWhyNotExplanation
} from '../server/engine/scoringEngine.js';
import { applyJourneyEvent } from '../server/engine/eventEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 5 — Hard Accessibility Constraints Test Suite', () => {
  // Test profiles
  const wheelchairTraveler = {
    name: 'Aditi',
    mobility: 'wheelchair',
    accessibility: {
      stairsAllowed: false,
      stepFreeRequired: true,
      elevatorRequired: true,
      rampRequired: true
    },
    preferences: {
      safety: 0.30,
      accessibility: 0.40,
      crowd: 0.10,
      convenience: 0.10,
      cost: 0.10
    }
  };

  const standardTraveler = {
    name: 'Alex',
    mobility: 'standard',
    stairsAllowed: true,
    stepFreeRequired: false,
    elevatorRequired: false,
    crowdTolerance: 'low',
    safetyPriority: 'high',
    preferShade: true
  };

  const caneTravelerWithMaxWalk = {
    name: 'Sunil',
    mobility: 'cane',
    stairsAllowed: false,
    stepFreeRequired: true,
    maxWalkingDistanceMeters: 1500, // 1.5 km
    crowdTolerance: 'medium'
  };

  // Test routes
  const routeWithKnownStairs = {
    id: 'A',
    name: 'Route A: Coastal Bastion Steps',
    tagline: 'Historic Scenic Stairway Path',
    distanceKm: 2.0,
    durationMin: 25,
    safety: 85,
    accessibility: 40,
    crowd: 65,
    convenience: 95,
    cost: { estimated: 120 },
    hasStairs: true,
    accessibleFeatures: ['Cobblestone stairs near lower bastion', 'Steep stepped grade']
  };

  const routeStepFreeRamped = {
    id: 'B',
    name: 'Route B: Mandovi Promenade & Heritage Ramp',
    tagline: '100% Step-Free & Continuous Ramp',
    distanceKm: 2.8,
    durationMin: 35,
    safety: 90,
    accessibility: 96,
    crowd: 85,
    convenience: 82,
    cost: { estimated: 180 },
    isStepFree: true,
    stepFree: true,
    elevatorAvailable: true,
    accessibleFeatures: [
      'Step-free ramped access (1:12 slope)',
      'Elevator-assisted viewing deck access',
      'Dedicated wheelchair shuttle bay'
    ]
  };

  const routePlateauBypass = {
    id: 'C',
    name: 'Route C: Upper Plateau Barrier-Free Bypass',
    tagline: 'Low Crowd & Shaded Path',
    distanceKm: 3.2,
    durationMin: 40,
    safety: 88,
    accessibility: 91,
    crowd: 95,
    convenience: 78,
    cost: { estimated: 190 },
    isStepFree: true,
    stepFree: true,
    accessibleFeatures: [
      'Step-free upper plateau bypass (slope 1:15)',
      'Wide paved path (2.2m width)'
    ]
  };

  const routeMissingAccessibilityData = {
    id: 'D',
    name: 'Route D: Unsurveyed Alleyway',
    tagline: 'Short direct shortcut',
    distanceKm: 1.8,
    durationMin: 20,
    safety: 75,
    crowd: 70,
    convenience: 92,
    cost: { estimated: 50 }
    // No accessibility, no accessibleFeatures, no isStepFree
  };

  const routeExceedingMaxWalk = {
    id: 'E',
    name: 'Route E: Long Step-Free Perimeter Circuit',
    tagline: 'Paved level path around park perimeter',
    distanceKm: 4.5, // Exceeds 1.5 km
    durationMin: 65,
    safety: 90,
    accessibility: 92,
    crowd: 85,
    convenience: 60,
    isStepFree: true,
    stepFree: true,
    accessibleFeatures: ['Step-free wide path']
  };

  // ─── CRITERION 1: Known stairs are rejected when stairs are prohibited ───
  it('1. Known stairs are rejected when stairs are prohibited', () => {
    // Wheelchair user (stairs prohibited)
    const validation = validateRouteConstraints(routeWithKnownStairs, wheelchairTraveler);
    assert.strictEqual(validation.eligible, false, 'Route with stairs must not be eligible');
    assert.strictEqual(validation.valid, false);
    assert.strictEqual(validation.accessibilityStatus, 'INACCESSIBLE');
    assert.ok(
      validation.rejectionReasons.includes('KNOWN_STAIRS_PROHIBITED'),
      'Must contain KNOWN_STAIRS_PROHIBITED structured rejection code'
    );
    assert.ok(
      validation.violations.some((v) => v.toLowerCase().includes('stairs')),
      'Must contain descriptive violation mentioning stairs'
    );

    // Standard traveler (stairs permitted)
    const standardValidation = validateRouteConstraints(routeWithKnownStairs, standardTraveler);
    assert.strictEqual(standardValidation.eligible, true, 'Standard traveler allows stairs');
    assert.strictEqual(standardValidation.rejectionReasons.length, 0);
  });

  // ─── CRITERION 2: Missing accessibility data is never presented as verified accessibility ───
  it('2. Missing accessibility data is never presented as verified accessibility', () => {
    // Status resolution for missing data
    const statusForMissing = determineRouteAccessibilityStatus(routeMissingAccessibilityData);
    assert.strictEqual(statusForMissing, 'UNKNOWN', 'Route with missing data must evaluate to UNKNOWN');
    assert.notStrictEqual(statusForMissing, 'VERIFIED', 'Missing data must NEVER be presented as VERIFIED');

    // Status resolution for verified step-free route
    const statusForVerified = determineRouteAccessibilityStatus(routeStepFreeRamped);
    assert.strictEqual(statusForVerified, 'VERIFIED', 'Route with confirmed ramp must evaluate to VERIFIED');

    // Standard traveler: route is eligible, but status is preserved as UNKNOWN (never verified)
    const standardVal = validateRouteConstraints(routeMissingAccessibilityData, standardTraveler);
    assert.strictEqual(standardVal.eligible, true);
    assert.strictEqual(standardVal.accessibilityStatus, 'UNKNOWN', 'Standard traveler preserves UNKNOWN status');

    // Traveler requiring step-free access: route with unknown/missing data is strictly rejected
    const wheelchairVal = validateRouteConstraints(routeMissingAccessibilityData, wheelchairTraveler);
    assert.strictEqual(wheelchairVal.eligible, false, 'Wheelchair user cannot take unverified route');
    assert.strictEqual(wheelchairVal.accessibilityStatus, 'UNVERIFIED');
    assert.ok(
      wheelchairVal.rejectionReasons.includes('REQUIRED_STEP_FREE_ACCESS_UNVERIFIED'),
      'Must contain REQUIRED_STEP_FREE_ACCESS_UNVERIFIED rejection reason'
    );
  });

  // ─── CRITERION 3: High-scoring non-compliant route cannot beat compliant route ───
  it('3. A high-scoring but non-compliant route cannot beat a compliant route', () => {
    const weights = deriveTravelerWeights(wheelchairTraveler);

    // Route A has higher convenience (95) and lower distance, but contains stairs
    // Route B is step-free ramped
    const ranked = rankSegmentRoutes([routeWithKnownStairs, routeStepFreeRamped], weights, wheelchairTraveler);

    // Compliant route B must be #1 and recommended
    assert.strictEqual(ranked[0].id, 'B', 'Step-free Route B must rank first');
    assert.strictEqual(ranked[0].isRecommended, true, 'Route B must be recommended');
    assert.strictEqual(ranked[0].isFeasible, true);
    assert.strictEqual(ranked[0].eligible, true);

    // Non-compliant Route A must be eliminated
    const routeA = ranked.find((r) => r.id === 'A');
    assert.strictEqual(routeA.isEliminated, true, 'Route A must be marked as eliminated');
    assert.strictEqual(routeA.isFeasible, false);
    assert.strictEqual(routeA.eligible, false);
    assert.strictEqual(routeA.isRecommended, false, 'Non-compliant route must never be recommended');
    assert.ok(routeA.rejectionReasons.includes('KNOWN_STAIRS_PROHIBITED'));
  });

  // ─── CRITERION 4: If no compliant route exists, system explains that limitation ───
  it('4. If no compliant route exists, the system explains that limitation', () => {
    const weights = deriveTravelerWeights(wheelchairTraveler);

    // Candidate set where ALL routes violate mandatory constraints:
    // Route A has stairs; Route D has unverified accessibility
    const allIneligible = [routeWithKnownStairs, routeMissingAccessibilityData];
    const ranked = rankSegmentRoutes(allIneligible, weights, wheelchairTraveler);

    // No route may be recommended
    assert.strictEqual(ranked.every((r) => !r.isRecommended), true, 'No route can be recommended when none are compliant');
    assert.strictEqual(ranked[0].hasFeasibleRoute, false);
    assert.strictEqual(ranked[0].limitationNotice.code, 'NO_COMPLIANT_ROUTE_AVAILABLE');

    // Structured why-not explanation documents the system limitation
    const whyNot = generateWhyNotExplanation(allIneligible, weights, wheelchairTraveler);
    assert.strictEqual(whyNot.recommended, null, 'Recommended route must be null when all are ineligible');
    assert.strictEqual(whyNot.hasFeasibleRoute, false);
    assert.ok(whyNot.limitationNotice);
    assert.strictEqual(whyNot.limitationNotice.code, 'NO_COMPLIANT_ROUTE_AVAILABLE');
    assert.ok(whyNot.limitationNotice.explanation.includes('mandatory accessibility constraints'));
    assert.ok(whyNot.limitationNotice.violatedConstraints.includes('NO_STAIRS'));
    assert.ok(whyNot.limitationNotice.violatedConstraints.includes('STEP_FREE_MANDATORY'));

    // Every rejected route explains its exact violation
    assert.strictEqual(whyNot.rejected.length, 2);
    const rejA = whyNot.rejected.find((r) => r.routeId === 'A');
    assert.ok(rejA.rejectionReasons.includes('KNOWN_STAIRS_PROHIBITED'));
  });

  // ─── CRITERION 5: Every automatic reroute re-runs accessibility validation ───
  it('5. Every automatic reroute re-runs accessibility validation', () => {
    // Start with baseline journey for wheelchair user
    const initialSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    const journeyState = {
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: initialSegments
    };

    const s3 = journeyState.segments.find((s) => s.id === 'S3');
    assert.strictEqual(s3.recommendedRouteId, 'B', 'Initial recommended route for S3 is Route B (elevator ramp)');

    // Trigger hero elevator failure on S3 Route B
    const elevatorFailureEvent = {
      type: 'ACCESSIBILITY_DEGRADATION',
      segmentId: 'S3',
      routeId: 'B',
      severity: 1.0,
      reason: 'Elevator mechanical failure on north lower ramp',
      delta: { accessibility: 58 }
    };

    const adaptationResult = applyJourneyEvent(journeyState, elevatorFailureEvent);
    assert.strictEqual(adaptationResult.routeChanged, true, 'Elevator failure must trigger route adaptation');
    assert.strictEqual(adaptationResult.previousRecommendedId, 'B');
    assert.strictEqual(adaptationResult.newRecommendedId, 'C', 'Must promote Route C (Plateau bypass)');

    // Verify candidate routes in updated segment were re-validated
    const adaptedS3 = adaptationResult.affectedSegment;
    const adaptedRouteB = adaptedS3.candidateRoutes.find((r) => r.id === 'B');
    const adaptedRouteC = adaptedS3.candidateRoutes.find((r) => r.id === 'C');

    // Route B is eliminated because required elevator is out of service and accessibility dropped below safe threshold
    assert.strictEqual(adaptedRouteB.isEliminated, true, 'Route B must be eliminated after elevator failure');
    assert.strictEqual(adaptedRouteB.isRecommended, false);
    assert.ok(
      adaptedRouteB.rejectionReasons.includes('REQUIRED_ELEVATOR_OUTAGE') ||
      adaptedRouteB.rejectionReasons.includes('BELOW_WHEELCHAIR_ACCESSIBILITY_THRESHOLD'),
      'Route B must cite elevator outage or accessibility threshold violation'
    );

    // Route C is compliant and recommended
    assert.strictEqual(adaptedRouteC.isFeasible, true);
    assert.strictEqual(adaptedRouteC.eligible, true);
    assert.strictEqual(adaptedRouteC.isRecommended, true);
  });

  // ─── CRITERION 6: Separation of hard constraints from preferences ───
  it('6. Separates hard constraints from soft preferences without conflating them', () => {
    const hardConstraints = extractHardConstraints(standardTraveler);
    assert.strictEqual(hardConstraints.stairsAllowed, true);
    assert.strictEqual(hardConstraints.stepFreeRequired, false);
    assert.strictEqual(hardConstraints.elevatorRequired, false);

    // Soft preferences (preferShade, crowdTolerance, safetyPriority) exist on traveler
    // but are NOT hard constraints; they only alter weights
    const weights = deriveTravelerWeights(standardTraveler);
    assert.ok(weights.safety >= 0.25, 'High safety priority raises safety weight');
    assert.ok(weights.crowd >= 0.20, 'Low crowd tolerance raises crowd weight');

    // A low-scoring route due to soft preferences is ranked lower, but NOT eliminated
    const crowdedRoute = {
      id: 'F',
      name: 'Route F: High Density Market Path',
      safety: 80,
      accessibility: 85,
      crowd: 40, // Violates low crowd preference
      convenience: 90,
      cost: { estimated: 50 },
      isStepFree: true
    };

    const validation = validateRouteConstraints(crowdedRoute, standardTraveler);
    assert.strictEqual(validation.eligible, true, 'Crowd preference violation does not eliminate route');
    assert.strictEqual(validation.rejectionReasons.length, 0);

    const ranked = rankSegmentRoutes([crowdedRoute, routePlateauBypass], weights, standardTraveler);
    assert.strictEqual(ranked[0].id, 'C', 'Preferred uncrowded Route C ranks #1');
    assert.strictEqual(ranked[1].id, 'F');
    assert.strictEqual(ranked[1].isEliminated, false, 'Route F is ranked #2 but NOT eliminated');
  });

  // ─── CRITERION 7: Strict Maximum Walking Distance Hard Constraint ───
  it('7. Enforces maximum walking distance hard constraint', () => {
    const validationExceeded = validateRouteConstraints(routeExceedingMaxWalk, caneTravelerWithMaxWalk);
    assert.strictEqual(validationExceeded.eligible, false, 'Route exceeding max walk distance must be eliminated');
    assert.ok(
      validationExceeded.rejectionReasons.includes('EXCEEDS_MAX_WALK_DISTANCE'),
      'Must contain EXCEEDS_MAX_WALK_DISTANCE'
    );

    // Test a short 1.2km step-free route (within 1.5km limit)
    const shortRoute = { ...routeStepFreeRamped, id: 'S', distanceKm: 1.2 };
    const valShort = validateRouteConstraints(shortRoute, caneTravelerWithMaxWalk);
    assert.strictEqual(valShort.eligible, true, 'Route within max walk distance must be eligible');
    assert.strictEqual(valShort.rejectionReasons.length, 0);
  });
});
