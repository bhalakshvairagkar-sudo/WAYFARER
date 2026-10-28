import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Mic, Compass, Navigation, History, ShieldCheck, MapPin, Radio, ArrowRight, ShieldAlert } from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import PersonalizedNeedBanner from '../components/dashboard/PersonalizedNeedBanner.jsx';

export default function LandingPageView() {
  const { journeyState } = useJourney();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const travelerName = user?.name || journeyState?.traveler?.name || 'Traveler';
  const isController = user?.role === 'CONTROLLER' || user?.role === 'ADMIN';

  // If there's an active route, we can show it in 'Next Journey'
  const activeSegment = journeyState?.segments?.find((s) => s.status === 'ACTIVE') || journeyState?.segments?.[0];
  const activeScore = activeSegment ? Math.round((activeSegment.candidateRoutes?.find(r => r.id === activeSegment.recommendedRouteId)?.compositeScore || 0.90) * 100) : 92;

  const handleMicClick = (e) => {
    e.preventDefault();
    navigate('/planner', { state: { autoVoice: true } });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Controller Notice Card (Visible when signed in as Controller) */}
      {isController && (
        <div className="p-4 sm:p-5 rounded-3xl bg-rose-950 text-white border border-rose-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                TRANSIT CONTROLLER SESSION ACTIVE
              </span>
              <h2 className="text-base font-black text-white">
                {user?.organization || 'Transit Control Operations Center'}
              </h2>
              <p className="text-xs text-rose-200/80 font-medium">
                Authoritative corridor control, TrustShield quarantine moderation, and emergency dispatch.
              </p>
            </div>
          </div>
          <Link
            to="/controller"
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shrink-0 shadow-md shadow-rose-900/40"
          >
            <span>Open Command Center</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Greeting */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Good morning, {travelerName} <span className="text-2xl animate-wave inline-block origin-[70%_70%]">👋</span>
        </h1>
        <p className="text-slate-500 font-medium">Where are you going?</p>
      </div>

      {/* Adaptive Personalized Needs Banner (Auto-adapts to user's mobility & constraints) */}
      <PersonalizedNeedBanner />

      {/* Global Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400 group-focus-within:text-brand-500 transition-colors" />
        </div>
        <input
          type="text"
          className="block w-full pl-12 pr-14 py-4 bg-white border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm transition-all text-base font-medium"
          placeholder="Search destination..."
          onClick={() => navigate('/planner')}
        />
        <button 
          onClick={handleMicClick}
          className="absolute inset-y-0 right-2 flex items-center px-3 text-slate-400 hover:text-brand-600 transition-colors"
        >
          <Mic className="h-5 w-5" />
        </button>
      </div>

      {/* Next Journey Card */}
      <div className="space-y-3">
        <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
          YOUR NEXT JOURNEY
        </h2>
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-1 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
            <Compass className="w-32 h-32 transform translate-x-8 -translate-y-8" />
          </div>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-[22px] p-5 sm:p-6 border border-white/10 relative z-10 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  {activeSegment ? `${activeSegment.origin} → ${activeSegment.destination}` : 'Mumbai → Goa'}
                </h3>
                <p className="text-brand-300 text-sm font-medium mt-1">Today • {activeSegment?.originId === 'stop-1' ? '9:30 AM' : 'In Progress'}</p>
              </div>
              <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg text-xs font-bold flex flex-col items-center leading-none">
                <span className="text-[10px] uppercase opacity-80 mb-0.5">Score</span>
                <span className="text-lg">{activeScore}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-300 font-medium">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {journeyState?.segments?.length ? journeyState.segments.length + 1 : 0} stops</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-slate-400" /> Monitored</span>
            </div>

            <Link
              to="/journey/active"
              className="mt-2 w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25 group-hover:bg-brand-400"
            >
              <span>CONTINUE JOURNEY</span>
              <Navigation className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
          QUICK ACTIONS
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Link to="/planner" className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors shadow-sm group text-slate-700">
            <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
              <Compass className="w-5 h-5 text-slate-600 group-hover:text-brand-600" />
            </div>
            <span className="font-bold text-sm">Plan Trip</span>
          </Link>
          
          <Link to="/events" className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-colors shadow-sm group text-slate-700">
            <div className="w-10 h-10 rounded-full bg-slate-50 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
              <History className="w-5 h-5 text-slate-600 group-hover:text-brand-600" />
            </div>
            <span className="font-bold text-sm">Explore</span>
          </Link>
        </div>
      </div>

      {/* Recent Trips */}
      <div className="space-y-3 pb-4">
        <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
          RECENT
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
          <Link to="/history" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Mumbai → Goa</p>
                <p className="text-xs text-slate-500 font-medium">Completed • Score 94</p>
              </div>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
          <Link to="/history" className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Pune → Mumbai</p>
                <p className="text-xs text-slate-500 font-medium">Last Week • Score 88</p>
              </div>
            </div>
            <span className="text-slate-300">›</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
