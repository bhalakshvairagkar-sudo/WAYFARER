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
  Loader2,
  MapPin
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';

export default function ProfilePageView() {
  const navigate = useNavigate();
  const { journeyState, updateTravelerProfile, parsePrompt, isLoading } = useJourney();

  const [promptText, setPromptText] = useState(
    "I use a power wheelchair, cannot use stairs, prefer step-free gentle ramps, dislike crowded bottlenecks, and prioritize personal safety and accessible transit."
  );

  const [travelerName, setTravelerName] = useState(journeyState?.traveler?.name || 'Aditi');
  const [mobility, setMobility] = useState(journeyState?.traveler?.mobility || 'wheelchair');
  const [stairsAllowed, setStairsAllowed] = useState(journeyState?.traveler?.stairsAllowed || false);
  const [safetyPriority, setSafetyPriority] = useState(journeyState?.traveler?.safetyPriority || 'high');
  const [crowdTolerance, setCrowdTolerance] = useState(journeyState?.traveler?.crowdTolerance || 'low');
  const [budgetPriority, setBudgetPriority] = useState(journeyState?.traveler?.budget || 'medium');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <User className="w-6 h-6 text-brand-600" />
            Traveler Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Manage your mobility needs, accessibility preferences, and past journeys.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Preferences */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-brand-500" />
              Routing Preferences
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Traveler Name</label>
                <input
                  type="text"
                  value={travelerName}
                  onChange={(e) => setTravelerName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Primary Mobility</label>
                <select
                  value={mobility}
                  onChange={(e) => setMobility(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-500"
                >
                  <option value="none">Fully Ambulatory</option>
                  <option value="cane">Cane / Walker</option>
                  <option value="wheelchair">Manual Wheelchair</option>
                  <option value="power_wheelchair">Power Wheelchair / Scooter</option>
                  <option value="vision">Vision Impaired</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Avoid Stairs</h4>
                  <p className="text-xs text-slate-500 font-medium">Require step-free routes</p>
                </div>
                <button 
                  onClick={() => setStairsAllowed(!stairsAllowed)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${!stairsAllowed ? 'bg-brand-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${!stairsAllowed ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Safety Priority</label>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={safetyPriority === 'low' ? 33 : safetyPriority === 'medium' ? 66 : 100} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setSafetyPriority(val < 50 ? 'low' : val < 80 ? 'medium' : 'high');
                  }}
                  className="w-full accent-brand-600" 
                />
                <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-1 uppercase">
                  <span>Standard</span>
                  <span>High</span>
                  <span>Maximum</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleContinueToPlan}
              className="mt-6 w-full py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold shadow-sm transition"
            >
              Save Preferences
            </button>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-4">
              <Accessibility className="w-5 h-5 text-indigo-500" />
              App Accessibility
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm font-medium text-slate-700 p-2">
                <span>Text Size</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">Standard</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-700 p-2">
                <span>High Contrast</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">Off</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-slate-700 p-2">
                <span>Reduce Motion</span>
                <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">Off</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: My Trips */}
        <div className="space-y-4">
          <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
            MY JOURNEYS
          </h2>
          
          <div className="bg-white border border-brand-200 rounded-3xl p-5 shadow-sm relative overflow-hidden group hover:border-brand-300 transition-colors cursor-pointer" onClick={() => navigate('/journey/active')}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-50 rounded-bl-full -mr-4 -mt-4 opacity-50 pointer-events-none" />
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                </span>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Mumbai → Goa</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Today • WAYFARER Score 92</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm opacity-75">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold uppercase mb-2">
                  Completed
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Pune → Mumbai</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">3 days ago • Score 88</p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm opacity-75">
            <div className="flex justify-between items-start">
              <div>
                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold uppercase mb-2">
                  Completed
                </span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">Jaipur Transit</h3>
                <p className="text-xs font-medium text-slate-500 mt-1">Last Month • Score 94</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
