import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, PhoneCall, Check, X, Bell } from 'lucide-react';

export default function SafetyVerificationModal({ isOpen, onClose, onVerifiedFine }) {
  const [assistedRequested, setAssistedRequested] = useState(false);

  if (!isOpen) return null;

  const handleFine = () => {
    setAssistedRequested(false);
    onVerifiedFine();
  };

  const handleNeedAssistance = () => {
    setAssistedRequested(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-scale-up">
        
        {!assistedRequested ? (
          <>
            {/* Pulsing Alert Icon */}
            <div className="w-14 h-14 bg-amber-50 border-2 border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <AlertTriangle className="w-7 h-7" />
            </div>

            {/* Workflow steps */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-800 text-[11px] font-extrabold mb-3">
              <span>DEVIATION DETECTED</span>
              <span>→</span>
              <span>VERIFYING JOURNEY</span>
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-2">
              Are you okay?
            </h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              WAYFARER noticed you took an unmapped turn away from the designated accessible corridor near Mandovi Bridge. Please confirm your status.
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={handleFine}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <Check className="w-4 h-4" />
                <span>I'M FINE</span>
              </button>

              <button
                type="button"
                onClick={handleNeedAssistance}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20"
              >
                <PhoneCall className="w-4 h-4" />
                <span>NEED ASSISTANCE</span>
              </button>
            </div>

            {/* Prototype Notice */}
            <p className="text-[10px] text-slate-400 font-medium">
              Prototype simulation for hackathon demonstration.
            </p>
          </>
        ) : (
          <>
            {/* Assistance Simulation Confirmation */}
            <div className="w-14 h-14 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 animate-pulse" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200 rounded-full text-rose-800 text-[11px] font-extrabold mb-3">
              <span>ASSISTANCE REQUESTED (SIMULATED)</span>
            </div>

            <h3 className="text-lg font-extrabold text-slate-900 mb-2">
              Emergency Contact Notified
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Simulated telemetry sent to emergency contact with current GPS coordinates (15.4989° N, 73.8278° E) and nearest wheelchair-accessible shelter point.
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs mb-6 space-y-1 text-slate-700">
              <div className="font-bold text-slate-900">Telemetry Payload:</div>
              <div>• Traveler: Aditi (Wheelchair mobility)</div>
              <div>• Nearest Accessible Hub: Mandovi River Patrol Post (240m)</div>
              <div>• Status: Simulated Prototype Dispatch</div>
            </div>

            <button
              type="button"
              onClick={handleFine}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
            >
              Close Simulation & Resume Journey
            </button>
          </>
        )}

      </div>
    </div>
  );
}
