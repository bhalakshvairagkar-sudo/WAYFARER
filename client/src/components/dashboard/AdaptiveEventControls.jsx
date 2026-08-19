import React from 'react';
import { Zap, Users, AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';

export default function AdaptiveEventControls({
  onTriggerElevatorFailure,
  onTriggerCrowdSpike,
  onTriggerDeviation,
  onResetJourney,
  isLoading
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header with Honest Prototype Badge */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <h3 className="font-extrabold text-sm text-slate-900">
              LIVE JOURNEY EVENTS
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Trigger dynamic environmental conditions to test continuous re-optimization
          </p>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200 hidden sm:inline">
          SIMULATED EXTERNAL EVENT
        </span>
      </div>

      {/* Trigger Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* 1. Hero Elevator Failure */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onTriggerElevatorFailure}
          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-left transition group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-rose-600 group-hover:scale-110 transition" />
              Elevator Fails
            </span>
            <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded">
              Hero Demo
            </span>
          </div>
          <p className="text-[11px] text-rose-800 leading-snug font-medium">
            Drops Route B access (96→38). Reroutes to Route C upper ramp.
          </p>
        </button>

        {/* 2. Crowd Spike */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onTriggerCrowdSpike}
          className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 hover:bg-amber-100/80 text-left transition group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-amber-600 group-hover:scale-110 transition" />
              Crowd Spikes
            </span>
            <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded">
              Downstream
            </span>
          </div>
          <p className="text-[11px] text-amber-800 leading-snug font-medium">
            Market surge. Re-evaluates timing (+45m schedule shift).
          </p>
        </button>

        {/* 3. Traveler Deviation */}
        <button
          type="button"
          disabled={isLoading}
          onClick={onTriggerDeviation}
          className="p-3.5 rounded-xl border border-brand-200 bg-brand-50/60 hover:bg-brand-100/80 text-left transition group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-extrabold text-brand-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-brand-600 group-hover:scale-110 transition" />
              Traveler Deviates
            </span>
            <span className="text-[10px] font-bold bg-brand-200 text-brand-900 px-1.5 py-0.2 rounded">
              Safety
            </span>
          </div>
          <p className="text-[11px] text-brand-800 leading-snug font-medium">
            Deviation detected. Triggers "Are You Okay?" verification modal.
          </p>
        </button>

      </div>
    </div>
  );
}
