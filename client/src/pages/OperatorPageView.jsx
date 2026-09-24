import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActivitySquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';

export default function OperatorPageView() {
  const navigate = useNavigate();
  const { journeyState, resetToBaseline } = useJourney();

  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'STABLE' | 'MONITORING' | 'AT_RISK'

  const hasEvent = Boolean(journeyState.eventRecord);
  const isAtRisk = hasEvent && (journeyState.eventRecord?.type === 'ACCESSIBILITY_DEGRADATION' || journeyState.downstreamImpact?.hasDownstreamImpact);

  // The primary tour reflects the live backend journey state directly!
  const liveTour = {
    id: 'TOUR-1042',
    traveler: journeyState.traveler?.name || 'Aditi',
    mobility: journeyState.traveler?.mobility || 'wheelchair',
    route: `${journeyState.trip?.origin || 'Origin'} → ${journeyState.trip?.destination || 'Destination'}`,
    status: isAtRisk ? 'AT_RISK' : hasEvent ? 'MONITORING' : 'STABLE',
    score: journeyState.overallScore || 88,
    activeEvent: journeyState.eventRecord
      ? `${journeyState.eventRecord.type}: ${journeyState.eventRecord.reason || 'Event triggered'}`
      : 'None (Optimal Corridor)',
    affectedNodes: journeyState.downstreamImpact?.adjustedTimeline?.length || (hasEvent ? 2 : 0),
    downstreamSummary: journeyState.downstreamImpact?.summary || (hasEvent ? 'Downstream cascade evaluated' : 'All schedule buffers intact'),
    recommendation: hasEvent
      ? `Re-route to Route ${journeyState.eventRecord?.newRecommendedId || 'C'} and re-optimize dwell times`
      : 'Maintain scheduled progression'
  };

  // Complementary fleet tours in the fleet
  const otherTours = [
    {
      id: 'TOUR-1043',
      traveler: 'Rahul S.',
      mobility: 'elderly',
      route: 'Jaipur Junction → City Palace Courtyard',
      status: 'STABLE',
      score: 93,
      activeEvent: 'None',
      affectedNodes: 0,
      downstreamSummary: 'On-time schedule maintained',
      recommendation: 'Nominal operation'
    },
    {
      id: 'TOUR-1044',
      traveler: 'Priya K.',
      mobility: 'cane',
      route: 'Bengaluru Central → Cubbon Park Ramp Deck',
      status: 'MONITORING',
      score: 84,
      activeEvent: 'Moderate crowd surge (+10m transit shift)',
      affectedNodes: 1,
      downstreamSummary: 'Dwell compressed 15m to absorb surge',
      recommendation: 'Monitor pedestrian congestion'
    },
    {
      id: 'TOUR-1045',
      traveler: 'Vikram M.',
      mobility: 'standard',
      route: 'Delhi Terminal → Red Fort Heritage Area',
      status: 'STABLE',
      score: 89,
      activeEvent: 'None',
      affectedNodes: 0,
      downstreamSummary: 'On-time schedule maintained',
      recommendation: 'Nominal operation'
    }
  ];

  const allTours = [liveTour, ...otherTours];

  const filteredTours = allTours.filter((t) => {
    if (filterStatus === 'ALL') return true;
    return t.status === filterStatus;
  });

  const stableCount = allTours.filter((t) => t.status === 'STABLE').length;
  const monitoringCount = allTours.filter((t) => t.status === 'MONITORING').length;
  const atRiskCount = allTours.filter((t) => t.status === 'AT_RISK').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block mb-1">
            OPERATIONS & FLEET INTELLIGENCE
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ActivitySquare className="w-7 h-7 text-brand-600" />
            <span>Operator Operations Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Fleet-wide monitoring of active traveler itineraries. Live events from the traveler interface automatically reflect here through shared backend state.
          </p>
        </div>

        <button
          type="button"
          onClick={resetToBaseline}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Fleet Baseline</span>
        </button>
      </div>

      {/* Fleet Stats Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            filterStatus === 'ALL' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-70">
            Total Active Tours
          </span>
          <span className="text-2xl font-black">{allTours.length}</span>
        </div>

        <div
          onClick={() => setFilterStatus('STABLE')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            filterStatus === 'STABLE' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100/70'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
            Stable
          </span>
          <span className="text-2xl font-black">{stableCount}</span>
        </div>

        <div
          onClick={() => setFilterStatus('MONITORING')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            filterStatus === 'MONITORING' ? 'bg-amber-600 text-white border-amber-600 shadow-md' : 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100/70'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
            Monitoring
          </span>
          <span className="text-2xl font-black">{monitoringCount}</span>
        </div>

        <div
          onClick={() => setFilterStatus('AT_RISK')}
          className={`p-4 rounded-2xl border cursor-pointer transition ${
            filterStatus === 'AT_RISK' ? 'bg-rose-600 text-white border-rose-600 shadow-md' : 'bg-rose-50/70 border-rose-200 text-rose-950 hover:bg-rose-100/70'
          }`}
        >
          <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
            At Risk
          </span>
          <span className="text-2xl font-black">{atRiskCount}</span>
        </div>
      </div>

      {/* Tour Cards List */}
      <div className="space-y-4">
        <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wider">
          Active Traveler Itineraries ({filteredTours.length})
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {filteredTours.map((tour) => {
            const isLive = tour.id === 'TOUR-1042';

            return (
              <div
                key={tour.id}
                className={`p-6 rounded-2xl border shadow-soft transition space-y-4 ${
                  isLive
                    ? (tour.status === 'AT_RISK' ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-400' : 'bg-white border-brand-300 ring-2 ring-brand-400')
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {tour.id}
                    </span>
                    {isLive && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 uppercase tracking-wider">
                        Current Session State
                      </span>
                    )}
                    <span className="font-bold text-xs text-slate-700">
                      {tour.traveler} ({tour.mobility})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      tour.status === 'AT_RISK'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : tour.status === 'MONITORING'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {tour.status === 'AT_RISK' ? '⚠ At Risk' : tour.status === 'MONITORING' ? '🟡 Monitoring' : '🟢 Stable'}
                    </span>

                    <span className="font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {tour.score}★
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      Corridor / Route
                    </span>
                    <strong className="text-slate-900 block truncate">{tour.route}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      Active Ingested Disruption
                    </span>
                    <span className="text-slate-800 font-medium block truncate">
                      {tour.activeEvent}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">
                      Downstream Impact
                    </span>
                    <span className="text-slate-800 font-medium block">
                      {tour.affectedNodes > 0 ? `${tour.affectedNodes} downstream nodes impacted` : 'Zero cascade breaches'}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <strong className="text-slate-900">Operator Recommendation:</strong>
                    <span>{tour.recommendation}</span>
                  </div>

                  {/* Operator Action Buttons as requested */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate('/journey/active')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition shadow-2xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-brand-600" />
                      <span>View Journey</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/events')}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 transition shadow-2xs flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>View Impact</span>
                    </button>

                    {tour.status !== 'STABLE' && (
                      <button
                        type="button"
                        onClick={() => navigate('/recovery/active')}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-black text-white transition shadow-2xs flex items-center gap-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>View Recovery</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
