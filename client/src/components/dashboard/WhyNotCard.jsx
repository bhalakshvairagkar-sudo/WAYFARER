import React from 'react';
import { HelpCircle, Check, X } from 'lucide-react';

export default function WhyNotCard({ whyNotData }) {
  if (!whyNotData) return null;

  const { recommended, rejected } = whyNotData;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
        <HelpCircle className="w-5 h-5 text-slate-700" />
        <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">Why Did Wayfarer Change The Route?</h3>
      </div>
      
      <div className="p-5 flex flex-col gap-6">
        {recommended && (
          <div className="bg-green-50/50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-green-900">WHY ROUTE {recommended.routeId}?</h4>
              <span className="ml-auto px-2 py-1 bg-green-200 text-green-800 font-bold rounded text-sm">
                SCORE: {recommended.score}
              </span>
            </div>
            <div className="ml-9">
              <div className="font-medium text-green-800 mb-2">{recommended.routeName}</div>
              <ul className="flex flex-col gap-2">
                {recommended.strengths?.map((strength, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-green-700 text-sm">
                    <Check className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        
        {rejected && rejected.length > 0 && (
          <div className="flex flex-col gap-4">
            {rejected.map((route, rIdx) => (
              <div key={rIdx} className="bg-red-50/50 rounded-xl p-4 border border-red-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0">
                    <X className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-red-900">WHY NOT ROUTE {route.routeId}?</h4>
                  <span className="ml-auto px-2 py-1 bg-red-200 text-red-800 font-bold rounded text-sm">
                    SCORE: {route.score}
                  </span>
                </div>
                <div className="ml-9">
                  <div className="font-medium text-red-800 mb-2">{route.routeName}</div>
                  <ul className="flex flex-col gap-2">
                    {route.reasons?.map((reason, idx) => {
                      const isCritical = reason.toLowerCase().includes('critical') || reason.toLowerCase().includes('broken') || reason.toLowerCase().includes('below');
                      return (
                        <li key={idx} className={`flex items-start gap-2 text-sm ${isCritical ? 'text-red-700 font-medium' : 'text-amber-700'}`}>
                          <X className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
