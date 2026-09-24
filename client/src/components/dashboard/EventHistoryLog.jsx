import React from 'react';
import { History, Clock, ArrowRight, Activity, Zap, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export default function EventHistoryLog({ eventHistory = [] }) {
  // Always include a "Journey Created" event at the bottom
  const allEvents = [...eventHistory, {
    id: 'creation',
    type: 'JOURNEY_CREATED',
    timestamp: '08:00',
    reason: 'Initial journey plan synthesized and optimized.',
    severity: 0
  }];

  const getEventBadgeInfo = (type) => {
    if (type === 'JOURNEY_CREATED') return { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle2 };
    if (type === 'ACTIVITY_CANCELLATION' || type?.includes('DEGRADATION') || type === 'TRANSPORT_DELAY') return { color: 'bg-rose-100 text-rose-800 border-rose-200', icon: AlertTriangle };
    return { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Zap };
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-sm text-slate-900">
            DECISION HISTORY
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {eventHistory.length} Events
        </span>
      </div>

      <div className="relative pl-4 space-y-6">
        {/* Vertical Timeline Line */}
        <div className="absolute top-2 bottom-4 left-[9px] w-px bg-slate-200"></div>

        {allEvents.map((item, idx) => {
          const badgeInfo = getEventBadgeInfo(item.type);
          const Icon = badgeInfo.icon;

          return (
            <div key={item.id || idx} className="relative">
              {/* Timeline Dot */}
              <div className={`absolute -left-6 mt-1 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${badgeInfo.color.split(' ')[0]}`}>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${badgeInfo.color}`}>
                    <Icon className="w-3 h-3" />
                    {item.type?.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.timestamp || '08:00'}
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-700 font-medium mb-2 leading-relaxed">
                  {item.reason}
                </p>

                {item.routeChanged && (
                  <div className="flex items-center flex-wrap gap-2 text-[10px] font-bold text-emerald-800 bg-emerald-50/50 p-1.5 rounded border border-emerald-100">
                    <div className="flex items-center gap-1">
                      <span className="line-through opacity-70">Route {item.previousRecommendedId}</span>
                      <span className="opacity-70">({item.previousRecommendedScore})</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-emerald-500" />
                    <div className="flex items-center gap-1">
                      <span>Route {item.newRecommendedId}</span>
                      <span>({item.newRecommendedScore})</span>
                      {item.scoreDelta && (
                        <span className={`ml-1 px-1 rounded ${item.scoreDelta < 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {item.scoreDelta > 0 ? '+' : ''}{item.scoreDelta}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {item.substitution && (
                  <div className="mt-2 flex items-center flex-wrap gap-2 text-[10px] font-bold text-brand-800 bg-brand-50/50 p-1.5 rounded border border-brand-100">
                    <div className="flex items-center gap-1">
                      <span className="line-through opacity-70">{item.substitution.old}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-brand-500" />
                    <div className="flex items-center gap-1">
                      <span>{item.substitution.new}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
