import React, { useState } from 'react';
import { Award, Info, Check, X, Shield, DollarSign } from 'lucide-react';

const FACTOR_META = {
  safety: { emoji: '🛡️', label: 'Safety', color: 'bg-emerald-500' },
  accessibility: { emoji: '♿', label: 'Access', color: 'bg-brand-500' },
  crowd: { emoji: '👥', label: 'Crowd', color: 'bg-amber-500' },
  convenience: { emoji: '⚡', label: 'Conv', color: 'bg-slate-500' },
  cost: { emoji: '💰', label: 'Cost', color: 'bg-violet-500' }
};

export default function RouteComparisonMatrix({ candidateRoutes = [], activeSegmentName, weights = {} }) {
  const [expandedRouteId, setExpandedRouteId] = useState(null);

  const selectedRoute = candidateRoutes.find(r => r.id === expandedRouteId) || candidateRoutes.find(r => r.isRecommended);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Transparent Decision Matrix
          </span>
          <h3 className="font-extrabold text-sm text-slate-900">
            ROUTE COMPARISON MATRIX
          </h3>
        </div>
        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
          Click route to view score math
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
              <th className="py-2.5 px-3 rounded-l-lg">Route</th>
              <th className="py-2.5 px-2">Time</th>
              <th className="py-2.5 px-2">♿</th>
              <th className="py-2.5 px-2">🛡️</th>
              <th className="py-2.5 px-2">👥</th>
              <th className="py-2.5 px-2">💰</th>
              <th className="py-2.5 px-3 text-right rounded-r-lg">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidateRoutes.map((route) => {
              const isRec = route.isRecommended;
              const isExpanded = route.id === expandedRouteId;
              const isDegraded = route.accessibility < 50;
              const costScore = route.cost !== undefined
                ? (typeof route.cost === 'object' ? Math.max(0, 100 - Math.round((route.cost.estimated || 0) / 20)) : route.cost)
                : 70;

              return (
                <React.Fragment key={route.id}>
                  <tr
                    onClick={() => setExpandedRouteId(isExpanded ? null : route.id)}
                    className={`cursor-pointer transition-colors ${
                      isRec
                        ? 'bg-emerald-50/60 font-bold hover:bg-emerald-50'
                        : (isExpanded ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-slate-50')
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                          isRec
                            ? 'bg-emerald-600 text-white'
                            : (route.id === 'A' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white')
                        }`}>
                          {route.id}
                        </span>
                        <span className="truncate max-w-[100px] sm:max-w-[140px] text-slate-900 text-[11px]">
                          {route.name.replace(/^Route [A-C]:\s*/, '')}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-semibold">{route.durationMin}m</td>
                    <td className={`py-3 px-2 font-bold ${isDegraded ? 'text-rose-600 bg-rose-50 rounded' : 'text-slate-800'}`}>
                      {route.accessibility}
                    </td>
                    <td className="py-3 px-2 text-slate-700 font-semibold">{route.safety}</td>
                    <td className="py-3 px-2 text-slate-700 font-semibold">{route.crowd}</td>
                    <td className="py-3 px-2 text-slate-700 font-semibold">{costScore}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full ${
                        isRec ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {route.score} {isRec && '★'}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded Score Breakdown */}
                  {isExpanded && route.breakdown && (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <div className="bg-slate-50 border-t border-slate-200 p-3 space-y-1.5">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                            Score Arithmetic: Route {route.id}
                          </span>
                          {Object.entries(route.breakdown).map(([key, data]) => {
                            const meta = FACTOR_META[key] || { emoji: '📊', label: key, color: 'bg-slate-400' };
                            return (
                              <div key={key} className="flex items-center gap-2 text-[11px]">
                                <span className="w-16 font-semibold text-slate-600 flex items-center gap-1">
                                  <span>{meta.emoji}</span> {meta.label}
                                </span>
                                <span className="w-8 text-right font-bold text-slate-800">{data.value}</span>
                                <span className="text-slate-400">×</span>
                                <span className="w-10 text-slate-600 font-medium">{Math.round(data.weight * 100)}%</span>
                                <span className="text-slate-400">=</span>
                                <span className="w-10 font-bold text-slate-900">{data.weighted}</span>
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <div className={`h-full ${meta.color} rounded-full`} style={{ width: `${data.value}%` }}></div>
                                </div>
                              </div>
                            );
                          })}
                          <div className="flex items-center gap-2 text-[11px] pt-1 border-t border-slate-200 mt-1">
                            <span className="w-16 font-extrabold text-slate-900">TOTAL</span>
                            <span className="w-8"></span>
                            <span className="w-3"></span>
                            <span className="w-10"></span>
                            <span className="w-3"></span>
                            <span className="w-10 font-black text-emerald-700 text-sm">{route.score}</span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Route Feature Inspector */}
      {selectedRoute && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-brand-600" />
              Route {selectedRoute.id} Verified Infrastructure:
            </span>
            {selectedRoute.isRecommended && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                ★ RECOMMENDED NOW
              </span>
            )}
            {selectedRoute.activeEvent && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full">
                ⚠ {selectedRoute.activeEvent.type}
              </span>
            )}
          </div>
          <ul className="space-y-1 text-slate-600">
            {selectedRoute.accessibleFeatures?.map((feat, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-[11px]">
                <Check className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            )) || (
              <li className="text-[11px] text-slate-500">Standard corridor infrastructure.</li>
            )}
          </ul>
        </div>
      )}

    </div>
  );
}
