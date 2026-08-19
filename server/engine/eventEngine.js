/**
 * WAYFARER AI - Generic Event Engine
 * Handles real-world dynamic event mutations without hardcoding route winners.
 */

import { rankSegmentRoutes, deriveTravelerWeights } from "./scoringEngine.js";

/**
 * Apply a generic real-world event to the journey state.
 * @param {Object} currentJourneyState 
 * @param {Object} eventPayload 
 * @returns {Object} { updatedSegments, affectedSegment, previousRecommendedId, newRecommendedId, changeDetected, eventRecord }
 */
export function applyJourneyEvent(currentJourneyState, eventPayload) {
  const { type, segmentId = "S3", routeId, severity = 0.5, reason = "Real-world environmental change", delta = {} } = eventPayload;

  const weights = deriveTravelerWeights(currentJourneyState.traveler);
  const segments = JSON.parse(JSON.stringify(currentJourneyState.segments || []));

  const targetSegment = segments.find(s => s.id === segmentId);
  if (!targetSegment) {
    throw new Error(`Segment with ID "${segmentId}" not found in journey state.`);
  }

  const previousRecommended = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
  const previousRecommendedId = previousRecommended.id;
  const previousRecommendedScore = previousRecommended.score;

  // Apply factor mutations based on event type and delta
  targetSegment.candidateRoutes = targetSegment.candidateRoutes.map(route => {
    // If routeId is specified, apply only to that route; otherwise apply to matching routes
    const isTargetRoute = !routeId || route.id === routeId;

    if (!isTargetRoute) {
      return route;
    }

    let newSafety = route.safety;
    let newAccessibility = route.accessibility;
    let newCrowd = route.crowd;
    let newConvenience = route.convenience;
    let eventNote = "";

    switch (type) {
      case "ACCESSIBILITY_DEGRADATION":
        // Direct drop in accessibility (e.g. elevator failure, ramp closure)
        const accessDrop = delta.accessibility ?? Math.round(58 * severity);
        newAccessibility = Math.max(10, route.accessibility - accessDrop);
        eventNote = `Elevator / ramp failure: Accessibility degraded from ${route.accessibility} to ${newAccessibility}`;
        break;

      case "CROWD_SPIKE":
        // Drop in crowd suitability (higher congestion)
        const crowdDrop = delta.crowd ?? Math.round(45 * severity);
        newCrowd = Math.max(10, route.crowd - crowdDrop);
        eventNote = `Severe foot-traffic congestion: Crowd score dropped from ${route.crowd} to ${newCrowd}`;
        break;

      case "SAFETY_ALERT":
        const safetyDrop = delta.safety ?? Math.round(40 * severity);
        newSafety = Math.max(10, route.safety - safetyDrop);
        eventNote = `Safety alert reported on corridor: Safety score dropped from ${route.safety} to ${newSafety}`;
        break;

      case "TRANSPORT_DELAY":
        const addedMin = delta.durationMin ?? Math.round(30 * severity);
        route.durationMin += addedMin;
        newConvenience = Math.max(10, route.convenience - Math.round(addedMin / 2));
        eventNote = `Transit delay of +${addedMin} mins applied.`;
        break;

      case "ROUTE_DEVIATION":
        eventNote = "Traveler deviation detected from planned route geometry.";
        break;

      default:
        break;
    }

    return {
      ...route,
      safety: newSafety,
      accessibility: newAccessibility,
      crowd: newCrowd,
      convenience: newConvenience,
      activeEvent: {
        type,
        reason,
        note: eventNote,
        timestamp: new Date().toISOString()
      }
    };
  });

  // Re-rank all routes for the affected segment using deterministic weights
  const rerankedRoutes = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
  const newRecommended = rerankedRoutes.find(r => r.isRecommended) || rerankedRoutes[0];
  const newRecommendedId = newRecommended.id;
  const newRecommendedScore = newRecommended.score;

  targetSegment.candidateRoutes = rerankedRoutes;
  targetSegment.recommendedRouteId = newRecommendedId;
  targetSegment.journeyScore = newRecommendedScore;

  const routeChanged = previousRecommendedId !== newRecommendedId;
  const scoreChanged = previousRecommendedScore !== newRecommendedScore;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const eventRecord = {
    id: `event-${Date.now()}`,
    timestamp: timeString,
    type,
    segmentId,
    affectedSegmentName: `${targetSegment.origin} → ${targetSegment.destination}`,
    reason,
    previousRecommendedId,
    previousRecommendedScore,
    newRecommendedId,
    newRecommendedScore,
    routeChanged,
    scoreChanged
  };

  return {
    updatedSegments: segments,
    affectedSegment: targetSegment,
    previousRecommendedId,
    newRecommendedId,
    routeChanged,
    scoreChanged,
    eventRecord
  };
}
