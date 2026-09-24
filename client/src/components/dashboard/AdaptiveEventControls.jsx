import React from 'react';
import { Zap, Users, AlertTriangle, RotateCcw, Clock, XCircle, Navigation } from 'lucide-react';

export default function AdaptiveEventControls({
  onTriggerElevatorFailure,
  onTriggerCrowdSpike,
  onTriggerDeviation,
  onTriggerTransportDelay,
  onTriggerActivityCancellation,
  onResetJourney,
  isLoading
}) {
  const events = [
    {
      id: 'elevator',
      label: 'Elevator Fails',
      badge: 'Hero Demo',
      description: 'Drops Route B access (96→38). Reroutes to Route C upper ramp.',
      icon: Zap,
      onClick: onTriggerElevatorFailure,
      borderColor: 'border-rose-200',
      bgColor: 'bg-rose-50/60 hover:bg-rose-100/80',
      textColor: 'text-rose-900',
      iconColor: 'text-rose-600',
      descColor: 'text-rose-800',
      badgeBg: 'bg-rose-200 text-rose-900'
    },
    {
      id: 'transport',
      label: 'Transport Delay',
      badge: '+50 min',
      description: 'Bus delay on NH66. Real DAG cascade through downstream nodes.',
      icon: Clock,
      onClick: onTriggerTransportDelay,
      borderColor: 'border-amber-200',
      bgColor: 'bg-amber-50/60 hover:bg-amber-100/80',
      textColor: 'text-amber-900',
      iconColor: 'text-amber-600',
      descColor: 'text-amber-800',
      badgeBg: 'bg-amber-200 text-amber-900'
    },
    {
      id: 'crowd',
      label: 'Crowd Spikes',
      badge: 'Downstream',
      description: 'Market surge. Re-evaluates timing and schedule shift.',
      icon: Users,
      onClick: onTriggerCrowdSpike,
      borderColor: 'border-orange-200',
      bgColor: 'bg-orange-50/60 hover:bg-orange-100/80',
      textColor: 'text-orange-900',
      iconColor: 'text-orange-600',
      descColor: 'text-orange-800',
      badgeBg: 'bg-orange-200 text-orange-900'
    },
    {
      id: 'cancel',
      label: 'Market Cancelled',
      badge: 'Substitution',
      description: 'Market closed. Finds accessible alternative activity dynamically.',
      icon: XCircle,
      onClick: onTriggerActivityCancellation,
      borderColor: 'border-red-200',
      bgColor: 'bg-red-50/60 hover:bg-red-100/80',
      textColor: 'text-red-900',
      iconColor: 'text-red-600',
      descColor: 'text-red-800',
      badgeBg: 'bg-red-200 text-red-900'
    },
    {
      id: 'deviation',
      label: 'Traveler Deviates',
      badge: 'Safety',
      description: 'Deviation detected. Triggers "Are You Okay?" verification modal.',
      icon: Navigation,
      onClick: onTriggerDeviation,
      borderColor: 'border-brand-200',
      bgColor: 'bg-brand-50/60 hover:bg-brand-100/80',
      textColor: 'text-brand-900',
      iconColor: 'text-brand-600',
      descColor: 'text-brand-800',
      badgeBg: 'bg-brand-200 text-brand-900'
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
            <h3 className="font-extrabold text-sm text-slate-900">
              LIVE JOURNEY EVENTS
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Trigger real-world events to test continuous re-optimization
          </p>
        </div>
        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider border border-slate-200 hidden sm:inline">
          SIMULATED EXTERNAL EVENT
        </span>
      </div>

      {/* Event Buttons Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {events.map((evt) => {
          const Icon = evt.icon;
          return (
            <button
              key={evt.id}
              type="button"
              disabled={isLoading}
              onClick={evt.onClick}
              className={`p-3.5 rounded-xl border ${evt.borderColor} ${evt.bgColor} text-left transition group disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-extrabold ${evt.textColor} flex items-center gap-1.5`}>
                  <Icon className={`w-4 h-4 ${evt.iconColor} group-hover:scale-110 transition`} />
                  {evt.label}
                </span>
                <span className={`text-[10px] font-bold ${evt.badgeBg} px-1.5 py-0.5 rounded`}>
                  {evt.badge}
                </span>
              </div>
              <p className={`text-[11px] ${evt.descColor} leading-snug font-medium`}>
                {evt.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Reset Button */}
      <button
        type="button"
        disabled={isLoading}
        onClick={onResetJourney}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition disabled:opacity-50"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reset to Baseline
      </button>

    </div>
  );
}
