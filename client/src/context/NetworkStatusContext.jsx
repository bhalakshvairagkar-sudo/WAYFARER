import React, { createContext, useContext, useState, useEffect } from 'react';

const NetworkStatusContext = createContext(null);

export function NetworkStatusProvider({ children }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState(new Date().toISOString());
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Stale data freshness indicators
  const [dataFreshness, setDataFreshness] = useState({
    isStale: false,
    cachedAt: null,
    provenance: 'LIVE_NETWORK',
    statusText: 'Data Live & Fresh'
  });

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setWasOffline(true);
      setLastOnlineAt(new Date().toISOString());
      
      // Auto-revert stale indicator if network is back
      setDataFreshness((prev) => ({
        ...prev,
        isStale: false,
        provenance: 'LIVE_NETWORK',
        statusText: 'Connection Restored — Live'
      }));

      // Auto dismiss reconnected notice after 4 seconds
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 4000);

      return () => clearTimeout(timer);
    }

    function handleOffline() {
      setIsOnline(false);
      setDataFreshness((prev) => ({
        ...prev,
        isStale: true,
        provenance: 'POTENTIALLY_STALE_CACHE',
        statusText: 'Offline — Cached Data (Potentially Stale)'
      }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capture PWA install prompt
    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setPwaInstallPrompt(e);
    }

    function handleAppInstalled() {
      setIsPwaInstalled(true);
      setPwaInstallPrompt(null);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptPwaInstall = async () => {
    if (!pwaInstallPrompt) return false;
    pwaInstallPrompt.prompt();
    const { outcome } = await pwaInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      setPwaInstallPrompt(null);
      return true;
    }
    return false;
  };

  const markDataAsStale = (cachedTimestamp) => {
    setDataFreshness({
      isStale: true,
      cachedAt: cachedTimestamp || new Date().toISOString(),
      provenance: 'POTENTIALLY_STALE_CACHE',
      statusText: 'Cached Data (Potentially Stale)'
    });
  };

  const markDataAsLive = () => {
    setDataFreshness({
      isStale: false,
      cachedAt: null,
      provenance: 'LIVE_NETWORK',
      statusText: 'Data Live & Fresh'
    });
  };

  const value = {
    isOnline,
    wasOffline,
    lastOnlineAt,
    dataFreshness,
    markDataAsStale,
    markDataAsLive,
    pwaInstallPrompt,
    promptPwaInstall,
    isPwaInstalled
  };

  return (
    <NetworkStatusContext.Provider value={value}>
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext);
  if (!context) {
    return {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      wasOffline: false,
      lastOnlineAt: new Date().toISOString(),
      dataFreshness: { isStale: false, provenance: 'LIVE_NETWORK', statusText: 'Live' },
      markDataAsStale: () => {},
      markDataAsLive: () => {},
      pwaInstallPrompt: null,
      promptPwaInstall: async () => false,
      isPwaInstalled: false
    };
  }
  return context;
}
