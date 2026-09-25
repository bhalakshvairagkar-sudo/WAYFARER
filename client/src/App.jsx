import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JourneyProvider } from './context/JourneyContext.jsx';
import Navbar from './components/Navbar.jsx';
import WelcomeModal from './components/common/WelcomeModal.jsx';

import LandingPageView from './pages/LandingPageView.jsx';
import ProfilePageView from './pages/ProfilePageView.jsx';
import PlannerPageView from './pages/PlannerPageView.jsx';
import LiveJourneyPageView from './pages/LiveJourneyPageView.jsx';
import EventsCenterPageView from './pages/EventsCenterPageView.jsx';
import RecoveryPageView from './pages/RecoveryPageView.jsx';
import OperatorPageView from './pages/OperatorPageView.jsx';
import HistoryPageView from './pages/HistoryPageView.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <JourneyProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-brand-500 selection:text-white">
          
          {/* Global Sticky Navbar */}
          <Navbar />
          
          {/* Onboarding Overlay */}
          <WelcomeModal />

          {/* Main Route Switcher */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPageView />} />
              <Route path="/profile" element={<ProfilePageView />} />
              <Route path="/planner" element={<PlannerPageView />} />
              <Route path="/journey/:id" element={<LiveJourneyPageView />} />
              <Route path="/events" element={<EventsCenterPageView />} />
              <Route path="/recovery/:id" element={<RecoveryPageView />} />
              <Route path="/operator" element={<OperatorPageView />} />
              <Route path="/history" element={<HistoryPageView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>

          {/* Global Professional Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500 font-medium">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">WAYFARER AI</span>
                <span>— Adaptive Journey Intelligence for Dynamic, Inclusive Travel</span>
              </div>
              <div className="flex items-center gap-4 text-slate-400">
                <span>Google Maps & Places API</span>
                <span>•</span>
                <span>Gemini Reasoning</span>
                <span>•</span>
                <span>5-Factor Deterministic Scoring</span>
              </div>
            </div>
          </footer>

        </div>
      </JourneyProvider>
    </BrowserRouter>
  );
}
