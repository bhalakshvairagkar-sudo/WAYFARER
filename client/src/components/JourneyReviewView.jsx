import React from 'react';
import { CheckCircle2, Edit3, ArrowRight, Shield, Accessibility, Users, Sparkles, Navigation, Clock, Info } from 'lucide-react';

export default function JourneyReviewView({
  parsedJourney,
  onConfirmJourney,
  onEditJourney
}) {
  if (!parsedJourney) return null;

  const { trip, traveler, stops, weights, overallScore, fitLevel, dayScores, source, model } = parsedJourney;

  // Group stops by day
  const stopsByDay = (stops || []).reduce((acc, stop) => {
    const day = stop.day || 1;
    if (!acc[day]) acc[day] = [];
    acc[day].push(stop);
    return acc;
  }, {});

  const isAiLive = source === 'LIVE_GEMINI';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-800 text-xs font-bold mb-3 shadow-sm">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Trip & Traveler Successfully Structured</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">
          WAYFARER Understands Your Journey
        </h1>
        <p className="text-sm sm:text-base text-slate-600">
          Review your personalized itinerary and mobility parameters before starting active journey orchestration.
        </p>
      </div>

      {/* AI Source & Model Provenance Banner */}
      <div className="mb-6 bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-brand-600" />
          <span>Parser Engine: <strong className="text-slate-800 font-semibold">{model || (isAiLive ? 'Google Gemini 1.5 Flash' : 'Deterministic Rule-Based Engine')}</strong></span>
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
          isAiLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {isAiLive ? '🟢 AI LIVE PARSED' : '🟡 DEMO FALLBACK PARSED'}
        </span>
      </div>

      {/* Grid: Journey Summary + Traveler Profile */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Left 2 Cols: Structured Itinerary Breakdown */}
        <div className="md:col-span-2 space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Itinerary Blueprint</span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {trip.durationDays || 3} Days: {trip.origin} → {trip.destination}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 font-medium">Travelers</span>
                <p className="text-sm font-bold text-slate-900">{trip.travelerCount || 1} Solo</p>
              </div>
            </div>

            {/* Day by Day Stops */}
            <div className="space-y-4">
              {Object.entries(stopsByDay).map(([day, dayStops]) => (
                <div key={day} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-extrabold px-2 py-0.5 bg-brand-100 text-brand-800 rounded">
                      DAY {day}
                    </span>
                    {dayScores && dayScores[day] && (
                      <span className="text-xs font-bold text-emerald-700">
                        Day Score: {dayScores[day]}/100
                      </span>
                    )}
                  </div>
                  
                  {/* Sequence flow */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
                    {dayStops.map((stop, sIdx) => (
                      <React.Fragment key={sIdx}>
                        <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-md shadow-xs font-semibold text-slate-800">
                          {stop.name}
                        </span>
                        {sIdx < dayStops.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Extracted Traveler Profile & Weights */}
        <div className="space-y-4">
          
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Traveler Priorities
            </h3>

            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                <span className="text-base">♿</span>
                <span>Mobility: {traveler.mobility || 'Wheelchair'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                <span className="text-base">🚫</span>
                <span>{traveler.stairsAllowed === false ? 'Avoid Stairs (Step-Free Only)' : 'Standard Stairs'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                <span className="text-base">🟡</span>
                <span>Crowd: {traveler.crowdTolerance === 'low' ? 'Low Crowd Tolerance' : 'Normal'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                <span className="text-base">🔴</span>
                <span>Safety: {traveler.safetyPriority === 'high' ? 'High Safety Priority' : 'Standard'}</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800">
                <span className="text-base">🟢</span>
                <span>Longer Routes Acceptable</span>
              </div>
            </div>

            {/* Weights Breakdown */}
            <div className="border-t border-slate-100 pt-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                Personalized Factor Weights (Σ = 1.0)
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Accessibility</span>
                    <span className="text-brand-700 font-bold">{Math.round((weights?.accessibility || 0.4) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-brand-600 h-full" style={{ width: `${(weights?.accessibility || 0.4) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Safety</span>
                    <span className="text-brand-700 font-bold">{Math.round((weights?.safety || 0.3) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full" style={{ width: `${(weights?.safety || 0.3) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Crowd Suitability</span>
                    <span className="text-brand-700 font-bold">{Math.round((weights?.crowd || 0.2) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full" style={{ width: `${(weights?.crowd || 0.2) * 100}%` }}></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span className="text-slate-600">Convenience</span>
                    <span className="text-brand-700 font-bold">{Math.round((weights?.convenience || 0.1) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-slate-500 h-full" style={{ width: `${(weights?.convenience || 0.1) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Initial Overall Fit */}
            <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Initial Journey Score
              </span>
              <div className="text-2xl font-black text-emerald-700 my-0.5">
                {overallScore || 90} <span className="text-sm font-semibold text-emerald-600">/ 100</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-full">
                {fitLevel || 'EXCELLENT FIT'}
              </span>
            </div>

          </div>

        </div>

      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={onEditJourney}
          className="w-full sm:w-auto px-6 py-3 border border-slate-300 hover:border-slate-400 bg-white text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm"
        >
          <Edit3 className="w-4 h-4" />
          <span>EDIT JOURNEY</span>
        </button>

        <button
          type="button"
          onClick={onConfirmJourney}
          className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-[0.99] transition flex items-center justify-center gap-2 text-sm"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>CONFIRM & START JOURNEY</span>
        </button>
      </div>

    </div>
  );
}
