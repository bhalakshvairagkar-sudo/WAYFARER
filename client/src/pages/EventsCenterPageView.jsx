import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  XCircle,
  Navigation,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Users,
  CheckCircle2,
  Activity,
  Zap,
  Clock
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

  const handleSimulateEvent = async (id, payload) => {
    setActiveSimulationId(id);
    try {
      await triggerEvent(payload);
      navigate('/recovery/active');
    } catch (e) {
      console.error(e);
    } finally {
      setActiveSimulationId(null);
    }
  };

  const simulationEvents = [
    {
      id: 'elevator',
      title: 'Elevator Outage',
      description: 'Simulates a critical accessibility failure at the next transit hub.',
      icon: XCircle,
      action: () => handleSimulateEvent('elevator', {
        type: 'ACCESSIBILITY_DEGRADATION',
        segmentId: activeSegment?.id || 'S1',
        severity: 1.0,
        reason: 'Elevator out of service at destination',
        delta: { accessibility: 50 }
      })
    },
    {
      id: 'crowd',
      title: 'Sudden Congestion',
      description: 'Simulates a massive influx of people at the destination.',
      icon: Users,
      action: () => handleSimulateEvent('crowd', {
        type: 'CROWD_SURGE',
        segmentId: activeSegment?.id || 'S1',
        severity: 0.8,
        reason: 'Unexpected high density crowding at destination',
        delta: { crowds: 40 }
      })
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            Alerts
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Active journey monitoring, real-world disruptions, and adaptations.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToBaseline}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Journey</span>
        </button>
      </div>

      {/* Alerts Log */}
      <div className="space-y-4">
        <h2 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest pl-1">
          LATEST NOTIFICATIONS
        </h2>

        {/* Action Required */}
        {journeyState.events?.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
              <AlertTriangle className="w-24 h-24 transform translate-x-4 -translate-y-4 text-red-600" />
            </div>
            
            <div className="relative z-10 flex gap-4">
              <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">🔴 NOW</span>
                  </div>
                  <h3 className="text-base font-bold text-red-950 leading-tight mt-1">Journey Adaptation Required</h3>
                  <p className="text-sm text-red-800 font-medium mt-1">
                    {journeyState.events[journeyState.events.length - 1].reason}
                  </p>
                </div>
                
                <button 
                  onClick={() => navigate('/recovery/active')}
                  className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
                >
                  REVIEW ALTERNATIVES
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Warning Example */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex gap-4 hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 shrink-0 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🟡 10 MIN AGO</span>
            <h3 className="text-sm font-bold text-slate-900 leading-tight mt-1">Crowding Increased</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              WAYFARER is monitoring density at your destination.
            </p>
          </div>
        </div>

        {/* Success Example */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex gap-4 hover:bg-slate-50 transition-colors">
          <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🟢 YESTERDAY</span>
            <h3 className="text-sm font-bold text-slate-900 leading-tight mt-1">Journey Completed</h3>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Mumbai → Goa. Arrived safely.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-200">
        <h2 className="text-lg font-black text-slate-900 mb-2">Simulate Disruptions</h2>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Trigger real-world events below to test how WAYFARER adapts to sudden changes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulationEvents.map((ev) => {
            const Icon = ev.icon;
            return (
              <button
                key={ev.id}
                onClick={ev.action}
                disabled={activeSimulationId === ev.id || isLoading}
                className="text-left p-5 rounded-2xl border transition group flex flex-col relative overflow-hidden bg-white border-slate-200 shadow-sm hover:shadow-md disabled:opacity-50"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-xl bg-slate-50 shadow-sm">
                    <Icon className="w-5 h-5 text-slate-700" />
                  </div>
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    SIMULATION
                  </span>
                </div>
                
                <h3 className="font-extrabold text-sm mb-1.5 text-slate-900">
                  {ev.title}
                </h3>
                <p className="text-[10px] font-medium leading-relaxed opacity-80 text-slate-600">
                  {ev.description}
                </p>

                {activeSimulationId === ev.id && (
                  <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-800" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <SafetyVerificationModal 
        isOpen={isSafetyModalOpen} 
        onClose={() => setIsSafetyModalOpen(false)} 
        segmentId={activeSegment?.id || 'S1'}
      />
    </div>
  );
}
