import React from 'react';
import { HeartPulse, Shield, Activity, Clock, Smile, AlertCircle, ArrowRight } from 'lucide-react';

export default function JourneyHealthWidget({ journeyState, healthData }) {
  // Use provided healthData or fallback to journeyState.journeyHealth or calculate baseline
  const health = healthData || journeyState?.journeyHealth || {
    overall: journeyState?.overallScore || 91,
    accessibility: 94,
    safety: 91,
    reliability: 84,
    time: 89,
    comfort: 88,
    disruption: 76,
    status: journeyState?.eventRecord ? "RECOVERED" : "OPTIMAL"
  };

  const hasEvent = Boolean(journeyState?.eventRecord);
  const isRecovered = hasEvent && journeyState?.eventRecord?.routeChanged;

  const getStatusBadge = () => {
    if (health.overall < 65) {
      return { label: 'CRITICAL ATTENTION', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (isRecovered) {
      return { label: 'ADAPTED & SAFE', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (health.overall >= 88) {
      return { label: 'OPTIMAL FLOW', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    return { label: 'MONITORING', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <HeartPulse className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Journey Health
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Real-time multi-dimensional resilience</p>
          </div>
        </div>

        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${badge.bg}`}>
          {badge.label}
        </span>
      </div>

      {/* Main Score & Visible Transition Story */}
      <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-slate-900 tracking-tight">
            {health.overall}
          </span>
          <span className="text-xs font-bold text-slate-400">/ 100</span>
        </div>

        {/* 91 -> 57 -> 86 visible adaptation transition */}
        {isRecovered && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
            <span className="text-slate-400 line-through">91</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-rose-500 font-black">57</span>
            <ArrowRight className="w-3 h-3 text-slate-400" />
            <span className="text-emerald-600 font-black">86</span>
          </div>
        )}
      </div>

      {/* 6 Sub-dimensions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-brand-600" /> Access
            </span>
            <span className="text-slate-900 font-black">{health.accessibility}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${health.accessibility}%` }}></div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-600" /> Safety
            </span>
            <span className="text-slate-900 font-black">{health.safety}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${health.safety}%` }}></div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-600" /> Reliability
            </span>
            <span className="text-slate-900 font-black">{health.reliability}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${health.reliability}%` }}></div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" /> Time
            </span>
            <span className="text-slate-900 font-black">{health.time}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${health.time}%` }}></div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Smile className="w-3 h-3 text-violet-600" /> Comfort
            </span>
            <span className="text-slate-900 font-black">{health.comfort}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${health.comfort}%` }}></div>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-rose-600" /> Disruption
            </span>
            <span className="text-slate-900 font-black">{health.disruption}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${health.disruption}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
