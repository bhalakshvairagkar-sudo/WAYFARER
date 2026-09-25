import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, RotateCcw, User, ActivitySquare, MapPin, Zap, RefreshCw, History, ShieldAlert } from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import { isGoogleMapsConfigured } from '../services/googleMapsLoader.js';

export default function Navbar() {
  const location = useLocation();
  const { aiStatus, routingMode, resetToBaseline, journeyState } = useJourney();

  const isAiLive = aiStatus?.geminiConfigured || aiStatus?.mode === 'LIVE_AI';
  const isGoogleLive = routingMode === 'LIVE_GOOGLE' || isGoogleMapsConfigured();

  const navLinks = [
    { to: '/', label: 'Overview' },
    { to: '/profile', label: 'Profile' },
    { to: '/planner', label: 'Planner' },
    { to: '/journey/active', label: 'Live Journey' },
    { to: '/events', label: 'Events' },
    { to: '/operator', label: 'Operator' },
    { to: '/history', label: 'History' }
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <Link to="/" className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center text-white shadow-glow-blue">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 font-sans">
                WAYFARER<span className="text-brand-600">.AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium hidden md:block">
              Adaptive Journey Intelligence
            </p>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200/80">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to || (link.to !== '/' && location.pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-white text-brand-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Maps Engine Mode Badge */}
          <div
            title={isGoogleLive ? "Connected to Google Maps & Places JavaScript API" : "Using offline-resilient deterministic routing simulation"}
            className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isGoogleLive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isGoogleLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{isGoogleLive ? 'GOOGLE ROUTING' : 'DEMO MODE'}</span>
          </div>

          {/* AI Status Badge */}
          <div
            title={isAiLive ? "Live Gemini AI API connected" : "Deterministic rule-based parser active"}
            className={`hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isAiLive
                ? 'bg-brand-50 border-brand-200 text-brand-800'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAiLive ? 'bg-brand-500' : 'bg-slate-400'}`}></span>
            <span>{isAiLive ? 'GEMINI' : 'RULE-BASED'}</span>
          </div>

          {/* Reset Journey Button */}
          <button
            type="button"
            onClick={resetToBaseline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition shadow-2xs"
            title="Reset Journey to Baseline Pristine Configuration"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

      </div>

      {/* Mobile Horizontal Navigation Bar (Hidden, replaced by MobileBottomNav) */}
    </header>
  );
}
