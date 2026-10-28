/**
 * WAYFARER AI - Permission-Aware Geolocation Helper
 * 
 * Provides safe, non-blocking browser geolocation with explicit permission states.
 * Guarantees that denying location permission never locks the UI or breaks manual entry.
 */

export const GEOLOCATION_STATUS = {
  GRANTED: 'GRANTED',
  PROMPT: 'PROMPT',
  DENIED: 'DENIED',
  UNSUPPORTED: 'UNSUPPORTED',
  TIMEOUT: 'TIMEOUT',
  UNAVAILABLE: 'UNAVAILABLE'
};

/**
 * Queries the current browser permission state for geolocation.
 * 
 * @returns {Promise<string>} 'GRANTED' | 'PROMPT' | 'DENIED' | 'UNSUPPORTED'
 */
export async function checkGeolocationPermission() {
  if (typeof window === 'undefined' || !navigator.permissions || !navigator.geolocation) {
    return GEOLOCATION_STATUS.UNSUPPORTED;
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'granted') return GEOLOCATION_STATUS.GRANTED;
    if (status.state === 'denied') return GEOLOCATION_STATUS.DENIED;
    return GEOLOCATION_STATUS.PROMPT;
  } catch (err) {
    // Some browsers do not support querying geolocation permission
    return GEOLOCATION_STATUS.PROMPT;
  }
}

/**
 * Requests current GPS coordinates with non-blocking error handling.
 * 
 * @param {Object} options
 * @param {number} [options.timeout=8000]
 * @param {boolean} [options.enableHighAccuracy=true]
 * @param {number} [options.maximumAge=30000]
 * @returns {Promise<Object>} { success: boolean, coords?: { lat, lng, accuracy }, status: string, error?: string, canManualInput: true }
 */
export async function getCurrentGeolocation(options = {}) {
  const { timeout = 8000, enableHighAccuracy = true, maximumAge = 30000 } = options;

  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      success: false,
      status: GEOLOCATION_STATUS.UNSUPPORTED,
      error: 'Geolocation is not supported by your current browser environment.',
      canManualInput: true
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          status: GEOLOCATION_STATUS.GRANTED,
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy || 10
          },
          canManualInput: true
        });
      },
      (error) => {
        let status = GEOLOCATION_STATUS.UNAVAILABLE;
        let message = 'Unable to acquire location.';

        if (error.code === error.PERMISSION_DENIED) {
          status = GEOLOCATION_STATUS.DENIED;
          message = 'Location permission was denied. You can enter your origin manually.';
        } else if (error.code === error.TIMEOUT) {
          status = GEOLOCATION_STATUS.TIMEOUT;
          message = 'Location request timed out. Please enter your origin manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          status = GEOLOCATION_STATUS.UNAVAILABLE;
          message = 'Location currently unavailable. Please enter your origin manually.';
        }

        resolve({
          success: false,
          status,
          error: message,
          canManualInput: true
        });
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge
      }
    );
  });
}
