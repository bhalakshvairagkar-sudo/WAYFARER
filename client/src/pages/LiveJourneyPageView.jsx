import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Navigation,
  Clock,
  MapPin,
  AlertTriangle,
  History,
  Zap,
  ShieldAlert,
  ChevronRight,
  Info,
  CheckCircle2
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import GoogleMap from '../components/common/GoogleMap.jsx';
import JourneyScoreGauge from '../components/dashboard/JourneyScoreGauge.jsx';
import ScoreBreakdownCard from '../components/dashboard/ScoreBreakdownCard.jsx';
import RouteComparisonMatrix from '../components/dashboard/RouteComparisonMatrix.jsx';
import WhyNotCard from '../components/dashboard/WhyNotCard.jsx';
import JourneyTimeline from '../components/dashboard/JourneyTimeline.jsx';
import CurrentSegmentCard from '../components/dashboard/CurrentSegmentCard.jsx';
import DownstreamImpactCard from '../components/dashboard/DownstreamImpactCard.jsx';
import ExplanationCard from '../components/dashboard/ExplanationCard.jsx';
import SafetyVerificationModal from '../components/dashboard/SafetyVerificationModal.jsx';

export default function LiveJourneyPageView() {
  const navigate = useNavigate();
  const {
    journeyState,
    activeSegmentId,
    setActiveSegmentId,
    selectRouteForSegment,
    triggerEvent
  } = useJourney();

  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  const segments = journeyState.segments || [];
  const activeSegment = segments.find((s) => s.id === activeSegmentId) || segments[0];
  const candidateRoutes = activeSegment?.candidateRoutes || [];
  const recommendedRoute = candidateRoutes.find((r) => r.isRecommended) || candidateRoutes[0];

  const handleVerifiedFine = () => {
    setIsSafetyModalOpen(false);
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const devRecord = {
      id: `dev-${Date.now()}`,
      timestamp: timeString,
      type: 'ROUTE_DEVIATION',
      reason: 'Traveler verified safe: Path re-aligned with accessible corridor',
      routeChanged: false
    };
    journeyState.eventHistory = [devRecord, ...(journeyState.eventHistory || [])];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              PRIMARY TRAVELER INTERFACE
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{journeyState.trip?.origin || 'Origin'}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
            <span className="text-brand-600">{journeyState.trip?.destination || 'Destination'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Active Segment: <strong className="text-slate-800">{activeSegment?.origin || 'Start'} → {activeSegment?.destination || 'End'}</strong> • Traveler: <strong className="text-slate-800">{journeyState.traveler?.name || 'Aditi'}</strong> ({journeyState.traveler?.mobility || 'Wheelchair'})
          </p>
        </div>

        {/* 4 Action Buttons as requested */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>{showMatrix ? 'Hide Route Details' : 'View Route Details'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsSafetyModalOpen(true)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>Report Change</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Open Events</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/history')}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white transition flex items-center gap-1.5 shadow-sm"
          >
            <History className="w-3.5 h-3.5" />
            <span>View History</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Map + Segment, Right Score Gauge + Explanation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Map + Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <GoogleMap
            activeSegment={activeSegment}
            segments={segments}
            selectedRouteId={recommendedRoute?.id}
            onSelectRoute={(rId) => selectRouteForSegment(activeSegment?.id, rId)}
            height="460px"
          />

          <JourneyTimeline
            stops={journeyState.stops || []}
            activeSegmentId={activeSegment?.id}
            downstreamImpact={journeyState.downstreamImpact}
            segments={segments}
          />

          {/* Segment Selector tabs */}
          {segments.length > 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                Itinerary Segments:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {segments.map((seg) => (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setActiveSegmentId(seg.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                      seg.id === activeSegment?.id
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{seg.id}: {seg.destination}</span>
                    <span className="ml-1.5 text-[10px] opacity-80">{seg.journeyScore}★</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {showMatrix && (
            <RouteComparisonMatrix
              candidateRoutes={candidateRoutes}
              activeSegmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
              weights={journeyState.weights}
            />
          )}
        </div>

        {/* Right: Scores & Reasonings (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <JourneyScoreGauge
            score={journeyState.overallScore || recommendedRoute?.score || 88}
            fitLevel={journeyState.fitLevel || 'EXCELLENT FIT'}
            weights={journeyState.weights}
          />

          <ScoreBreakdownCard
            scoreBreakdown={journeyState.scoreBreakdown}
            weights={journeyState.weights}
          />

          <WhyNotCard
            whyNotData={journeyState.whyNotData}
          />

          <CurrentSegmentCard
            activeSegment={activeSegment}
          />

          <ExplanationCard
            explanation={journeyState.explanation}
            explanationSource={journeyState.explanationSource}
            explanationBadge={journeyState.explanationBadge}
          />

          <DownstreamImpactCard
            downstreamImpact={journeyState.downstreamImpact}
          />
        </div>

      </div>

      {/* Safety Deviation Modal */}
      <SafetyVerificationModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onVerifiedFine={handleVerifiedFine}
        travelerName={journeyState.traveler?.name}
        segmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
      />

    </div>
  );
}
