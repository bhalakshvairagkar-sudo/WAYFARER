import React from 'react';
import { Clock, MapPin, ChevronRight, AlertTriangle, CheckCircle2, Navigation } from 'lucide-react';

export default function JourneyTimeline({ stops = [], activeSegmentId, downstreamImpact, segments = [] }) {
  const activeSegment = segments.find(s => s.id === activeSegmentId) || segments[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            End-to-End Orchestration
          </span>
          <h3 className="font-extrabold text-sm text-slate-900">
            DYNAMIC JOURNEY TIMELINE
          </h3>
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
            // Data-driven active & completion detection
            const isActive = activeSegment && (
              stop.id === activeSegment.destinationId ||
              stop.name === activeSegment.destination ||
              (activeSegment.originId === stop.id && idx === 0)
            );

            const activeIdx = segments.findIndex(s => s.id === activeSegmentId);
            const isCompleted = activeIdx > 0 && idx <= activeIdx;

            // Data-driven downstream arrival calculation
            let arrivalDisplay = stop.arrivalTime || "12:00";
            let isAdjusted = false;
            let adjustmentNote = null;

            if (downstreamImpact?.adjustedTimeline && Array.isArray(downstreamImpact.adjustedTimeline)) {
              const match = downstreamImpact.adjustedTimeline.find(
                item => item.destination === stop.name || item.destinationId === stop.id || item.nodeId === stop.id
              );
              if (match && match.adjustedArrival && match.adjustedArrival !== match.originalArrival) {
                arrivalDisplay = match.adjustedArrival;
                isAdjusted = true;
                adjustmentNote = match.note || `Shifted from ${match.originalArrival}`;
              }
            }

            return (
              <React.Fragment key={stop.id || idx}>
                {/* Stop Card */}
                <div className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between w-48 ${
                  isActive
                    ? 'bg-brand-50/80 border-brand-300 shadow-sm ring-1 ring-brand-400'
                    : (isCompleted ? 'bg-slate-50/80 border-slate-200' : 'bg-white border-slate-200 hover:border-slate-300')
                }`}>
                  
                  {/* Top Bar: Day and Time */}
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                      isActive ? 'bg-brand-200 text-brand-900' : (isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700')
                    }`}>
                      DAY {stop.day || 1}
                    </span>

                    <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${
                      isAdjusted ? 'text-amber-800 bg-amber-100/90 px-1 rounded' : 'text-slate-500'
                    }`} title={adjustmentNote || undefined}>
                      <Clock className="w-3 h-3 text-slate-400" />
                      {arrivalDisplay}
                      {isAdjusted && <span className="text-[9px] font-black text-amber-700">*</span>}
                    </span>
                  </div>

                  {/* Stop Name & City */}
                  <div className="mb-3">
                    <h4 className="font-extrabold text-xs text-slate-900 line-clamp-1" title={stop.name}>
                      {stop.name}
                    </h4>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                      {stop.city || 'Destination'}
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-bold">
                    <span className="capitalize text-slate-500">{stop.type || 'Attraction'}</span>
                    <span className={`flex items-center gap-1 ${
                      isActive
                        ? 'text-brand-700 font-extrabold'
                        : (isCompleted ? 'text-emerald-700' : 'text-slate-400')
                    }`}>
                      {isActive && <Navigation className="w-2.5 h-2.5 animate-pulse" />}
                      {isCompleted && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {isActive ? 'Current En Route' : (isCompleted ? 'Verified' : 'Scheduled')}
                    </span>
                  </div>

                </div>

                {/* Arrow Connector between stops */}
                {idx < stops.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
}
