/**
 * WAYFARER AI - Deterministic Multi-Factor Scoring Engine
 * 
 * Mathematical Formulation:
 * Segment Score = wSafety * Safety + wAccessibility * Accessibility + wCrowd * Crowd + wConvenience * Convenience
 * 
 * Weights are derived transparently from the traveler profile and always normalize to 1.0.
 */

/**
 * Derive normalized weights (summing to 1.0) from traveler preferences and mobility profile.
 * @param {Object} traveler 
 * @returns {Object} { safety, accessibility, crowd, convenience }
 */
export function deriveTravelerWeights(traveler = {}) {
  // If traveler already has customized explicit weights (e.g. from state), use them after validation
  if (traveler.weights && typeof traveler.weights.safety === 'number') {
    const sum = Number((traveler.weights.safety + traveler.weights.accessibility + traveler.weights.crowd + traveler.weights.convenience).toFixed(2));
    if (sum === 1.0) return traveler.weights;
  }

  const mobility = (traveler.mobility || "").toLowerCase();
  const stairsDisallowed = traveler.stairsAllowed === false || traveler.avoidStairs === true;
  const rampsPreferred = traveler.rampsPreferred === true;
  const safetyPriority = (traveler.safetyPriority || "").toLowerCase();
  const crowdTolerance = (traveler.crowdTolerance || "").toLowerCase();
  const isWheelchair = mobility.includes("wheelchair") || mobility.includes("power_wheelchair");

  // Canonical archetype mapping for Wheelchair Solo Traveler (Aditi scenario)
  if (isWheelchair && safetyPriority === "high" && crowdTolerance === "low") {
    return {
      safety: 0.30,
      accessibility: 0.40,
      crowd: 0.20,
      convenience: 0.10
    };
  }

  // Dynamic derivation for arbitrary traveler profiles
  let raw = {
    safety: 25,
    accessibility: 25,
    crowd: 25,
    convenience: 25
  };

  if (isWheelchair) {
    raw.accessibility += 35;
    raw.safety += 15;
    raw.convenience -= 20;
  } else if (stairsDisallowed || mobility.includes("elderly") || mobility.includes("cane")) {
    raw.accessibility += 25;
    raw.safety += 15;
    raw.convenience -= 15;
  } else if (rampsPreferred) {
    raw.accessibility += 15;
  }

  if (safetyPriority === "high" || safetyPriority === "critical") {
    raw.safety += 20;
    raw.convenience -= 10;
  } else if (safetyPriority === "low") {
    raw.safety -= 10;
    raw.convenience += 10;
  }

  if (crowdTolerance === "low" || crowdTolerance === "avoid_crowds") {
    raw.crowd += 15;
    raw.convenience -= 10;
  } else if (crowdTolerance === "high") {
    raw.crowd -= 10;
    raw.convenience += 10;
  }

  if (traveler.longerRouteAccepted === true) {
    raw.convenience = Math.max(10, raw.convenience - 10);
  }

  raw.safety = Math.max(5, raw.safety);
  raw.accessibility = Math.max(5, raw.accessibility);
  raw.crowd = Math.max(5, raw.crowd);
  raw.convenience = Math.max(5, raw.convenience);

  const total = raw.safety + raw.accessibility + raw.crowd + raw.convenience;
  const weights = {
    safety: Number((raw.safety / total).toFixed(2)),
    accessibility: Number((raw.accessibility / total).toFixed(2)),
    crowd: Number((raw.crowd / total).toFixed(2)),
    convenience: Number((raw.convenience / total).toFixed(2))
  };

  const sum = Number((weights.safety + weights.accessibility + weights.crowd + weights.convenience).toFixed(2));
  if (sum !== 1.0) {
    const diff = Number((1.0 - sum).toFixed(2));
    weights.accessibility = Number((weights.accessibility + diff).toFixed(2));
  }

  return weights;
}

/**
 * Calculate multi-factor score for an individual candidate route.
 * @param {Object} routeCandidate 
 * @param {Object} weights 
 * @returns {Object} Score details and composite score
 */
export function calculateRouteScore(routeCandidate, weights) {
  const safety = Math.min(100, Math.max(0, routeCandidate.safety ?? 70));
  const accessibility = Math.min(100, Math.max(0, routeCandidate.accessibility ?? 70));
  const crowd = Math.min(100, Math.max(0, routeCandidate.crowd ?? 70));
  const convenience = Math.min(100, Math.max(0, routeCandidate.convenience ?? 70));

  const weightedSafety = weights.safety * safety;
  const weightedAccessibility = weights.accessibility * accessibility;
  const weightedCrowd = weights.crowd * crowd;
  const weightedConvenience = weights.convenience * convenience;

  const rawScore = weightedSafety + weightedAccessibility + weightedCrowd + weightedConvenience;
  const compositeScore = Math.round(rawScore);

  return {
    rawScore: Number(rawScore.toFixed(2)),
    compositeScore,
    breakdown: {
      safety: { value: safety, weighted: Number(weightedSafety.toFixed(1)), weight: weights.safety },
      accessibility: { value: accessibility, weighted: Number(weightedAccessibility.toFixed(1)), weight: weights.accessibility },
      crowd: { value: crowd, weighted: Number(weightedCrowd.toFixed(1)), weight: weights.crowd },
      convenience: { value: convenience, weighted: Number(weightedConvenience.toFixed(1)), weight: weights.convenience }
    }
  };
}

/**
 * Rank candidate routes for a given segment and assign recommendation.
 * @param {Array} candidateRoutes 
 * @param {Object} weights 
 * @returns {Array} Ranked candidate routes with scores
 */
export function rankSegmentRoutes(candidateRoutes = [], weights) {
  const scoredRoutes = candidateRoutes.map(route => {
    const scoreResult = calculateRouteScore(route, weights);
    return {
      ...route,
      score: scoreResult.compositeScore,
      rawScore: scoreResult.rawScore,
      breakdown: scoreResult.breakdown
    };
  });

  // Sort descending by composite score, then by accessibility, then convenience
  scoredRoutes.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.accessibility !== a.accessibility) return b.accessibility - a.accessibility;
    return b.convenience - a.convenience;
  });

  // Assign recommended tag to the highest scoring route
  return scoredRoutes.map((route, index) => ({
    ...route,
    isRecommended: index === 0,
    rank: index + 1
  }));
}

/**
 * Compute the Overall Journey Score and Day-wise breakdown from all segments.
 * @param {Array} segments 
 * @returns {Object} { overallScore, fitLevel, dayScores, segmentScores }
 */
export function calculateOverallJourneyScore(segments = []) {
  if (!segments || segments.length === 0) {
    return { overallScore: 0, fitLevel: "NO_DATA", dayScores: {}, segmentScores: {} };
  }

  const dayBuckets = {};
  const segmentScores = {};

  segments.forEach(seg => {
    const recRoute = seg.candidateRoutes?.find(r => r.isRecommended) || seg.candidateRoutes?.[0];
    const score = recRoute ? recRoute.score : (seg.journeyScore || 85);
    const day = seg.day || 1;

    if (!dayBuckets[day]) dayBuckets[day] = [];
    dayBuckets[day].push(score);

    segmentScores[seg.id] = score;
  });

  const dayScores = {};
  let totalSum = 0;
  let totalCount = 0;

  Object.entries(dayBuckets).forEach(([day, scores]) => {
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    dayScores[day] = avg;
    totalSum += avg;
    totalCount += 1;
  });

  const overallScore = totalCount > 0 ? Math.round(totalSum / totalCount) : 0;

  let fitLevel = "EXCELLENT FIT";
  if (overallScore < 70) fitLevel = "NEEDS ATTENTION";
  else if (overallScore < 85) fitLevel = "GOOD FIT";
  else fitLevel = "EXCELLENT FIT";

  return {
    overallScore,
    fitLevel,
    dayScores,
    segmentScores
  };
}
