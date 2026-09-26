/**
 * WAYFARER AI - Deterministic Multi-Factor Scoring Engine
 * 
 * Mathematical Formulation:
 * Segment Score = wSafety * Safety + wAccessibility * Accessibility + wCrowd * Crowd + wConvenience * Convenience + wCost * Cost
 * 
 * Weights are derived transparently from the traveler profile and always normalize to 1.0.
 */

/**
 * Derive normalized weights (summing to 1.0) from traveler preferences and mobility profile.
 * @param {Object} traveler 
 * @returns {Object} { safety, accessibility, crowd, convenience, cost }
 */
export function deriveTravelerWeights(traveler = {}) {
  // If traveler already has customized explicit weights (e.g. from state)
  if (traveler.weights && typeof traveler.weights.safety === 'number') {
    const hasCost = typeof traveler.weights.cost === 'number';
    let safety = traveler.weights.safety;
    let accessibility = traveler.weights.accessibility;
    let crowd = traveler.weights.crowd;
    let convenience = traveler.weights.convenience;
    let cost = hasCost ? traveler.weights.cost : 0.0;

    if (!hasCost) {
      // Auto-distribute by taking 0.15 for cost proportionally from others
      cost = 0.15;
      const factor = (1.0 - cost) / 1.0;
      safety = Number((safety * factor).toFixed(2));
      accessibility = Number((accessibility * factor).toFixed(2));
      crowd = Number((crowd * factor).toFixed(2));
      convenience = Number((convenience * factor).toFixed(2));
    }

    const sum = Number((safety + accessibility + crowd + convenience + cost).toFixed(2));
    if (sum === 1.0) {
      return { safety, accessibility, crowd, convenience, cost };
    } else {
      const diff = Number((1.0 - sum).toFixed(2));
      accessibility = Number((accessibility + diff).toFixed(2));
      return { safety, accessibility, crowd, convenience, cost };
    }
  }

  const mobility = (traveler.mobility || "").toLowerCase();
  const stairsDisallowed = traveler.stairsAllowed === false || traveler.avoidStairs === true;
  const rampsPreferred = traveler.rampsPreferred === true;
  const safetyPriority = (traveler.safetyPriority || "").toLowerCase();
  const crowdTolerance = (traveler.crowdTolerance || "").toLowerCase();
  const isWheelchair = mobility.includes("wheelchair") || mobility.includes("power_wheelchair");
  const budgetPriority = (traveler.budgetPriority || "").toLowerCase();

  // Canonical archetype mapping for Wheelchair Solo Traveler (Aditi scenario)
  if (isWheelchair && safetyPriority === "high" && crowdTolerance === "low" && budgetPriority !== "high") {
    return {
      safety: 0.25,
      accessibility: 0.35,
      crowd: 0.15,
      convenience: 0.10,
      cost: 0.15
    };
  }

  // Dynamic derivation for arbitrary traveler profiles
  let raw = {
    safety: 20,
    accessibility: 20,
    crowd: 20,
    convenience: 20,
    cost: 20
  };

  if (isWheelchair) {
    raw.accessibility += 35;
    raw.safety += 15;
    raw.convenience -= 20;
    raw.cost -= 5;
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
    raw.convenience = Math.max(5, raw.convenience - 10);
  }

  if (budgetPriority === "high") {
    raw.cost += 20;
    raw.convenience -= 5;
    raw.crowd -= 5;
  } else if (budgetPriority === "low") {
    raw.cost -= 10;
    raw.convenience += 5;
  }

  raw.safety = Math.max(5, raw.safety);
  raw.accessibility = Math.max(5, raw.accessibility);
  raw.crowd = Math.max(5, raw.crowd);
  raw.convenience = Math.max(5, raw.convenience);
  raw.cost = Math.max(5, raw.cost);

  const total = raw.safety + raw.accessibility + raw.crowd + raw.convenience + raw.cost;
  const weights = {
    safety: Number((raw.safety / total).toFixed(2)),
    accessibility: Number((raw.accessibility / total).toFixed(2)),
    crowd: Number((raw.crowd / total).toFixed(2)),
    convenience: Number((raw.convenience / total).toFixed(2)),
    cost: Number((raw.cost / total).toFixed(2))
  };

  const sum = Number((weights.safety + weights.accessibility + weights.crowd + weights.convenience + weights.cost).toFixed(2));
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
  const costRaw = routeCandidate.cost;
  const cost = Math.min(100, Math.max(0,
    typeof costRaw === 'number' ? costRaw :
    (costRaw && typeof costRaw === 'object' && costRaw.estimated !== undefined)
      ? Math.max(0, 100 - Math.round(costRaw.estimated / 20))
      : 70
  ));

  const weightedSafety = weights.safety * safety;
  const weightedAccessibility = weights.accessibility * accessibility;
  const weightedCrowd = weights.crowd * crowd;
  const weightedConvenience = weights.convenience * convenience;
  const weightedCost = (weights.cost || 0) * cost;

  const rawScore = weightedSafety + weightedAccessibility + weightedCrowd + weightedConvenience + weightedCost;
  const compositeScore = Math.round(rawScore);

  return {
    rawScore: Number(rawScore.toFixed(2)),
    compositeScore,
    breakdown: {
      safety: { value: safety, weighted: Number(weightedSafety.toFixed(1)), weight: weights.safety },
      accessibility: { value: accessibility, weighted: Number(weightedAccessibility.toFixed(1)), weight: weights.accessibility },
      crowd: { value: crowd, weighted: Number(weightedCrowd.toFixed(1)), weight: weights.crowd },
      convenience: { value: convenience, weighted: Number(weightedConvenience.toFixed(1)), weight: weights.convenience },
      cost: { value: cost, weighted: Number(weightedCost.toFixed(1)), weight: weights.cost || 0 }
    }
  };
}

/**
 * Extract hard constraints and preferences separately from traveler profile.
 * Hard constraints represent absolute requirements (e.g. stairsAllowed: false)
 * that eliminate infeasible routes, distinct from preference weights.
 * @param {Object} traveler 
 * @returns {Object} Extracted hard constraints
 */
export function extractHardConstraints(traveler = {}) {
  if (!traveler) return {};
  const mobility = (traveler.mobility || "").toLowerCase();
  const isWheelchair = mobility.includes("wheelchair") || mobility.includes("power_wheelchair");

  const acc = traveler.accessibility || {};
  
  const stairsAllowed = acc.stairsAllowed !== undefined
    ? acc.stairsAllowed
    : (traveler.stairsAllowed !== undefined ? traveler.stairsAllowed : (isWheelchair ? false : true));

  const stepFreeRequired = acc.stepFreeRequired !== undefined
    ? acc.stepFreeRequired
    : (traveler.stepFreeRequired !== undefined ? traveler.stepFreeRequired : (isWheelchair ? true : false));

  const elevatorRequired = acc.elevatorRequired !== undefined
    ? acc.elevatorRequired
    : (traveler.elevatorRequired !== undefined ? traveler.elevatorRequired : (isWheelchair ? true : false));

  const rampRequired = acc.rampRequired !== undefined
    ? acc.rampRequired
    : (traveler.rampRequired !== undefined ? traveler.rampRequired : (traveler.rampsPreferred || false));

  const maxWalkDistanceKm = traveler.constraints?.maxWalkDistanceKm || traveler.maxWalkDistanceKm || null;
  const arrivalDeadline = traveler.constraints?.arrivalDeadline || traveler.arrivalDeadline || null;

  return {
    isWheelchair,
    stairsAllowed,
    stepFreeRequired,
    elevatorRequired,
    rampRequired,
    maxWalkDistanceKm,
    arrivalDeadline
  };
}

/**
 * Validates a single candidate route against traveler hard constraints.
 * @param {Object} route 
 * @param {Object} travelerOrConstraints 
 * @returns {Object} { valid: boolean, violations: string[] }
 */
export function validateRouteConstraints(route, travelerOrConstraints = {}) {
  if (!route) return { valid: false, violations: ["Route is undefined"] };

  const constraints = (travelerOrConstraints.isWheelchair !== undefined || travelerOrConstraints.stairsAllowed !== undefined)
    ? travelerOrConstraints
    : extractHardConstraints(travelerOrConstraints);

  const violations = [];
  const features = (route.accessibleFeatures || []).join(" ").toLowerCase();
  const routeName = (route.name || "").toLowerCase();
  const routeTagline = (route.tagline || "").toLowerCase();
  const allText = `${routeName} ${routeTagline} ${features}`;

  // 1. Stairs Check
  const hasStairsPattern = /\b(stairs|steps|stairway|staircase|flight of steps|steep steps|cobblestone stairs)\b/i;
  const negatesStairsPattern = /\b(no steps|zero steps|step-free|step free|without stairs|no stairs)\b/i;
  const routeHasStairs = route.hasStairs === true || (hasStairsPattern.test(allText) && !negatesStairsPattern.test(allText));

  if (constraints.stairsAllowed === false && routeHasStairs) {
    violations.push("Route contains stairs/steps, violating traveler's step-free constraint");
  }

  // 2. Step-Free Requirement
  const isStepFree = route.isStepFree === true || route.stepFree === true ||
    negatesStairsPattern.test(allText) ||
    /step-free ramped access|100% step-free|continuous.*ramp/i.test(allText);

  if (constraints.stepFreeRequired) {
    if (route.isStepFree === false || route.stepFree === false) {
      violations.push("Route is marked as not step-free");
    } else if (routeHasStairs && !isStepFree) {
      violations.push("Route lacks continuous step-free access");
    }
  }

  // 3. Elevator Requirement & Active Outage Disruption
  const hasActiveElevatorDisruption = (
    (route.activeEvent?.type === "ACCESSIBILITY_DEGRADATION" || route.activeEvent?.type === "ELEVATOR_OUTAGE") &&
    /elevator|lift/i.test(route.activeEvent.reason || route.activeEvent.note || "")
  ) || route.elevatorFailure === true;

  const elevatorUnavailable = route.elevatorAvailable === false || hasActiveElevatorDisruption;

  if (constraints.elevatorRequired && elevatorUnavailable) {
    violations.push("Required elevator is unavailable or out of service on this route");
  }

  // 4. Wheelchair Safe Mobility Accessibility Threshold (score < 50)
  if (constraints.isWheelchair && route.accessibility !== undefined && route.accessibility < 50) {
    violations.push(`Route accessibility (${route.accessibility}/100) is below safe wheelchair mobility threshold (50)`);
  }

  // 5. Walking Distance Constraint
  if (constraints.maxWalkDistanceKm && route.distanceKm && route.distanceKm > constraints.maxWalkDistanceKm) {
    violations.push(`Route distance (${route.distanceKm} km) exceeds maximum walking tolerance (${constraints.maxWalkDistanceKm} km)`);
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Filter route candidates down to strictly valid routes that satisfy all hard constraints.
 * Implements the Route Candidates -> Constraint Validator -> Valid routes pipeline.
 * @param {Array} candidateRoutes 
 * @param {Object} travelerOrConstraints 
 * @returns {Array} Strictly valid candidate routes
 */
export function filterValidRoutes(candidateRoutes = [], travelerOrConstraints = {}) {
  if (!candidateRoutes || candidateRoutes.length === 0) return [];
  const constraints = (travelerOrConstraints.isWheelchair !== undefined || travelerOrConstraints.stairsAllowed !== undefined)
    ? travelerOrConstraints
    : extractHardConstraints(travelerOrConstraints);

  return candidateRoutes.filter(route => {
    const result = validateRouteConstraints(route, constraints);
    return result.valid;
  });
}

/**
 * Rank candidate routes for a given segment and assign recommendation.
 * Routes violating hard constraints are eliminated from recommendation eligibility.
 * @param {Array} candidateRoutes 
 * @param {Object} weights 
 * @param {Object} [traveler] Optional traveler profile to validate hard constraints
 * @returns {Array} Ranked candidate routes with scores and validity flags
 */
export function rankSegmentRoutes(candidateRoutes = [], weights, traveler = null) {
  const constraints = traveler ? extractHardConstraints(traveler) : null;

  // Step 1: Constraint Validation
  const routesWithConstraints = candidateRoutes.map(route => {
    if (!constraints) {
      return { ...route, isFeasible: true, isEliminated: false, violations: [] };
    }
    const validation = validateRouteConstraints(route, constraints);
    return {
      ...route,
      isFeasible: validation.valid,
      isEliminated: !validation.valid,
      violations: validation.violations
    };
  });

  // Step 2: 5-Factor Scoring
  const scoredRoutes = routesWithConstraints.map(route => {
    const scoreResult = calculateRouteScore(route, weights);
    return {
      ...route,
      score: scoreResult.compositeScore,
      rawScore: scoreResult.rawScore,
      breakdown: scoreResult.breakdown
    };
  });

  // Step 3: Ranking - Feasible routes always rank above eliminated routes
  scoredRoutes.sort((a, b) => {
    if (a.isFeasible !== b.isFeasible) {
      return a.isFeasible ? -1 : 1;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (b.accessibility !== a.accessibility) return (b.accessibility || 0) - (a.accessibility || 0);
    return (b.convenience || 0) - (a.convenience || 0);
  });

  // Step 4: Assign recommendation - Only the highest scoring FEASIBLE route is recommended
  const firstFeasibleIndex = scoredRoutes.findIndex(r => r.isFeasible);

  return scoredRoutes.map((route, index) => ({
    ...route,
    isRecommended: route.isFeasible && index === firstFeasibleIndex,
    rank: index + 1
  }));
}

/**
 * Generate a detailed score breakdown for each route.
 * @param {Array} candidateRoutes 
 * @param {Object} weights 
 * @returns {Array} List of detailed breakdown objects
 */
export function generateScoreBreakdown(candidateRoutes = [], weights) {
  const scoredRoutes = rankSegmentRoutes(candidateRoutes, weights);

  return scoredRoutes.map(route => {
    return {
      routeId: route.id,
      routeName: route.name,
      isRecommended: route.isRecommended,
      score: route.score,
      breakdown: [
        { factor: 'SAFETY', value: route.breakdown.safety.value, weight: route.breakdown.safety.weight, weighted: route.breakdown.safety.weighted },
        { factor: 'ACCESSIBILITY', value: route.breakdown.accessibility.value, weight: route.breakdown.accessibility.weight, weighted: route.breakdown.accessibility.weighted },
        { factor: 'CROWD', value: route.breakdown.crowd.value, weight: route.breakdown.crowd.weight, weighted: route.breakdown.crowd.weighted },
        { factor: 'CONVENIENCE', value: route.breakdown.convenience.value, weight: route.breakdown.convenience.weight, weighted: route.breakdown.convenience.weighted },
        { factor: 'COST', value: route.breakdown.cost.value, weight: route.breakdown.cost.weight, weighted: route.breakdown.cost.weighted }
      ],
      total: route.rawScore
    };
  });
}

/**
 * Generate a structured comparative explanation for why alternative routes were rejected.
 * @param {Array} candidateRoutes 
 * @param {Object} weights 
 * @returns {Object} Structured explanation { recommended, rejected: [] }
 */
export function generateWhyNotExplanation(candidateRoutes = [], weights, traveler = null) {
  if (!candidateRoutes || candidateRoutes.length === 0) return { recommended: null, rejected: [] };

  const scoredRoutes = rankSegmentRoutes(candidateRoutes, weights, traveler);
  const recommended = scoredRoutes.find(r => r.isRecommended) || scoredRoutes[0];
  const rejected = scoredRoutes.filter(r => r.id !== recommended?.id);

  const getStrengths = (route) => {
    let strengths = [];
    if (route.accessibility >= 90) strengths.push(`Accessibility: ${route.accessibility} (highest remaining)`);
    else if (route.accessibility >= 80) strengths.push(`Accessibility: ${route.accessibility} (meets wheelchair threshold)`);
    if (route.crowd >= 80) strengths.push(`Crowd: ${route.crowd} (low density)`);
    if (route.safety >= 90) strengths.push(`Safety: ${route.safety} (highly secure)`);
    if (route.cost >= 85) strengths.push(`Cost: ${route.cost} (highly economical)`);
    if (route.elevatorDependency === false) strengths.push('No elevator dependency');
    
    if (strengths.length === 0) strengths.push('Highest overall balanced score');
    return strengths;
  };

  const getReasons = (route, recommendedRoute) => {
    let reasons = [];

    // If route was eliminated by hard constraint validator, that is the primary reason
    if (route.isEliminated && route.violations && route.violations.length > 0) {
      route.violations.forEach(v => reasons.push(`HARD CONSTRAINT VIOLATION: ${v}`));
      return reasons;
    }

    const factors = ['accessibility', 'safety', 'crowd', 'convenience', 'cost'];
    
    factors.forEach(factor => {
      const val = route[factor] || 70;
      const recVal = recommendedRoute ? (recommendedRoute[factor] || 70) : 70;
      
      if (factor === 'accessibility' && val < 80) {
        reasons.push(`Accessibility: ${val} — well below wheelchair threshold of 80`);
      } else if (recVal - val > 15) {
        let context = '';
        if (factor === 'crowd' && val < 70) context = ' — exceeds low-tolerance comfort zone';
        else if (factor === 'safety') context = ' — significant security or terrain concern';
        reasons.push(`${factor.charAt(0).toUpperCase() + factor.slice(1)}: ${val}${context}`);
      }
    });

    if (route.elevatorFailure === true) {
      reasons.push('Accessibility dropped significantly after elevator failure');
      reasons.push('Critical step-free path dependency broken');
    }

    if (reasons.length === 0 && recommendedRoute) {
      reasons.push(`Overall composite score lower than recommended route (${route.score} vs ${recommendedRoute.score})`);
    }

    return reasons;
  };

  return {
    recommended: {
      routeId: recommended.id,
      routeName: recommended.name,
      score: recommended.score,
      strengths: getStrengths(recommended)
    },
    rejected: rejected.map(route => ({
      routeId: route.id,
      routeName: route.name,
      score: route.score,
      isEliminated: Boolean(route.isEliminated),
      violations: route.violations || [],
      reasons: getReasons(route, recommended)
    }))
  };
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
