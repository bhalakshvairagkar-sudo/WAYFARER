/**
 * WAYFARER AI - Google Maps JavaScript API Loader
 * Safely loads Google Maps API with Places & Geometry libraries.
 * Gracefully handles missing keys, network errors, and offline modes.
 */

let googleMapsPromise = null;
let dynamicApiKey = null;

export function setGoogleMapsApiKey(key) {
  if (key && typeof key === 'string') {
    dynamicApiKey = key.trim();
  }
}

export function getGoogleMapsApiKey() {
  if (dynamicApiKey && dynamicApiKey !== '' && dynamicApiKey.toLowerCase() !== 'your_google_maps_api_key_here') {
    return dynamicApiKey;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('wayfarer_google_maps_api_key');
    if (stored && stored.trim() !== '' && stored.toLowerCase() !== 'your_google_maps_api_key_here') {
      return stored.trim();
    }
  }
  const viteKey = (import.meta.env && import.meta.env.VITE_GOOGLE_MAPS_API_KEY) || '';
  if (viteKey && viteKey.trim() !== '' && viteKey.toLowerCase() !== 'your_google_maps_api_key_here') {
    return viteKey.trim();
  }
  return '';
}

export function saveGoogleMapsApiKey(key) {
  const cleanKey = (key || '').trim();
  if (typeof window !== 'undefined' && window.localStorage) {
    if (cleanKey && cleanKey.toLowerCase() !== 'your_google_maps_api_key_here') {
      window.localStorage.setItem('wayfarer_google_maps_api_key', cleanKey);
      setGoogleMapsApiKey(cleanKey);
    } else {
      window.localStorage.removeItem('wayfarer_google_maps_api_key');
      setGoogleMapsApiKey('');
    }
  }
  // Reset promise so reloaded script uses the new key
  googleMapsPromise = null;
  // Also sync to backend environment
  try {
    fetch('/api/config/maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanKey })
    }).catch(() => {});
  } catch (e) {}
}

export function isGoogleMapsConfigured() {
  const apiKey = getGoogleMapsApiKey();
  return Boolean(apiKey && apiKey.trim() !== '' && apiKey.toLowerCase() !== 'your_google_maps_api_key_here');
}

/**
 * Optionally fetches maps config from server if key is set in backend .env
 */
export async function ensureMapsKeyLoaded() {
  if (isGoogleMapsConfigured()) return getGoogleMapsApiKey();
  try {
    const res = await fetch('/api/config/maps');
    if (res.ok) {
      const data = await res.json();
      if (data?.apiKey) {
        setGoogleMapsApiKey(data.apiKey);
        return data.apiKey;
      }
    }
  } catch (err) {
    // Fail silently to offline/nominatim mode
  }
  return '';
}

/**
 * Dynamically loads Google Maps script once and returns window.google.maps
 */
export async function loadGoogleMapsScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);

  if (googleMapsPromise) return googleMapsPromise;

  // Attempt server fetch if not in vite env
  let apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    apiKey = await ensureMapsKeyLoaded();
  }

  const validKey = apiKey && apiKey.trim() !== '' && apiKey.toLowerCase() !== 'your_google_maps_api_key_here' ? apiKey : '';

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.getElementById('wayfarer-google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    // Intercept Google Maps auth failure to prevent unhandled alerts
    if (typeof window !== 'undefined') {
      window.gm_authFailure = () => {
        console.warn('[Google Maps] Authentication failed. Falling back gracefully to OpenStreetMap/Leaflet.');
      };
    }

    const callbackName = `__wayfarerGoogleMapsCallback_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    script.id = 'wayfarer-google-maps-script';
    script.type = 'text/javascript';
    const keyParam = validKey ? `key=${validKey}&` : '';
    script.src = `https://maps.googleapis.com/maps/api/js?${keyParam}libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error(`Failed to load Google Maps script: ${err.message || 'Network error'}`));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
