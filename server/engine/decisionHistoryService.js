/**
 * WAYFARER AI - Decision History & Journey Analytics Service
 * 
 * Phase 10 Implementation:
 * Provides transparent, immutable auditability for every important journey decision.
 * 
 * Features:
 * - Structured decision records linking route versions, event triggers, reason codes, and score breakdowns.
 * - Route replay utilizing actual saved geometry (never synthetic or invented historical polylines).
 * - Multi-criteria filtering by date range, journey ID, event type, and route status.
 * - Clear mathematical distinction between estimated ETA and actual recorded travel duration.
 * - Authorization enforcement: Users cannot read or delete another user's journeys (IDOR prevention).
 * - User-controlled deletion and configurable data retention policies.
 * - Export of full journey audit trails in JSON format.
 */

import { Journey } from "../models/Journey.js";
import { LocationHistory } from "../models/LocationHistory.js";
import { isDbConnected, inMemoryStore } from "../config/db.js";
import { securityLogger } from "../utils/securityLogger.js";

/**
 * Validates whether the requesting user is authorized to access a given journey.
 * 
 * @param {Object} journey Target journey object
 * @param {string} userId Requesting user's ID
 * @param {string} [userRole='USER'] Requesting user's role
 * @returns {boolean} True if authorized
 */
export function isUserAuthorizedForJourney(journey, userId, userRole = 'USER') {
  if (!journey) return false;
  if (userRole === 'ADMIN' || userRole === 'CONTROLLER') return true;

  const journeyOwner = journey.userId || 'guest-traveler';
  if (!userId) {
    return journeyOwner === 'guest-traveler';
  }

  return journeyOwner === userId || journeyOwner === 'guest-traveler';
}

/**
 * Creates and records a standardized decision record into a journey's audit trail.
 * 
 * @param {Object} params
 * @param {Object} params.journey Target journey state or document
 * @param {Object} params.decisionData Decision record fields
 * @returns {Object} Canonical decision record
 */
export function createDecisionRecord({
  journey,
  decisionData = {}
}) {
  const journeyId = journey._id ? String(journey._id) : (journey.id || 'default-journey');
  const now = new Date();

  const decision = {
    decisionId: decisionData.decisionId || `dec-${now.getTime()}-${Math.random().toString(36).substr(2, 6)}`,
    journeyId,
    decisionType: decisionData.decisionType || 'REROUTE_ACCEPTED',
    triggerEventId: decisionData.triggerEventId || `evt-${now.getTime()}`,
    previousRouteVersion: typeof decisionData.previousRouteVersion === 'number' ? decisionData.previousRouteVersion : (journey.version || 1),
    newRouteVersion: typeof decisionData.newRouteVersion === 'number' ? decisionData.newRouteVersion : ((journey.version || 1) + 1),
    affectedSegmentId: decisionData.affectedSegmentId || 'S1',
    previousRouteId: decisionData.previousRouteId || null,
    newRouteId: decisionData.newRouteId || null,
    fromRoute: decisionData.fromRoute || null,
    toRoute: decisionData.toRoute || null,
    reasonCodes: Array.isArray(decisionData.reasonCodes) && decisionData.reasonCodes.length > 0
      ? decisionData.reasonCodes
      : ['ROUTE_SEGMENT_IMPACTED'],
    scoreBreakdown: decisionData.scoreBreakdown || null,
    factorChanges: decisionData.factorChanges || [],
    estimatedDurationMinutes: typeof decisionData.estimatedDurationMinutes === 'number'
      ? decisionData.estimatedDurationMinutes
      : null,
    actualDurationMinutes: typeof decisionData.actualDurationMinutes === 'number'
      ? decisionData.actualDurationMinutes
      : null,
    durationVarianceMinutes: (typeof decisionData.actualDurationMinutes === 'number' && typeof decisionData.estimatedDurationMinutes === 'number')
      ? decisionData.actualDurationMinutes - decisionData.estimatedDurationMinutes
      : null,
    durationDeltaMinutes: typeof decisionData.durationDeltaMinutes === 'number' ? decisionData.durationDeltaMinutes : 0,
    scoreDelta: typeof decisionData.scoreDelta === 'number' ? decisionData.scoreDelta : 0,
    storedGeometry: Array.isArray(decisionData.storedGeometry) ? decisionData.storedGeometry : [],
    userAccepted: Boolean(decisionData.userAccepted !== false),
    actor: decisionData.actor || 'SYSTEM_AUTONOMIC',
    createdAt: now.toISOString()
  };

  // Append to journey's in-memory list
  journey.decisionRecords = [decision, ...(journey.decisionRecords || [])];

  // Store in in-memory fallback index
  if (inMemoryStore.decisions) {
    inMemoryStore.decisions.set(decision.decisionId, decision);
  }

  return decision;
}

/**
 * Retrieves decision audit records with filtering by date, journey, event type, and status.
 * Strictly enforces user authorization to prevent IDOR access.
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Filtered decisions and analytics
 */
export async function getJourneyDecisions({
  journeyId = null,
  userId = 'guest-traveler',
  userRole = 'USER',
  startDate = null,
  endDate = null,
  eventType = null,
  decisionType = null,
  lifecycleState = null,
  limit = 50
}) {
  let targetJourneys = [];

  if (isDbConnected()) {
    const query = { isDeleted: { $ne: true } };
    if (userRole !== 'ADMIN' && userRole !== 'CONTROLLER') {
      query.userId = userId;
    }
    if (journeyId) {
      query._id = journeyId;
    }

    targetJourneys = await Journey.find(query).limit(10);
  } else {
    // In-memory fallback
    for (const j of inMemoryStore.journeys.values()) {
      if (j.isDeleted) continue;
      if (journeyId && j.id !== journeyId && String(j._id) !== journeyId) continue;
      if (userRole !== 'ADMIN' && userRole !== 'CONTROLLER' && j.userId !== userId && j.userId !== 'guest-traveler') continue;
      targetJourneys.push(j);
    }
  }

  // Aggregate decisions across matching journeys
  let allDecisions = [];
  for (const j of targetJourneys) {
    if (!isUserAuthorizedForJourney(j, userId, userRole)) {
      continue;
    }
    const decs = j.decisionRecords || [];
    allDecisions.push(...decs);
  }

  // Apply filters
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    allDecisions = allDecisions.filter(d => new Date(d.createdAt).getTime() >= startMs);
  }

  if (endDate) {
    const endMs = new Date(endDate).getTime();
    allDecisions = allDecisions.filter(d => new Date(d.createdAt).getTime() <= endMs);
  }

  if (decisionType) {
    const dt = decisionType.toUpperCase();
    allDecisions = allDecisions.filter(d => (d.decisionType || '').toUpperCase() === dt);
  }

  if (eventType) {
    const et = eventType.toUpperCase();
    allDecisions = allDecisions.filter(d => 
      (d.reasonCodes || []).some(rc => rc.toUpperCase().includes(et)) ||
      (d.triggerEventId || '').toUpperCase().includes(et)
    );
  }

  // Sort descending by creation date
  allDecisions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (limit && allDecisions.length > limit) {
    allDecisions = allDecisions.slice(0, limit);
  }

  // Compute summary analytics
  const totalDecisions = allDecisions.length;
  const acceptedCount = allDecisions.filter(d => d.userAccepted).length;
  const avgDurationDelta = totalDecisions > 0
    ? Math.round((allDecisions.reduce((sum, d) => sum + (d.durationDeltaMinutes || 0), 0) / totalDecisions) * 10) / 10
    : 0;

  return {
    success: true,
    count: totalDecisions,
    acceptedCount,
    avgDurationDeltaMinutes: avgDurationDelta,
    decisions: allDecisions
  };
}

/**
 * Replays route progression using stored geometry from actual transitions.
 * Prohibits invented/synthetic historical geometry.
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Chronological route replay steps
 */
export async function getRouteReplay({
  journeyId,
  userId = 'guest-traveler',
  userRole = 'USER'
}) {
  let journey = null;

  if (isDbConnected()) {
    journey = await Journey.findById(journeyId);
  } else {
    journey = inMemoryStore.journeys.get(journeyId) || null;
  }

  if (!journey || journey.isDeleted) {
    return {
      success: false,
      status: 'NOT_FOUND',
      error: 'Journey record not found.'
    };
  }

  // Authorization Check: Users cannot read another user's journey
  if (!isUserAuthorizedForJourney(journey, userId, userRole)) {
    securityLogger.warn(`[AUDIT_SECURITY] Unauthorized replay attempt for journey ${journeyId} by user ${userId}`);
    return {
      success: false,
      status: 'FORBIDDEN',
      code: 'UNAUTHORIZED_JOURNEY_ACCESS',
      error: 'Access denied: You are not authorized to view another user\'s journey history.'
    };
  }

  const decisions = [...(journey.decisionRecords || [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const replaySteps = decisions.map((dec, idx) => {
    return {
      stepIndex: idx + 1,
      decisionId: dec.decisionId,
      timestamp: dec.createdAt,
      decisionType: dec.decisionType,
      routeVersion: dec.newRouteVersion,
      fromRouteId: dec.previousRouteId,
      toRouteId: dec.newRouteId,
      routeName: dec.toRoute?.name || `Route ${dec.newRouteId}`,
      reasonCodes: dec.reasonCodes,
      estimatedEtaMinutes: dec.estimatedDurationMinutes,
      actualDurationMinutes: dec.actualDurationMinutes,
      varianceMinutes: dec.durationVarianceMinutes,
      storedGeometry: dec.storedGeometry, // Actual saved geometry
      hasStoredGeometry: Array.isArray(dec.storedGeometry) && dec.storedGeometry.length > 0
    };
  });

  return {
    success: true,
    journeyId,
    trip: journey.trip,
    baselineVersion: 1,
    currentVersion: journey.version || 1,
    totalTransitions: replaySteps.length,
    replaySteps,
    provenance: 'STORED_HISTORICAL_GEOMETRY'
  };
}

/**
 * Deletes a journey following user-controlled privacy and retention policy.
 * Strictly prevents a user from deleting another user's journeys.
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteJourneyHistory({
  journeyId,
  userId = 'guest-traveler',
  userRole = 'USER',
  permanent = false
}) {
  let journey = null;

  if (isDbConnected()) {
    journey = await Journey.findById(journeyId);
  } else {
    journey = inMemoryStore.journeys.get(journeyId) || null;
  }

  if (!journey) {
    return {
      success: false,
      status: 'NOT_FOUND',
      error: 'Journey not found.'
    };
  }

  // Authorization Check
  if (!isUserAuthorizedForJourney(journey, userId, userRole)) {
    securityLogger.warn(`[AUDIT_SECURITY] Unauthorized deletion attempt for journey ${journeyId} by user ${userId}`);
    return {
      success: false,
      status: 'FORBIDDEN',
      code: 'UNAUTHORIZED_JOURNEY_DELETE',
      error: 'Access denied: You cannot delete another user\'s journey.'
    };
  }

  if (isDbConnected()) {
    if (permanent) {
      await Journey.findByIdAndDelete(journeyId);
    } else {
      journey.isDeleted = true;
      journey.deletedAt = new Date().toISOString();
      await journey.save();
    }
  } else {
    if (permanent) {
      inMemoryStore.journeys.delete(journeyId);
    } else {
      journey.isDeleted = true;
      journey.deletedAt = new Date().toISOString();
    }
  }

  securityLogger.info(`[AUDIT_PURGE] Journey ${journeyId} deleted by user ${userId} (permanent=${permanent})`);

  return {
    success: true,
    message: 'Journey deleted successfully in compliance with privacy retention policy.',
    journeyId,
    deletedAt: new Date().toISOString()
  };
}

/**
 * Exports complete journey audit trail as JSON.
 * Strictly enforces user authorization.
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Export payload
 */
export async function exportJourneyAuditTrail({
  journeyId,
  userId = 'guest-traveler',
  userRole = 'USER'
}) {
  let journey = null;

  if (isDbConnected()) {
    journey = await Journey.findById(journeyId);
  } else {
    journey = inMemoryStore.journeys.get(journeyId) || null;
  }

  if (!journey || journey.isDeleted) {
    return {
      success: false,
      status: 'NOT_FOUND',
      error: 'Journey not found.'
    };
  }

  // Authorization Check
  if (!isUserAuthorizedForJourney(journey, userId, userRole)) {
    return {
      success: false,
      status: 'FORBIDDEN',
      code: 'UNAUTHORIZED_JOURNEY_EXPORT',
      error: 'Access denied: You cannot export another user\'s journey.'
    };
  }

  const exportData = {
    exportVersion: '2.2-audit',
    exportedAt: new Date().toISOString(),
    journeyId: journey._id || journey.id,
    userId: journey.userId,
    trip: journey.trip,
    travelerProfile: journey.traveler,
    routeVersion: journey.version,
    overallScore: journey.overallScore,
    fitLevel: journey.fitLevel,
    journeyHealth: journey.journeyHealth,
    decisionsCount: (journey.decisionRecords || []).length,
    decisionRecords: journey.decisionRecords || [],
    routeTransitions: journey.routeTransitions || [],
    eventHistory: journey.eventHistory || [],
    notifications: journey.notifications || [],
    retentionPolicy: {
      locationRetentionDays: 30,
      userControlledDeletion: true
    }
  };

  return {
    success: true,
    data: exportData
  };
}

/**
 * Enforces location history retention policy by purging records older than retention period.
 * 
 * @param {number} [retentionDays=30] Retention window in days
 * @returns {Promise<number>} Number of purged records
 */
export async function enforceLocationRetentionPolicy(retentionDays = 30) {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  let purgedCount = 0;

  if (isDbConnected()) {
    const result = await LocationHistory.deleteMany({
      createdAt: { $lt: cutoffDate }
    });
    purgedCount = result.deletedCount || 0;
  } else {
    for (const [userId, records] of inMemoryStore.locationHistory.entries()) {
      const filtered = records.filter(r => new Date(r.recordedAt).getTime() >= cutoffDate.getTime());
      purgedCount += (records.length - filtered.length);
      inMemoryStore.locationHistory.set(userId, filtered);
    }
  }

  if (purgedCount > 0) {
    securityLogger.info(`[RETENTION_POLICY] Purged ${purgedCount} location history records older than ${retentionDays} days.`);
  }

  return purgedCount;
}
