import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Layers,
  ArrowDown
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import GoogleMap from '../components/common/GoogleMap.jsx';
import RouteComparisonMatrix from '../components/dashboard/RouteComparisonMatrix.jsx';
import WhyChangedCard from '../components/dashboard/WhyChangedCard.jsx';
import DownstreamImpactCard from '../components/dashboard/DownstreamImpactCard.jsx';

export default function RecoveryPageView() {
  const navigate = useNavigate();
  const {
    journeyState,
    activeSegmentId,
    recoveryState,
    acceptRecoveryRoute,
    selectRouteForSegment
  } = useJourney();

  const [selectedRouteChoice, setSelectedRouteChoice] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  const segments = journeyState.segments || [];
  const activeSegment = segments.find((s) => s.id === activeSegmentId) || segments[0];
  const candidateRoutes = activeSegment?.candidateRoutes || [];

  const eventRecord = journeyState.eventRecord || recoveryState?.event || {
    type: 'ACCESSIBILITY_DEGRADATION',
    reason: 'Elevator unavailable at primary ramp access point',
    previousRecommendedId: 'B',
    previousRecommendedScore: 91,
    newRecommendedId: 'C',
    newRecommendedScore: 88,
    routeChanged: true
  };

  const recRoute = candidateRoutes.find((r) => r.isRecommended) || candidateRoutes[0];
  const prevRoute = candidateRoutes.find((r) => r.id === eventRecord.previousRecommendedId) || candidateRoutes[1] || candidateRoutes[0];

  const handleAccept = () => {
    const targetRouteId = selectedRouteChoice || recRoute?.id || 'C';
    acceptRecoveryRoute(targetRouteId);
    navigate('/journey/active');
  };

  const handleKeepCurrent = () => {
    // Keep previously chosen route
    selectRouteForSegment(activeSegment?.id, eventRecord.previousRecommendedId || 'B');
    navigate('/journey/active');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Alert Header */}
      <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-6 sm:p-8 shadow-soft space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-rose-200">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-200/80 text-rose-950 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-rose-700" />
            JOURNEY ADAPTATION REQUIRED
          </div>

          <span className="text-xs font-extrabold text-rose-800">
            Automated Re-Optimization Ingested
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-rose-950 tracking-tight">
            Environmental Change Detected on {activeSegment?.origin || 'Route'} → {activeSegment?.destination || 'Milestone'}
          </h1>
          <p className="text-xs sm:text-sm text-rose-900 font-medium leading-relaxed">
            {eventRecord.reason || 'Infrastructure degradation reported. WAYFARER recalculated factor scores and evaluated resilient alternatives.'}
          </p>
        </div>
      </div>

      {/* Before vs After Score Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* BEFORE CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              BEFORE DISRUPTION
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Route {eventRecord.previousRecommendedId || 'B'}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">
              Score: {eventRecord.previousRecommendedScore || prevRoute?.score || 91}
              <span className="text-sm text-slate-400 font-bold"> / 100</span>
            </span>
            <span className="text-xs font-bold text-slate-500">Initially Optimal</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-medium text-slate-600">
              <span>Safety</span>
              <strong className="text-slate-900">{prevRoute?.safety || 90}</strong>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Accessibility (Initial)</span>
              <strong className="text-slate-900">{prevRoute?.accessibility !== undefined ? prevRoute.accessibility : 96}</strong>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Crowd</span>
              <strong className="text-slate-900">{prevRoute?.crowd || 85}</strong>
            </div>
            <div className="flex justify-between font-medium text-slate-600">
              <span>Convenience</span>
              <strong className="text-slate-900">{prevRoute?.convenience || 86}</strong>
            </div>
          </div>
        </div>

        {/* AFTER / RECOMMENDED RECOVERY CARD */}
        <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-6 shadow-soft space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-200">
            <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
              NEW RECOMMENDED RECOVERY
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
              Route {recRoute?.id || 'C'} ★
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-950">
              Score: {recRoute?.score || 88}
              <span className="text-sm text-emerald-700/70 font-bold"> / 100</span>
            </span>
            <span className="text-xs font-black text-emerald-800 bg-emerald-200 px-2 py-0.5 rounded">
              High Accessibility Maintained
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-medium text-emerald-900">
              <span>Safety</span>
              <strong className="text-emerald-950">{recRoute?.safety || 88}</strong>
            </div>
            <div className="flex justify-between font-medium text-emerald-900">
              <span>Accessibility</span>
              <strong className="text-emerald-950">{recRoute?.accessibility || 91}</strong>
            </div>
            <div className="flex justify-between font-medium text-emerald-900">
              <span>Crowd</span>
              <strong className="text-emerald-950">{recRoute?.crowd || 88}</strong>
            </div>
            <div className="flex justify-between font-medium text-emerald-900">
              <span>Convenience</span>
              <strong className="text-emerald-950">{recRoute?.convenience || 80}</strong>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-emerald-900 font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Zero dependency on degraded infrastructure. Verified step-free.</span>
          </div>
        </div>

      </div>

      {/* Why Did WAYFARER Change? Structured Card */}
      <WhyChangedCard
        structuredChange={journeyState.structuredChange || recoveryState?.structuredChange}
        eventRecord={eventRecord}
        previousRoute={prevRoute}
        newRoute={recRoute}
      />

      {/* Downstream Impact Propagation */}
      <DownstreamImpactCard
        downstreamImpact={journeyState.downstreamImpact || recoveryState?.downstreamImpact}
      />

      {/* Map Preview of the Recovery Route */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-900">
            Corridor Geography & Alternative Alignments
          </h3>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="text-xs font-bold text-brand-600 hover:text-brand-800 transition"
          >
            {showMatrix ? 'Hide Decision Matrix' : 'View Full Decision Matrix'}
          </button>
        </div>

        <GoogleMap
          activeSegment={activeSegment}
          segments={segments}
          selectedRouteId={selectedRouteChoice || recRoute?.id}
          onSelectRoute={setSelectedRouteChoice}
          height="380px"
        />

        {showMatrix && (
          <RouteComparisonMatrix
            candidateRoutes={candidateRoutes}
            activeSegmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
            weights={journeyState.weights}
          />
        )}
      </div>

      {/* Action Buttons as requested */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-black text-sm text-slate-900">
            Confirm Journey Re-Alignment
          </h4>
          <p className="text-xs text-slate-500 font-medium">
            Accepting updates the active navigation instructions and logs this adaptation in decision history.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleKeepCurrent}
            className="flex-1 sm:flex-none px-4 py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition"
          >
            Keep Current Route
          </button>

          <button
            type="button"
            onClick={() => setShowMatrix(true)}
            className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition"
          >
            View Alternatives
          </button>

          <button
            type="button"
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept Route {selectedRouteChoice || recRoute?.id || 'C'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
