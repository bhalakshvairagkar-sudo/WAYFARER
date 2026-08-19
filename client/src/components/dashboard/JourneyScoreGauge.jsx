import React from 'react';
import { Award, Shield, Accessibility, Users, Zap, TrendingUp, TrendingDown } from 'lucide-react';

export default function JourneyScoreGauge({ overallScore = 90, fitLevel = "EXCELLENT FIT", dayScores = {}, activeSegment }) {
  const recRoute = activeSegment?.candidateRoutes?.find(r => r.isRecommended) || activeSegment?.candidateRoutes?.[0];

  const safetyVal = recRoute?.safety ?? 90;
  const accessVal = recRoute?.accessibility ?? 96;
  const crowdVal = recRoute?.crowd ?? 85;
  const convVal = recRoute?.convenience ?? 86;

  // Determine color scheme based on overallScore
  const isHighFit = overallScore >= 85;
  const isMediumFit = overallScore >= 70 && overallScore < 85;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Composite Fit
          </span>
          <h3 className="font-extrabold text-sm text-slate-900">JOURNEY SCORE</h3>
        </div>
        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
          isHighFit ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
        }`}>
          {fitLevel}
        </span>
      </div>

      {/* Main Score Meter Display */}
      <div className="flex items-center justify-center my-3">
        <div className="relative w-36 h-36 flex items-center justify-center">
          
          {/* Circular SVG Gauge */}
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#e2e8f0"
              strokeWidth="9"
              fill="transparent"
            />
            {/* Value stroke */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke={isHighFit ? '#10b981' : (isMediumFit ? '#3b82f6' : '#f59e0b')}
              strokeWidth="9"
              strokeDasharray={251.2}
              strokeDashoffset={251.2 - (251.2 * overallScore) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          {/* Centered Number */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight transition-all duration-500">
              {overallScore}
            </span>
            <span className="text-[11px] font-bold text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* Day Breakdown Pills */}
      <div className="grid grid-cols-3 gap-2 my-4 text-center">
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 block">DAY 1</span>
          <span className="text-xs font-black text-slate-800">{dayScores[1] || 91}</span>
        </div>
        <div className="p-2 bg-brand-50/70 border border-brand-200 rounded-xl">
          <span className="text-[10px] font-bold text-brand-700 block">DAY 2</span>
          <span className="text-xs font-black text-brand-900">{dayScores[2] || 87}</span>
        </div>
        <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 block">DAY 3</span>
          <span className="text-xs font-black text-slate-800">{dayScores[3] || 94}</span>
        </div>
      </div>

      {/* Active Segment Factor Breakdown */}
      <div className="pt-3 border-t border-slate-100">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
          Active Segment Factors ({activeSegment?.id || 'S3'})
        </span>
        
        <div className="space-y-2 text-xs">
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Accessibility className="w-3 h-3 text-brand-600" /> Accessibility
              </span>
              <span className={`font-bold transition-all duration-500 ${accessVal < 50 ? 'text-rose-600' : 'text-slate-800'}`}>
                {accessVal}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${accessVal < 50 ? 'bg-rose-500' : 'bg-brand-600'}`}
                style={{ width: `${accessVal}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-500" /> Safety
              </span>
              <span className="font-bold text-slate-800">{safetyVal}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${safetyVal}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-amber-500" /> Crowd Suitability
              </span>
              <span className="font-bold text-slate-800">{crowdVal}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${crowdVal}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-slate-500" /> Convenience
              </span>
              <span className="font-bold text-slate-800">{convVal}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full transition-all duration-500" style={{ width: `${convVal}%` }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
