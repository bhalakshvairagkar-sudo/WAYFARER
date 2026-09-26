import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Navigation,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Clock,
  Compass
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';

export default function HistoryPageView() {
  const navigate = useNavigate();
  const { journeyState, resetToBaseline } = useJourney();

  const history = journeyState?.eventHistory || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block mb-1">
            DATA-DRIVEN AUDIT TRAIL
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-brand-600" />
            <span>Journey Decision History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Verifiable chronological log of algorithmic decisions, environmental events, score recalibrations, and accepted adaptations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/journey/active')}
          className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <span>Back to Live Journey</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Container */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-soft">
        {history.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <History className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-sm text-slate-800">
              Baseline Journey Active
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No live disruptions have occurred yet. Initial route recommendations are operating at baseline.
            </p>
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs"
            >
              Simulate First Live Event
            </button>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-8">
            {history.map((item, idx) => {
              const isEvent = Boolean(item.type && !item.type.includes('CREATED') && !item.type.includes('SELECTED') && !item.type.includes('RECOVERY_ACCEPTED'));
              const isRecovery = item.type === 'RECOVERY_ACCEPTED';
              const isCreation = item.type === 'JOURNEY_CREATED';

              return (
                <div key={item.id || idx} className="relative group">
                  {/* Timeline Node Badge Icon */}
                  <div className={`absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white shadow-xs ${
                    isRecovery
                      ? 'border-emerald-500 text-emerald-600'
                      : isEvent
                      ? 'border-rose-500 text-rose-600'
                      : isCreation
                      ? 'border-brand-500 text-brand-600'
                      : 'border-slate-400 text-slate-600'
                  }`}>
                    {isRecovery ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isEvent ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Compass className="w-4 h-4" />
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-2 group-hover:bg-white group-hover:shadow-soft transition">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {item.timestamp || 'Just now'}
                      </span>

                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isRecovery
                          ? 'bg-emerald-100 text-emerald-800'
                          : isEvent
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-brand-100 text-brand-800'
                      }`}>
                        {item.type?.replace(/_/g, ' ') || 'DECISION LOGGED'}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900">
                      {item.reason || item.details || 'System State Update'}
                    </h4>

                    {/* Metadata Badges */}
                    {(item.previousRecommendedId || item.newRecommendedId) && (
                      <div className="flex items-center gap-2 text-xs pt-1">
                        {item.previousRecommendedId && (
                          <span className="text-slate-500">
                            Previous: <strong className="text-slate-800">Route {item.previousRecommendedId}</strong>
                            {item.previousRecommendedScore ? ` (${item.previousRecommendedScore}★)` : ''}
                          </span>
                        )}
                        {item.newRecommendedId && item.newRecommendedId !== item.previousRecommendedId && (
                          <>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="text-emerald-700 font-bold">
                              Adapted: Route {item.newRecommendedId}
                              {item.newRecommendedScore ? ` (${item.newRecommendedScore}★)` : ''}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
