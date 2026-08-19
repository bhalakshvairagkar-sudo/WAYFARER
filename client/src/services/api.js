/**
 * WAYFARER AI - Frontend API Service Client
 */

const API_BASE = '/api';

export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
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

export async function fetchDefaultJourney() {
  try {
    const res = await fetch(`${API_BASE}/journey/default`);
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
