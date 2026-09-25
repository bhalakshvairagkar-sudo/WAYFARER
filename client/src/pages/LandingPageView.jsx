import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  Accessibility,
  Activity,
  Layers,
  Sparkles,
  Zap,
  MapPin,
  Clock,
  CheckCircle,
  HelpCircle,
  Play
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';

export default function LandingPageView() {
  const { journeyState, resetToBaseline } = useJourney();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-16">
      
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-extrabold uppercase tracking-wider shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
          Next-Gen Adaptive Journey Intelligence
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
          A route is only optimal{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-indigo-600">
            until something changes.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 font-medium leading-relaxed">
          WAYFARER continuously monitors environmental events, infrastructure accessibility, transit delays, and safety hazards — dynamically re-optimizing downstream itinerary dependencies in real time.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            to="/profile"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm transition shadow-lg shadow-brand-600/25 flex items-center justify-center gap-2 group"
          >
            <span>Plan My Journey</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </Link>

          <Link
            to="/planner"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm transition border border-slate-300 shadow-sm flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 text-brand-600 fill-brand-600" />
            <span>Explore Live Planner</span>
          </Link>
        </div>

        {/* Quick Jump Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 font-semibold">
          <span>Jump to:</span>
          <Link to="/profile" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Traveler Profile
          </Link>
          <Link to="/planner" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Journey Planner
          </Link>
          <Link to="/journey/active" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Live Journey
          </Link>
          <Link to="/events" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Events Center
          </Link>
          <Link to="/operator" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Operator Dashboard
          </Link>
          <Link to="/history" className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
            Decision History
          </Link>
        </div>
      </div>

      {/* 3 Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
            <Accessibility className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900">
            Real-Time Accessibility Checking
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            WAYFARER constantly verifies ramp gradients, step-free corridors, and barrier-free transit. When an elevator or ramp fails, we reroute you instantly to a safe alternative.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900">
            Smart Schedule Auto-Adjustments
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Delays happen. Our Smart Schedule Tracker automatically updates all your downstream reservations, compresses buffer times, and warns you if you'll miss a closing time.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft space-y-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-base text-slate-900">
            Transparent Safety & Fit Scoring
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            No hidden decisions. Every route is scored and ranked based on your exact needs across 5 key areas: Safety, Accessibility, Crowds, Convenience, and Cost.
          </p>
        </div>
      </div>

      {/* Interactive Architecture Flow Diagram */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-4">
          <span className="text-[11px] font-extrabold text-brand-400 uppercase tracking-widest block">
            HOW IT WORKS
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            How WAYFARER Adapts When the World Changes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-xs font-bold text-center">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10">
              <span className="text-brand-400 block text-[10px] mb-1">01. DETECT</span>
              Live Event Alert
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10">
              <span className="text-brand-400 block text-[10px] mb-1">02. ADJUST</span>
              Smart Schedule Sync
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10">
              <span className="text-brand-400 block text-[10px] mb-1">03. RE-ROUTE</span>
              Safety & Fit Scoring
            </div>
            <div className="p-3 bg-white/10 rounded-xl border border-white/10">
              <span className="text-brand-400 block text-[10px] mb-1">04. EXPLAIN</span>
              Clear Alternatives
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
