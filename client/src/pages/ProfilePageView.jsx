import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Sparkles,
  ArrowRight,
  Shield,
  Accessibility,
  Users,
  Compass,
  DollarSign,
  CheckCircle2,
  Sliders,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';

export default function ProfilePageView() {
  const navigate = useNavigate();
  const { journeyState, updateTravelerProfile, parsePrompt, isLoading } = useJourney();

  const [promptText, setPromptText] = useState(
    "I use a power wheelchair, cannot use stairs, prefer step-free gentle ramps, dislike crowded bottlenecks, and prioritize personal safety and accessible transit."
  );

  const [travelerName, setTravelerName] = useState(journeyState.traveler?.name || 'Aditi');
  const [mobility, setMobility] = useState(journeyState.traveler?.mobility || 'wheelchair');
  const [stairsAllowed, setStairsAllowed] = useState(journeyState.traveler?.stairsAllowed || false);
  const [safetyPriority, setSafetyPriority] = useState(journeyState.traveler?.safetyPriority || 'high');
  const [crowdTolerance, setCrowdTolerance] = useState(journeyState.traveler?.crowdTolerance || 'low');
  const [budgetPriority, setBudgetPriority] = useState(journeyState.traveler?.budget || 'medium');
  const [parsedConfirmation, setParsedConfirmation] = useState(null);

  const handleUnderstandNeeds = async () => {
    try {
      const result = await parsePrompt(promptText, {
        travelerName,
        mobility,
        stairsAllowed,
        safetyPriority,
        crowdTolerance,
        budgetPriority
      });
      if (result && result.traveler) {
        setParsedConfirmation(result.traveler);
      }
    } catch (e) {
      // Local fallback parse
      const localParsed = {
        name: travelerName,
        mobility,
        stairsAllowed,
        safetyPriority,
        crowdTolerance,
        budget: budgetPriority,
        summary: `Verified profile: ${mobility} traveler, ${stairsAllowed ? 'stairs allowed' : 'zero stairs / ramp-only'}, ${safetyPriority} safety, ${crowdTolerance} crowd tolerance.`
      };
      updateTravelerProfile(localParsed);
      setParsedConfirmation(localParsed);
    }
  };

  const handleContinueToPlan = () => {
    updateTravelerProfile({
      name: travelerName,
      mobility,
      stairsAllowed,
      safetyPriority,
      crowdTolerance,
      budget: budgetPriority
    });
    navigate('/planner');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title */}
      <div className="border-b border-slate-200 pb-5">
        <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block mb-1">
          STEP 1: INCLUSIVE PERSONALIZATION
        </span>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Tell WAYFARER How You Travel
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          WAYFARER calibrates its mathematical 5-factor scoring engine directly around your physical mobility, crowd sensitivities, safety preferences, and budget.
        </p>
      </div>

      {/* Main Input Form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              Describe Your Travel Needs & Accessibility Constraints
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Natural Language Prompt</span>
          </label>
          <textarea
            rows={4}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Example: I'm traveling alone with a wheelchair, cannot climb steps, prefer quieter corridors, and prioritize safety..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition leading-relaxed"
          />
        </div>

        {/* Structured Preferences Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
          
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Traveler Name
            </label>
            <input
              type="text"
              value={travelerName}
              onChange={(e) => setTravelerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mobility Archetype
            </label>
            <select
              value={mobility}
              onChange={(e) => setMobility(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="wheelchair">Power / Manual Wheelchair</option>
              <option value="cane">Walking Cane / Assisted</option>
              <option value="elderly">Elderly / Low Endurance</option>
              <option value="standard">Standard Unassisted</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Stairs Allowed?
            </label>
            <select
              value={stairsAllowed ? 'yes' : 'no'}
              onChange={(e) => setStairsAllowed(e.target.value === 'yes')}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="no">Strictly No (Step-Free Ramps Only)</option>
              <option value="yes">Yes (Up to 5 steps permitted)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Safety Priority
            </label>
            <select
              value={safetyPriority}
              onChange={(e) => setSafetyPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="high">High (Verified lighting & patrols)</option>
              <option value="medium">Standard / Balanced</option>
              <option value="low">Low (Direct path only)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Crowd Tolerance
            </label>
            <select
              value={crowdTolerance}
              onChange={(e) => setCrowdTolerance(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="low">Low (Avoid peak congestion)</option>
              <option value="medium">Moderate / Standard</option>
              <option value="high">High (Crowds do not bother)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Budget Sensitivity
            </label>
            <select
              value={budgetPriority}
              onChange={(e) => setBudgetPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white"
            >
              <option value="medium">Standard Balanced</option>
              <option value="high">Budget Prioritized (Cost Factor 30%)</option>
              <option value="low">Flexibility Prioritized</option>
            </select>
          </div>

        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            disabled={isLoading}
            onClick={handleUnderstandNeeds}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md shadow-brand-600/20 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Understand My Needs (AI Engine)</span>
          </button>
        </div>
      </div>

      {/* Parsed Profile Display Card */}
      {(parsedConfirmation || journeyState.traveler) && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 shadow-soft space-y-4 animate-scale-up">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200/80">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-emerald-950">
                Parsed Traveler Profile & Calibrated Scoring Weights
              </h3>
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 uppercase tracking-wider">
              Profile Ready
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Traveler</span>
              <span className="font-black text-slate-900">{parsedConfirmation?.name || travelerName}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Mobility</span>
              <span className="font-black text-slate-900 capitalize">{parsedConfirmation?.mobility || mobility}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Stairs Allowed</span>
              <span className="font-black text-slate-900">{stairsAllowed ? 'Allowed' : 'Step-Free Only'}</span>
            </div>
            <div className="p-3 bg-white/80 rounded-xl border border-emerald-100">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Safety / Crowd</span>
              <span className="font-black text-slate-900 capitalize">{safetyPriority} / {crowdTolerance}</span>
            </div>
          </div>

          <p className="text-xs text-emerald-900 font-medium">
            {parsedConfirmation?.summary || journeyState.traveler?.summary || 'Continuous step-free ramps prioritized; bottleneck segments penalized.'}
          </p>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleContinueToPlan}
              className="px-8 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-md shadow-slate-900/20"
            >
              <span>Continue to Journey Planner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
