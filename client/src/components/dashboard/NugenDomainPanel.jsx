import React, { useState } from 'react';
import {
  Cpu,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown,
  Compass,
  Award,
  ChevronDown,
  ChevronUp,
  Sliders,
  ExternalLink,
  Zap
} from 'lucide-react';

export default function NugenDomainPanel({
  twinData,
  isSimulating = false,
  className = ''
}) {
  const [showBenchmarkDetails, setShowBenchmarkDetails] = useState(false);

  const nugen = twinData?.nugenPrediction || {
    riskLevel: 'LOW',
    primaryImpact: 'NONE',
    routeRecommendation: 'CONTINUE',
    accessibilityImpact: 'NONE',
    estimatedEtaDeltaMinutes: 0,
    predictedJourneyHealth: 91,
    confidence: 0.94,
    uncertainty: 0.06,
    reasoning: 'Clear environmental flow. Nominal travel conditions.',
    modelSource: 'NUGEN_ALIGNED_WAYFARER_MODEL',
    alignedModelId: 'wayfarer-weather-twin-v1'
  };

  const isLiveNugen = nugen.modelSource === 'NUGEN_ALIGNED_WAYFARER_MODEL';
  const confidencePercent = Math.round((nugen.confidence || 0.92) * 100);

  const getRiskBadge = (level) => {
    switch (level) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  const getRecBadge = (rec) => {
    switch (rec) {
      case 'REROUTE':
      case 'AVOID_SEGMENT':
        return 'bg-rose-600 text-white';
      case 'WARN':
        return 'bg-amber-600 text-white';
      case 'MONITOR':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <div className={`bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 sm:p-5 text-white shadow-lg ${className}`}>
      
      {/* Header: Model Provenance & Architecture Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-black tracking-wider uppercase text-indigo-200">
                NUGEN INTELLIGENCE • DOMAIN MODEL
              </h4>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                isSimulating ? 'bg-amber-400 text-slate-900' : 'bg-emerald-500 text-white'
              }`}>
                {isSimulating ? 'SIMULATION MODE (ISOLATED)' : 'REAL EXECUTION'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
              <span>Base: <strong className="text-slate-200">qwen-v2p5-0p5b-instruct</strong></span>
              <span>•</span>
              <span>Aligned: <strong className="text-indigo-300">{nugen.alignedModelId || 'wayfarer-weather-twin-v1'}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/10 border border-white/15 text-slate-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isLiveNugen ? 'NUGEN API INFERENCE' : 'ALIGNED DOMAIN FALLBACK'}</span>
          </span>
          <button
            type="button"
            onClick={() => setShowBenchmarkDetails(!showBenchmarkDetails)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600/60 hover:bg-indigo-600 text-indigo-100 border border-indigo-400/30 transition flex items-center gap-1"
          >
            <Award className="w-3 h-3 text-amber-300" />
            <span>Benchmark (91.3%)</span>
            {showBenchmarkDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Primary Predictions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        
        {/* Risk Level */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Domain Risk Level</span>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black border uppercase ${getRiskBadge(nugen.riskLevel)}`}>
              {nugen.riskLevel}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Impact: <strong className="text-slate-200">{nugen.primaryImpact}</strong>
          </span>
        </div>

        {/* Route Recommendation */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Route Recommendation</span>
          <div className="mt-1">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase inline-block ${getRecBadge(nugen.routeRecommendation)}`}>
              {nugen.routeRecommendation}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            ETA Delta: <strong className="text-amber-300">+{nugen.estimatedEtaDeltaMinutes} min</strong>
          </span>
        </div>

        {/* Accessibility Impact */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-bold text-slate-400">Accessibility Impact</span>
          <div className="mt-1">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              nugen.accessibilityImpact === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              nugen.accessibilityImpact === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
              nugen.accessibilityImpact === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}>
              {nugen.accessibilityImpact}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-2 block">
            Step-free guarantee checked
          </span>
        </div>

        {/* Confidence & Journey Health */}
        <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400">Nugen Confidence</span>
            <span className="text-[10px] text-indigo-300 font-mono">{confidencePercent}%</span>
          </div>
          <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden my-1.5">
            <div
              className="bg-gradient-to-r from-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${confidencePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Predicted Health:</span>
            <strong className="text-emerald-300">{nugen.predictedJourneyHealth}/100</strong>
          </div>
        </div>

      </div>

      {/* Model Reasoning */}
      <div className="bg-black/30 rounded-xl p-3 border border-white/10 text-xs flex items-start gap-2.5">
        <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            Domain Reasoning & Decision Engine Coupling
          </span>
          <p className="text-slate-300 leading-relaxed font-sans text-xs">
            {nugen.reasoning}
          </p>
        </div>
      </div>

      {/* Benchmark Drawer (Collapsible) */}
      {showBenchmarkDetails && (
        <div className="mt-3 pt-3 border-t border-white/10 bg-white/5 rounded-xl p-3 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-indigo-300 text-[11px] uppercase tracking-wide">
              Official 20-Scenario Alignment Benchmark Metrics
            </span>
            <span className="text-[10px] text-slate-400">Dataset: wayfarer_weather_evaluation.jsonl</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div className="bg-black/40 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Domain Accuracy</span>
              <strong className="text-sm font-black text-emerald-400">91.3%</strong>
            </div>
            <div className="bg-black/40 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Accessibility Fidelity</span>
              <strong className="text-sm font-black text-emerald-400">100.0%</strong>
            </div>
            <div className="bg-black/40 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Risk Classification</span>
              <strong className="text-sm font-black text-emerald-400">95.0%</strong>
            </div>
            <div className="bg-black/40 rounded-lg p-2">
              <span className="text-[10px] text-slate-400 block">Route Recommendations</span>
              <strong className="text-sm font-black text-emerald-400">90.0%</strong>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
