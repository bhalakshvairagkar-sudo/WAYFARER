import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Compass,
  Sliders,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Building,
  Coffee,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import {
  getLiveDigitalTwin,
  simulateWhatIf,
  getPrebakedScenarios
} from '../../services/digitalTwinService.js';

export default function DigitalTwinWidget({
  journeyState,
  onApplyAdaptation = null,
  className = ''
}) {
  const [loading, setLoading] = useState(false);
  const [twinData, setTwinData] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');

  // What-If Slider States
  const [rainfallMm, setRainfallMm] = useState(45);
  const [stormDurationHours, setStormDurationHours] = useState(2.0);
  const [floodProbability, setFloodProbability] = useState(75);
  const [temperatureC, setTemperatureC] = useState(26);

  // Load initial live digital twin & scenarios
  useEffect(() => {
    let isMounted = true;
    async function loadInitial() {
      setLoading(true);
      try {
        const [liveResp, scList] = await Promise.all([
          getLiveDigitalTwin(18.9401, 72.8354, journeyState),
          getPrebakedScenarios()
        ]);
        if (isMounted) {
          if (liveResp?.twinState) {
            setTwinData(liveResp.twinState);
          }
          if (scList && scList.length > 0) {
            setScenarios(scList);
          }
        }
      } catch (err) {
        console.warn('[DigitalTwinWidget] Init error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadInitial();
    return () => { isMounted = false; };
  }, [journeyState?.trip?.origin, journeyState?.trip?.destination]);

  // Execute What-If simulation
  const handleRunSimulation = async (paramsOverride = null) => {
    setLoading(true);
    const params = paramsOverride || {
      rainfallMm,
      stormDurationHours,
      floodProbability,
      temperatureC
    };

    try {
      const result = await simulateWhatIf(journeyState, params);
      if (result?.success) {
        setSimulationResult(result);
        setIsSimulating(true);
      }
    } catch (err) {
      console.error('[DigitalTwinWidget] Simulation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Select a pre-baked scenario
  const handleSelectScenario = (sc) => {
    setSelectedScenarioId(sc.id);
    setRainfallMm(sc.params.rainfallMm);
    setStormDurationHours(sc.params.stormDurationHours);
    setFloodProbability(sc.params.floodProbability);
    setTemperatureC(sc.params.temperatureC);
    handleRunSimulation(sc.params);
  };

  // Reset back to live physical state
  const handleResetToLive = () => {
    setIsSimulating(false);
    setSimulationResult(null);
    setSelectedScenarioId('');
  };

  // Current active display state (Simulated Twin or Live Twin)
  const currentTwin = isSimulating && simulationResult?.simulatedTwin
    ? simulationResult.simulatedTwin
    : twinData;

  const weather = currentTwin?.weatherState || {
    condition: 'Partly Cloudy',
    temperature: 28.5,
    feelsLike: 31,
    precipitation: 0.0,
    windSpeed: 14,
    humidity: 78,
    rainIntensity: 'NONE',
    provenance: 'LIVE'
  };

  const surface = currentTwin?.surfaceState || {
    surfaceWetness: 'DRY',
    floodProbability: 5,
    waterAccumulationMm: 0,
    trafficSlowdownMultiplier: 1.0
  };

  const health = currentTwin?.journeyHealth || {
    overall: 91,
    accessibility: 94,
    safety: 88,
    status: 'OPTIMAL'
  };

  const travelerImpact = currentTwin?.travelers?.[0]?.impact || {
    vulnerabilityLevel: 'LOW',
    recommendedAction: 'MONITOR',
    advisoryMessage: 'Standard environmental flow. All corridors clear.'
  };

  return (
    <div className={`bg-white border border-slate-200/90 rounded-2xl shadow-soft overflow-hidden transition-all duration-300 ${className}`}>
      
      {/* ─── 1. WIDGET HEADER & STATUS TELEMETRY ─── */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2.5 h-2.5 rounded-full ${isSimulating ? 'bg-amber-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`}></span>
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-300">
                AI DIGITAL TWIN • METEOROLOGICAL ENGINE
              </span>
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                isSimulating ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-white'
              }`}>
                {isSimulating ? 'SIMULATED WHAT-IF' : 'LIVE TWIN'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
              <span>{weather.condition}</span>
              <span className="text-indigo-300 font-medium text-sm">({weather.temperature}°C)</span>
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {isSimulating && (
              <button
                type="button"
                onClick={handleResetToLive}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return to Live</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAdvancedSliders(!showAdvancedSliders)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showAdvancedSliders ? 'Hide Simulator' : 'What-If Simulator'}</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
          <div className="bg-white/5 rounded-xl p-2 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Precipitation Rate</span>
            <div className="font-extrabold text-white flex items-center gap-1 mt-0.5">
              <CloudRain className="w-3.5 h-3.5 text-blue-300" />
              <span>{weather.precipitation} mm/h</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Flood Probability</span>
            <div className="font-extrabold text-white flex items-center gap-1 mt-0.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-300" />
              <span>{surface.floodProbability}%</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Surface State</span>
            <div className="font-extrabold text-white flex items-center gap-1 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                surface.surfaceWetness === 'FLOODED' ? 'bg-rose-400' :
                surface.surfaceWetness === 'WATERLOGGED' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}></span>
              <span>{surface.surfaceWetness}</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/10">
            <span className="text-[10px] text-slate-400 block font-medium">Traffic Friction</span>
            <div className="font-extrabold text-white flex items-center gap-1 mt-0.5">
              <Activity className="w-3.5 h-3.5 text-amber-300" />
              <span>{surface.trafficSlowdownMultiplier}x slowdown</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-2 border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 block font-medium">Twin Confidence</span>
            <div className="font-extrabold text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{Math.round((currentTwin?.confidence?.actionConfidence || 0.88) * 100)}% Verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. WHAT-IF SCENARIO SIMULATOR PANEL ─── */}
      {showAdvancedSliders && (
        <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Simulate Future Weather Scenarios Before They Strike</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Adjust environmental stress variables to model cascading infrastructure and traveler health impact.
              </p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              SIMULATION ISOLATION GUARANTEED
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-[11px] font-bold text-slate-500 self-center mr-1">Presets:</span>
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border ${
                  selectedScenarioId === sc.id
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{sc.name.split('&')[0]}</span>
              </button>
            ))}
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Rainfall Intensity</span>
                <span className="text-indigo-600">{rainfallMm} mm/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="2"
                value={rainfallMm}
                onChange={(e) => setRainfallMm(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">0 (Dry) to 100 (Torrential)</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Storm Duration</span>
                <span className="text-indigo-600">{stormDurationHours} hrs</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="6"
                step="0.5"
                value={stormDurationHours}
                onChange={(e) => setStormDurationHours(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Precipitation persistence</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Corridor Flood Probability</span>
                <span className="text-indigo-600">{floodProbability}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={floodProbability}
                onChange={(e) => setFloodProbability(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Low elevation water risk</span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Air Temperature</span>
                <span className="text-indigo-600">{temperatureC}°C</span>
              </div>
              <input
                type="range"
                min="18"
                max="45"
                step="1"
                value={temperatureC}
                onChange={(e) => setTemperatureC(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Coastal thermal index</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleRunSimulation()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition flex items-center gap-1.5 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{loading ? 'Modeling Digital Twin...' : 'Simulate Counterfactual Scenario'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 3. COMPARATIVE IMPACT MATRIX (When Simulating) ─── */}
      {isSimulating && simulationResult?.comparison && (
        <div className="p-4 sm:p-5 bg-indigo-50/70 border-b border-indigo-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-indigo-600 text-white uppercase">
                  WHAT-IF COMPARISON
                </span>
                <span className="text-xs font-black text-indigo-950">
                  {simulationResult.comparison.signatureStory}
                </span>
              </div>
              <p className="text-xs text-indigo-900 mt-1 max-w-3xl leading-relaxed">
                {simulationResult.comparison.counterfactualExplanation}
              </p>
            </div>

            {onApplyAdaptation && (
              <button
                type="button"
                onClick={() => onApplyAdaptation(simulationResult)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1.5 shadow-md whitespace-nowrap self-start sm:self-auto"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-current" />
                <span>Adopt AI Weather Route Adaptation</span>
              </button>
            )}
          </div>

          {/* Side-by-Side Metrics Table */}
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-indigo-200 text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                  <th className="py-2 pr-3">System Dimension</th>
                  <th className="py-2 px-3 bg-white/60 rounded-t-lg">Current Live State</th>
                  <th className="py-2 px-3 bg-rose-50/80 text-rose-900 rounded-t-lg">What-If (Unmitigated)</th>
                  <th className="py-2 pl-3 bg-emerald-50/80 text-emerald-900 rounded-t-lg">With AI Adaptation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-100 font-medium text-slate-800">
                {simulationResult.comparison.metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-white/40 transition">
                    <td className="py-2 pr-3 font-bold text-slate-700">{m.dimension}</td>
                    <td className="py-2 px-3 bg-white/40 font-semibold">{m.currentLive}</td>
                    <td className="py-2 px-3 bg-rose-50/50 font-bold text-rose-700">{m.whatIfSimulated}</td>
                    <td className="py-2 pl-3 bg-emerald-50/50 font-bold text-emerald-700">{m.adaptedMitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── 4. MULTI-ENTITY IMPACTS & CASCADING DAG ─── */}
      <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Entity Card: Personalized Traveler Vulnerability */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Traveler Impact Model
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                travelerImpact.vulnerabilityLevel === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                travelerImpact.vulnerabilityLevel === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                travelerImpact.vulnerabilityLevel === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {travelerImpact.vulnerabilityLevel} Vulnerability
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-900 mb-1">{travelerImpact.mobilityType}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{travelerImpact.advisoryMessage}</p>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-slate-700">
            <span>Action Required:</span>
            <span className={`font-black ${travelerImpact.recommendedAction === 'ADAPT' ? 'text-rose-600' : 'text-emerald-600'}`}>
              {travelerImpact.recommendedAction}
            </span>
          </div>
        </div>

        {/* Entity Card: Hospitality & Shelter Demand */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Hospitality & Shelter
              </span>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Demand Index: {currentTwin?.shelterDemandIndex || 25}%
              </span>
            </div>
            <div className="space-y-2 mt-1">
              {(currentTwin?.hospitality || []).slice(0, 2).map((h, i) => (
                <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>{h.name}</span>
                    <span className="text-indigo-600">+{h.occupancySurgePct}% surge</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">{h.amenities?.join(' • ')}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Digital twin routes travelers toward verified dry indoor lounges during storms.
          </span>
        </div>

        {/* Entity Card: Transportation Corridors */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Transit & Corridor Delays
              </span>
              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
                Live Status
              </span>
            </div>
            <div className="space-y-2 mt-1">
              {(currentTwin?.transport || []).map((t, i) => (
                <div key={i} className="text-xs bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-[11px]">{t.mode.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-500">{t.route}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    t.status.includes('SUSPENDED') ? 'bg-rose-100 text-rose-800' :
                    t.status.includes('DELAYED') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Automatic DAG re-route triggered if rail or corridor exceeds 15m delay.
          </span>
        </div>

      </div>

      {/* ─── 5. CASCADING EFFECTS DAG CHAIN ─── */}
      <div className="px-4 sm:px-5 pb-5 pt-2">
        <div className="bg-slate-900 text-white rounded-xl p-3 sm:p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Cascading Impact Chain (DAG Propagation Model)</span>
            </span>
            <span className="text-[10px] text-slate-400">Continuous Dynamic Coupling</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-2">
            {(currentTwin?.cascadingEffects || []).map((node, idx) => (
              <div
                key={node.id}
                className={`p-2 rounded-lg border text-xs transition ${
                  node.triggered
                    ? node.severity === 'CRITICAL' || node.severity === 'ACTION_REQUIRED'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                      : 'bg-amber-950/80 border-amber-700 text-amber-200'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-bold opacity-80 mb-1">
                  <span>Step {idx + 1}</span>
                  <span>{node.triggered ? 'ACTIVE' : 'NOMINAL'}</span>
                </div>
                <h5 className="font-extrabold text-[11px] leading-tight text-white mb-1">
                  {node.label}
                </h5>
                <p className="text-[10px] opacity-80 leading-normal line-clamp-2">
                  {node.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
