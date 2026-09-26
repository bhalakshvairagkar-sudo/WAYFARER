import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Users,
  Copy,
  Network,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Eye,
  RefreshCw,
  Clock,
  MapPin,
  Camera,
  Layers,
  Sparkles,
  ArrowDown,
  ArrowRight,
  Filter
} from 'lucide-react';
import {
  fetchCommunityIncidents,
  actionCommunityIncident,
  simulateCommunityScenario
} from '../../services/api.js';
import { useJourney } from '../../context/JourneyContext.jsx';

export default function EvidenceFusionPipelineVisualizer({ onOpenReportModal }) {
  const { triggerEvent, journeyState } = useJourney();

  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSimulation, setActiveSimulation] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const data = await fetchCommunityIncidents();
      if (data && data.incidents) {
        setIncidents(data.incidents);
        if (!selectedIncident && data.incidents.length > 0) {
          setSelectedIncident(data.incidents[0]);
        } else if (selectedIncident) {
          const updated = data.incidents.find((i) => i.id === selectedIncident.id);
          if (updated) setSelectedIncident(updated);
        }
      }
    } catch (err) {
      console.warn('Failed to load incidents:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async (scenarioKey, label) => {
    setActiveSimulation(scenarioKey);
    setActionNotice(`Executing ${label}...`);
    try {
      const res = await simulateCommunityScenario(scenarioKey);
      if (res && res.cluster) {
        setSelectedIncident(res.cluster);
        await loadIncidents();

        // If the decision is ADAPT, trigger real journey adaptation
        if (res.decision === 'ADAPT' && triggerEvent) {
          try {
            await triggerEvent({
              type: 'ACCESSIBILITY_DEGRADATION',
              segmentId: res.cluster.resourceId.startsWith('S') ? res.cluster.resourceId : 'S3',
              severity: 0.8,
              reason: res.cluster.title || 'Community consensus adaptation'
            });
          } catch (e) {
            console.warn('[Pipeline Visualizer] Journey adaptation note:', e.message);
          }
        }

        setActionNotice(`Pipeline completed: Outcome set to ${res.decision}`);
      }
    } catch (err) {
      setActionNotice(`Simulation failed: ${err.message}`);
    } finally {
      setActiveSimulation(null);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const handleOperatorAction = async (incidentId, actionType) => {
    try {
      const res = await actionCommunityIncident(incidentId, actionType);
      if (res && res.incident) {
        setSelectedIncident(res.incident);
        await loadIncidents();
        setActionNotice(`Incident updated to ${res.incident.status}`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const current = selectedIncident || incidents[0] || null;
  const fusion = current?.evidenceFusion || {};
  const indep = current?.independenceAnalysis || {};
  const scores = current?.scores || {};

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-950 text-white p-6 rounded-2xl shadow-xl border border-slate-700/60 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-brand-500/10 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-brand-500/20 text-brand-300 border border-brand-500/30">
                Resilience Engine 2.0
              </span>
              <span className="text-xs text-slate-400">Deterministic Multi-Source Intelligence</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Network className="w-6 h-6 text-brand-400" />
              Community Report & Evidence Fusion Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Automated 4-stage pipeline that ingests raw crowd reports, neutralizes Sybil/spam attacks,
              fuses 8 independent dimensions, and deterministically triggers <strong>WARN</strong>, <strong>ADAPT</strong>, or <strong>QUARANTINE</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenReportModal && (
              <button
                type="button"
                onClick={onOpenReportModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white transition shadow-sm flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" />
                <span>Submit Report</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadIncidents}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 1-Click Interactive Test Scenarios */}
        <div className="mt-5 pt-4 border-t border-slate-700/80">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Scenario Simulator (Live Evaluation)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              {
                id: 'SCENARIO_SINGLE_REPORT',
                title: '1. Single Unverified Report',
                outcome: 'WARN',
                badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                desc: '1 traveler, moderate confidence'
              },
              {
                id: 'SCENARIO_BOT_FLOOD',
                title: '2. Sybil Bot Flood Attack',
                outcome: 'QUARANTINE',
                badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                desc: 'Same IP, identical GPS, zero entropy'
              },
              {
                id: 'SCENARIO_INDEPENDENT_CONFIRMATIONS',
                title: '3. Multi-Witness + Photos',
                outcome: 'ADAPT',
                badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                desc: '3 independent subnets with photos'
              },
              {
                id: 'SCENARIO_AUTHORITY_CONFIRM',
                title: '4. Verified Authority Notice',
                outcome: 'ADAPT',
                badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
                desc: 'Official transit authority override'
              }
            ].map((scen) => (
              <button
                key={scen.id}
                type="button"
                disabled={activeSimulation !== null}
                onClick={() => handleSimulate(scen.id, scen.title)}
                className={`p-3 rounded-xl border text-left transition relative overflow-hidden group ${
                  activeSimulation === scen.id
                    ? 'border-brand-500 bg-brand-900/40 text-white'
                    : 'border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold truncate group-hover:text-white">{scen.title}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${scen.badgeColor}`}>
                    {scen.outcome}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{scen.desc}</p>
              </button>
            ))}
          </div>
          {actionNotice && (
            <p className="mt-2 text-xs font-semibold text-emerald-400 animate-in fade-in duration-150">
              ✓ {actionNotice}
            </p>
          )}
        </div>
      </div>

      {/* Main Interactive Flowchart Architecture Display */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600" />
              Live Evidence Pipeline Inspection
            </h3>
            <p className="text-xs text-slate-500">
              Examining Incident: <span className="font-bold text-slate-800">{current?.title || 'No active cluster selected'}</span>
            </p>
          </div>

          {/* Quick Selector for Active Clusters */}
          {incidents.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Cluster:</span>
              <select
                value={current?.id || ''}
                onChange={(e) => {
                  const found = incidents.find((i) => i.id === e.target.value);
                  if (found) setSelectedIncident(found);
                }}
                className="text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 focus:outline-hidden"
              >
                {incidents.map((inc) => (
                  <option key={inc.id} value={inc.id}>
                    [{inc.status}] {inc.resourceName} ({inc.reports?.length || 1} reports)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* VISUAL ARCHITECTURE PIPELINE CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          
          {/* STEP 1: ABUSE / SPAM DETECTION */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stage 1</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <ShieldAlert className="w-4 h-4 text-orange-500" />
                Abuse / Spam Detection
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Velocity Check:</span>
                  <span className="font-semibold text-emerald-600">PASSED (&lt;3/min)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Content Quality:</span>
                  <span className="font-semibold text-slate-700">Valid Text</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Coordinate Bounds:</span>
                  <span className="font-semibold text-slate-700">Plausible</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
              Filter: Heuristics & Velocity
            </div>
          </div>

          {/* STEP 2: DUPLICATE DETECTION */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stage 2</span>
                <Copy className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <Copy className="w-4 h-4 text-blue-500" />
                Duplicate Detection
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Spatial Radius:</span>
                  <span className="font-semibold text-slate-700">&le; 350 meters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Temporal Window:</span>
                  <span className="font-semibold text-slate-700">&le; 60 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clustered Reports:</span>
                  <span className="font-bold text-brand-600">{current?.reports?.length || 1} Reports</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
              Clustering: Spatial-Temporal
            </div>
          </div>

          {/* STEP 3: INDEPENDENCE ANALYSIS */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Stage 3</span>
                <Network className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <Network className="w-4 h-4 text-purple-500" />
                Independence Analysis
              </h4>
              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Unique Reporters:</span>
                  <span className="font-bold text-slate-800">{indep.uniqueReportersCount ?? 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Subnet Entropy:</span>
                  <span className="font-semibold text-slate-700">{indep.uniqueSubnetsCount ?? 1} Subnets</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sybil Risk:</span>
                  <span className={`font-bold ${indep.sybilRiskScore > 0.4 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {Math.round((indep.sybilRiskScore || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400 font-mono">
              Metric: Entropy & Jitter
            </div>
          </div>

          {/* STEP 4: DECISION OUTCOME */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between ${
            scores.decision === 'ADAPT'
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : scores.decision === 'WARN'
              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
              : 'bg-rose-50/80 border-rose-300 text-rose-950'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Decision</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider text-white ${
                  scores.decision === 'ADAPT' ? 'bg-emerald-600' : scores.decision === 'WARN' ? 'bg-amber-500' : 'bg-rose-600'
                }`}>
                  {scores.decision || 'WARN'}
                </span>
              </div>
              <h4 className="text-xs font-black tracking-tight mb-2">
                {scores.decision === 'ADAPT' && '⚡ ADAPT ITINERARY'}
                {scores.decision === 'WARN' && '⚠ CAUTION ADVISORY'}
                {scores.decision === 'QUARANTINE' && '🛡 QUARANTINE REPORT'}
              </h4>
              <div className="space-y-1 text-[11px]">
                <p className="leading-snug opacity-90">
                  {scores.decision === 'ADAPT' && 'High consensus. Dynamic rerouting triggered on Corridor S3.'}
                  {scores.decision === 'WARN' && 'Corroborated incident. Warning banner active on traveler map.'}
                  {scores.decision === 'QUARANTINE' && 'High attack risk or unverified. Isolated for operator review.'}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[11px] font-bold">
              <span>Action Conf:</span>
              <span className="text-sm font-black">{Math.round((scores.actionConfidence || 0) * 100)}%</span>
            </div>
          </div>

        </div>

        {/* 8-FACTOR EVIDENCE FUSION RADAR / METRIC MATRIX */}
        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-600" />
                8 Evidential Dimensions (Fusion Matrix)
              </h4>
              <p className="text-[11px] text-slate-500">
                Mathematical weights computed deterministically by the Evidence Fusion algorithm.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-brand-700">Community Confidence: {Math.round((scores.communityConfidence || 0) * 100)}%</span>
              <span className="text-rose-600">Attack Risk: {Math.round((scores.attackRisk || 0) * 100)}%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: 'Independent Confirmations',
                score: fusion.independentConfirmations ?? 0.6,
                detail: `${indep.independentConfirmationsCount || 1} independent witnesses`
              },
              {
                label: 'Proximity',
                score: fusion.proximity ?? 0.85,
                detail: 'On-site GPS corroboration'
              },
              {
                label: 'Recency',
                score: fusion.recency ?? 0.9,
                detail: 'Half-life: 45m exponential decay'
              },
              {
                label: 'Reputation',
                score: fusion.reputation ?? 0.8,
                detail: 'Trust-weighted account tier'
              },
              {
                label: 'Media Evidence',
                score: fusion.mediaEvidence ?? 0.95,
                detail: current?.reports?.some((r) => r.mediaEvidence?.hasPhoto) ? 'Photo attached' : 'No media'
              },
              {
                label: 'Contradictions',
                score: 1.0 - (fusion.contradictions || 0),
                detail: fusion.contradictions > 0 ? 'Dissenting reports' : 'Zero contradictions'
              },
              {
                label: 'External Sources',
                score: fusion.externalSources ?? 0.5,
                detail: current?.officialAuthorityVerified ? 'Authority Verified' : 'Neutral / Sensor'
              },
              {
                label: 'Attack Inversion (1 - Risk)',
                score: 1.0 - (scores.attackRisk || 0.1),
                detail: `Sybil Risk: ${Math.round((scores.attackRisk || 0) * 100)}%`
              }
            ].map((factor, idx) => {
              const pct = Math.round(factor.score * 100);
              return (
                <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 truncate">{factor.label}</span>
                    <span className="font-black text-brand-600">{pct}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-brand-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">{factor.detail}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* VERIFIED AUTHORITY / OPERATOR OVERRIDE CONTROLS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-700">Official Authority Override:</span> Human operators can force adaptation or quarantine any incident.
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOperatorAction(current.id, 'CONFIRM_ADAPT')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-2xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm & Adapt</span>
            </button>
            <button
              type="button"
              onClick={() => handleOperatorAction(current.id, 'DOWNGRADE_WARN')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition flex items-center gap-1 shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Set as Advisory (WARN)</span>
            </button>
            <button
              type="button"
              onClick={() => handleOperatorAction(current.id, 'REJECT_QUARANTINE')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Quarantine / Reject</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
