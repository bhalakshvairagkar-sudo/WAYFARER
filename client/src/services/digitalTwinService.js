/**
 * WAYFARER AI - Digital Twin API Service
 * Connects frontend dashboard and map to the backend Weather Digital Twin Engine
 */

const API_BASE = '/api/digital-twin';

function getAuthHeaders() {
  const token = localStorage.getItem('wayfarer_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch live digital twin state for coordinates or journey
 */
export async function getLiveDigitalTwin(lat = 18.9401, lng = 72.8354, journeyState = null) {
  try {
    const res = await fetch(`${API_BASE}/current?lat=${lat}&lng=${lng}`, {
      method: 'GET',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('[DigitalTwinService] getLiveDigitalTwin fallback:', err.message);
    return null;
  }
}

/**
 * Run counterfactual What-If simulation with custom parameters
 * (Strict Isolation: does not mutate live state or database)
 */
export async function simulateWhatIf(journeyState, whatIfParams) {
  try {
    const res = await fetch(`${API_BASE}/simulate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ journeyState, whatIfParams })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('[DigitalTwinService] simulateWhatIf error:', err);
    throw err;
  }
}

/**
 * Retrieve pre-baked environmental scenarios
 */
export async function getPrebakedScenarios() {
  try {
    const res = await fetch(`${API_BASE}/scenarios`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.scenarios || [];
  } catch (err) {
    console.warn('[DigitalTwinService] getPrebakedScenarios fallback:', err.message);
    return [];
  }
}

/**
 * Fetch raw live weather telemetry
 */
export async function getLiveWeather(lat = 18.922, lng = 72.834) {
  try {
    const res = await fetch(`${API_BASE}/weather?lat=${lat}&lng=${lng}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.weather;
  } catch (err) {
    console.warn('[DigitalTwinService] getLiveWeather error:', err.message);
    return null;
  }
}

/**
 * Fetch verified real-world social and civic signals
 */
export async function getSocialSignals(lat = 18.922, lng = 72.834, topic = null) {
  try {
    const topicQuery = topic ? `&topic=${encodeURIComponent(topic)}` : '';
    const res = await fetch(`${API_BASE}/social-signals?lat=${lat}&lng=${lng}${topicQuery}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.signals || [];
  } catch (err) {
    console.warn('[DigitalTwinService] getSocialSignals error:', err.message);
    return [];
  }
}
