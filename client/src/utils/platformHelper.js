/**
 * WAYFARER AI - Platform & Capabilities Detection Helper
 * 
 * Accurately determines client runtime (PWA, Web, or Native Capacitor)
 * and strictly bounds advertised capabilities:
 * - Offline cached route viewing is available.
 * - Background tracking and offline rerouting are NOT falsely advertised.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Checks whether the app is currently running in a native Capacitor shell.
 * 
 * @returns {boolean} True if running on native iOS/Android device
 */
export function isNativeApp() {
  try {
    return typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
  } catch (_) {
    return false;
  }
}

/**
 * Checks whether the app is currently installed and running as a standalone PWA.
 * 
 * @returns {boolean} True if running as standalone PWA
 */
export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * Returns the current platform identifier.
 * 
 * @returns {'ios' | 'android' | 'pwa' | 'web'}
 */
export function getPlatformType() {
  if (isNativeApp()) {
    try {
      return Capacitor.getPlatform(); // 'ios' or 'android'
    } catch (_) {
      return 'native';
    }
  }
  if (isStandalonePwa()) {
    return 'pwa';
  }
  return 'web';
}

/**
 * Returns the verified capabilities of WAYFARER on this client.
 * In accordance with Phase 11 safety criteria:
 * - Offline cached route viewing is supported.
 * - Background tracking and offline recalculations are advertised ONLY if separately implemented and verified.
 */
export function getVerifiedCapabilities() {
  return {
    offlineRouteViewing: true,
    offlineRerouting: false, // Requires live edge-compute or server network
    backgroundTracking: false, // Requires native background service authorization
    permissionAwareGeolocation: true,
    pwaInstallable: !isNativeApp(),
    serviceWorkerPrecaching: true,
    idempotentSyncOnReconnect: true
  };
}
