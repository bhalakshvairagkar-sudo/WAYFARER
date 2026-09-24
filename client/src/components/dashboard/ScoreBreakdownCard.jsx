import React, { useState } from 'react';
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react';

export default function ScoreBreakdownCard({ scoreBreakdown, weights }) {
  const [openRoutes, setOpenRoutes] = useState(() => {
    const initial = {};
    if (scoreBreakdown) {
      scoreBreakdown.forEach(route => {
        initial[route.routeId] = route.isRecommended;
      });
    }
    return initial;
  });

  const toggleRoute = (routeId) => {
    setOpenRoutes(prev => ({
      ...prev,
      [routeId]: !prev[routeId]
    }));
  };

  const getEmoji = (factor) => {
    const upper = factor.toUpperCase();
    if (upper.includes('SAFETY')) return '🛡️';
    if (upper.includes('ACCESS')) return '♿';
    if (upper.includes('CROWD')) return '👥';
    if (upper.includes('CONV')) return '⚡';
    if (upper.includes('COST')) return '💰';
    return '📊';
  };

  if (!scoreBreakdown || scoreBreakdown.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
        <Calculator className="w-5 h-5 text-slate-600" />
        <h3 className="font-semibold text-slate-800 text-sm tracking-wide">TRANSPARENT SCORE BREAKDOWN</h3>
      </div>
      
      <div className="divide-y divide-slate-100">
        {scoreBreakdown.map(route => {
          const isOpen = openRoutes[route.routeId];
          
          return (
            <div key={route.routeId} className="flex flex-col">
              <button 
                onClick={() => toggleRoute(route.routeId)}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${route.isRecommended ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    ROUTE {route.routeId}
                  </span>
                  <span className="font-medium text-slate-800">{route.routeName}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-lg ${route.isRecommended ? 'text-green-600' : 'text-slate-800'}`}>{route.total?.toFixed(1)}</span>
                  {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </button>
              
              {isOpen && (
                <div className="p-4 pt-0 bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-500 text-xs border-b border-slate-100">
                          <th className="font-medium text-left pb-2 w-1/3">FACTOR</th>
                          <th className="font-medium text-center pb-2 w-1/4">VALUE</th>
                          <th className="font-medium text-center pb-2 w-1/5">× WEIGHT</th>
                          <th className="font-medium text-right pb-2 w-1/5">= WEIGHTED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {route.breakdown.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <span>{getEmoji(item.factor)}</span>
                                <span className="font-medium text-slate-700 capitalize">{item.factor.toLowerCase()}</span>
                              </div>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-2">
                                  {item.previousValue !== undefined && item.previousValue !== item.value && (
                                    <span className="line-through text-red-400 text-xs">{item.previousValue}</span>
                                  )}
                                  <span className="font-semibold text-slate-800">{item.value}</span>
                                </div>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${item.value >= 80 ? 'bg-green-500' : item.value >= 60 ? 'bg-amber-400' : 'bg-red-500'}`}
                                    style={{ width: `${Math.max(0, Math.min(100, item.value))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-center text-slate-500">
                              {item.weight.toFixed(2)}
                            </td>
                            <td className="py-3 text-right font-medium text-slate-800">
                              {item.weighted?.toFixed(2) || (item.value * item.weight).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan="3" className="py-3 font-bold text-right text-slate-700 pr-4">TOTAL SCORE</td>
                          <td className="py-3 font-bold text-right text-slate-900 text-lg">{route.total?.toFixed(1)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
