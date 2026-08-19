import React from 'react';
import { History, Clock, ArrowRight, Activity } from 'lucide-react';

export default function EventHistoryLog({ eventHistory = [] }) {
  if (!eventHistory || eventHistory.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-2 pb-3 border-b border-slate-100">
          <History className="w-4 h-4 text-slate-500" />
          <h3 className="font-extrabold text-sm text-slate-900">
            JOURNEY EVENT HISTORY
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          No external environmental disruptions recorded yet. Active monitoring in progress.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            JOURNEY EVENT HISTORY
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {eventHistory.length} Events
        </span>
      </div>

      {/* Audit Trail List */}
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {eventHistory.map((item, idx) => (
          <div key={item.id || idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
                {item.type?.replace('_', ' ')}
              </span>
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {item.timestamp || '14:15'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 font-medium mb-1">
              {item.reason}
            </p>
            {item.routeChanged && (
              <div className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
                <span>Rerouted: Route {item.previousRecommendedId} ({item.previousRecommendedScore})</span>
                <ArrowRight className="w-2.5 h-2.5 text-emerald-600" />
                <span>Route {item.newRecommendedId} ({item.newRecommendedScore})</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
