import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Clock,
  Users,
  AlertTriangle,
  XCircle,
  Navigation,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import SafetyVerificationModal from '../components/dashboard/SafetyVerificationModal.jsx';

export default function EventsCenterPageView() {
  const navigate = useNavigate();
  const {
    journeyState,
    activeSegmentId,
    triggerEvent,
    resetToBaseline,
    isLoading
  } = useJourney();

  const [activeSimulationId, setActiveSimulationId] = useState(null);
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  const segments = journeyState.segments || [];
  const activeSegment = segments.find((s) => s.id === activeSegmentId) || segments[0];

  // 1. Hero Event: Elevator Failure
  const handleElevatorFailure = async () => {
    setActiveSimulationId('elevator');
    try {
      const seg = activeSegment || segments[0];
      const recRoute = seg?.candidateRoutes?.find((r) => r.isRecommended);
      await triggerEvent({
        type: 'ACCESSIBILITY_DEGRADATION',
        segmentId: seg?.id || 'S1',
        routeId: recRoute?.id || 'B',
        severity: 1.0,
        reason: `Elevator and lift mechanism out of service at ${seg?.destination || 'milestone'} lower rampway entrance`,
        delta: { accessibility: 58 }
      });
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  // 2. Transport Delay (+50 min)
  const handleTransportDelay = async () => {
    setActiveSimulationId('transport');
    try {
      const seg = activeSegment || segments[0];
      await triggerEvent({
        type: 'TRANSPORT_DELAY',
        segmentId: seg?.id || 'S1',
        delayMinutes: 50,
        reason: `Transit vehicle mechanical breakdown en route to ${seg?.destination || 'destination'} (+50 min delay)`
      });
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  // 3. Activity Cancellation (Market / Landmark)
  const handleActivityCancellation = async () => {
    setActiveSimulationId('cancel');
    try {
      const stops = journeyState.stops || [];
      const cancelStop = stops.find((s) => s.type === 'experience' || s.type === 'attraction') || stops[stops.length - 2] || stops[0];
      const seg = segments.find((s) => s.destinationId === cancelStop?.id) || activeSegment || segments[0];

      await triggerEvent({
        type: 'ACTIVITY_CANCELLATION',
        nodeId: cancelStop?.id,
        segmentId: seg?.id,
        reason: `${cancelStop?.name || 'Venue'} temporarily closed for emergency civil maintenance`
      });
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  // 4. Crowd Spike
  const handleCrowdSpike = async () => {
    setActiveSimulationId('crowd');
    try {
      const seg = activeSegment || segments[0];
      await triggerEvent({
        type: 'CROWD_SPIKE',
        segmentId: seg?.id || 'S1',
        routeId: seg?.candidateRoutes?.[0]?.id || 'A',
        severity: 0.9,
        reason: `Severe bottleneck surge and pedestrian density exceeding 4.2 persons/m² at ${seg?.destination || 'corridor'}`,
        delta: { crowd: 45 }
      });
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  // 5. Safety Alert
  const handleSafetyAlert = async () => {
    setActiveSimulationId('safety');
    try {
      const seg = activeSegment || segments[0];
      await triggerEvent({
        type: 'SAFETY_ALERT',
        segmentId: seg?.id || 'S1',
        routeId: 'A',
        severity: 0.8,
        reason: `Municipal construction hazard and unmonitored sidewalk excavation along ${seg?.origin || 'corridor'}`,
        delta: { safety: 40 }
      });
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  // 6. Route Deviation
  const handleRouteDeviation = () => {
    setIsSafetyModalOpen(true);
  };

  const simulationEvents = [
    {
      id: 'elevator',
      title: 'Elevator Failure',
      badge: 'Hero Accessibility Demo',
      description: 'Cuts Route B accessibility score by 58 points. Triggers real-time re-ranking promoting Route C.',
      icon: Zap,
      borderColor: 'border-rose-300',
      bgColor: 'bg-rose-50/70 hover:bg-rose-100/90',
      textColor: 'text-rose-950',
      badgeStyle: 'bg-rose-200 text-rose-900',
      action: handleElevatorFailure
    },
    {
      id: 'transport',
      title: 'Transport Delay (+50 min)',
      badge: 'Downstream DAG Cascade',
      description: 'Shifts subsequent milestone arrival times. Checks venue closing hours and applies dwell compression.',
      icon: Clock,
      borderColor: 'border-amber-300',
      bgColor: 'bg-amber-50/70 hover:bg-amber-100/90',
      textColor: 'text-amber-950',
      badgeStyle: 'bg-amber-200 text-amber-900',
      action: handleTransportDelay
    },
    {
      id: 'cancel',
      title: 'Activity Cancellation',
      badge: 'Node Substitution',
      description: 'Target attraction closed. Automatically queries alternative pool and substitutes nearest accessible venue.',
      icon: XCircle,
      borderColor: 'border-red-300',
      bgColor: 'bg-red-50/70 hover:bg-red-100/90',
      textColor: 'text-red-950',
      badgeStyle: 'bg-red-200 text-red-900',
      action: handleActivityCancellation
    },
    {
      id: 'crowd',
      title: 'Crowd Spike',
      badge: 'Stress Mitigation',
      description: 'Heavy pedestrian bottleneck reported. Re-ranks toward low-density scenic corridors to ensure low stress.',
      icon: Users,
      borderColor: 'border-orange-300',
      bgColor: 'bg-orange-50/70 hover:bg-orange-100/90',
      textColor: 'text-orange-950',
      badgeStyle: 'bg-orange-200 text-orange-900',
      action: handleCrowdSpike
    },
    {
      id: 'safety',
      title: 'Safety Hazard Alert',
      badge: 'Corridor Security',
      description: 'Unmonitored construction hazard detected. Penalizes poorly-lit arterial routes and routes around safe zones.',
      icon: AlertTriangle,
      borderColor: 'border-yellow-300',
      bgColor: 'bg-yellow-50/70 hover:bg-yellow-100/90',
      textColor: 'text-yellow-950',
      badgeStyle: 'bg-yellow-200 text-yellow-900',
      action: handleSafetyAlert
    },
    {
      id: 'deviation',
      title: 'Traveler Path Deviation',
      badge: 'Telemetry Check',
      description: 'Traveler turns off designated accessible path. Launches instant "Are You Okay?" verification modal.',
      icon: Navigation,
      borderColor: 'border-brand-300',
      bgColor: 'bg-brand-50/70 hover:bg-brand-100/90',
      textColor: 'text-brand-950',
      badgeStyle: 'bg-brand-200 text-brand-900',
      action: handleRouteDeviation
    }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest block mb-1">
            CONTINUOUS RE-OPTIMIZATION TESTBED
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Real-Time Events & Environmental Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Simulate dynamic real-world disruptions. Events are sent to the actual Express backend event engine, triggering Directed Acyclic Graph (DAG) cascades, 5-factor re-scoring, and comparative AI explainability.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToBaseline}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All Events</span>
        </button>
      </div>

      {/* Active Journey Snapshot Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
              MONITORED JOURNEY STATE
            </span>
          </div>
          <h3 className="font-extrabold text-base text-slate-900">
            {journeyState.trip?.origin} → {journeyState.trip?.destination}
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Current Active Segment: <strong className="text-slate-800">{activeSegment?.origin} → {activeSegment?.destination}</strong> • Score: <strong className="text-emerald-700">{journeyState.overallScore}/100</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            SIMULATED TELEMETRY FEEDS
          </span>
        </div>
      </div>

      {/* 6 Event Simulation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {simulationEvents.map((evt) => {
          const Icon = evt.icon;
          const isTriggering = activeSimulationId === evt.id || (isLoading && activeSimulationId === evt.id);

          return (
            <div
              key={evt.id}
              className={`p-5 rounded-2xl border ${evt.borderColor} ${evt.bgColor} shadow-soft flex flex-col justify-between transition group relative overflow-hidden`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${evt.badgeStyle}`}>
                    {evt.badge}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-500 bg-white/70 px-2 py-0.5 rounded border border-slate-200">
                    SIMULATED EVENT
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center shadow-xs">
                    <Icon className="w-4 h-4 text-slate-800 group-hover:scale-110 transition" />
                  </div>
                  <h4 className={`font-black text-sm ${evt.textColor}`}>
                    {evt.title}
                  </h4>
                </div>

                <p className="text-xs text-slate-700 font-medium leading-relaxed mb-4">
                  {evt.description}
                </p>
              </div>

              <button
                type="button"
                disabled={isLoading}
                onClick={evt.action}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isTriggering ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Simulate & Trigger Backend Re-Score</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Safety Deviation Modal */}
      <SafetyVerificationModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onVerifiedFine={() => setIsSafetyModalOpen(false)}
        travelerName={journeyState.traveler?.name}
        segmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
      />

    </div>
  );
}
