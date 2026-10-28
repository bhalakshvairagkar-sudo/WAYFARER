import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  CloudRain,
  Flame,
  Wind,
  Layers,
  Database,
  Lock,
  Building,
  Phone,
  UserCheck,
  Eye,
  Sliders,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useJourney } from '../context/JourneyContext.jsx';
import {
  fetchCommunityIncidents,
  actionCommunityIncident,
  simulateCommunityScenario,
  dispatchEmergencyBroadcast
} from '../services/api.js';

export default function ControllerPageView() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { journeyState, triggerEvent, resetToBaseline } = useJourney();

  const [activeTab, setActiveTab] = useState('surveillance'); // 'surveillance' | 'trustshield' | 'simulation' | 'broadcast' | 'telemetry'
  const [incidents, setIncidents] = useState([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);

  // Broadcast state
  const [broadcastCorridor, setBroadcastCorridor] = useState('S3');
  const [broadcastType, setBroadcastType] = useState('ACCESSIBILITY_ISSUE');
  const [broadcastSeverity, setBroadcastSeverity] = useState(0.85);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState([]);

  // Simulation state
  const [simRunning, setSimRunning] = useState(false);
  const [simOutput, setSimOutput] = useState(null);

  const organization = user?.organization || 'Transit Control Operations Center';
  const controllerName = user?.name || user?.email || 'Duty Commander';
  const controllerPhone = user?.phone || '+91 22 2262 0000';

  // Load live community incidents
  const loadIncidents = async () => {
    setIsLoadingIncidents(true);
    try {
      const data = await fetchCommunityIncidents();
      if (data && data.incidents) {
        setIncidents(data.incidents);
      }
    } catch (e) {
      console.warn('Failed to load incidents:', e.message);
    } finally {
      setIsLoadingIncidents(false);
    }
  };

  useEffect(() => {
    loadIncidents();
    const interval = setInterval(loadIncidents, 6000);
    return () => clearInterval(interval);
  }, []);

  // Handle authority moderation actions on TrustShield incidents
  const handleAuthorityAction = async (incidentId, actionType) => {
    try {
      const res = await actionCommunityIncident(
        incidentId,
        actionType,
        `Controller Action by ${controllerName} (${organization})`
      );

      setActionFeedback({
        id: incidentId,
        type: actionType,
        text: `Action '${actionType}' executed successfully by ${organization}.`
      });

      // If action is CONFIRM_ADAPT, trigger adaptive event into live journey
      if (actionType === 'CONFIRM_ADAPT' && triggerEvent) {
        await triggerEvent({
          type: 'ACCESSIBILITY_DEGRADATION',
          segmentId: 'S3',
          severity: 0.85,
          reason: `Authority Verified Incident by ${organization}`
        });
      }

      await loadIncidents();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Dispatch Emergency Broadcast
  const handleDispatchBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) {
      alert('Please enter both broadcast title and instructions.');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await dispatchEmergencyBroadcast({
        corridorId: broadcastCorridor,
        title: broadcastTitle,
        message: broadcastMessage,
        severity: Number(broadcastSeverity),
        eventType: broadcastType
      });

      setBroadcastHistory((prev) => [
        {
          id: `bc-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          corridorId: broadcastCorridor,
          title: broadcastTitle,
          message: broadcastMessage,
          severity: broadcastSeverity,
          status: 'DISPATCHED_CONFIRMED'
        },
        ...prev
      ]);

      // Automatically propagate into live journey
      if (triggerEvent) {
        await triggerEvent({
          type: 'ACCESSIBILITY_DEGRADATION',
          segmentId: broadcastCorridor,
          severity: Number(broadcastSeverity),
          reason: `[OFFICIAL BROADCAST] ${broadcastTitle}`
        });
      }

      setBroadcastTitle('');
      setBroadcastMessage('');
      await loadIncidents();
      setActiveTab('trustshield');
    } catch (err) {
      alert(`Broadcast failed: ${err.message}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Run Digital Twin Weather Simulation
  const handleRunSimulation = async (scenarioType) => {
    setSimRunning(true);
    try {
      let eventPayload;
      if (scenarioType === 'CLOUDBURST') {
        eventPayload = {
          type: 'WEATHER_SURGE',
          segmentId: 'S3',
          severity: 0.95,
          reason: 'Severe Monsoon Cloudburst: 85mm/hr rain, flash flooding on street level'
        };
      } else if (scenarioType === 'STORM_SURGE') {
        eventPayload = {
          type: 'WEATHER_SURGE',
          segmentId: 'S2',
          severity: 0.80,
          reason: 'Coastal Gale Wind Surge: 70km/h gusts, tree falls on Colaba corridor'
        };
      } else if (scenarioType === 'HEATWAVE') {
        eventPayload = {
          type: 'WEATHER_SURGE',
          segmentId: 'S1',
          severity: 0.65,
          reason: 'Extreme Heat Stress: 41°C ambient temp, exposed walking routes penalized'
        };
      }

      if (eventPayload && triggerEvent) {
        const simRes = await triggerEvent(eventPayload);
        setSimOutput({
          scenario: scenarioType,
          event: eventPayload,
          result: simRes
        });
      }
    } catch (e) {
      console.error('Simulation error:', e);
    } finally {
      setSimRunning(false);
    }
  };

  // Corridor data
  const hasEvent = Boolean(journeyState?.eventRecord);
  const liveCorridorStatus = hasEvent ? 'AT_RISK' : 'STABLE';
  const liveHealthScore = journeyState?.overallScore || 91;

  const corridors = [
    {
      id: 'CORR-MUM-01',
      name: 'Mumbai Central - CST - Colaba Corridor',
      activeTravelers: 142,
      mobilityBreakdown: '28 Wheelchair • 35 Senior • 79 Standard',
      status: liveCorridorStatus,
      score: liveHealthScore,
      alert: hasEvent ? journeyState.eventRecord?.reason : 'Nominal schedule adherence. Elevators operational.',
      riskLevel: hasEvent ? 'HIGH' : 'LOW'
    },
    {
      id: 'CORR-PUN-02',
      name: 'Pune Metro Line 1 & Shivajinagar Ramp Deck',
      activeTravelers: 88,
      mobilityBreakdown: '12 Wheelchair • 22 Senior • 54 Standard',
      status: 'STABLE',
      score: 94,
      alert: 'Step-free ramps inspected at 08:30 IST. Tactile paving unobstructed.',
      riskLevel: 'LOW'
    },
    {
      id: 'CORR-JAI-03',
      name: 'Jaipur Junction - Hawa Mahal Heritage Way',
      activeTravelers: 64,
      mobilityBreakdown: '8 Wheelchair • 18 Senior • 38 Standard',
      status: 'MONITORING',
      score: 83,
      alert: 'Ambient temperature 38°C. Shaded walkways auto-recommended for seniors.',
      riskLevel: 'MODERATE'
    },
    {
      id: 'CORR-BLR-04',
      name: 'Bengaluru MG Road - Cubbon Park Skywalk',
      activeTravelers: 110,
      mobilityBreakdown: '15 Wheelchair • 30 Senior • 65 Standard',
      status: 'STABLE',
      score: 89,
      alert: 'Nominal multimodal flow. Elevators and escalators verified online.',
      riskLevel: 'LOW'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7 animate-in fade-in">
      
      {/* Authoritative Command Header */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-md">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>TRANSIT CONTROL COMMAND CENTER</span>
              </span>
              <span className="text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                Level 3 Authority
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{organization}</span>
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium pt-1">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Officer: <strong>{controllerName}</strong></span>
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-blue-400" />
                <span>Hotline: {controllerPhone}</span>
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <Activity className="w-4 h-4" />
                <span>Corridor Surveillance Active (4 Corridors Monitored)</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
            <button
              type="button"
              onClick={resetToBaseline}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-2"
              title="Reset all corridors to pristine baseline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Fleet Baseline</span>
            </button>

            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs transition flex items-center gap-2 shadow-md"
            >
              <span>Switch to Traveler View</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Controller Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-2xl shadow-xs overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('surveillance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'surveillance'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Activity className="w-4 h-4 text-brand-400" />
          <span>Corridor & Fleet Surveillance</span>
        </button>

        <button
          onClick={() => setActiveTab('trustshield')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'trustshield'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>TrustShield Quarantine & Incidents ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('simulation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'simulation'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span>Weather Digital Twin Stress Test</span>
        </button>

        <button
          onClick={() => setActiveTab('broadcast')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'broadcast'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Radio className="w-4 h-4 text-amber-400" />
          <span>Emergency Dispatch Console</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'telemetry'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          <span>Database & System Health</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CORRIDOR & FLEET SURVEILLANCE */}
      {/* ========================================================================= */}
      {activeTab === 'surveillance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900">Active Metropolitan Travel Corridors</h2>
              <p className="text-xs text-slate-500 font-medium">Real-time status, traveler density, and accessibility health across corridors.</p>
            </div>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              Auto-updating via shared backend state
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {corridors.map((c) => (
              <div
                key={c.id}
                className={`p-5 rounded-3xl border bg-white shadow-xs transition hover:shadow-md ${
                  c.status === 'AT_RISK'
                    ? 'border-rose-300 ring-2 ring-rose-500/10'
                    : c.status === 'MONITORING'
                    ? 'border-amber-300'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
                      {c.id}
                    </span>
                    <h3 className="text-base font-black text-slate-900">{c.name}</h3>
                  </div>
                  <div className="flex flex-col items-end">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        c.status === 'AT_RISK'
                          ? 'bg-rose-100 text-rose-800'
                          : c.status === 'MONITORING'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-black text-slate-900 mt-1">
                      Health: <span className={c.score < 80 ? 'text-rose-600' : 'text-emerald-600'}>{c.score}%</span>
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                    <span className="text-slate-500">Traveler Density:</span>
                    <span className="font-bold text-slate-800">{c.activeTravelers} active travelers</span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                    <span className="text-slate-500">Accessibility Needs:</span>
                    <span className="font-bold text-slate-700">{c.mobilityBreakdown}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-slate-700">
                    <span className="font-bold text-slate-900 block mb-0.5">Corridor Advisory:</span>
                    <span>{c.alert}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Corridor Risk: <strong>{c.riskLevel}</strong></span>
                  <Link
                    to="/operator"
                    className="text-xs font-extrabold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                  >
                    <span>Detailed Fleet Telemetry</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRUSTSHIELD QUARANTINE & INCIDENTS */}
      {/* ========================================================================= */}
      {activeTab === 'trustshield' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">TrustShield Incident Moderation Queue</h2>
              <p className="text-xs text-slate-500 font-medium">
                Authoritative verification desk for community reports, Sybil attack filtration, and DAG cascade propagation.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadIncidents}
                disabled={isLoadingIncidents}
                className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 bg-white"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingIncidents ? 'animate-spin' : ''}`} />
                <span>Refresh Queue</span>
              </button>
            </div>
          </div>

          {actionFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionFeedback.text}</span>
            </div>
          )}

          {/* Test Scenario Simulators */}
          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black text-slate-900 block">TrustShield Attack & Evidence Testing:</span>
              <span className="text-[11px] text-slate-500 font-medium">Inject synthetic attack vectors or corroboration pipelines into the queue.</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  await simulateCommunityScenario('SCENARIO_BOT_FLOOD');
                  await loadIncidents();
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition shadow-2xs"
              >
                Inject Sybil Bot Flood (Test Quarantine)
              </button>
              <button
                type="button"
                onClick={async () => {
                  await simulateCommunityScenario('SCENARIO_INDEPENDENT_CONFIRMATIONS');
                  await loadIncidents();
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-700 text-xs font-bold hover:bg-blue-50 transition shadow-2xs"
              >
                Inject Independent Corroborations
              </button>
              <button
                type="button"
                onClick={async () => {
                  await simulateCommunityScenario('SCENARIO_AUTHORITY_CONFIRM');
                  await loadIncidents();
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-50 transition shadow-2xs"
              >
                Inject Authority Verified Confirmation
              </button>
            </div>
          </div>

          {/* Incidents List */}
          <div className="space-y-4">
            {incidents.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                <p className="font-bold text-slate-700 text-sm">No Active Incidents in Queue</p>
                <p className="text-xs text-slate-400 mt-1">All travel corridors are operating normally.</p>
              </div>
            ) : (
              incidents.map((inc) => {
                const decision = inc.decision || inc.scores?.decision || 'WARN';
                const isQuarantined = decision === 'QUARANTINE';
                const isAdapted = decision === 'ADAPT';
                const spamScore = inc.scores?.spamScore ?? inc.reports?.[0]?.spamScore ?? 0.05;
                const attackRisk = inc.independenceAnalysis?.attackRiskScore ?? inc.scores?.attackRiskScore ?? 0.08;
                const confidence = inc.scores?.actionConfidence ?? 0.75;

                return (
                  <div
                    key={inc.id}
                    className={`p-5 rounded-3xl border bg-white shadow-xs transition ${
                      isQuarantined
                        ? 'border-rose-200 bg-rose-50/20'
                        : isAdapted
                        ? 'border-brand-300 bg-brand-50/20 ring-1 ring-brand-500/20'
                        : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            Resource: {inc.resourceId}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isQuarantined
                                ? 'bg-rose-100 text-rose-800'
                                : isAdapted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Decision: {decision}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            Status: {inc.status}
                          </span>
                        </div>
                        <h3 className="text-base font-black text-slate-900">
                          {inc.title || inc.description || `Incident on Corridor ${inc.resourceId}`}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {inc.description || 'Community reported accessibility or route disruption.'}
                        </p>
                      </div>

                      {/* Evidence Metrics */}
                      <div className="flex flex-wrap sm:flex-col items-end gap-1.5 shrink-0 text-xs">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                          Confidence: <strong>{Math.round(confidence * 100)}%</strong>
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          attackRisk > 0.4 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}>
                          Sybil Risk: <strong>{Math.round(attackRisk * 100)}%</strong>
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          Reports: {inc.reports?.length || 1}
                        </span>
                      </div>
                    </div>

                    {/* Controller Actions Toolbar */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-[11px] text-slate-500 font-medium">
                        Last reported: {new Date(inc.lastReportedAt || inc.createdAt || Date.now()).toLocaleTimeString()}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAuthorityAction(inc.id, 'CONFIRM_ADAPT')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition flex items-center gap-1.5 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Confirm & Adapt Network</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAuthorityAction(inc.id, 'QUARANTINE_SPAM')}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-extrabold text-xs transition flex items-center gap-1.5"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Quarantine as Attack</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAuthorityAction(inc.id, 'DOWNGRADE_WARN')}
                          className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold text-xs transition"
                        >
                          Downgrade to Advisory
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAuthorityAction(inc.id, 'RESOLVE')}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                        >
                          Mark Cleared
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WEATHER DIGITAL TWIN STRESS TEST */}
      {/* ========================================================================= */}
      {activeTab === 'simulation' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">Weather-Driven AI Digital Twin Simulation</h2>
            <p className="text-xs text-slate-500 font-medium">
              Simulate severe environmental disruptions to test how WAYFARER automatically adapts wheelchair routing, walking tolerances, and DAG dwell times.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Scenario 1: Cloudburst */}
            <div className="p-5 rounded-3xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CloudRain className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-blue-950">Monsoon Cloudburst</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  85 mm/hr downpour. Triggers curb waterlogging (&gt;20mm), sidewalk inundation, and pedestrian transit delays across Corridor S3.
                </p>
              </div>
              <button
                type="button"
                disabled={simRunning}
                onClick={() => handleRunSimulation('CLOUDBURST')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-md shadow-blue-600/20"
              >
                {simRunning ? 'Executing Simulation...' : 'Simulate Cloudburst Impact'}
              </button>
            </div>

            {/* Scenario 2: Coastal Storm Surge */}
            <div className="p-5 rounded-3xl border border-indigo-200 bg-gradient-to-b from-indigo-50/70 to-white flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Wind className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-indigo-950">Gale Storm Surge</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  70 km/h coastal winds. Suspends harbor ferries, blocks tree-lined heritage walkways, and triggers DAG route substitution.
                </p>
              </div>
              <button
                type="button"
                disabled={simRunning}
                onClick={() => handleRunSimulation('STORM_SURGE')}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition shadow-md shadow-indigo-600/20"
              >
                {simRunning ? 'Executing Simulation...' : 'Simulate Storm Surge'}
              </button>
            </div>

            {/* Scenario 3: Heatwave */}
            <div className="p-5 rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-amber-950">Severe Heat Stress</h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  41°C ambient temperature. Shaded/covered walkway requirements strictly enforced; max walk limits compressed for seniors.
                </p>
              </div>
              <button
                type="button"
                disabled={simRunning}
                onClick={() => handleRunSimulation('HEATWAVE')}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs transition shadow-md shadow-amber-600/20"
              >
                {simRunning ? 'Executing Simulation...' : 'Simulate Heatwave Impact'}
              </button>
            </div>
          </div>

          {/* Simulation Output Card */}
          {simOutput && (
            <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Digital Twin Stress Test Results: {simOutput.scenario}</span>
                </h3>
                <span className="text-xs font-bold text-slate-400">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Simulation event injected into DAG cascade engine. Traveler routes automatically evaluated for accessibility compliance and weather-adjusted scoring.
              </p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[11px] text-slate-800 overflow-x-auto">
                <pre>{JSON.stringify(simOutput.event, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMERGENCY BROADCAST DISPATCHER */}
      {/* ========================================================================= */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Dispatch Form */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider block mb-1">
                AUTHORITATIVE TRANSMISSION
              </span>
              <h2 className="text-lg font-black text-slate-900">Official Emergency Dispatch Console</h2>
              <p className="text-xs text-slate-500 font-medium">
                Transmits verified emergency advisories directly to all traveler mobile devices and updates TrustShield routing instantly.
              </p>
            </div>

            <form onSubmit={handleDispatchBroadcast} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Target Corridor</label>
                  <select
                    value={broadcastCorridor}
                    onChange={(e) => setBroadcastCorridor(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="S3">Corridor S3: CST Central Hub</option>
                    <option value="S2">Corridor S2: Colaba Causeway</option>
                    <option value="S1">Corridor S1: Marine Drive</option>
                    <option value="ALL">Entire Metropolitan Fleet</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Incident Category</label>
                  <select
                    value={broadcastType}
                    onChange={(e) => setBroadcastType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                  >
                    <option value="ACCESSIBILITY_ISSUE">Elevator / Ramp Outage</option>
                    <option value="WEATHER_SEVERE">Flash Flooding / Cloudburst</option>
                    <option value="PLATFORM_CLOSURE">Transit Platform Stoppage</option>
                    <option value="SAFETY_HAZARD">Pedestrian Crowd Surge</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700">Severity Rating</label>
                  <span className="text-xs font-black text-rose-600">{Math.round(broadcastSeverity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="1.0"
                  step="0.05"
                  value={broadcastSeverity}
                  onChange={(e) => setBroadcastSeverity(e.target.value)}
                  className="w-full accent-rose-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Broadcast Headline</label>
                <input
                  type="text"
                  required
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="e.g. CST Elevator 3 Offline - Step-Free Reroute via Ramp B"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Actionable Traveler Guidance</label>
                <textarea
                  required
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="e.g. Wheelchair travelers must divert to Route C via Northern Concourse. Station marshals stationed on site."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-rose-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30"
              >
                <Send className="w-4 h-4" />
                <span>{isBroadcasting ? 'Broadcasting...' : 'Dispatch Emergency Broadcast'}</span>
              </button>
            </form>
          </div>

          {/* Broadcast History */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-4 flex flex-col">
            <h2 className="text-base font-black text-slate-900">Broadcast Transmission Log</h2>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[460px]">
              {broadcastHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-2xl">
                  No emergency broadcasts dispatched during this session.
                </div>
              ) : (
                broadcastHistory.map((bc) => (
                  <div key={bc.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-rose-700">{bc.title}</span>
                      <span className="text-[10px] text-slate-400">{bc.time}</span>
                    </div>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{bc.message}</p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-bold">
                      <span>Corridor: {bc.corridorId}</span>
                      <span>•</span>
                      <span>Severity: {Math.round(bc.severity * 100)}%</span>
                      <span>•</span>
                      <span className="text-emerald-600">CONFIRMED</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SYSTEM & DATABASE TELEMETRY */}
      {/* ========================================================================= */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-black text-slate-900">System Telemetry & Database Security</h2>
            <p className="text-xs text-slate-500 font-medium">Verified local MongoDB persistence and cryptographic verification controls.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* MongoDB Health */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Database Engine</h3>
              <p className="text-xs text-slate-500 font-medium">MongoDB Local Service / Atlas Cluster</p>
              <div className="pt-2 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">URI:</span>
                  <span className="text-slate-800 font-bold">mongodb://127.0.0.1:27017</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Database:</span>
                  <span className="text-slate-800 font-bold">wayfarer</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-600 font-bold">CONNECTED</span>
                </div>
              </div>
            </div>

            {/* Authentication & RBAC */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">RBAC Enforcement</h3>
              <p className="text-xs text-slate-500 font-medium">Role-Based Access Control Active</p>
              <div className="pt-2 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Role:</span>
                  <span className="text-rose-600 font-bold">CONTROLLER</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">JWT Token:</span>
                  <span className="text-slate-800 font-bold">HMAC-SHA256 (Signed)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Password Hashing:</span>
                  <span className="text-slate-800 font-bold">bcrypt (12 rounds)</span>
                </div>
              </div>
            </div>

            {/* Privacy Controls */}
            <div className="p-5 rounded-3xl border border-slate-200 bg-white space-y-2.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900">Location Privacy</h3>
              <p className="text-xs text-slate-500 font-medium">Differential Privacy & TTL Redaction</p>
              <div className="pt-2 text-xs font-mono space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fuzzing Grid:</span>
                  <span className="text-slate-800 font-bold">~1.1km Grid (2 Decimals)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ephemeral Shares:</span>
                  <span className="text-slate-800 font-bold">Auto-Expire 30m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Audit Logging:</span>
                  <span className="text-emerald-600 font-bold">Strict Redaction Active</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}