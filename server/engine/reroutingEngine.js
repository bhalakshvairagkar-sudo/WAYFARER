/**
 * WAYFARER AI - Event-Driven Automatic Rerouting Engine v2.0
 * 
 * Phase 7 Implementation:
 * Connects real environmental changes, verified incidents, and routing provider alternatives.
 * 
 * Enforces:
 * 1. Strict route lifecycle: ACTIVE → RECALCULATING → PROPOSED → ACCEPTED (or FAILED_NO_SAFE_ALTERNATIVE).
 * 2. Event deduplication and idempotency to prevent repeated route thrashing.
 * 3. Geospatial corridor verification (unrelated nearby roads do not cause unjustified reroutes).
 * 4. Fresh alternative retrieval from real routing provider (Google / OSRM).
 * 5. Mandatory hard accessibility constraint validation (invalid routes strictly eliminated).
 * 6. 5-factor scoring and ranking with mathematical reconciliation.
 * 7. Route transition policy with structured journey history recording and database persistence.
 * 8. Concurrency protection (delayed recalculations cannot overwrite newer accepted routes).
 * 9. Explicit failure state with safety warning when no safe alternative exists.
 */

import { haversineDistanceMeters } from "./evidenceFusionEngine.js";
import {
  deriveTravelerWeights,
  calculateOverallJourneyScore,
  generateScoreBreakdown,
  generateWhyNotExplanation,
  validateRouteConstraints,
  extractHardConstraints,
  rankSegmentRoutes
} from "./scoringEngine.js";
import { applyJourneyEvent } from "./eventEngine.js";
import { checkDownstreamImpact } from "./downstreamOptimizer.js";
import { generateAdaptationExplanation } from "./explanationEngine.js";
import { calculateJourneyHealth } from "./journeyHealthEngine.js";
import { buildItineraryGraph, propagateDelay } from "./itineraryGraphEngine.js";
import { calculateProductionRoute, validateProviderRoute } from "../services/routingService.js";
import { Journey } from "../models/Journey.js";
import { isDbConnected } from "../config/db.js";
import { securityLogger } from "../utils/securityLogger.js";
import { DEFAULT_TRAVELER, DEFAULT_STOPS } from "../data/defaultJourney.js";

/**
 * Route Lifecycle States
 */
export const ROUTE_LIFECYCLE = {
  ACTIVE: 'ACTIVE',                                 // Current accepted route in operational state
  RECALCULATING: 'RECALCULATING',                   // Validating incident impact and querying alternatives
  PROPOSED: 'PROPOSED',                             // A valid replacement route is ready for transition
  ACCEPTED: 'ACCEPTED',                             // The new route is committed and accepted
  FAILED_NO_SAFE_ALTERNATIVE: 'FAILED_NO_SAFE_ALTERNATIVE' // Dedicated failure state: constraints violated
};

// In-memory cache for event deduplication & idempotency (TTL: 1 hour)
const processedEventsCache = new Map();
const DEDUPLICATION_TTL_MS = 60 * 60 * 1000;

/**
 * Reset in-memory deduplication cache (useful for test isolation)
 */
export function resetDeduplicationCache() {
  processedEventsCache.clear();
}

/**
 * Calculates perpendicular/minimum distance in meters from a coordinate point
 * to a polyline geometry using flat-earth equirectangular projection.
 * 
 * @param {number} lat Point latitude
 * @param {number} lng Point longitude
 * @param {Array<[number, number]>} coordinates Polyline coordinates
 * @returns {number} Minimum distance in meters
 */
export function pointToPolylineDistanceMeters(lat, lng, coordinates = []) {
  if (!coordinates || coordinates.length === 0 || lat == null || lng == null) {
    return Infinity;
  }
  if (coordinates.length === 1) {
    return haversineDistanceMeters(lat, lng, coordinates[0][0], coordinates[0][1]);
  }

  let minDistance = Infinity;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    if (!p1 || !p2) continue;

    const lat1 = p1[0];
    const lon1 = p1[1];
    const lat2 = p2[0];
    const lon2 = p2[1];

    // Flat-earth equirectangular projection around segment midpoint
    const midLatRad = (((lat1 + lat2) / 2) * Math.PI) / 180;
    const cosMidLat = Math.cos(midLatRad);

    const x1 = lon1 * cosMidLat * 111319.5;
    const y1 = lat1 * 111132.9;
    const x2 = lon2 * cosMidLat * 111319.5;
    const y2 = lat2 * 111132.9;
    const xp = lng * cosMidLat * 111319.5;
    const yp = lat * 111132.9;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    let projX;
    let projY;
    if (lenSq === 0) {
      projX = x1;
      projY = y1;
    } else {
      const t = Math.max(0, Math.min(1, ((xp - x1) * dx + (yp - y1) * dy) / lenSq));
      projX = x1 + t * dx;
      projY = y1 + t * dy;
    }

    const distSq = (xp - projX) * (xp - projX) + (yp - projY) * (yp - projY);
    const dMeters = Math.sqrt(distSq);
    if (dMeters < minDistance) {
      minDistance = dMeters;
    }
  }

  return Math.round(minDistance);
}

/**
 * Checks whether an incident's geometry or road name intersects the target route corridor.
 * Prevents incidents on nearby but unrelated parallel streets or distant roads from triggering an unjustified reroute.
 * 
 * @param {Object} incident Incident or event payload
 * @param {Object} route Route candidate object with coordinates or geometry
 * @param {number} toleranceMeters Maximum acceptable proximity threshold (default: 250m)
 * @returns {Object} { isOnRoute: boolean, distanceMeters: number, reason?: string }
 */
export function isIncidentOnRouteCorridor(incident = {}, route = {}, toleranceMeters = 250) {
  let incLat = null;
  let incLng = null;

  if (incident.coordinates && typeof incident.coordinates.lat === 'number') {
    incLat = incident.coordinates.lat;
    incLng = incident.coordinates.lng;
  } else if (incident.location && typeof incident.location.lat === 'number') {
    incLat = incident.location.lat;
    incLng = incident.location.lng;
  } else if (typeof incident.lat === 'number' && typeof incident.lng === 'number') {
    incLat = incident.lat;
    incLng = incident.lng;
  } else if (incident.reporterLocation && typeof incident.reporterLocation.lat === 'number') {
    incLat = incident.reporterLocation.lat;
    incLng = incident.reporterLocation.lng;
  }

  const routeCoords = route.coordinates || route.geometry || [];

  // If incident has coordinates and route has geometry, perform exact geospatial proximity check
  if (incLat !== null && incLng !== null && routeCoords.length > 0) {
    const distMeters = pointToPolylineDistanceMeters(incLat, incLng, routeCoords);
    if (distMeters > toleranceMeters) {
      return {
        isOnRoute: false,
        distanceMeters: distMeters,
        toleranceMeters,
        reason: `Incident coordinate (${incLat.toFixed(4)}, ${incLng.toFixed(4)}) is ${distMeters}m from route corridor (exceeds ${toleranceMeters}m threshold).`
      };
    }
    return {
      isOnRoute: true,
      distanceMeters: distMeters,
      toleranceMeters
    };
  }

  // If road or corridor name is specified on incident, verify name intersection
  if (incident.roadName || incident.corridorName) {
    const targetName = (incident.roadName || incident.corridorName).toLowerCase();
    const routeName = (route.name || '').toLowerCase();
    const routeTagline = (route.tagline || '').toLowerCase();

    // If incident specifies a completely different known street name, reject
    if (!routeName.includes(targetName) && !routeTagline.includes(targetName)) {
      if (incident.targetRouteId && incident.targetRouteId !== route.id) {
        return {
          isOnRoute: false,
          distanceMeters: 0,
          reason: `Incident specifically targets route ${incident.targetRouteId}, which is not active route ${route.id}.`
        };
      }
    }
  }

  // If no coordinates provided but segmentId or routeId matches
  return {
    isOnRoute: true,
    distanceMeters: 0,
    toleranceMeters
  };
}

/**
 * Checks if an event is a duplicate to guarantee idempotency and avoid repeated route transitions.
 * 
 * @param {Object} journeyState Current journey state
 * @param {Object} event Event payload
 * @returns {Object} { isDuplicate: boolean, eventKey: string }
 */
export function isDuplicateEvent(journeyState = {}, event = {}) {
  const journeyId = journeyState.id || journeyState._id || 'default-journey';
  const eventId = event.id || event.eventId || event.idempotencyKey || null;

  // Stable event key
  const eventKey = eventId
    ? `${journeyId}:${eventId}`
    : `${journeyId}:${event.type || 'UNKNOWN'}:${event.segmentId || 'S1'}:${event.routeId || 'any'}:${event.reason || ''}:${event.timestamp || ''}`;

  // 1. Check in-memory deduplication cache
  const cachedTime = processedEventsCache.get(eventKey);
  const now = Date.now();
  if (cachedTime && now - cachedTime < DEDUPLICATION_TTL_MS) {
    return { isDuplicate: true, eventKey };
  }

  // 2. Check journey event history
  const history = journeyState.eventHistory || [];
  const inHistory = history.some(entry => {
    if (!entry) return false;
    if (eventId && (entry.id === eventId || entry.eventId === eventId || entry.idempotencyKey === eventId)) {
      return true;
    }
    if (entry.type === event.type && entry.segmentId === event.segmentId && entry.reason === event.reason) {
      return true;
    }
    return false;
  });

  if (inHistory) {
    processedEventsCache.set(eventKey, now);
    return { isDuplicate: true, eventKey };
  }

  return { isDuplicate: false, eventKey };
}

/**
 * Evaluates concurrency and versioning to prevent delayed recalculations from overwriting newer accepted routes.
 * 
 * @param {Object} journeyState Current journey state
 * @param {number|undefined} baseVersion Base version upon which calculation was initiated
 * @returns {Object} { conflict: boolean, currentVersion: number, baseVersion?: number, code?: string }
 */
export function checkConcurrency(journeyState = {}, baseVersion = undefined) {
  const currentVersion = typeof journeyState.version === 'number' ? journeyState.version : 1;

  if (typeof baseVersion === 'number' && baseVersion < currentVersion) {
    return {
      conflict: true,
      currentVersion,
      baseVersion,
      code: 'OUTDATED_CALCULATION',
      message: `Delayed recalculation (base version ${baseVersion}) cannot overwrite newer accepted route (current version ${currentVersion}).`
    };
  }

  return {
    conflict: false,
    currentVersion
  };
}

/**
 * Runs mandatory accessibility validation on candidate routes and ranks eligible alternatives.
 * Non-compliant alternatives are strictly eliminated with structured rejection reasons.
 * 
 * @param {Array<Object>} candidateRoutes Candidate routes
 * @param {Object} traveler Traveler profile
 * @param {Object} weights 5-factor scoring weights
 * @returns {Object} { hasEligible: boolean, eligibleRoutes: Array, rejectedRoutes: Array, recommendedRoute: Object|null }
 */
export function validateAndRankAlternatives(candidateRoutes = [], traveler = {}, weights = {}) {
  const constraints = extractHardConstraints(traveler);
  const eligibleRoutes = [];
  const rejectedRoutes = [];

  for (const route of candidateRoutes) {
    const val = validateRouteConstraints(route, constraints);
    if (val.eligible) {
      eligibleRoutes.push({
        ...route,
        isFeasible: true,
        isEliminated: false,
        accessibilityStatus: val.accessibilityStatus
      });
    } else {
      rejectedRoutes.push({
        ...route,
        isFeasible: false,
        isEliminated: true,
        accessibilityStatus: val.accessibilityStatus,
        rejectionReasons: val.rejectionReasons
      });
    }
  }

  if (eligibleRoutes.length === 0) {
    return {
      hasEligible: false,
      eligibleRoutes: [],
      rejectedRoutes,
      recommendedRoute: null,
      safetyWarning: "No safe alternative route available: all alternatives violate mandatory accessibility constraints."
    };
  }

  // Rank eligible routes using 5-factor scoring engine
  const rankedEligible = rankSegmentRoutes(eligibleRoutes, weights, traveler);
  const bestRoute = rankedEligible.find(r => r.isRecommended) || rankedEligible[0];

  return {
    hasEligible: true,
    eligibleRoutes: rankedEligible,
    rejectedRoutes,
    recommendedRoute: bestRoute
  };
}

/**
 * Master Event-Driven Automatic Rerouting Pipeline (Phase 7 Milestone)
 * 
 * @param {Object} params
 * @param {Object} params.journeyState Current journey state
 * @param {Object} params.event Event or incident payload
 * @param {number} [params.baseVersion] Base version for concurrency check
 * @param {boolean} [params.autoCommit=true] Whether to commit the route transition to ACCEPTED
 * @param {Function} [params.routingProvider] Optional routing provider override
 * @returns {Promise<Object>} Rerouting result contract
 */
export async function processEventAndReroute({
  journeyState,
  event,
  baseVersion = undefined,
  autoCommit = true,
  routingProvider = null
}) {
  if (!journeyState || !event) {
    throw new Error("Missing journeyState or event payload in processEventAndReroute.");
  }

  const traveler = journeyState.traveler || DEFAULT_TRAVELER;
  const weights = deriveTravelerWeights(traveler);
  const segments = JSON.parse(JSON.stringify(journeyState.segments || []));
  const stops = journeyState.stops || DEFAULT_STOPS;
  const targetSegId = event.segmentId || segments[0]?.id || 'S1';
  const targetSegment = segments.find(s => s.id === targetSegId);

  if (!targetSegment) {
    throw new Error(`Target segment "${targetSegId}" not found in journey state.`);
  }

  const currentRecRoute = targetSegment.candidateRoutes?.find(r => r.isRecommended) || targetSegment.candidateRoutes?.[0];
  const currentVersion = typeof journeyState.version === 'number' ? journeyState.version : 1;

  // ─────────────────────────────────────────────────────────────
  // 1. Concurrency Check: Protect against delayed/outdated responses
  // ─────────────────────────────────────────────────────────────
  const concurrency = checkConcurrency(journeyState, baseVersion);
  if (concurrency.conflict) {
    securityLogger.warn(`[REROUTING_ENGINE] Concurrency conflict: ${concurrency.message}`);
    return {
      success: false,
      status: 'CONFLICT',
      code: 'OUTDATED_CALCULATION',
      lifecycleState: journeyState.lifecycleState || ROUTE_LIFECYCLE.ACTIVE,
      conflict: true,
      recalculated: false,
      version: currentVersion,
      error: concurrency.message,
      journeyState,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 2. Deduplication & Idempotency Check
  // ─────────────────────────────────────────────────────────────
  const dedup = isDuplicateEvent(journeyState, event);
  if (dedup.isDuplicate) {
    securityLogger.info(`[REROUTING_ENGINE] Suppressed duplicate event key: ${dedup.eventKey}`);
    return {
      success: true,
      status: 'DUPLICATE',
      isDuplicate: true,
      recalculated: false,
      lifecycleState: journeyState.lifecycleState || ROUTE_LIFECYCLE.ACTIVE,
      version: currentVersion,
      message: "Duplicate event detected. Current route preserved without repeated transitions.",
      journeyState,
      segments: journeyState.segments,
      affectedSegment: targetSegment,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Verification & Geographic Scope Check
  // ─────────────────────────────────────────────────────────────
  const isVerified = Boolean(
    event.isVerified === true ||
    event.verificationStatus === 'VERIFIED' ||
    event.decision === 'ADAPT' ||
    event.officialAuthorityVerified === true ||
    (event.severity && event.severity >= 0.8 && !['PENDING', 'UNVERIFIED', 'DISPUTED'].includes(event.verificationStatus)) ||
    // Standard system events without pending flags are considered verified
    (event.verificationStatus === undefined && event.status === undefined)
  );

  // If incident is disputed or under review
  if (event.status === 'DISPUTED' || event.verificationStatus === 'DISPUTED') {
    return {
      success: true,
      status: 'DISPUTED_UNDER_REVIEW',
      recalculated: false,
      lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
      version: currentVersion,
      message: "Incident is disputed and undergoing moderator triage. Route preserved without adaptation.",
      journeyState,
      segments: journeyState.segments,
      affectedSegment: targetSegment,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute
    };
  }

  // If incident is expired or resolved
  if (event.status === 'EXPIRED' || event.status === 'RESOLVED' || event.timeValidity?.isExpired === true) {
    return {
      success: true,
      status: 'EXPIRED_OR_RESOLVED',
      recalculated: false,
      lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
      version: currentVersion,
      message: "Incident is expired or resolved. Active route remains unmutated.",
      journeyState,
      segments: journeyState.segments,
      affectedSegment: targetSegment,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute
    };
  }

  // If unverified report: advisory only, cannot create authoritative closure or reroute
  if (!isVerified) {
    return {
      success: true,
      status: 'ADVISORY_ONLY',
      recalculated: false,
      lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
      version: currentVersion,
      message: "Unverified community report: Advisory recorded. Route preserved until verified by independent corroboration.",
      journeyState,
      segments: journeyState.segments,
      affectedSegment: targetSegment,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute
    };
  }

  // Geospatial corridor proximity check: unrelated roads do not cause unjustified reroutes
  if (currentRecRoute) {
    const corridorCheck = isIncidentOnRouteCorridor(event, currentRecRoute, event.corridorToleranceMeters || 250);
    if (!corridorCheck.isOnRoute) {
      securityLogger.info(`[REROUTING_ENGINE] Incident on unrelated road ignored: ${corridorCheck.reason}`);
      return {
        success: true,
        status: 'OUTSIDE_CORRIDOR',
        affected: false,
        recalculated: false,
        lifecycleState: ROUTE_LIFECYCLE.ACTIVE,
        version: currentVersion,
        reason: 'INCIDENT_OUTSIDE_CORRIDOR',
        message: `Incident is situated on an unrelated road (${corridorCheck.distanceMeters}m away) and does not intersect active route corridor. Unjustified reroute avoided.`,
        journeyState,
        segments: journeyState.segments,
        affectedSegment: targetSegment,
        lastValidStateRetained: true,
        preservedRoute: currentRecRoute
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Lifecycle: RECALCULATING
  // ─────────────────────────────────────────────────────────────
  let lifecycleState = ROUTE_LIFECYCLE.RECALCULATING;

  // ─────────────────────────────────────────────────────────────
  // 5. Query Fresh Alternatives from Routing Provider
  // ─────────────────────────────────────────────────────────────
  let freshAlternatives = [];
  if (typeof routingProvider === 'function') {
    try {
      freshAlternatives = await routingProvider({
        segment: targetSegment,
        traveler,
        event
      });
    } catch (e) {
      securityLogger.warn(`[REROUTING_ENGINE] Custom routing provider failed: ${e.message}`);
    }
  } else if (targetSegment.originCoord && targetSegment.destinationCoord) {
    try {
      const prodResult = await calculateProductionRoute({
        origin: targetSegment.originCoord,
        destination: targetSegment.destinationCoord,
        travelMode: 'walking',
        traveler
      });
      if (prodResult && prodResult.success && Array.isArray(prodResult.routes)) {
        freshAlternatives = prodResult.routes.filter(validateProviderRoute);
      }
    } catch (e) {
      securityLogger.warn(`[REROUTING_ENGINE] Provider query failed: ${e.message}`);
    }
  }

  // Apply core event mutation using eventEngine
  const eventResult = applyJourneyEvent(journeyState, event);

  // Merge fresh provider alternatives with mutated candidate routes if present
  let allCandidateRoutes = [...(eventResult.affectedSegment?.candidateRoutes || [])];
  for (const fresh of freshAlternatives) {
    if (!allCandidateRoutes.some(r => r.id === fresh.id || r.name === fresh.name)) {
      allCandidateRoutes.push(fresh);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 6. Mandatory Accessibility Constraint Validation
  // ─────────────────────────────────────────────────────────────
  const evalResult = validateAndRankAlternatives(allCandidateRoutes, traveler, weights);

  // If NO eligible alternatives exist, enter dedicated failure state: DO NOT SILENTLY RELAX CONSTRAINTS!
  if (!evalResult.hasEligible) {
    securityLogger.warn(`[REROUTING_ENGINE] No safe alternative found satisfying traveler constraints.`);
    return {
      success: false,
      status: 'NO_SAFE_ALTERNATIVE',
      code: 'NO_SAFE_ALTERNATIVE',
      lifecycleState: ROUTE_LIFECYCLE.FAILED_NO_SAFE_ALTERNATIVE,
      safetyWarning: evalResult.safetyWarning,
      recalculated: true,
      version: currentVersion,
      lastValidStateRetained: true,
      preservedRoute: currentRecRoute,
      rejectedRoutes: evalResult.rejectedRoutes,
      journeyState,
      segments: journeyState.segments,
      affectedSegment: targetSegment,
      message: "Rerouting halted: No candidate alternative satisfies traveler's mandatory accessibility constraints. Last valid state preserved."
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 7. Lifecycle: PROPOSED
  // ─────────────────────────────────────────────────────────────
  lifecycleState = ROUTE_LIFECYCLE.PROPOSED;
  const newRecRoute = evalResult.recommendedRoute;
  const routeChanged = Boolean(currentRecRoute && newRecRoute && currentRecRoute.id !== newRecRoute.id);
  const scoreChanged = Boolean(currentRecRoute && newRecRoute && currentRecRoute.score !== newRecRoute.score);

  // Combine eligible and rejected routes on the affected segment
  const finalCandidates = [
    ...evalResult.eligibleRoutes.map(r => ({
      ...r,
      isRecommended: r.id === newRecRoute.id
    })),
    ...evalResult.rejectedRoutes.map(r => ({
      ...r,
      isRecommended: false
    }))
  ];

  eventResult.affectedSegment.candidateRoutes = finalCandidates;
  eventResult.affectedSegment.recommendedRouteId = newRecRoute.id;
  eventResult.affectedSegment.journeyScore = newRecRoute.score;

  // Also reflect in updatedSegments
  const finalSegments = eventResult.updatedSegments.map(s => {
    if (s.id === targetSegId) {
      return eventResult.affectedSegment;
    }
    return s;
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Downstream Delay Propagation
  // ─────────────────────────────────────────────────────────────
  const downstreamResult = checkDownstreamImpact(
    finalSegments,
    targetSegId,
    eventResult.eventRecord,
    stops,
    eventResult.graphImpact || null
  );

  // ─────────────────────────────────────────────────────────────
  // 9. Score Breakdown, Why-Not Explanations & AI Explanation
  // ─────────────────────────────────────────────────────────────
  const scoreBreakdown = generateScoreBreakdown(finalCandidates, weights);
  const whyNotData = generateWhyNotExplanation(finalCandidates, weights, traveler);

  const durationDeltaMin = currentRecRoute ? (newRecRoute.durationMin - currentRecRoute.durationMin) : 0;
  const distanceDeltaKm = currentRecRoute ? Number((newRecRoute.distanceKm - currentRecRoute.distanceKm).toFixed(1)) : 0;
  const scoreDelta = currentRecRoute ? (newRecRoute.score - currentRecRoute.score) : 0;

  const eventRecord = {
    ...eventResult.eventRecord,
    previousRecommendedId: currentRecRoute?.id,
    previousRecommendedScore: currentRecRoute?.score,
    newRecommendedId: newRecRoute.id,
    newRecommendedScore: newRecRoute.score,
    routeChanged,
    scoreChanged,
    durationDeltaMin,
    distanceDeltaKm,
    scoreDelta,
    previousRoute: currentRecRoute ? {
      id: currentRecRoute.id,
      name: currentRecRoute.name,
      score: currentRecRoute.score,
      durationMin: currentRecRoute.durationMin,
      distanceKm: currentRecRoute.distanceKm,
      accessibility: currentRecRoute.accessibility
    } : null,
    newRoute: {
      id: newRecRoute.id,
      name: newRecRoute.name,
      score: newRecRoute.score,
      durationMin: newRecRoute.durationMin,
      distanceKm: newRecRoute.distanceKm,
      accessibility: newRecRoute.accessibility
    }
  };

  const explanationResult = await generateAdaptationExplanation(
    eventRecord,
    eventResult.affectedSegment,
    newRecRoute,
    traveler,
    downstreamResult
  );

  const overallScoreResult = calculateOverallJourneyScore(finalSegments);
  const journeyHealth = calculateJourneyHealth({
    segments: finalSegments,
    downstreamImpact: downstreamResult,
    eventRecord
  });

  // ─────────────────────────────────────────────────────────────
  // 10. Route Transition Policy & Commitment (ACCEPTED)
  // ─────────────────────────────────────────────────────────────
  let committedVersion = currentVersion;
  let transitionRecord = null;

  if (autoCommit) {
    lifecycleState = ROUTE_LIFECYCLE.ACCEPTED;
    committedVersion = currentVersion + 1;

    transitionRecord = {
      transitionId: `trans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      eventId: eventRecord.id,
      eventType: event.type,
      lifecycleState: ROUTE_LIFECYCLE.ACCEPTED,
      previousRouteId: currentRecRoute?.id,
      newRouteId: newRecRoute.id,
      fromRoute: currentRecRoute ? { id: currentRecRoute.id, name: currentRecRoute.name, score: currentRecRoute.score } : null,
      toRoute: { id: newRecRoute.id, name: newRecRoute.name, score: newRecRoute.score },
      durationDeltaMin,
      distanceDeltaKm,
      scoreDelta,
      reason: event.reason || "Automatic rerouting following verified event"
    };

    // Record in deduplication cache
    processedEventsCache.set(dedup.eventKey, Date.now());

    // Update in-memory state
    journeyState.segments = finalSegments;
    journeyState.version = committedVersion;
    journeyState.lifecycleState = ROUTE_LIFECYCLE.ACCEPTED;
    journeyState.eventHistory = [eventRecord, ...(journeyState.eventHistory || [])];
    journeyState.routeTransitions = [transitionRecord, ...(journeyState.routeTransitions || [])];

    // Persist to MongoDB if connected
    if (isDbConnected() && (journeyState._id || journeyState.id)) {
      try {
        const jId = journeyState._id || journeyState.id;
        await Journey.findByIdAndUpdate(jId, {
          segments: finalSegments,
          version: committedVersion,
          lifecycleState: ROUTE_LIFECYCLE.ACCEPTED,
          overallScore: overallScoreResult.overallScore,
          fitLevel: overallScoreResult.fitLevel,
          journeyHealth,
          $push: {
            eventHistory: eventRecord,
            routeTransitions: transitionRecord
          }
        });
      } catch (e) {
        securityLogger.warn(`[REROUTING_ENGINE] DB persistence warning: ${e.message}`);
      }
    }
  }

  return {
    success: true,
    status: lifecycleState,
    lifecycleState,
    recalculated: true,
    routeChanged,
    version: committedVersion,
    segments: finalSegments,
    affectedSegment: eventResult.affectedSegment,
    previousRecommendedId: currentRecRoute?.id,
    newRecommendedRoute: newRecRoute,
    eventRecord,
    transition: transitionRecord,
    downstreamImpact: downstreamResult,
    graphImpact: eventResult.graphImpact || null,
    overallScore: overallScoreResult.overallScore,
    fitLevel: overallScoreResult.fitLevel,
    dayScores: overallScoreResult.dayScores,
    journeyHealth,
    explanation: explanationResult.explanation,
    explanationSource: explanationResult.source,
    explanationBadge: explanationResult.badge,
    structuredChange: explanationResult.structuredChange || null,
    scoreBreakdown,
    whyNotData,
    lastValidStateRetained: true
  };
}
