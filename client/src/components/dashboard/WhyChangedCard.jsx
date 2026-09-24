import React from 'react';
import { AlertTriangle, ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';

export default function WhyChangedCard({ structuredChange }) {
  if (!structuredChange) return null;

  const { before, event, after, factorChanges, downstreamSummary } = structuredChange;

  return (
    <div className="bg-white border border-slate-200 border-t-4 border-t-amber-400 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Why Did The Recommendation Change?</h3>
      </div>
      
      <div className="p-5">
        <div className="flex flex-col md:flex-row items-stretch gap-4 md:gap-0 relative mb-6">
          <div className="flex-1 bg-blue-50 p-4 rounded-xl md:rounded-r-none border border-blue-100 z-10">
            <div className="text-xs font-bold text-blue-600 mb-1">BEFORE</div>
            <div className="font-bold text-blue-900 text-lg mb-1">Route {before?.routeId}</div>
            <div className="text-sm font-medium text-slate-700 mb-2">{before?.routeName}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded">Score: {before?.score}</span>
            </div>
            <div className="text-xs text-slate-500 italic">"{before?.keyFactor}"</div>
          </div>
          
          <div className="hidden md:flex flex-col justify-center items-center px-4 z-20 -mx-4 relative">
            <div className="bg-amber-100 border border-amber-200 p-2 rounded-full text-amber-700">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex-1 border-2 border-dashed border-red-200 bg-red-50 p-4 rounded-xl md:rounded-none z-10 flex flex-col justify-center items-center text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
            <div className="text-xs font-bold text-red-600 uppercase mb-1">{event?.type?.replace(/_/g, ' ')}</div>
            <div className="text-sm font-medium text-slate-800">{event?.description}</div>
          </div>
          
          <div className="hidden md:flex flex-col justify-center items-center px-4 z-20 -mx-4 relative">
            <div className="bg-green-100 border border-green-200 p-2 rounded-full text-green-700">
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex-1 bg-green-50 p-4 rounded-xl md:rounded-l-none border border-green-100 z-10">
            <div className="text-xs font-bold text-green-600 mb-1">AFTER</div>
            <div className="font-bold text-green-900 text-lg mb-1">Route {after?.routeId}</div>
            <div className="text-sm font-medium text-slate-700 mb-2">{after?.routeName}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-white border border-slate-200 px-2 py-1 rounded font-bold">Score: {after?.score}</span>
            </div>
            <div className="text-xs text-slate-500 italic">"{after?.keyFactor}"</div>
          </div>
        </div>
        
        {factorChanges && factorChanges.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Impact on Factors</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-slate-600 text-xs">Factor</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 text-xs">Before</th>
                    <th className="text-center py-2 px-3 font-medium text-slate-600 text-xs">After</th>
                    <th className="text-right py-2 px-3 font-medium text-slate-600 text-xs">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {factorChanges.map((change, idx) => (
                    <tr key={idx} className={change.critical ? "bg-red-50/30" : ""}>
                      <td className="py-2 px-3 font-medium text-slate-800">{change.factor}</td>
                      <td className="py-2 px-3 text-center text-slate-500">{change.before}</td>
                      <td className="py-2 px-3 text-center font-medium text-slate-700">{change.after}</td>
                      <td className="py-2 px-3 text-right">
                        <div className={`flex items-center justify-end gap-1 ${change.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {change.delta < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                          <span className="font-bold">{change.delta > 0 ? '+' : ''}{change.delta}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {downstreamSummary && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm text-slate-600 flex items-start gap-2">
            <div className="mt-0.5">ℹ️</div>
            <div>
              <span className="font-semibold text-slate-700">Downstream Impact: </span>
              {downstreamSummary}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
