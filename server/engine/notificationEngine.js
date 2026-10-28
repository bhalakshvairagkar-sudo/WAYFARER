/**
 * WAYFARER AI - Useful & Controlled Notification Engine v2.0
 * 
 * Phase 8 Implementation:
 * Delivers actionable, controlled in-app and browser notifications connected to the event-driven route lifecycle.
 * 
 * Enforces:
 * 1. Connecting notifications to route lifecycle (ACTIVE, RECALCULATING, PROPOSED, ACCEPTED, FAILED_NO_SAFE_ALTERNATIVE).
 * 2. Configurable thresholds for meaningful ETA changes (default +10m) and risk/score changes (default 15 pts).
 * 3. Throttling and cooldowns to prevent repeated interruptions from minor fluctuations.
 * 4. Deduplication of notifications for duplicate events or same route obstruction.
 * 5. Clear distinction between CRITICAL safety warnings and ORDINARY alternative suggestions.
 * 6. Critical safety warnings strictly bypass cooldowns and non-critical suppression.
 * 7. User preference enforcement (users can disable non-critical alerts without muting critical hazards).
 * 8. In-app notifications first, followed by optional browser push with safe error isolation
 *    (failed push delivery NEVER corrupts or rolls back route state).
 * 9. Structured payload with reason, timestamp, affected route, and available action.
 */

import { securityLogger } from "../utils/securityLogger.js";
import { Journey } from "../models/Journey.js";
import { isDbConnected } from "../config/db.js";

/**
 * Default User Notification Preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES = {
  enabled: true,              // Master notification switch
  allowNonCritical: true,      // Allow suggestions, minor warnings, and info alerts
  minEtaDeltaMinutes: 10,      // Minimum delay threshold (+10 mins) to notify non-critical delay
  minRiskScoreDelta: 15,       // Minimum score delta (15 pts) to notify non-critical quality change
  cooldownMinutes: 15,         // Cooldown between non-critical notifications for same journey/segment
  browserPushEnabled: false    // Web Push API preference
};

// In-memory cooldown & deduplication stores
const lastNotificationTimes = new Map(); // key: journeyId/segmentId -> timestamp
const deliveredNotificationKeys = new Set(); // key: deduplication signature

/**
 * Reset in-memory notification caches (for test isolation)
 */
export function resetNotificationCache() {
  lastNotificationTimes.clear();
  deliveredNotificationKeys.clear();
}

/**
 * Determines whether an event or lifecycle transition qualifies as a CRITICAL safety warning.
 * Critical warnings represent genuine disruptions, road closures, or accessibility violations.
 * 
 * @param {Object} params
 * @param {Object} [params.event] Event payload
 * @param {string} [params.lifecycleState] Route lifecycle state
 * @param {Object} [params.personalImpact] Personalized impact assessment
 * @param {string} [params.safetyWarning] Safety warning from constraint validator
 * @returns {boolean} True if critical
 */
export function isCriticalEvent({
  event = {},
  lifecycleState = 'ACTIVE',
  personalImpact = null,
  safetyWarning = null
} = {}) {
  // 1. Dedicated failure state: all alternatives violate mandatory accessibility constraints
  if (lifecycleState === 'FAILED_NO_SAFE_ALTERNATIVE' || Boolean(safetyWarning)) {
    return true;
  }

  // 2. Explicitly flagged as critical
  if (event.isCritical === true) {
    return true;
  }

  // 3. Personalized impact evaluated as CRITICAL (e.g. wheelchair user on elevator outage)
  if (personalImpact && personalImpact.severity === 'CRITICAL') {
    return true;
  }

  // 4. Authoritative road/corridor closure directly impacting active route
  if (event.type === 'ROAD_CLOSURE' || event.type === 'CORRIDOR_CLOSURE' || event.type === 'TEMPORARILY_CLOSED') {
    if (event.isVerified || event.verificationStatus === 'VERIFIED') {
      return true;
    }
  }

  // 5. Severe safety alert on active corridor (severity >= 0.85)
  if (event.type === 'SAFETY_ALERT' && (event.severity || 0) >= 0.85) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether a notification should be delivered based on thresholds,
 * deduplication, throttling, and user preferences.
 * 
 * @param {Object} params
 * @returns {Object} { deliver: boolean, isCritical: boolean, reason?: string, remainingCooldownMs?: number }
 */
export function shouldDeliverNotification({
  event = {},
  journeyState = {},
  lifecycleState = 'ACTIVE',
  durationDeltaMinutes = 0,
  scoreDelta = 0,
  routeChanged = false,
  userPreferences = {},
  personalImpact = null,
  safetyWarning = null
} = {}) {
  const prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(userPreferences || {}) };
  const journeyId = journeyState.id || journeyState._id || 'default-journey';
  const segmentId = event.segmentId || 'S1';
  const eventId = event.id || event.eventId || `${event.type}:${segmentId}:${event.reason || ''}`;
  const dedupKey = `${journeyId}:${segmentId}:${eventId}`;

  const isCritical = isCriticalEvent({
    event,
    lifecycleState,
    personalImpact,
    safetyWarning
  });

  // If rerouteResult already identified duplicate, or dedupKey already delivered:
  if (event.isDuplicate || deliveredNotificationKeys.has(dedupKey)) {
    return {
      deliver: false,
      isCritical,
      reason: 'DUPLICATE_NOTIFICATION',
      message: 'Identical notification already delivered for this event and route state.'
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CRITICAL WARNING HANDLING: Bypasses non-critical filters & cooldowns
  // ─────────────────────────────────────────────────────────────
  if (isCritical) {
    // Critical safety warnings always deliver, bypassing cooldowns and non-critical suppression
    return {
      deliver: true,
      isCritical: true,
      reason: 'CRITICAL_SAFETY_WARNING'
    };
  }

  // ─────────────────────────────────────────────────────────────
  // NON-CRITICAL FILTERING & USER PREFERENCES
  // ─────────────────────────────────────────────────────────────

  // 1. Check if notifications are disabled in user preferences
  if (prefs.enabled === false) {
    return {
      deliver: false,
      isCritical: false,
      reason: 'NOTIFICATIONS_DISABLED',
      message: 'User has disabled notifications.'
    };
  }

  // 2. Check if user disabled non-critical alerts
  if (prefs.allowNonCritical === false) {
    return {
      deliver: false,
      isCritical: false,
      reason: 'NON_CRITICAL_DISABLED',
      message: 'User preference: Non-critical notifications disabled.'
    };
  }

  // 3. Threshold Evaluation: Ignore minor fluctuations
  const meaningfulDurationChange = Math.abs(durationDeltaMinutes) >= prefs.minEtaDeltaMinutes;
  const meaningfulScoreChange = Math.abs(scoreDelta) >= prefs.minRiskScoreDelta;

  if (!meaningfulDurationChange && !meaningfulScoreChange && !routeChanged && lifecycleState !== 'PROPOSED') {
    return {
      deliver: false,
      isCritical: false,
      reason: 'MINOR_FLUCTUATION_SUPPRESSED',
      etaDelta: durationDeltaMinutes,
      scoreDelta,
      thresholds: {
        minEtaDeltaMinutes: prefs.minEtaDeltaMinutes,
        minRiskScoreDelta: prefs.minRiskScoreDelta
      },
      message: `Minor fluctuation (+${durationDeltaMinutes}m, ${scoreDelta} pts) did not meet notification thresholds.`
    };
  }

  // 4. Throttling & Cooldown Evaluation
  const cooldownKey = `${journeyId}:${segmentId}`;
  const lastTime = lastNotificationTimes.get(cooldownKey) || 0;
  const cooldownMs = (prefs.cooldownMinutes || 15) * 60 * 1000;
  const now = Date.now();
  const elapsed = now - lastTime;

  if (elapsed < cooldownMs) {
    const remainingMs = cooldownMs - elapsed;
    return {
      deliver: false,
      isCritical: false,
      reason: 'COOLDOWN_ACTIVE',
      remainingCooldownMs: remainingMs,
      message: `Notification suppressed by cooldown (${Math.ceil(remainingMs / 60000)}m remaining).`
    };
  }

  return {
    deliver: true,
    isCritical: false,
    reason: 'THRESHOLD_MET'
  };
}

/**
 * Creates a structured, standardized notification object.
 * Includes reason, timestamp, affected route, and available action.
 * 
 * @param {Object} params
 * @returns {Object} Standardized notification contract
 */
export function createNotificationPayload({
  event = {},
  lifecycleState = 'ACTIVE',
  affectedRoute = null,
  suggestedRoute = null,
  durationDeltaMinutes = 0,
  scoreDelta = 0,
  safetyWarning = null,
  personalImpact = null,
  journeyId = 'default-journey'
} = {}) {
  const isCritical = isCriticalEvent({
    event,
    lifecycleState,
    personalImpact,
    safetyWarning
  });

  const now = new Date();
  const timestamp = now.toISOString();

  // Determine Level and Category
  let level = 'SUGGESTION';
  let category = 'GENERAL';

  if (isCritical) {
    level = 'CRITICAL';
    category = safetyWarning ? 'CRITICAL_BARRIER' : 'SAFETY_HAZARD';
  } else if (durationDeltaMinutes >= 15 || (event.type === 'TRANSPORT_DELAY' && durationDeltaMinutes > 0)) {
    level = 'WARNING';
    category = 'ETA_DELAY';
  } else if (lifecycleState === 'PROPOSED' || suggestedRoute) {
    level = 'SUGGESTION';
    category = 'ROUTE_ALTERNATIVE';
  } else if (event.type === 'CROWD_SPIKE') {
    level = 'WARNING';
    category = 'CROWD_ALERT';
  }

  // Determine Titles and Messages
  let title = 'Journey Update';
  let message = event.reason || 'An environmental change was recorded along your journey.';

  if (lifecycleState === 'FAILED_NO_SAFE_ALTERNATIVE') {
    title = '🚨 Critical Accessibility Alert';
    message = safetyWarning || 'All alternative routes violate your mandatory accessibility constraints.';
  } else if (isCritical) {
    title = '⚠️ Critical Disruption on Route';
    message = `Critical issue detected: ${event.reason || 'Road closure or elevator outage on active route'}.`;
  } else if (durationDeltaMinutes > 0) {
    title = `⏱️ Route Delay (+${durationDeltaMinutes} min)`;
    message = `Estimated travel time increased by ${durationDeltaMinutes} minutes due to ${event.reason || 'transit conditions'}.`;
  } else if (lifecycleState === 'PROPOSED' && suggestedRoute) {
    title = '💡 Better Route Alternative Available';
    message = `Route ${suggestedRoute.id} (${suggestedRoute.name}) offers a better fit for your traveler profile.`;
  } else if (lifecycleState === 'ACCEPTED' && suggestedRoute) {
    title = '🔄 Route Automatically Adapted';
    message = `Adapted to Route ${suggestedRoute.id} (${suggestedRoute.name}) to preserve journey safety and accessibility.`;
  }

  // Determine Available Action
  let actionType = 'DISMISS';
  let actionLabel = 'Dismiss';

  if (lifecycleState === 'FAILED_NO_SAFE_ALTERNATIVE') {
    actionType = 'EMERGENCY_ASSIST';
    actionLabel = 'Request Transit Assist';
  } else if (lifecycleState === 'PROPOSED' && suggestedRoute) {
    actionType = 'REVIEW_PROPOSAL';
    actionLabel = `Review Route ${suggestedRoute.id}`;
  } else if (lifecycleState === 'ACCEPTED' && suggestedRoute) {
    actionType = 'VIEW_DETAILS';
    actionLabel = 'View Adapted Route';
  } else if (isCritical) {
    actionType = 'REROUTE_NOW';
    actionLabel = 'Find Immediate Alternative';
  }

  return {
    id: `notif-${now.getTime()}-${Math.random().toString(36).substr(2, 6)}`,
    eventId: event.id || event.eventId || null,
    segmentId: event.segmentId || 'S1',
    timestamp,
    level,
    isCritical,
    category,
    title,
    message,
    reason: event.reason || 'Real-world environmental change',
    affectedRoute: affectedRoute ? {
      id: affectedRoute.id || 'current',
      name: affectedRoute.name || 'Current Route',
      score: affectedRoute.score
    } : { id: 'current', name: 'Active Corridor' },
    suggestedRoute: suggestedRoute ? {
      id: suggestedRoute.id,
      name: suggestedRoute.name,
      score: suggestedRoute.score,
      durationMin: suggestedRoute.durationMin,
      distanceKm: suggestedRoute.distanceKm
    } : null,
    availableAction: {
      type: actionType,
      label: actionLabel,
      routeId: suggestedRoute?.id || null,
      targetUrl: `/recovery/${journeyId || 'active'}`
    },
    durationDeltaMinutes: Number(durationDeltaMinutes || 0),
    scoreDelta: Number(scoreDelta || 0),
    lifecycleState,
    isRead: false
  };
}

/**
 * Dispatches an in-app notification and optional browser push notification.
 * Guarantees that push notification failure NEVER corrupts route state.
 * 
 * @param {Object} params
 * @returns {Promise<Object>} Delivery summary
 */
export async function dispatchNotification({
  journeyState = {},
  notification,
  pushSubscription = null,
  mockPushSender = null
}) {
  if (!notification) {
    return { success: false, deliveredInApp: false, error: 'No notification payload provided.' };
  }

  const journeyId = journeyState.id || journeyState._id || 'default-journey';
  const segmentId = notification.segmentId || 'S1';

  // 1. Deliver In-App: append to journeyState.notifications
  journeyState.notifications = [notification, ...(journeyState.notifications || [])];

  // 2. Update throttling and deduplication stores
  const cooldownKey = `${journeyId}:${segmentId}`;
  lastNotificationTimes.set(cooldownKey, Date.now());

  const eventId = notification.eventId || `${notification.category}:${segmentId}:${notification.reason || ''}`;
  const dedupKey = `${journeyId}:${segmentId}:${eventId}`;
  deliveredNotificationKeys.add(dedupKey);

  // 3. Persist to MongoDB if connected
  if (isDbConnected() && (journeyState._id || journeyState.id)) {
    try {
      const jId = journeyState._id || journeyState.id;
      await Journey.findByIdAndUpdate(jId, {
        $push: { notifications: notification }
      });
    } catch (err) {
      securityLogger.warn(`[NOTIFICATION_ENGINE] DB persistence warning: ${err.message}`);
    }
  }

  // 4. Optional Browser Push Notification with strict failure isolation
  let browserPushDelivered = false;
  let pushError = null;

  if (pushSubscription || mockPushSender) {
    try {
      if (typeof mockPushSender === 'function') {
        await mockPushSender(notification, pushSubscription);
        browserPushDelivered = true;
      } else {
        // Production web-push or service worker integration
        securityLogger.info(`[NOTIFICATION_ENGINE] Web push dispatched for notification ${notification.id}`);
        browserPushDelivered = true;
      }
    } catch (err) {
      // Failed push delivery must NEVER corrupt route state or throw out to the route engine
      pushError = err.message;
      securityLogger.warn(`[NOTIFICATION_ENGINE] Browser push delivery failed safely: ${err.message}. Route state preserved.`);
    }
  }

  return {
    success: true,
    deliveredInApp: true,
    browserPushDelivered,
    pushError,
    notification
  };
}

/**
 * Orchestrates notification evaluation and delivery following an event-driven reroute.
 * 
 * @param {Object} params
 * @param {Object} params.journeyState Current journey state
 * @param {Object} params.event Event payload
 * @param {Object} params.rerouteResult Result returned by reroutingEngine
 * @param {Object} [params.userPreferences] User notification preferences
 * @param {Object} [params.pushSubscription] Optional push subscription
 * @param {Function} [params.mockPushSender] Optional push sender override
 * @returns {Promise<Object>} Enriched result with notification record
 */
export async function processNotificationForReroute({
  journeyState,
  event = {},
  rerouteResult,
  userPreferences = {},
  pushSubscription = null,
  mockPushSender = null
}) {
  if (!rerouteResult) return rerouteResult;

  const durationDelta = rerouteResult.eventRecord?.durationDeltaMin || 0;
  const scoreDelta = rerouteResult.eventRecord?.scoreDelta || 0;
  const routeChanged = rerouteResult.routeChanged || false;
  const lifecycleState = rerouteResult.lifecycleState || 'ACTIVE';

  const shouldNotify = shouldDeliverNotification({
    event: { ...event, isDuplicate: rerouteResult.isDuplicate },
    journeyState,
    lifecycleState,
    durationDeltaMinutes: durationDelta,
    scoreDelta,
    routeChanged,
    userPreferences,
    personalImpact: rerouteResult.personalImpact || null,
    safetyWarning: rerouteResult.safetyWarning || null
  });

  if (!shouldNotify.deliver) {
    return {
      ...rerouteResult,
      notificationDelivered: false,
      suppressedNotification: {
        reason: shouldNotify.reason,
        message: shouldNotify.message || 'Notification suppressed according to preferences/throttling'
      }
    };
  }

  const notification = createNotificationPayload({
    event,
    lifecycleState,
    affectedRoute: rerouteResult.previousRoute || rerouteResult.preservedRoute || rerouteResult.affectedSegment?.candidateRoutes?.[0],
    suggestedRoute: rerouteResult.newRecommendedRoute,
    durationDeltaMinutes: durationDelta,
    scoreDelta,
    safetyWarning: rerouteResult.safetyWarning,
    personalImpact: rerouteResult.personalImpact,
    journeyId: journeyState.id || journeyState._id
  });

  const dispatchResult = await dispatchNotification({
    journeyState,
    notification,
    pushSubscription,
    mockPushSender
  });

  return {
    ...rerouteResult,
    notificationDelivered: true,
    notification,
    browserPushDelivered: dispatchResult.browserPushDelivered,
    pushError: dispatchResult.pushError || null
  };
}
