import React from 'react';
import { Clock, MapPin, CheckCircle2, CircleDot, AlertTriangle, ArrowRight } from 'lucide-react';

export default function JourneyTimeline({ stops = [], activeSegmentId, downstreamImpact }) {
  const adjustedTimelineMap = (downstreamImpact?.adjustedTimeline || []).reduce((acc, item) => {
    acc[item.segmentId] = item;
    return acc;
  }, {});

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider block">
            Chronological Itinerary
          </span>
          <h3 className="font-extrabold text-sm text-slate-900">JOURNEY TIMELINE & STOPS</h3>
        </div>
        {downstreamImpact?.hasDownstreamImpact && (
          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            TIMELINE RE-OPTIMIZED
          </span>
        )}
      </div>

      {/* Horizontal Stop Scroll Container */}
      <div className="overflow-x-auto pb-2">
        <div className="flex items-center min-w-max gap-3 py-2">
          {stops.map((stop, idx) => {
            const isCompleted = stop.day === 1;
            const isHeroStop = stop.id === 'stop-4'; // Fort Aguada
            const isBeachStop = stop.id === 'stop-5';
            const isMarketStop = stop.id === 'stop-6';

            // Check if there is an adjusted arrival time
            let arrivalDisplay = stop.arrivalTime || "12:00";
            let isAdjusted = false;

            if (isMarketStop && downstreamImpact?.hasDownstreamImpact) {
              arrivalDisplay = "18:15";
              isAdjusted = true;
            }

            return (
              <React.Fragment key={stop.id || idx}>
                {/* Stop Card */}
                <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between w-44 ${
                  isHeroStop
                    ? 'bg-brand-50/80 border-brand-300 shadow-sm ring-1 ring-brand-400'
                    : (isCompleted ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300')
                }`}>
                  
                  {/* Top Bar: Day and Time */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      isHeroStop ? 'bg-brand-200 text-brand-900' : (isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')
                    }`}>
                      DAY {stop.day || 1}
                    </span>
                    
                    <span className={`text-[11px] font-bold flex items-center gap-1 ${
                      isAdjusted ? 'text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-extrabold' : 'text-slate-500'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {arrivalDisplay}
                    </span>
                  </div>

                  {/* Stop Name & City */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 truncate leading-snug">
                      {stop.name}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-medium truncate block">
                      {stop.city || 'Goa'}
                    </span>
                  </div>

                  {/* Status Note */}
                  <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-slate-600 capitalize">
                      {stop.type || 'Attraction'}
                    </span>
                    {isCompleted ? (
                      <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <span className="text-brand-700 font-bold">
                        {isHeroStop ? 'Active Demo' : 'Planned'}
                      </span>
                    )}
                  </div>

                </div>

                {/* Connector Arrow */}
                {idx < stops.length - 1 && (
                  <div className="flex items-center justify-center text-slate-300">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
}
