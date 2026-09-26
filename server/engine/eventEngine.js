/**
 * WAYFARER AI - Generic Event Engine v2.0
 * Handles real-world dynamic event mutations with graph-aware dependency cascades.
 * Supports: ACCESSIBILITY_DEGRADATION, TRANSPORT_DELAY, ACTIVITY_CANCELLATION, CROWD_SPIKE, SAFETY_ALERT, ROUTE_DEVIATION
 */

import { rankSegmentRoutes, deriveTravelerWeights } from "./scoringEngine.js";
import { buildItineraryGraph, propagateDelay, substituteNode } from "./itineraryGraphEngine.js";
import { ALTERNATIVE_ACTIVITIES } from "../data/defaultJourney.js";

/**
 * Haversine distance in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Apply a generic real-world event to the journey state.
 * @param {Object} currentJourneyState 
 * @param {Object} eventPayload 
 * @returns {Object} { updatedSegments, affectedSegment, previousRecommendedId, newRecommendedId, routeChanged, scoreChanged, eventRecord, graphImpact }
 */
export function applyJourneyEvent(currentJourneyState, eventPayload) {
  const firstSegId = currentJourneyState.segments?.[0]?.id || "S1";
  const { type, segmentId = firstSegId, routeId, severity = 0.5, reason = "Real-world environmental change", delta = {}, delayMinutes, nodeId } = eventPayload;

  const weights = deriveTravelerWeights(currentJourneyState.traveler);
  const segments = JSON.parse(JSON.stringify(currentJourneyState.segments || []));
  const stops = currentJourneyState.stops || [];

  let targetSegment = segments.find(s => s.id === segmentId);
  let graphImpact = null;
  let previousRecommendedId = null;
  let previousRecommendedScore = null;
  let newRecommendedId = null;
  let newRecommendedScore = null;
  let routeChanged = false;
  let scoreChanged = false;
  let extraEventData = {};

  // ─── EVENT A: ACCESSIBILITY_DEGRADATION ───
  if (type === "ACCESSIBILITY_DEGRADATION") {
    if (!targetSegment) throw new Error(`Segment "${segmentId}" not found.`);

    const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
    previousRecommendedId = prevRec.id;
    previousRecommendedScore = prevRec.score;

    // Apply accessibility drop to targeted route
    targetSegment.candidateRoutes = targetSegment.candidateRoutes.map(route => {
      if (routeId && route.id !== routeId) return route;

      const accessDrop = delta.accessibility ?? Math.round(58 * severity);
      const newAccessibility = Math.max(10, route.accessibility - accessDrop);
      const eventNote = `Elevator/ramp failure: Accessibility degraded from ${route.accessibility} to ${newAccessibility}`;

      return {
        ...route,
        accessibility: newAccessibility,
        activeEvent: { type, reason, note: eventNote, timestamp: new Date().toISOString() }
      };
    });

    // Re-rank
    const reranked = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
    targetSegment.candidateRoutes = reranked;
    const newRec = reranked.find(r => r.isRecommended) || reranked[0];
    newRecommendedId = newRec.id;
    newRecommendedScore = newRec.score;
    targetSegment.recommendedRouteId = newRecommendedId;
    targetSegment.journeyScore = newRecommendedScore;

    // Check duration delta for graph cascade
    const oldRoute = reranked.find(r => r.id === previousRecommendedId);
    const durationDelta = newRec.durationMin - (oldRoute?.durationMin || newRec.durationMin);
    if (durationDelta > 0) {
      try {
        const graph = buildItineraryGraph(stops, segments);
        graphImpact = propagateDelay(graph, targetSegment.destinationId || `stop-${parseInt(segmentId.slice(1)) + 1}`, durationDelta);
      } catch (e) { /* graph enhancement optional */ }
    }
  }

  // ─── EVENT B: TRANSPORT_DELAY ───
  else if (type === "TRANSPORT_DELAY") {
    if (!targetSegment) throw new Error(`Segment "${segmentId}" not found.`);

    const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
    previousRecommendedId = prevRec.id;
    previousRecommendedScore = prevRec.score;

    const addedMin = delayMinutes || delta.durationMin || Math.round(30 * severity);

    // Apply delay to all routes on the segment (transport delay affects the entire segment)
    targetSegment.candidateRoutes = targetSegment.candidateRoutes.map(route => {
      const newDuration = route.durationMin + addedMin;
      const newConvenience = Math.max(10, route.convenience - Math.round(addedMin / 3));
      return {
        ...route,
        durationMin: newDuration,
        convenience: newConvenience,
        activeEvent: { type, reason, note: `Transit delay of +${addedMin}m applied. Duration ${route.durationMin}m → ${newDuration}m.`, timestamp: new Date().toISOString() }
      };
    });

    // Re-rank
    const reranked = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
    targetSegment.candidateRoutes = reranked;
    const newRec = reranked.find(r => r.isRecommended) || reranked[0];
    newRecommendedId = newRec.id;
    newRecommendedScore = newRec.score;
    targetSegment.recommendedRouteId = newRecommendedId;
    targetSegment.journeyScore = newRecommendedScore;

    // Propagate delay through itinerary graph
    try {
      const graph = buildItineraryGraph(stops, segments);
      const destNodeId = targetSegment.destinationId || `stop-${parseInt(segmentId.slice(1)) + 1}`;
      graphImpact = propagateDelay(graph, destNodeId, addedMin);
    } catch (e) { /* graph enhancement optional */ }

    extraEventData.delayMinutes = addedMin;
  }

  // ─── EVENT C: ACTIVITY_CANCELLATION ───
  else if (type === "ACTIVITY_CANCELLATION") {
    const fallbackCancelNode = stops.find(s => s.type === 'experience' || s.type === 'attraction')?.id || stops[stops.length - 2]?.id;
    const cancelledNodeId = nodeId || fallbackCancelNode;
    const cancelledStop = stops.find(s => s.id === cancelledNodeId);

    if (!cancelledStop) {
      throw new Error(`Stop "${cancelledNodeId}" not found for cancellation.`);
    }

    // Find the best accessible alternative
    const alternatives = (ALTERNATIVE_ACTIVITIES || []).filter(alt => {
      const typeMatch = alt.replacesTypes?.includes(cancelledStop.type);
      const accessOk = (alt.accessibility?.score || 0) >= 80;
      const distOk = haversineDistance(
        cancelledStop.lat, cancelledStop.lng,
        alt.lat, alt.lng
      ) < 20;
      return typeMatch && accessOk && distOk;
    });

    // Sort by accessibility score descending
    alternatives.sort((a, b) => (b.accessibility?.score || 0) - (a.accessibility?.score || 0));
    const bestAlt = alternatives[0] || null;

    if (bestAlt) {
      extraEventData.cancelledActivity = { name: cancelledStop.name, reason };
      extraEventData.substitutedActivity = {
        name: bestAlt.name,
        accessibility: bestAlt.accessibility?.score || 85,
        cost: bestAlt.cost?.estimated || 0,
        reason: "Best accessible alternative within range"
      };
    }

    // Find the affected segment (the one that goes TO the cancelled stop or FROM it)
    targetSegment = segments.find(s => s.id === segmentId);
    if (!targetSegment) targetSegment = segments.find(s => s.destination === cancelledStop.name) || segments[4];

    if (targetSegment) {
      const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
      previousRecommendedId = prevRec.id;
      previousRecommendedScore = prevRec.score;

      // If we found a substitute, update the segment destination
      if (bestAlt) {
        targetSegment.destination = bestAlt.name;
        targetSegment.destinationLat = bestAlt.lat;
        targetSegment.destinationLng = bestAlt.lng;
      }

      // Re-rank existing routes
      const reranked = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
      targetSegment.candidateRoutes = reranked;
      const newRec = reranked.find(r => r.isRecommended) || reranked[0];
      newRecommendedId = newRec.id;
      newRecommendedScore = newRec.score;
      targetSegment.recommendedRouteId = newRecommendedId;
      targetSegment.journeyScore = newRecommendedScore;
    }

    // Build graph impact for substitution
    if (bestAlt) {
      graphImpact = {
        substitution: {
          removed: cancelledStop.name,
          added: bestAlt.name,
          accessibilityScore: bestAlt.accessibility?.score || 85,
          cost: bestAlt.cost?.estimated || 0,
          timingAdjustment: "Schedule preserved within opening hours"
        }
      };
    }
  }

  // ─── CROWD_SPIKE ───
  else if (type === "CROWD_SPIKE") {
    if (!targetSegment) throw new Error(`Segment "${segmentId}" not found.`);

    const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
    previousRecommendedId = prevRec.id;
    previousRecommendedScore = prevRec.score;

    targetSegment.candidateRoutes = targetSegment.candidateRoutes.map(route => {
      if (routeId && route.id !== routeId) return route;
      const crowdDrop = delta.crowd ?? Math.round(45 * severity);
      const newCrowd = Math.max(10, route.crowd - crowdDrop);
      return {
        ...route,
        crowd: newCrowd,
        activeEvent: { type, reason, note: `Crowd surge: ${route.crowd} → ${newCrowd}`, timestamp: new Date().toISOString() }
      };
    });

    const reranked = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
    targetSegment.candidateRoutes = reranked;
    const newRec = reranked.find(r => r.isRecommended) || reranked[0];
    newRecommendedId = newRec.id;
    newRecommendedScore = newRec.score;
    targetSegment.recommendedRouteId = newRecommendedId;
    targetSegment.journeyScore = newRecommendedScore;

    // Propagate downstream timing shift
    try {
      const graph = buildItineraryGraph(stops, segments);
      graphImpact = propagateDelay(graph, targetSegment.destinationId || `stop-${parseInt(segmentId.slice(1)) + 1}`, 30);
    } catch (e) { /* optional */ }
  }

  // ─── SAFETY_ALERT ───
  else if (type === "SAFETY_ALERT") {
    if (!targetSegment) throw new Error(`Segment "${segmentId}" not found.`);

    const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
    previousRecommendedId = prevRec.id;
    previousRecommendedScore = prevRec.score;

    targetSegment.candidateRoutes = targetSegment.candidateRoutes.map(route => {
      if (routeId && route.id !== routeId) return route;
      const safetyDrop = delta.safety ?? Math.round(40 * severity);
      const newSafety = Math.max(10, route.safety - safetyDrop);
      return {
        ...route,
        safety: newSafety,
        activeEvent: { type, reason, note: `Safety alert: ${route.safety} → ${newSafety}`, timestamp: new Date().toISOString() }
      };
    });

    const reranked = rankSegmentRoutes(targetSegment.candidateRoutes, weights);
    targetSegment.candidateRoutes = reranked;
    const newRec = reranked.find(r => r.isRecommended) || reranked[0];
    newRecommendedId = newRec.id;
    newRecommendedScore = newRec.score;
    targetSegment.recommendedRouteId = newRecommendedId;
    targetSegment.journeyScore = newRecommendedScore;
  }

  // ─── ROUTE_DEVIATION ───
  else if (type === "ROUTE_DEVIATION") {
    if (targetSegment) {
      const prevRec = targetSegment.candidateRoutes.find(r => r.isRecommended) || targetSegment.candidateRoutes[0];
      previousRecommendedId = prevRec.id;
      previousRecommendedScore = prevRec.score;
      newRecommendedId = previousRecommendedId;
      newRecommendedScore = previousRecommendedScore;
    }
  }

  routeChanged = previousRecommendedId !== newRecommendedId;
  scoreChanged = previousRecommendedScore !== newRecommendedScore;

  const now = new Date();
  const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const eventRecord = {
    id: `event-${Date.now()}`,
    timestamp: timeString,
    type,
    segmentId,
    affectedSegmentName: targetSegment ? `${targetSegment.origin} → ${targetSegment.destination}` : "N/A",
    reason,
    previousRecommendedId,
    previousRecommendedScore,
    newRecommendedId,
    newRecommendedScore,
    routeChanged,
    scoreChanged,
    ...extraEventData
  };

  return {
    updatedSegments: segments,
    affectedSegment: targetSegment,
    previousRecommendedId,
    newRecommendedId,
    routeChanged,
    scoreChanged,
    eventRecord,
    graphImpact
  };
}

/**
 * Canonical contract: Converts a TrustShield cluster into a structured IncidentDecision.
 * @param {Object} cluster 
 * @returns {Object} Structured incident decision
 */
export function buildIncidentDecision(cluster) {
  if (!cluster) return null;
  const reports = cluster.reports || [];
  const fusion = cluster.evidenceFusion || {};
  const scores = cluster.scores || {};
  const independence = cluster.independenceAnalysis || {};
  
  const resourceId = cluster.resourceId || "S1";
  const affectedSegments = resourceId.startsWith("S") ? [resourceId] : [resourceId];

  return {
    incidentId: cluster.id,
    eventType: cluster.eventType || "ACCESSIBILITY_ISSUE",
    title: cluster.title || `Incident on ${resourceId}`,
    status: cluster.status || "UNVERIFIED",
    decision: cluster.decision || scores.decision || "WARN",
    communityConfidence: scores.communityConfidence ?? 0.5,
    attackRisk: scores.attackRisk ?? 0.1,
    actionConfidence: scores.actionConfidence ?? 0.5,
    affectedResource: resourceId,
    affectedSegments,
    severity: reports[reports.length - 1]?.severity || 0.7,
    description: reports[reports.length - 1]?.description || cluster.title,
    timestamp: cluster.lastReportedAt || new Date().toISOString(),
    explanationContext: {
      independentConfirmations: independence.independentConfirmationsCount || reports.length,
      recentReports: reports.length,
      uniqueSubnets: independence.uniqueSubnetsCount || 1,
      contradictions: fusion.contradictions || 0,
      mediaEvidence: fusion.mediaEvidence || 0.25
    }
  };
}

/**
 * Phase 4: Evaluates the personalized impact of an incident for a specific traveler.
 * The same incident (e.g. elevator outage) has CRITICAL impact on a wheelchair user,
 * HIGH impact on an elderly user, and LOW impact on a standard traveler who can take stairs.
 *
 * @param {Object} incident IncidentDecision or incident payload
 * @param {Object} travelerProfile Traveler profile
 * @param {Object} journey Current journey state
 * @returns {Object} Personalized impact assessment
 */
export function calculatePersonalImpact(incident = {}, travelerProfile = {}, journey = {}) {
  const mobility = (travelerProfile.mobility || "").toLowerCase();
  const isWheelchair = mobility.includes("wheelchair") || mobility.includes("power_wheelchair");
  const isSenior = mobility.includes("elderly") || mobility.includes("cane") || mobility.includes("senior");
  const eventType = (incident.eventType || "").toUpperCase();
  const desc = (incident.description || incident.title || "").toLowerCase();
  const isElevatorOrStepIssue = eventType.includes("ELEVATOR") || eventType === "ACCESSIBILITY_ISSUE" || /elevator|lift|ramp|stair/i.test(desc);

  let severity = "LOW";
  let accessibilityImpact = 0.10;
  let timeImpact = 0.10;
  let recommendedAction = "WARN";

  if (isElevatorOrStepIssue) {
    if (isWheelchair) {
      severity = "CRITICAL";
      accessibilityImpact = 0.94;
      timeImpact = 0.15;
      recommendedAction = (incident.decision === "QUARANTINE" || incident.status === "QUARANTINED") ? "QUARANTINE" : "ADAPT";
    } else if (isSenior) {
      severity = "HIGH";
      accessibilityImpact = 0.70;
      timeImpact = 0.20;
      recommendedAction = (incident.decision === "QUARANTINE" || incident.status === "QUARANTINED") ? "QUARANTINE" : "ADAPT";
    } else {
      // Standard traveler can use stairs -> low impact, advisory warning only
      severity = "LOW";
      accessibilityImpact = 0.15;
      timeImpact = 0.05;
      recommendedAction = "WARN";
    }
  } else if (eventType === "TRANSPORT_DELAY") {
    timeImpact = Math.min(1.0, (incident.delayMinutes || 30) / 60);
    severity = timeImpact > 0.5 ? "HIGH" : "MEDIUM";
    recommendedAction = incident.decision === "ADAPT" ? "ADAPT" : "WARN";
  } else if (eventType === "TEMPORARILY_CLOSED" || eventType === "ACTIVITY_CANCELLATION") {
    severity = "HIGH";
    accessibilityImpact = 0.50;
    timeImpact = 0.40;
    recommendedAction = (incident.decision === "QUARANTINE" || incident.status === "QUARANTINED") ? "QUARANTINE" : "ADAPT";
  } else if (eventType === "CROWD_SURGE" || eventType === "CROWD_SPIKE") {
    const crowdSensitive = (travelerProfile.crowdTolerance || "").toLowerCase() === "low";
    severity = crowdSensitive ? "HIGH" : "LOW";
    accessibilityImpact = crowdSensitive ? 0.40 : 0.10;
    recommendedAction = (crowdSensitive && incident.decision === "ADAPT") ? "ADAPT" : "WARN";
  } else {
    severity = "MEDIUM";
    recommendedAction = incident.decision || "WARN";
  }

  // If incident itself is quarantined, personal recommended action is strictly QUARANTINE (never adapt)
  if (incident.decision === "QUARANTINE" || incident.status === "QUARANTINED") {
    recommendedAction = "QUARANTINE";
  }

  return {
    severity,
    affectedSegments: incident.affectedSegments || [incident.affectedResource || "S1"],
    accessibilityImpact: Number(accessibilityImpact.toFixed(2)),
    timeImpact: Number(timeImpact.toFixed(2)),
    recommendedAction,
    explanation: `Personalized evaluation for ${travelerProfile.name || 'traveler'} (${mobility || 'standard'} mobility): ${severity} impact.`
  };
}

/**
 * Phase 3 & 4: Master Integration Function connecting TrustShield -> Event Engine -> Journey State.
 * Automatically evaluates personal impact, determines if adaptation is warranted,
 * and if so, applies the event mutation, constraint validation, re-ranking, and DAG delay cascade.
 *
 * @param {Object} journeyState Authoritative journey state
 * @param {Object} incidentOrDecision TrustShield cluster or IncidentDecision
 * @param {Object} [traveler] Optional traveler profile override
 * @returns {Object} Adaptation result with updated segments, personalImpact, and status
 */
export function applyIncidentToJourney(journeyState, incidentOrDecision, traveler = null) {
  if (!journeyState || !journeyState.segments) {
    throw new Error("Invalid journeyState provided to applyIncidentToJourney");
  }

  const currentTraveler = traveler || journeyState.traveler || {};
  const incidentDecision = incidentOrDecision.incidentId
    ? incidentOrDecision
    : buildIncidentDecision(incidentOrDecision);

  // 1. Evaluate Personalized Impact
  const personalImpact = calculatePersonalImpact(incidentDecision, currentTraveler, journeyState);

  // 2. If decision or personal impact is QUARANTINE or WARN (not ADAPT), do NOT adapt the route
  if (personalImpact.recommendedAction === "QUARANTINE" || incidentDecision.decision === "QUARANTINE") {
    return {
      adapted: false,
      reason: "QUARANTINED_ATTACK_OR_SPAM",
      advisory: false,
      personalImpact,
      incidentDecision,
      updatedSegments: journeyState.segments,
      affectedSegment: null,
      routeChanged: false,
      message: "Incident is quarantined due to high attack risk or spam. Journey route preserved without adaptation."
    };
  }

  if (personalImpact.recommendedAction === "WARN" || incidentDecision.decision === "WARN") {
    // Attach advisory notice to affected segment without recalculating/mutating route
    const targetSegId = personalImpact.affectedSegments[0] || "S1";
    const segmentsWithAdvisory = journeyState.segments.map(seg => {
      if (seg.id !== targetSegId) return seg;
      return {
        ...seg,
        activeAdvisory: {
          incidentId: incidentDecision.incidentId,
          type: incidentDecision.eventType,
          title: incidentDecision.title,
          severity: personalImpact.severity,
          note: incidentDecision.description,
          timestamp: incidentDecision.timestamp
        }
      };
    });

    return {
      adapted: false,
      reason: "ADVISORY_WARN_ONLY",
      advisory: true,
      personalImpact,
      incidentDecision,
      updatedSegments: segmentsWithAdvisory,
      affectedSegment: segmentsWithAdvisory.find(s => s.id === targetSegId),
      routeChanged: false,
      message: `Advisory registered (${personalImpact.severity} impact for ${currentTraveler.mobility || 'standard'} traveler). Route not changed.`
    };
  }

  // 3. ADAPT Action: Map incident to eventPayload and trigger full Event Engine & DAG cascade
  const targetSegId = personalImpact.affectedSegments[0] || "S1";
  let eventType = "ACCESSIBILITY_DEGRADATION";
  if (incidentDecision.eventType === "TRANSPORT_DELAY") eventType = "TRANSPORT_DELAY";
  else if (incidentDecision.eventType === "TEMPORARILY_CLOSED") eventType = "ACTIVITY_CANCELLATION";
  else if (incidentDecision.eventType === "CROWD_SURGE") eventType = "CROWD_SPIKE";

  // Identify specific candidate route affected if incident references an elevator or specific feature
  let targetRouteId = incidentDecision.routeId || null;
  if (!targetRouteId && (incidentDecision.eventType === "ACCESSIBILITY_ISSUE" || /elevator|lift/i.test(incidentDecision.description || ""))) {
    const seg = journeyState.segments.find(s => s.id === targetSegId);
    const elevatorRoute = seg?.candidateRoutes.find(r => 
      r.elevatorRequired || 
      (r.accessibleFeatures || []).some(f => /elevator|lift/i.test(f))
    );
    if (elevatorRoute) {
      targetRouteId = elevatorRoute.id;
    }
  }

  const eventPayload = {
    type: eventType,
    segmentId: targetSegId,
    routeId: targetRouteId,
    reason: incidentDecision.description || incidentDecision.title,
    severity: personalImpact.accessibilityImpact || 0.8,
    delta: {
      accessibility: Math.round(58 * (personalImpact.accessibilityImpact || 1.0))
    }
  };

  // Run the core event adaptation with constraint validation and DAG cascade
  const eventResult = applyJourneyEvent(journeyState, eventPayload);

  return {
    adapted: true,
    reason: "AUTOMATIC_ADAPTATION",
    advisory: false,
    personalImpact,
    incidentDecision,
    ...eventResult
  };
}
