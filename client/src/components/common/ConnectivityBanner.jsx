import React, { useState } from 'react';
import { Wifi, WifiOff, RefreshCw, Download, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useNetworkStatus } from '../../context/NetworkStatusContext.jsx';

export default function ConnectivityBanner() {
  const {
    isOnline,
    wasOffline,
    dataFreshness,
    pwaInstallPrompt,
    promptPwaInstall
  } = useNetworkStatus();

  const [dismissPwaPrompt, setDismissPwaPrompt] = useState(false);
  const [dismissOfflineNotice, setDismissOfflineNotice] = useState(false);

  // If user is online, no recent reconnection, and no install prompt to show, render nothing
  if (isOnline && !wasOffline && (!pwaInstallPrompt || dismissPwaPrompt)) {
    return null;
  }

  return (
    <aside aria-label="Network and Application Status" className="w-full z-40 transition-all">
      {/* 1. Offline Mode Notice with Explicit Stale Marker & Capability Disclosures */}
      {!isOnline && !dismissOfflineNotice && (
        <div 
          role="status"
          aria-live="assertive"
          className="bg-amber-600 text-white px-4 py-2.5 text-xs font-medium shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2"
        >
          <div className="flex items-start sm:items-center gap-2.5">
            <WifiOff className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-200" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold uppercase tracking-wide">
                  Offline Mode Active
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-800 text-amber-100 font-bold text-[10px]">
                  ⚠️ POTENTIALLY STALE DATA
                </span>
              </div>
              <p className="text-[11px] text-amber-100 mt-0.5">
                Viewing locally cached journey. Offline route viewing is supported. Real-time autonomic rerouting and sensor updates will resume once reconnected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {dataFreshness.cachedAt && (
              <span className="text-[10px] text-amber-200">
                Cached {new Date(dataFreshness.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              type="button"
              onClick={() => setDismissOfflineNotice(true)}
              aria-label="Dismiss offline banner"
              className="p-1 rounded hover:bg-amber-700 text-amber-200 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 2. Reconnection Restored Banner */}
      {isOnline && wasOffline && (
        <div 
          role="status"
          aria-live="polite"
          className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold shadow-md flex items-center justify-between gap-2 animate-in fade-in"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" aria-hidden="true" />
            <span>Connection restored. Live sensor fusion and autonomic rerouting re-engaged.</span>
          </div>
          <span className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">
            🟢 LIVE
          </span>
        </div>
      )}

      {/* 3. PWA Installation Action Pill */}
      {pwaInstallPrompt && !dismissPwaPrompt && isOnline && !wasOffline && (
        <div 
          role="region"
          aria-label="Install WAYFARER App"
          className="bg-slate-900 border-b border-slate-800 text-white px-4 py-2 text-xs flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold text-slate-100">Install WAYFARER for Mobile</span>
              <span className="text-slate-400 ml-1.5 hidden sm:inline text-[11px]">
                Add to your home screen for instant, offline-capable travel intelligence.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={promptPwaInstall}
              className="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold text-[11px] transition shadow-xs"
            >
              Install App
            </button>
            <button
              type="button"
              onClick={() => setDismissPwaPrompt(true)}
              aria-label="Dismiss app install prompt"
              className="p-1 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
