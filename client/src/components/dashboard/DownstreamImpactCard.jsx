import React from 'react';
import { GitFork, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function DownstreamImpactCard({ downstreamImpact }) {
  if (!downstreamImpact) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
          <GitFork className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            DOWNSTREAM IMPACT ANALYSIS
          </h3>
        </div>
        <p className="text-xs text-slate-600">
          WAYFARER continuously simulates downstream schedule ripple effects on subsequent stops when events occur.
        </p>
      </div>
    );
  }

  const { hasDownstreamImpact, statusBadge, summary, details = [] } = downstreamImpact;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header with Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <GitFork className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            DOWNSTREAM JOURNEY IMPACT
          </h3>
        </div>
        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider self-start sm:self-auto ${
          hasDownstreamImpact
            ? 'bg-amber-50 text-amber-800 border border-amber-200'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
        }`}>
          {statusBadge || (hasDownstreamImpact ? 'JOURNEY RE-OPTIMIZED' : 'CURRENT CHANGE DOES NOT AFFECT LATER STOPS')}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs font-semibold text-slate-800 mb-3 leading-relaxed">
        {summary}
      </p>

      {/* Verification Details */}
      <ul className="space-y-1.5 text-xs text-slate-600">
        {details.map((detail, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-[11px] leading-tight">{detail}</span>
          </li>
        ))}
      </ul>

    </div>
  );
}
