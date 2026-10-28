import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  deriveTravelerWeights,
  calculateRouteScore,
  rankSegmentRoutes,
  generateScoreBreakdown,
  generateWhyNotExplanation
} from '../server/engine/scoringEngine.js';
import { applyJourneyEvent } from '../server/engine/eventEngine.js';
import { generateAdaptationExplanation } from '../server/engine/explanationEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('Phase 6 — Explainable Adaptive Routing Test Suite', () => {
  const wheelchairTraveler = {
    name: 'Aditi',
    mobility: 'wheelchair',
    accessibility: {
      stairsAllowed: false,
      stepFreeRequired: true,
      elevatorRequired: true
    },
    preferences: {
      safety: 0.25,
      accessibility: 0.35,
      crowd: 0.15,
      convenience: 0.10,
      cost: 0.15
    }
  };

  const sampleCandidateRoutes = [
    {
      id: 'A',
      name: 'Route A: Coastal Bastion Path',
      tagline: 'Historic Scenic Stairs',
      distanceKm: 2.0,
      durationMin: 25,
      safety: 85,
      accessibility: 40,
      crowd: 65,
      convenience: 95,
      cost: { estimated: 120 },
      hasStairs: true,
      accessibleFeatures: ['Steep cobblestone steps']
    },
    {
      id: 'B',
      name: 'Route B: Mandovi Promenade & Heritage Ramp',
      tagline: '100% Step-Free & Continuous Ramp',
      distanceKm: 2.8,
      durationMin: 37,
      safety: 90,
      accessibility: 96,
      crowd: 85,
      convenience: 86,
      cost: { estimated: 180 },
      isStepFree: true,
      stepFree: true,
      elevatorAvailable: true,
      accessibleFeatures: ['Step-free ramped access (1:12 slope)', 'Continuous smooth pavement']
    },
    {
      id: 'C',
      name: 'Route C: Inland Plateau Express',
      tagline: 'Lower Crowd & Upper Plateau Ramp Bypass',
      distanceKm: 3.2,
      durationMin: 49,
      safety: 88,
      accessibility: 91,
      crowd: 90,
      convenience: 78,
      cost: { estimated: 160 },
      isStepFree: true,
      stepFree: true,
      accessibleFeatures: ['Step-free plateau ramp', 'Wide paved path']
    }
  ];

  // ─── CRITERION 1: Identical inputs produce reproducible rankings ───
  it('1. Identical inputs and scoring configuration produce 100% reproducible rankings and scores', () => {
    const weights = deriveTravelerWeights(wheelchairTraveler);

    // Run 10 consecutive evaluations with identical input
    const runs = [];
    for (let i = 0; i < 10; i++) {
      runs.push(rankSegmentRoutes(sampleCandidateRoutes, weights, wheelchairTraveler));
    }

    const baseline = runs[0];
    assert.strictEqual(baseline[0].id, 'B', 'Route B must be ranked #1');
    assert.strictEqual(baseline[0].isRecommended, true);
    assert.strictEqual(baseline[1].id, 'C', 'Route C must be ranked #2');
    assert.strictEqual(baseline[2].id, 'A', 'Non-compliant Route A must be ranked last');
    assert.strictEqual(baseline[2].isEliminated, true);

    // Verify all subsequent runs match baseline strictly
    for (let i = 1; i < runs.length; i++) {
      assert.deepStrictEqual(
        runs[i].map(r => ({ id: r.id, score: r.score, isRecommended: r.isRecommended, isEliminated: r.isEliminated })),
        baseline.map(r => ({ id: r.id, score: r.score, isRecommended: r.isRecommended, isEliminated: r.isEliminated })),
        `Run #${i + 1} must match baseline identically`
      );
    }
  });

  // ─── CRITERION 2: Score breakdown reconciles mathematically with formula ───
  it('2. The displayed score breakdown reconciles with the actual 5-factor scoring formula', () => {
    const weights = deriveTravelerWeights(wheelchairTraveler);
    const breakdowns = generateScoreBreakdown(sampleCandidateRoutes, weights, wheelchairTraveler);

    assert.strictEqual(breakdowns.length, 3);

    breakdowns.forEach(item => {
      // 1. Must expose all 5 canonical factors
      const factors = item.breakdown.map(f => f.factor);
      assert.deepStrictEqual(factors, ['SAFETY', 'ACCESSIBILITY', 'CROWD', 'CONVENIENCE', 'COST']);

      // 2. Weights must sum to 1.00
      const totalWeight = item.breakdown.reduce((sum, f) => sum + f.weight, 0);
      assert.ok(Math.abs(totalWeight - 1.0) < 0.01, 'Factor weights must sum to 1.00');

      // 3. Each factor weighted contribution must equal value * weight
      item.breakdown.forEach(f => {
        const expectedWeighted = Number((f.value * f.weight).toFixed(1));
        assert.strictEqual(f.weighted, expectedWeighted, `Weighted score for ${f.factor} must match value*weight`);
      });

      // 4. Sum of weighted values must reconcile with composite score
      const sumWeighted = Number(item.breakdown.reduce((sum, f) => sum + f.weighted, 0).toFixed(2));
      assert.strictEqual(item.sumOfWeighted, sumWeighted);
      assert.strictEqual(item.reconciles, true, 'Breakdown must mathematically reconcile with composite score');
      assert.strictEqual(Math.round(sumWeighted), item.score);
    });
  });

  // ─── CRITERION 3: Rejected routes include specific reason codes ───
  it('3. Rejected routes include specific, structured reason codes and comparative explanations', () => {
    const weights = deriveTravelerWeights(wheelchairTraveler);
    const whyNot = generateWhyNotExplanation(sampleCandidateRoutes, weights, wheelchairTraveler);

    assert.strictEqual(whyNot.recommended.routeId, 'B');
    assert.strictEqual(whyNot.rejected.length, 2);

    // Route A rejected because it contains stairs (hard constraint violation)
    const rejectedA = whyNot.rejected.find(r => r.routeId === 'A');
    assert.ok(rejectedA);
    assert.strictEqual(rejectedA.isEliminated, true);
    assert.ok(
      rejectedA.reasonCodes.includes('KNOWN_STAIRS_PROHIBITED'),
      'Route A must include KNOWN_STAIRS_PROHIBITED reason code'
    );
    assert.ok(
      rejectedA.reasons.some(r => r.includes('HARD CONSTRAINT VIOLATION')),
      'Must explain hard constraint violation'
    );

    // Route C is compliant, but rejected because Route B has higher composite score
    const rejectedC = whyNot.rejected.find(r => r.routeId === 'C');
    assert.ok(rejectedC);
    assert.strictEqual(rejectedC.isEliminated, false);
    assert.ok(
      rejectedC.reasonCodes.includes('LOWER_COMPOSITE_SCORE'),
      'Route C must include LOWER_COMPOSITE_SCORE reason code'
    );
    assert.ok(
      rejectedC.reasons.some(r => r.includes('Overall composite score lower than recommended route')),
      'Must explain score differential'
    );
  });

  // ─── CRITERION 4: Explanations never claim unsupported incident verification ───
  it('4. Explanations never claim unsupported incident verification (verified vs unverified distinction)', async () => {
    const affectedSegment = {
      id: 'S3',
      origin: 'Panjim Hotel',
      destination: 'Fort Aguada',
      candidateRoutes: sampleCandidateRoutes
    };

    // Case 4A: VERIFIED Corridor Closure -> Must accurately cite verified closure and duration delta
    const verifiedClosureEvent = {
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'A',
      reason: 'Authoritative municipal flood gate closure at lower coastal avenue',
      verificationStatus: 'VERIFIED',
      isVerified: true,
      previousRecommendedId: 'A',
      previousRecommendedScore: 90,
      newRecommendedId: 'B',
      newRecommendedScore: 88,
      durationDeltaMin: 12,
      previousRoute: sampleCandidateRoutes[0],
      newRoute: sampleCandidateRoutes[1]
    };

    const verifiedExplanation = await generateAdaptationExplanation(
      verifiedClosureEvent,
      affectedSegment,
      sampleCandidateRoutes[1], // Route B
      wheelchairTraveler,
      null
    );

    // Grounded truth check: Matches target explanation format
    assert.ok(
      verifiedExplanation.explanation.includes('Route B was recommended because Route A intersects a verified closure'),
      'Must state that Route A intersects a verified closure'
    );
    assert.ok(
      verifiedExplanation.explanation.includes("satisfies the traveler's mandatory accessibility constraints"),
      'Must confirm mandatory accessibility constraints are satisfied'
    );
    assert.ok(
      verifiedExplanation.explanation.includes('estimated 12-minute longer travel time'),
      'Must accurately report the 12-minute travel time delta'
    );
    assert.strictEqual(verifiedExplanation.structuredChange.event.isVerified, true);
    assert.strictEqual(verifiedExplanation.structuredChange.durationDeltaMinutes, 12);

    // Case 4B: UNVERIFIED Incident Report -> Must NEVER claim verified closure
    const unverifiedReportEvent = {
      type: 'ROAD_CLOSURE',
      segmentId: 'S3',
      routeId: 'A',
      reason: 'Single unconfirmed rumor of tree branch on road',
      verificationStatus: 'UNVERIFIED',
      isVerified: false,
      previousRecommendedId: 'A',
      previousRecommendedScore: 90,
      newRecommendedId: 'A',
      newRecommendedScore: 90,
      durationDeltaMin: 0,
      previousRoute: sampleCandidateRoutes[0],
      newRoute: sampleCandidateRoutes[0]
    };

    const unverifiedExplanation = await generateAdaptationExplanation(
      unverifiedReportEvent,
      affectedSegment,
      sampleCandidateRoutes[0],
      wheelchairTraveler,
      null
    );

    // Anti-hallucination check: must NOT claim "verified closure"
    assert.strictEqual(
      unverifiedExplanation.explanation.includes('verified closure'),
      false,
      'Unverified event explanation must NEVER claim a verified closure exists'
    );
    assert.ok(
      unverifiedExplanation.explanation.toLowerCase().includes('unverified') ||
      unverifiedExplanation.explanation.toLowerCase().includes('advisory'),
      'Must explicitly state that the report is unverified / advisory'
    );
    assert.strictEqual(unverifiedExplanation.structuredChange.event.isVerified, false);
  });

  // ─── CRITERION 5: Factor deltas and route versions are accurately recorded ───
  it('5. Records exact factor deltas and route version shifts during dynamic adaptation', () => {
    const journeyState = {
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      segments: segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER)
    };

    // Hero elevator failure event on S3
    const elevatorEvent = {
      type: 'ACCESSIBILITY_DEGRADATION',
      segmentId: 'S3',
      routeId: 'B',
      severity: 1.0,
      reason: 'Elevator mechanical failure on north lower ramp',
      delta: { accessibility: 58 }
    };

    const result = applyJourneyEvent(journeyState, elevatorEvent);
    assert.strictEqual(result.routeChanged, true);
    assert.strictEqual(result.previousRecommendedId, 'B');
    assert.strictEqual(result.newRecommendedId, 'C');

    const record = result.eventRecord;
    assert.ok(record.id.startsWith('event-'));
    assert.strictEqual(record.previousRecommendedId, 'B');
    assert.strictEqual(record.newRecommendedId, 'C');
    assert.strictEqual(record.durationDeltaMin, 3); // 40 - 37 = +3 mins
    assert.strictEqual(record.distanceDeltaKm, 1.3); // 19.8 - 18.5 = 1.3 km
    assert.strictEqual(record.scoreDelta, -3); // 88 - 91 = -3 points
    assert.ok(record.previousRoute);
    assert.ok(record.newRoute);
  });

  // ─── CRITERION 6: Existing scoring behavior remains stable for unaffected journeys ───
  it('6. Existing route scoring behavior remains stable for unaffected journeys', () => {
    const baselineSegments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    assert.strictEqual(baselineSegments.length, 7);

    // Segment S1, S2, S4, S5, S6, S7 unaffected
    const s1 = baselineSegments.find(s => s.id === 'S1');
    assert.strictEqual(s1.recommendedRouteId, 'B');
    assert.strictEqual(s1.journeyScore, 80);

    const s2 = baselineSegments.find(s => s.id === 'S2');
    assert.strictEqual(s2.recommendedRouteId, 'B');
    assert.strictEqual(s2.journeyScore, 94);

    const s3 = baselineSegments.find(s => s.id === 'S3');
    assert.strictEqual(s3.recommendedRouteId, 'B');
    assert.strictEqual(s3.journeyScore, 91);
  });
});
