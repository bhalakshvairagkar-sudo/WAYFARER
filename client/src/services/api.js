/**
 * WAYFARER AI - Frontend API Service Client
 * Features: Automatic Bearer token management, authenticated endpoints,
 * location telemetry synchronization, and ephemeral sharing clients.
 */

const API_BASE = '/api';

export function getAuthToken() {
  return localStorage.getItem('wayfarer_auth_token') || '';
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('wayfarer_auth_token', token);
  } else {
    localStorage.removeItem('wayfarer_auth_token');
  }
}

export function clearAuthToken() {
  localStorage.removeItem('wayfarer_auth_token');
  localStorage.removeItem('wayfarer_user');
}

export function handleSessionExpiration() {
  clearAuthToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('wayfarer_session_expired', {
      detail: { timestamp: new Date().toISOString() }
    }));
  }
}

export function queueOfflineMutation(mutation) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem('wayfarer_offline_mutations');
    const queue = raw ? JSON.parse(raw) : [];
    if (!queue.some(item => item.payload?.idempotencyKey && item.payload.idempotencyKey === mutation.payload?.idempotencyKey)) {
      queue.push({
        ...mutation,
        queuedAt: new Date().toISOString()
      });
      localStorage.setItem('wayfarer_offline_mutations', JSON.stringify(queue));
    }
  } catch (err) {
    console.warn('[OfflineQueue] Could not enqueue mutation:', err);
  }
}

export async function processOfflineQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  try {
    const raw = localStorage.getItem('wayfarer_offline_mutations');
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (!Array.isArray(queue) || queue.length === 0) return;

    const remaining = [];
    for (const item of queue) {
      try {
        if (item.type === 'COMMUNITY_REPORT') {
          await fetch(`${API_BASE}/community/report`, {
            method: 'POST',
            headers: getHeaders({ 'X-Idempotency-Key': item.payload.idempotencyKey }),
            body: JSON.stringify(item.payload)
          });
        } else if (item.type === 'JOURNEY_SAVE') {
          await fetch(`${API_BASE}/journey/save`, {
            method: 'POST',
            headers: getHeaders({ 'X-Idempotency-Key': item.payload.idempotencyKey }),
            body: JSON.stringify(item.payload)
          });
        }
      } catch (e) {
        remaining.push(item);
      }
    }
    localStorage.setItem('wayfarer_offline_mutations', JSON.stringify(remaining));
  } catch (err) {
    console.warn('[OfflineQueue] Error processing queue:', err);
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processOfflineQueue();
  });
}

function getHeaders(customHeaders = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// -------------------------------------------------------------
// System & Health Endpoints
// -------------------------------------------------------------

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      status: 'offline',
      geminiConfigured: false,
      mode: 'DEMO_FALLBACK'
    };
  }
}

// -------------------------------------------------------------
// Authentication & User Profile Endpoints
// -------------------------------------------------------------

export async function registerUser({ email, password, name, role = 'USER', organization = '', phone = '', privacySettings, travelerProfile }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name, role, organization, phone, privacySettings, travelerProfile })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  if (data.token) {
    setAuthToken(data.token);
    localStorage.setItem('wayfarer_user', JSON.stringify(data.user));
  }
  return data;
}

export async function updateUserProfile(profileData) {
  const res = await fetch(`${API_BASE}/auth/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(profileData)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update profile');
  if (data.user) {
    localStorage.setItem('wayfarer_user', JSON.stringify(data.user));
  }
  return data.user;
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  if (data.token) {
    setAuthToken(data.token);
    localStorage.setItem('wayfarer_user', JSON.stringify(data.user));
  }
  return data;
}

export async function fetchCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getHeaders() });
    if (!res.ok) {
      if (res.status === 401) clearAuthToken();
      return null;
    }
    const data = await res.json();
    if (data.user) {
      localStorage.setItem('wayfarer_user', JSON.stringify(data.user));
    }
    return data.user;
  } catch (err) {
    console.warn('[API Service] User session check failed:', err.message);
    return null;
  }
}

export async function updatePrivacySettings(privacySettings) {
  const res = await fetch(`${API_BASE}/auth/privacy`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(privacySettings)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update privacy settings');
  return data.privacySettings;
}

// -------------------------------------------------------------
// Location Protection & Ephemeral Sharing Endpoints
// -------------------------------------------------------------

export async function updateUserLocation({ lat, lng, accuracy = 10, precision, journeyId }) {
  try {
    const res = await fetch(`${API_BASE}/location/update`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ lat, lng, accuracy, precision, journeyId })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    // Graceful offline fallback
    return { success: false, offline: true };
  }
}

export async function fetchLocationHistory(limit = 50) {
  const res = await fetch(`${API_BASE}/location/history?limit=${limit}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function deleteLocationHistory() {
  const res = await fetch(`${API_BASE}/location/history`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return await res.json();
}

export async function startLocationShare({ durationMinutes = 30, recipientLabel, precision, initialLat, initialLng }) {
  const res = await fetch(`${API_BASE}/location/share/start`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ durationMinutes, recipientLabel, precision, initialLat, initialLng })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to start location sharing');
  return data;
}

export async function stopLocationShare() {
  const res = await fetch(`${API_BASE}/location/share/stop`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to stop location sharing');
  return data;
}

export async function fetchSharedLocation(shareToken) {
  const res = await fetch(`${API_BASE}/location/shared/${shareToken}`);
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Shared location unavailable');
    err.status = res.status;
    throw err;
  }
  return data;
}

// -------------------------------------------------------------
// Journey Intelligence Endpoints
// -------------------------------------------------------------

export async function fetchDefaultJourney() {
  try {
    const res = await fetch(`${API_BASE}/journey/default`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("[API Service] Backend default route error, using local fallback state.");
    return null;
  }
}

export async function parseJourneyPrompt(promptText, formData) {
  try {
    const res = await fetch(`${API_BASE}/journey/parse`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ promptText, formData })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("[API Service] Parse error:", err);
    throw err;
  }
}

export async function postJourneyEvent(journeyState, event) {
  try {
    const res = await fetch(`${API_BASE}/journey/event`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ journeyState, event })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("[API Service] Event error:", err);
    throw err;
  }
}

export async function explainJourneyPlan(trip, traveler, segments, overallScore) {
  try {
    const res = await fetch(`${API_BASE}/journey/explain-plan`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ trip, traveler, segments, overallScore })
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      explanation: `Journey tailored for ${traveler?.name || 'traveler'} with step-free accessibility priority (${Math.round((traveler?.weights?.accessibility || 0.4) * 100)}%).`,
      source: 'LOCAL_EXPLANATION',
      badge: '🟡 Local Explanation'
    };
  }
}

// -------------------------------------------------------------
// Community Report & Evidence Fusion API
// -------------------------------------------------------------

export async function submitCommunityReport(reportPayload) {
  const idempotencyKey = reportPayload.idempotencyKey || `rep-${reportPayload.reporterId || 'guest'}-${reportPayload.resourceId || 'S3'}-${Date.now()}`;
  const payloadWithIdempotency = { ...reportPayload, idempotencyKey };

  try {
    const res = await fetch(`${API_BASE}/community/report`, {
      method: 'POST',
      headers: getHeaders({ 'X-Idempotency-Key': idempotencyKey }),
      body: JSON.stringify(payloadWithIdempotency)
    });
    if (res.status === 401) {
      handleSessionExpiration();
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit report');
    return data;
  } catch (err) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      queueOfflineMutation({ type: 'COMMUNITY_REPORT', payload: payloadWithIdempotency });
      return {
        success: true,
        offline: true,
        message: 'You are currently offline. Report queued with idempotency protection and will sync upon reconnection.',
        idempotencyKey
      };
    }
    console.error('[API Service] Community report submission error:', err);
    throw err;
  }
}

export async function fetchCommunityIncidents() {
  try {
    const res = await fetch(`${API_BASE}/community/incidents`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[API Service] Failed to fetch community incidents:', err.message);
    return { success: false, count: 0, incidents: [] };
  }
}

export async function actionCommunityIncident(incidentId, actionType, notes = '') {
  try {
    const res = await fetch(`${API_BASE}/community/incidents/${incidentId}/action`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ actionType, notes })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to execute incident action');
    return data;
  } catch (err) {
    console.error('[API Service] Incident action error:', err);
    throw err;
  }
}

export async function simulateCommunityScenario(scenario) {
  try {
    const res = await fetch(`${API_BASE}/community/simulate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ scenario })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to simulate scenario');
    return data;
  } catch (err) {
    console.error('[API Service] Scenario simulation error:', err);
    throw err;
  }
}

export async function confirmIncidentFeedback(incidentId, feedbackPayload = {}) {
  try {
    const res = await fetch(`${API_BASE}/community/incidents/${incidentId}/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(feedbackPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to submit feedback');
    return data;
  } catch (err) {
    console.warn('[API Service] Feedback submission failed or running offline:', err.message);
    return { success: true, offline: true, ...feedbackPayload };
  }
}

export async function dispatchEmergencyBroadcast(broadcastPayload = {}) {
  try {
    const res = await fetch(`${API_BASE}/community/broadcast`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(broadcastPayload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to dispatch broadcast');
    return data;
  } catch (err) {
    console.error('[API Service] Emergency broadcast error:', err);
    throw err;
  }
}

export async function saveJourney(journeyPayload) {
  const idempotencyKey = journeyPayload.idempotencyKey || `save-${journeyPayload._id || journeyPayload.id || Date.now()}-${journeyPayload.version || 1}`;
  const payloadWithIdempotency = { ...journeyPayload, idempotencyKey };

  try {
    const res = await fetch(`${API_BASE}/journey/save`, {
      method: 'POST',
      headers: getHeaders({ 'X-Idempotency-Key': idempotencyKey }),
      body: JSON.stringify(payloadWithIdempotency)
    });
    if (res.status === 401) {
      handleSessionExpiration();
    }
    const data = await res.json();
    if (!res.ok) {
      const error = new Error(data.error || 'Failed to save journey');
      error.status = res.status;
      error.code = data.code || 'SAVE_ERROR';
      error.recoverable = data.recoverable !== false;
      error.lastValidStateRetained = Boolean(data.lastValidStateRetained);
      throw error;
    }
    return data;
  } catch (err) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      queueOfflineMutation({ type: 'JOURNEY_SAVE', payload: payloadWithIdempotency });
      return {
        success: true,
        offline: true,
        dataProvenance: 'LOCAL_OFFLINE_CACHE',
        message: 'You are offline. Journey saved locally and will sync when network reconnects.',
        idempotencyKey
      };
    }
    throw err;
  }
}

export async function fetchJourneyHistory() {
  const res = await fetch(`${API_BASE}/journey/history`, {
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to fetch journey history');
    error.status = res.status;
    error.code = data.code || 'FETCH_ERROR';
    error.recoverable = Boolean(data.recoverable);
    throw error;
  }
  return data;
}

export async function fetchProviderHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/providers`, {
      headers: getHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      overallHealth: 'DEGRADED',
      error: err.message,
      providers: []
    };
  }
}

export async function calculateRoutesApi({ origin, destination, waypoints = [], travelMode = 'walking', traveler = {} }) {
  const res = await fetch(`${API_BASE}/routes/calculate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ origin, destination, waypoints, travelMode, traveler })
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to calculate route');
    error.status = res.status;
    error.code = data.code || 'ROUTING_ERROR';
    error.recoverable = true;
    error.routes = data.routes || [];
    throw error;
  }
  return data;
}

export async function fetchRoutingStatus() {
  try {
    const res = await fetch(`${API_BASE}/routes/status`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    return {
      success: false,
      googleMapsConfigured: false,
      osrmAvailable: true,
      error: err.message
    };
  }
}


