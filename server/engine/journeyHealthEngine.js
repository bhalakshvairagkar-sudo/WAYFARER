/**
 * WAYFARER AI - Journey Health Engine
 * Computes multi-dimensional real-time health metrics across 6 key axes:
 * 1. Accessibility
 * 2. Safety
 * 3. Reliability
 * 4. Time (Punctuality)
 * 5. Comfort
 * 6. Disruption Resilience
 *
 * Implements the signature visible transition: 91 (baseline) -> 57 (incident) -> 86 (adapted)
 */

/**
 * Calculates multi-dimensional Journey Health for a given journey state.
 * @param {Object} journeyState Full journey state object
 * @param {Object} [options] Context options (e.g. activeIncident, simulatedDegradation)
 * @returns {Object} Comprehensive Journey Health breakdown
 */
export function calculateJourneyHealth(journeyState = {}, options = {}) {
  const segments = journeyState.segments || [];
  if (segments.length === 0) {
    return {
      overall: 80,
      accessibility: 85,
      safety: 85,
      reliability: 80,
      time: 85,
      comfort: 80,
      disruption: 85,
      status: "GOOD",
      fitLabel: "Good Journey Health"
    };
  }

  // Active / recommended routes per segment
  const activeRoutes = segments.map(s => {
    return s.candidateRoutes?.find(r => r.isRecommended) || s.candidateRoutes?.[0] || {};
  });

  // 1. Accessibility Axis
  let totalAccess = 0;
  let accessCount = 0;
  activeRoutes.forEach(r => {
    if (r.accessibility !== undefined) {
      totalAccess += r.accessibility;
      accessCount++;
    }
  });
  let accessibility = accessCount > 0 ? Math.round(totalAccess / accessCount) : 85;

  // 2. Safety Axis
  let totalSafety = 0;
  let safetyCount = 0;
  activeRoutes.forEach(r => {
    if (r.safety !== undefined) {
      totalSafety += r.safety;
      safetyCount++;
    }
  });
  let safety = safetyCount > 0 ? Math.round(totalSafety / safetyCount) : 88;

  // 3. Comfort Axis (Crowd density + Convenience)
  let totalComfort = 0;
  let comfortCount = 0;
  activeRoutes.forEach(r => {
    const crowd = r.crowd ?? 75;
    const conv = r.convenience ?? 75;
    totalComfort += (crowd + conv) / 2;
    comfortCount++;
  });
  let comfort = comfortCount > 0 ? Math.round(totalComfort / comfortCount) : 82;

  // 4. Time / Punctuality Axis (Delay penalty)
  const delayMin = journeyState.downstreamImpact?.cascadeDelayMin || 0;
  let time = Math.max(20, Math.min(100, Math.round(95 - delayMin * 1.5)));

  // 5. Disruption Axis
  let disruption = 92;
  const activeEvent = options.activeIncident || journeyState.eventRecord;
  if (activeEvent) {
    const sev = activeEvent.severity ?? 0.8;
    disruption = Math.max(20, Math.round(92 - sev * 45));
  }

  // 6. Reliability Axis
  let reliability = Math.round(0.4 * safety + 0.3 * disruption + 0.3 * time);

  // Check for active unmitigated degradation on an active route
  const degradedRoute = activeRoutes.find(r => r.activeEvent || r.elevatorFailure);
  if (degradedRoute || options.simulateDegradation) {
    // Before adaptation: active route is broken
    accessibility = options.simulateDegradation?.accessibility ?? Math.min(accessibility, degradedRoute?.accessibility || 38);
    safety = Math.max(30, safety - 22);
    reliability = Math.max(20, reliability - 42);
    disruption = Math.max(20, disruption - 45);
  }

  // Composite Weighted Overall Score:
  // Accessibility: 0.30, Safety: 0.25, Reliability: 0.15, Time: 0.15, Comfort: 0.10, Disruption: 0.05
  const overall = Math.round(
    0.30 * accessibility +
    0.25 * safety +
    0.15 * reliability +
    0.15 * time +
    0.10 * comfort +
    0.05 * disruption
  );

  let status = "GOOD";
  let fitLabel = "Good Health";
  if (overall < 65) {
    status = "DEGRADED";
    fitLabel = "Critical Attention Required";
  } else if (overall < 80) {
    status = "ATTENTION";
    fitLabel = "Moderate Disruption";
  } else if (overall >= 90) {
    status = "OPTIMAL";
    fitLabel = "Optimal Flow";
  }

  return {
    overall,
    accessibility,
    safety,
    reliability,
    time,
    comfort,
    disruption,
    status,
    fitLabel
  };
}

/**
 * Creates a structured transition trace demonstrating the 91 -> 57 -> 86 story.
 * @param {Object} baselineJourney Baseline journey state
 * @param {Object} incident Incident or event
 * @param {Object} adaptedJourney Adapted journey state
 * @returns {Object} { before, duringIncident, afterAdaptation }
 */
export function trackHealthTransition(baselineJourney, incident, adaptedJourney) {
  const before = calculateJourneyHealth(baselineJourney);

  // During incident (before route adaptation is accepted)
  const duringIncident = calculateJourneyHealth(baselineJourney, {
    activeIncident: incident,
    simulateDegradation: { accessibility: 38 }
  });

  // After adaptation (Route C promoted, step-free access preserved)
  const afterAdaptation = calculateJourneyHealth(adaptedJourney, {
    activeIncident: incident
  });

  return {
    story: `${before.overall} → ${duringIncident.overall} → ${afterAdaptation.overall}`,
    before,
    duringIncident,
    afterAdaptation
  };
}
