import React, { useState } from 'react';
import { PRESET_JOURNEYS } from '../data/mockData.js';
import { Sparkles, MapPin, Calendar, Users, Plus, X, ChevronDown, ChevronUp, ArrowRight, Shield, Accessibility, Flame } from 'lucide-react';

export default function PlanJourneyView({ onUnderstandJourney, isLoading }) {
  const defaultPreset = PRESET_JOURNEYS[0];

  const [promptText, setPromptText] = useState(defaultPreset.prompt);
  const [showStructuredFields, setShowStructuredFields] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);

  // Structured form inputs
  const [origin, setOrigin] = useState(defaultPreset.origin);
  const [destination, setDestination] = useState(defaultPreset.destination);
  const [startDate, setStartDate] = useState("2026-09-10");
  const [endDate, setEndDate] = useState("2026-09-12");
  const [durationDays, setDurationDays] = useState(defaultPreset.durationDays);
  const [travelerCount, setTravelerCount] = useState(defaultPreset.travelerCount);
  const [travelerName, setTravelerName] = useState(defaultPreset.travelerName);
  
  // Custom stops tags
  const [customStops, setCustomStops] = useState([
    { name: "Grand Panjim Hotel", type: "stay", day: 1 },
    { name: "Fort Aguada", type: "attraction", day: 2 },
    { name: "Candolim Beach", type: "attraction", day: 2 },
    { name: "Mapusa Local Market", type: "experience", day: 2 }
  ]);
  const [newStopName, setNewStopName] = useState("");
  const [newStopType, setNewStopType] = useState("attraction");

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setPromptText(preset.prompt);
    setOrigin(preset.origin);
    setDestination(preset.destination);
    setDurationDays(preset.durationDays);
    setTravelerCount(preset.travelerCount);
    setTravelerName(preset.travelerName);
  };

  const handleAddStop = (e) => {
    e.preventDefault();
    if (!newStopName.trim()) return;
    setCustomStops([...customStops, { name: newStopName.trim(), type: newStopType, day: 2 }]);
    setNewStopName("");
  };

  const handleRemoveStop = (index) => {
    setCustomStops(customStops.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = {
      origin,
      destination,
      startDate,
      endDate,
      durationDays: Number(durationDays),
      travelerCount: Number(travelerCount),
      travelerName,
      customStops
    };
    onUnderstandJourney(promptText, formData);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      
      {/* Hero Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-brand-700 text-xs font-bold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>Adaptive Journey Intelligence — Continuous Journey Orchestration</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
          What does your journey look like?
        </h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-normal">
          Describe your entire trip naturally. WAYFARER understands your complete itinerary, personalizes factor weights to your mobility needs, and adapts as reality changes.
        </p>
      </div>

      {/* Preset Quick Select Chips */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Demo Presets & Scenarios:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESET_JOURNEYS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`p-3 rounded-xl border text-left transition ${
                selectedPresetId === preset.id
                  ? 'border-brand-500 bg-brand-50/70 shadow-sm ring-2 ring-brand-400'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-900">{preset.title}</span>
              </div>
              <p className="text-[11px] text-brand-700 font-semibold">{preset.badge}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Journey Form Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Natural Language Prompt Area */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-900">
                Tell WAYFARER what you want to do:
              </label>
              <span className="text-xs text-slate-500 font-medium">
                Natural-language trip & mobility description
              </span>
            </div>
            <div className="relative">
              <textarea
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition leading-relaxed"
                placeholder="Example: I'm traveling alone from Pune to Goa for 3 days. I'm using a wheelchair, cannot use stairs, prefer safer routes, dislike crowded places, and want to visit Fort Aguada, a beach, and a local market..."
              />
            </div>
          </div>

          {/* Collapsible Structured Fields */}
          <div className="border border-slate-100 rounded-xl bg-slate-50/50 p-4">
            <button
              type="button"
              onClick={() => setShowStructuredFields(!showStructuredFields)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900"
            >
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-600" />
                Structured Trip Attributes (Origin, Dates, Custom Stops)
              </span>
              {showStructuredFields ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showStructuredFields && (
              <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Origin Point</label>
                    <input
                      type="text"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Final Destination</label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Travelers Count</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={travelerCount}
                      onChange={(e) => setTravelerCount(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Custom Stops */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-2">Optional Stops & Highlights</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {customStops.map((stop, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-50 border border-brand-200 text-brand-800 text-xs rounded-lg font-medium"
                      >
                        <span>{stop.name}</span>
                        <span className="text-[10px] bg-brand-200 px-1 py-0.2 rounded text-brand-900">Day {stop.day}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(idx)}
                          className="hover:text-rose-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a stop (e.g. Fort Aguada, Candolim Beach)..."
                      value={newStopName}
                      onChange={(e) => setNewStopName(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-brand-500"
                    />
                    <select
                      value={newStopType}
                      onChange={(e) => setNewStopType(e.target.value)}
                      className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="attraction">Attraction</option>
                      <option value="stay">Stay</option>
                      <option value="experience">Experience</option>
                      <option value="transport">Transport</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleAddStop}
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit CTA */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gradient-to-r from-brand-600 via-brand-700 to-navy-800 text-white rounded-xl font-bold text-base shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 hover:scale-[1.005] active:scale-[0.995] transition-all flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>AI Parsing Trip & Traveler Profile...</span>
                </>
              ) : (
                <>
                  <span>UNDERSTAND JOURNEY</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Feature Highlights Grid */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
            <Accessibility className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">Inclusive Mobility</h4>
          <p className="text-[11px] text-slate-500">
            Synthesizes step-free paths, ramp gradients, and elevator dependencies.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center mb-2">
            <Shield className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">Safety First</h4>
          <p className="text-[11px] text-slate-500">
            Multi-factor scoring prioritizes well-lit, actively monitored corridors.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-2">
            <Sparkles className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-900 mb-1">Live Adaptation</h4>
          <p className="text-[11px] text-slate-500">
            Re-evaluates affected segments and checks downstream cascade effects.
          </p>
        </div>
      </div>

    </div>
  );
}
