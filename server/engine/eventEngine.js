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
  const { type, segmentId = "S3", routeId, severity = 0.5, reason = "Real-world environmental change", delta = {}, delayMinutes, nodeId } = eventPayload;

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
    const cancelledNodeId = nodeId || "stop-6";
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
