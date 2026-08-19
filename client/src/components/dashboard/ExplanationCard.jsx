import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, Info } from 'lucide-react';

export default function ExplanationCard({ explanation, eventRecord, explanationBadge, explanationSource }) {
  if (!explanation && !eventRecord) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
          <Sparkles className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            WHY WAYFARER OPTIMIZED YOUR JOURNEY
          </h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Initial baseline routes are actively prioritized around step-free ramp infrastructure and low pedestrian congestion. Trigger a live event to observe real-time adaptation reasoning.
        </p>
      </div>
    );
  }

  const isAi = explanationSource === 'LIVE_GEMINI';

  return (
    <div className="bg-white border border-brand-200 rounded-2xl p-5 shadow-card relative overflow-hidden">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-600 animate-pulse" />
          <h3 className="font-extrabold text-sm text-slate-900">
            WHY WAYFARER CHANGED YOUR JOURNEY
          </h3>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          isAi ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {explanationBadge || (isAi ? '🟢 AI Live Reasoning' : '🟡 Deterministic Reasoning')}
        </span>
      </div>

      {/* Main Explanation Quote */}
      <div className="p-3.5 bg-brand-50/60 rounded-xl border border-brand-100 mb-4">
        <p className="text-xs font-semibold text-brand-950 leading-relaxed">
          "{explanation}"
        </p>
      </div>

      {/* Structured Diff Metadata */}
      {eventRecord && (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">EVENT</span>
            <span className="font-extrabold text-slate-900 truncate block text-[11px]">
              {eventRecord.type.replace('_', ' ')}
            </span>
          </div>

          <div className="p-2 bg-slate-50 border border-slate-100 rounded-lg">
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">SEGMENT</span>
            <span className="font-extrabold text-slate-900 truncate block text-[11px]">
              {eventRecord.affectedSegmentName || 'S3 Panjim → Fort'}
            </span>
          </div>

          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
            <span className="text-[10px] font-bold text-emerald-700 block uppercase tracking-wider">ROUTE SHIFT</span>
            <span className="font-extrabold text-emerald-800 flex items-center justify-center gap-1 text-[11px]">
              <span>Route {eventRecord.previousRecommendedId || 'B'}</span>
              <ArrowRight className="w-3 h-3" />
              <span>Route {eventRecord.newRecommendedId || 'C'}</span>
            </span>
          </div>

        </div>
      )}

    </div>
  );
}
