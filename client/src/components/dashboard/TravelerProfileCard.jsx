import React from 'react';
import { User, Shield, Accessibility, EyeOff, CheckCircle } from 'lucide-react';

export default function TravelerProfileCard({ traveler, weights }) {
  if (!traveler) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-sm">
          {traveler.name ? traveler.name.charAt(0) : 'A'}
        </div>
        <div>
          <h3 className="font-extrabold text-sm text-slate-900 leading-tight">
            {traveler.name || 'Aditi'}
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600"></span>
            {traveler.mobility || 'Wheelchair Solo'}
          </span>
        </div>
      </div>

      {/* Constraints & Priorities Badges */}
      <div className="space-y-1.5 mb-4 text-xs font-semibold">
        <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <span>♿</span>
          <span>Wheelchair (Step-free)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <span>🚫</span>
          <span>Avoid stairs & curbs</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <span>🟡</span>
          <span>Low crowd tolerance</span>
        </div>
        <div className="flex items-center gap-2 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
          <span>🔴</span>
          <span>High safety priority</span>
        </div>
      </div>

      {/* Personalized Weights Meter */}
      <div className="pt-3 border-t border-slate-100">
        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
          Decision Weights (Σ = 1.0)
        </span>
        <div className="space-y-1.5 text-xs">
          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span>Accessibility</span>
              <span className="font-bold text-brand-700">{Math.round((weights?.accessibility || 0.4) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-brand-600 h-full transition-all duration-500" style={{ width: `${(weights?.accessibility || 0.4) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span>Safety</span>
              <span className="font-bold text-rose-600">{Math.round((weights?.safety || 0.3) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${(weights?.safety || 0.3) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span>Crowd Suitability</span>
              <span className="font-bold text-amber-600">{Math.round((weights?.crowd || 0.2) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${(weights?.crowd || 0.2) * 100}%` }}></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-0.5">
              <span>Convenience</span>
              <span className="font-bold text-slate-600">{Math.round((weights?.convenience || 0.1) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-slate-400 h-full transition-all duration-500" style={{ width: `${(weights?.convenience || 0.1) * 100}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
