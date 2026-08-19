import React from 'react';
import { CheckCircle2, CircleDot, Circle, ChevronRight, MapPin } from 'lucide-react';

export default function MyJourneyTree({ segments = [], activeSegmentId, onSelectSegment }) {
  // Group segments by Day
  const segmentsByDay = segments.reduce((acc, seg) => {
    const day = seg.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(seg);
    return acc;
  }, {});

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider block">
            Trip Structure
          </span>
          <h3 className="font-extrabold text-sm text-slate-900">MY JOURNEY</h3>
        </div>
        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {segments.length} Segments
        </span>
      </div>

      {/* Multi-day Tree */}
      <div className="space-y-4">
        {Object.entries(segmentsByDay).map(([day, daySegs]) => {
          const isDay1 = Number(day) === 1;
          const isDay2 = Number(day) === 2; // Active demo day
          const isDay3 = Number(day) === 3;

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-800">
                  {isDay1 && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  {isDay2 && <CircleDot className="w-3.5 h-3.5 text-brand-600 animate-pulse" />}
                  {isDay3 && <Circle className="w-3.5 h-3.5 text-slate-400" />}
                  <span className={isDay2 ? 'text-brand-900 font-extrabold' : 'text-slate-700'}>
                    DAY {day}
                  </span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isDay1 ? 'bg-emerald-50 text-emerald-700' : (isDay2 ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-500')
                }`}>
                  {isDay1 ? 'COMPLETED' : (isDay2 ? 'IN PROGRESS' : 'PLANNED')}
                </span>
              </div>

              {/* Segment List */}
              <div className="space-y-1 pl-3 border-l-2 border-slate-100">
                {daySegs.map((seg) => {
                  const isSelected = seg.id === activeSegmentId;
                  const recRoute = seg.candidateRoutes?.find(r => r.isRecommended) || seg.candidateRoutes?.[0];

                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => onSelectSegment(seg.id)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition flex items-center justify-between border ${
                        isSelected
                          ? 'bg-brand-50 border-brand-300 text-brand-950 font-bold shadow-xs'
                          : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">
                          {seg.id}
                        </span>
                        <span className="truncate">
                          {seg.origin.split(' ')[0]} → {seg.destination.split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          (seg.journeyScore || recRoute?.score || 85) >= 88
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {seg.journeyScore || recRoute?.score || 85}
                        </span>
                        <ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
