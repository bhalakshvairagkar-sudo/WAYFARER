import React, { useState } from 'react';
import { Award, Info, ChevronRight, Check, X, Shield, Accessibility, Users, Zap } from 'lucide-react';

export default function RouteComparisonMatrix({ candidateRoutes = [], activeSegmentName }) {
  const [selectedRouteId, setSelectedRouteId] = useState(null);

  const selectedRoute = candidateRoutes.find(r => r.id === selectedRouteId) || candidateRoutes.find(r => r.isRecommended);

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
          Click route to inspect features
        </span>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/70">
              <th className="py-2.5 px-3 rounded-l-lg">Route</th>
              <th className="py-2.5 px-2">Time</th>
              <th className="py-2.5 px-2">Access</th>
              <th className="py-2.5 px-2">Safety</th>
              <th className="py-2.5 px-2">Crowd</th>
              <th className="py-2.5 px-3 text-right rounded-r-lg">Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidateRoutes.map((route) => {
              const isRec = route.isRecommended;
              const isSelected = route.id === selectedRoute?.id;
              const isDegraded = route.accessibility < 50;

              return (
                <tr
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={`cursor-pointer transition-colors ${
                    isRec
                      ? 'bg-emerald-50/60 font-bold hover:bg-emerald-50'
                      : (isSelected ? 'bg-brand-50/50 hover:bg-brand-50' : 'hover:bg-slate-50')
                  }`}
                >
                  {/* Route ID & Name */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                        isRec
                          ? 'bg-emerald-600 text-white'
                          : (route.id === 'A' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-white')
                      }`}>
                        {route.id}
                      </span>
                      <span className="truncate max-w-[120px] sm:max-w-[160px] text-slate-900">
                        {route.name.replace(/^Route [A-C]:\s*/, '')}
                      </span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-2 text-slate-700 font-semibold">
                    {route.durationMin}m
                  </td>

                  {/* Accessibility */}
                  <td className={`py-3 px-2 font-bold ${
                    isDegraded ? 'text-rose-600 bg-rose-50 px-1.5 rounded' : 'text-slate-800'
                  }`}>
                    {route.accessibility}
                  </td>

                  {/* Safety */}
                  <td className="py-3 px-2 text-slate-700 font-semibold">
                    {route.safety}
                  </td>

                  {/* Crowd */}
                  <td className="py-3 px-2 text-slate-700 font-semibold">
                    {route.crowd}
                  </td>

                  {/* Composite Journey Score */}
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-xs font-black px-2 py-0.5 rounded-full ${
                      isRec
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {route.score} {isRec && '★'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Route Accessibility Inspector Card */}
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
