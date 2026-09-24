import React from 'react';
import { Compass, RotateCcw, User, ActivitySquare } from 'lucide-react';

export default function Navbar({
  aiStatus,
  currentScreen,
  onReset,
  onNavigateScreen
}) {
  const isAiLive = aiStatus?.geminiConfigured || aiStatus?.mode === 'LIVE_AI';
  const showToggle = currentScreen === 'DASHBOARD' || currentScreen === 'OPERATIONS';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onNavigateScreen('PLAN')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-600 to-brand-500 flex items-center justify-center text-white shadow-glow-blue">
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                WAYFARER<span className="text-brand-600">.AI</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Adaptive Journey Intelligence
            </p>
          </div>
        </div>

        {/* Center Toggle (Traveler vs Operations) */}
        {showToggle && (
          <div className="absolute left-1/2 -translate-x-1/2 flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => onNavigateScreen('DASHBOARD')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentScreen !== 'OPERATIONS' 
                  ? 'bg-white text-brand-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Traveler View
            </button>
            <button
              onClick={() => onNavigateScreen('OPERATIONS')}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                currentScreen === 'OPERATIONS' 
                  ? 'bg-white text-amber-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ActivitySquare className="w-3.5 h-3.5" />
              Operations Center
            </button>
          </div>
        )}

        {/* Status Indicators & Action Controls */}
        <div className="flex items-center gap-3">
          
          {/* Active Status Badge */}
          {currentScreen === 'DASHBOARD' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              JOURNEY ACTIVE
            </div>
          )}
          {currentScreen === 'OPERATIONS' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-amber-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              OPS ACTIVE
            </div>
          )}

          {/* AI Live / Fallback Status Badge */}
          <div
            title={isAiLive ? "Connected to live Google Gemini API" : "Using honest Deterministic Fallback Parser (100% offline resilient)"}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
              isAiLive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isAiLive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isAiLive ? '🟢 AI LIVE' : '🟡 DEMO FALLBACK'}</span>
          </div>

          {/* Reset Journey Button */}
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
            title="Reset Journey to Baseline State"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

      </div>
    </header>
  );
}
