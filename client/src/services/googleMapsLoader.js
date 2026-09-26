/**
 * WAYFARER AI - Google Maps JavaScript API Loader
 * Safely loads Google Maps API with Places & Geometry libraries.
 * Gracefully handles missing keys, network errors, and offline modes.
 */

let googleMapsPromise = null;

export function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

export function isGoogleMapsConfigured() {
  const apiKey = getGoogleMapsApiKey();
  return apiKey && apiKey.trim() !== '' && apiKey.toLowerCase() !== 'your_google_maps_api_key_here';
}

/**
 * Dynamically loads Google Maps script once and returns window.google.maps
 */
export function loadGoogleMapsScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if (window.google && window.google.maps) return Promise.resolve(window.google.maps);

  if (googleMapsPromise) return googleMapsPromise;

  const apiKey = getGoogleMapsApiKey();
  const validKey = apiKey && apiKey.trim() !== '' && apiKey.toLowerCase() !== 'your_google_maps_api_key_here' ? apiKey : '';

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if script element already exists
    const existingScript = document.getElementById('wayfarer-google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google.maps));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
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
