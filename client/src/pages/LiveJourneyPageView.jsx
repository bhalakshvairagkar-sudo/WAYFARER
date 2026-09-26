import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  CheckCircle2,
  Menu,
  Phone
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
import CopilotChat from '../components/dashboard/CopilotChat.jsx';
import CommunityReportModal from '../components/common/CommunityReportModal.jsx';

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
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [sheetState, setSheetState] = useState('half');

  const segments = journeyState?.segments || [];
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

  const dashboardContent = (
    <div className="space-y-6">
      {/* Community Evidence Intelligence Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Community Evidence Intelligence Active</h4>
            <p className="text-[11px] text-slate-500">Notice an obstruction or elevator outage? Report it to protect fellow travelers.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsCommunityModalOpen(true)}
          className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          <span>Report Obstacle</span>
        </button>
      </div>

      <JourneyTimeline 
        segments={segments}
        activeSegmentId={activeSegmentId}
        onSelectSegment={setActiveSegmentId}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-6">
          <CurrentSegmentCard segment={activeSegment} />
          
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-brand-600" />
              Dynamic Score
            </h3>
            <div className="flex flex-col items-center">
              <JourneyScoreGauge score={journeyState.overallScore || 92} />
              <ScoreBreakdownCard scores={recommendedRoute || {}} />
            </div>
          </div>
          
          <DownstreamImpactCard impacts={journeyState.downstreamImpacts || []} />
        </div>
        
        <div className="md:col-span-8 space-y-6">
          {journeyState.events?.length > 0 && (
            <ExplanationCard event={journeyState.events[0]} />
          )}
          
          {showMatrix && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <RouteComparisonMatrix 
                candidateRoutes={candidateRoutes}
                selectedRouteId={activeSegment?.recommendedRouteId}
                onSelectRoute={(id) => selectRouteForSegment(activeSegmentId, id)}
              />
              <WhyNotCard />
            </div>
          )}
        </div>
      </div>
      
      {/* AI Journey Copilot */}
      <CopilotChat journeyState={journeyState} />
    </div>
  );

  return (
    <div className="relative w-full h-[calc(100vh-64px)] sm:h-auto sm:max-w-7xl sm:mx-auto sm:px-4 sm:py-6 flex flex-col gap-6 pb-20 sm:pb-0">
      
      {/* Top Banner (Desktop Only) */}
      <div className="hidden sm:flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-soft">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              LIVE JOURNEY
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>{journeyState.trip?.origin || 'Origin'}</span>
            <ChevronRight className="w-5 h-5 text-slate-400" />
            <span className="text-brand-600">{journeyState.trip?.destination || 'Destination'}</span>
          </h1>
          {journeyState.trip?.description && (
            <p className="text-xs text-slate-500 mt-1 max-w-xl line-clamp-2">
              {journeyState.trip.description}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <Info className="w-3.5 h-3.5 text-slate-500" />
            <span>{showMatrix ? 'Hide Route Details' : 'View Alternatives'}</span>
          </button>
        </div>
      </div>

      {/* Mobile Map Background / Desktop Grid */}
      <div className="absolute inset-0 sm:relative sm:flex-none sm:h-[400px] z-0 sm:rounded-2xl sm:overflow-hidden sm:shadow-md">
        <GoogleMap 
          activeSegment={activeSegment}
          segments={segments}
          waypoints={(journeyState?.stops || []).filter(s => s.lat && s.lng)}
          height="100%"
        />
        
        {/* Mobile Top Pill Bar Overlay */}
        <div className="sm:hidden absolute top-4 inset-x-4 z-10 flex gap-2 overflow-x-auto pb-2 snap-x">
          {segments.map((seg, idx) => (
            <button
              key={seg.id}
              onClick={() => setActiveSegmentId(seg.id)}
              className={`snap-center shrink-0 px-4 py-2 rounded-full shadow-md text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${seg.id === activeSegmentId ? 'bg-brand-600 text-white' : 'bg-white/90 backdrop-blur-md text-slate-700 border border-slate-200'}`}
            >
              {seg.status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx === 0 ? <MapPin className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
              {(seg.origin || 'Origin').split(',')[0]} → {(seg.destination || 'Destination').split(',')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="sm:hidden fixed bottom-24 right-4 z-50">
        <button
          onClick={() => setIsSafetyModalOpen(true)}
          className="w-14 h-14 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-600/30 flex items-center justify-center hover:scale-105 transition-transform"
        >
          <ShieldAlert className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="sm:hidden absolute inset-x-0 bottom-[60px] z-40 pointer-events-none">
        <motion.div 
          className="bg-slate-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] pointer-events-auto border-t border-slate-200"
          initial="half"
          animate={sheetState}
          variants={{
            collapsed: { y: "calc(100% - 70px)" },
            half: { y: "40%" },
            full: { y: "0%" }
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = offset.y;
            if (swipe < -50) setSheetState('full');
            else if (swipe > 50 && sheetState === 'full') setSheetState('half');
            else if (swipe > 50 && sheetState === 'half') setSheetState('collapsed');
          }}
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing" onClick={() => setSheetState(sheetState === 'collapsed' ? 'half' : sheetState === 'half' ? 'full' : 'collapsed')}>
            <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
          </div>
          
          <div className="px-4 pb-8 overflow-y-auto h-[70vh]">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg text-slate-900">Journey Details</h2>
              <button
                type="button"
                onClick={() => setShowMatrix(!showMatrix)}
                className="px-3 py-1.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 uppercase tracking-wider"
              >
                {showMatrix ? 'Hide Alts' : 'Alternatives'}
              </button>
            </div>
            {dashboardContent}
          </div>
        </motion.div>
      </div>

      {/* Desktop Dashboard */}
      <div className="hidden sm:block z-10">
        {dashboardContent}
      </div>

      <SafetyVerificationModal 
        isOpen={isSafetyModalOpen} 
        onClose={() => setIsSafetyModalOpen(false)} 
        onVerifiedFine={handleVerifiedFine}
        travelerName={journeyState.traveler?.name}
        segmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
      />

      <CommunityReportModal
        isOpen={isCommunityModalOpen}
        onClose={() => setIsCommunityModalOpen(false)}
        defaultResourceId={activeSegment?.id || 'S3'}
      />
    </div>
  );
}
