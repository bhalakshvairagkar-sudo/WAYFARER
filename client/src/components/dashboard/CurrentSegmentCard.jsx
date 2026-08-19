import React from 'react';
import { Navigation, Clock, Shield, Award, CheckCircle } from 'lucide-react';

export default function CurrentSegmentCard({ activeSegment }) {
  if (!activeSegment) return null;

  const recommendedRoute = activeSegment.candidateRoutes?.find(r => r.isRecommended) || activeSegment.candidateRoutes?.[0];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-extrabold text-brand-700 uppercase tracking-wider">
            CURRENT SEGMENT ({activeSegment.id || 'S3'})
          </span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
          Day {activeSegment.day || 2}
        </span>
      </div>

      {/* Segment Name */}
      <h2 className="text-base font-extrabold text-slate-900 mb-2">
        {activeSegment.origin} → {activeSegment.destination}
      </h2>

      {/* Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 block">Recommended</span>
          <span className="text-xs font-black text-emerald-700 flex items-center gap-1">
            ★ Route {recommendedRoute?.id || 'B'}
          </span>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 block">Est. Time</span>
          <span className="text-xs font-black text-slate-800 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-500" />
            {recommendedRoute?.durationMin || 37} mins
          </span>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold text-slate-500 block">Distance</span>
          <span className="text-xs font-black text-slate-800">
            {recommendedRoute?.distanceKm || 18.5} km
          </span>
        </div>
      </div>

      {/* Recommended Route Details */}
      {recommendedRoute && (
        <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="font-extrabold text-emerald-900">
              {recommendedRoute.name}
            </span>
            <span className="text-xs font-black px-2 py-0.5 bg-emerald-200 text-emerald-950 rounded">
              Score: {recommendedRoute.score}/100
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 font-medium">
            {recommendedRoute.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
