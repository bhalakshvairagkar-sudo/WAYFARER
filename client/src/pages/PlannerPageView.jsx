import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Trash2,
  Navigation,
  Compass,
  ArrowRight,
  Sparkles,
  Layers,
  User,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react';
import { useJourney } from '../context/JourneyContext.jsx';
import PlaceSearchInput from '../components/common/PlaceSearchInput.jsx';
import GoogleMap from '../components/common/GoogleMap.jsx';

export default function PlannerPageView() {
  const navigate = useNavigate();
  const { journeyState, planNewJourney, isLoading } = useJourney();

  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]);

  const [selectedRouteId, setSelectedRouteId] = useState('B');
  const [previewSegment, setPreviewSegment] = useState(null);

  // Update preview segment when origin, destination, or stops change
  useEffect(() => {
    async function loadPreview() {
      if (origin && destination) {
        try {
          const { calculateRoutes } = await import('../services/routeService.js');
          const routes = await calculateRoutes({
            origin,
            destination,
            waypoints: stops,
            travelerProfile: journeyState.traveler || {}
          });
          
          const mappedRoutes = routes.map((r, i) => ({
             ...r,
             score: Math.round((r.accessibility * 0.4) + (r.safety * 0.3) + (r.convenience * 0.3)), // approximate
             isRecommended: i === 0,
          }));

          setPreviewSegment({
            id: 'S_PREVIEW',
            origin: origin.name,
            originLat: origin.lat,
            originLng: origin.lng,
            destination: destination.name,
            destinationLat: destination.lat,
            destinationLng: destination.lng,
            candidateRoutes: mappedRoutes
          });

          if (mappedRoutes.length > 0 && !mappedRoutes.find(mr => mr.id === selectedRouteId)) {
            setSelectedRouteId(mappedRoutes[0].id);
          }
        } catch (err) {
          console.error('[Planner] Preview route calculation failed:', err);
        }
      }
    }
    
    // Add a small debounce
    const timeoutId = setTimeout(loadPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [origin, destination, stops, journeyState.traveler]);

  const handleAddStop = () => {
    setStops([
      ...stops,
      {
        id: `stop_way_${Date.now()}`,
        name: 'New Custom Stop',
        formattedAddress: 'Accessible Zone',
        lat: (origin.lat + destination.lat) / 2 + (Math.random() - 0.5) * 0.02,
        lng: (origin.lng + destination.lng) / 2 + (Math.random() - 0.5) * 0.02,
        type: 'attraction'
      }
    ]);
  };

  const handleRemoveStop = (idx) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  const handleUpdateStopPlace = (idx, placeDetails) => {
    if (!placeDetails) return;
    const updated = [...stops];
    updated[idx] = {
      ...updated[idx],
      name: placeDetails.name,
      formattedAddress: placeDetails.formattedAddress,
      lat: placeDetails.lat,
      lng: placeDetails.lng
    };
    setStops(updated);
  };

  const handleGenerateJourney = async () => {
    try {
      await planNewJourney({
        origin,
        destination,
        stops,
        traveler: journeyState.traveler
      });
      navigate('/journey/active');
    } catch (e) {
      console.error('[Planner] Generate error:', e);
      navigate('/journey/active');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-widest block mb-1">
            STEP 2: MULTI-STOP ROUTE OPTIMIZATION
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Journey Planner & Route Architect
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Search places with Google Places, organize accessible waypoints, and let WAYFARER's 5-factor scoring engine evaluate candidate routes.
          </p>
        </div>

        {/* Traveler Summary Chip */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2.5 self-start sm:self-auto">
          <User className="w-4 h-4 text-brand-600" />
          <div className="text-left text-xs">
            <span className="font-bold text-slate-900 block">{journeyState.traveler?.name || 'Aditi'}</span>
            <span className="text-[10px] text-slate-500 capitalize">{journeyState.traveler?.mobility || 'Wheelchair'} • 5-Factor Scored</span>
          </div>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: From/To/Stops (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-soft space-y-4">
            
            {/* Origin Search */}
            <PlaceSearchInput
              label="From (Origin Hub)"
              placeholder="Search origin station, airport, hotel..."
              value={origin}
              onSelectPlace={(p) => p && setOrigin(p)}
            />

            {/* Intermediate Stops */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Itinerary Stops & Waypoints ({stops.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-800 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stop</span>
                </button>
              </div>

              {stops.map((stop, idx) => (
                <div key={stop.id || idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <PlaceSearchInput
                      placeholder={`Stop ${idx + 1} place name...`}
                      value={stop}
                      onSelectPlace={(p) => handleUpdateStopPlace(idx, p)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveStop(idx)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Remove stop"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Destination Search */}
            <PlaceSearchInput
              label="To (Destination Milestone)"
              placeholder="Search final destination or accommodation..."
              value={destination}
              onSelectPlace={(p) => p && setDestination(p)}
            />

            {/* Generate Button */}
            <div className="pt-3">
              <button
                type="button"
                disabled={isLoading || !origin || !destination}
                onClick={handleGenerateJourney}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Generate Adaptive Journey</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* Quick Route Scoring Preview */}
          {previewSegment?.candidateRoutes && (
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-soft text-xs space-y-2">
              <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                Preliminary Candidate Alternatives
              </span>
              <div className="divide-y divide-slate-100">
                {previewSegment.candidateRoutes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className={`py-2 px-2.5 rounded-lg flex items-center justify-between cursor-pointer transition ${
                      r.id === selectedRouteId ? 'bg-emerald-50 text-emerald-950 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                        r.id === selectedRouteId ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {r.id}
                      </span>
                      <span className="truncate">{r.name}</span>
                    </div>
                    <span className="font-extrabold text-xs shrink-0">{r.score}★</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Google Map Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <GoogleMap
            activeSegment={previewSegment}
            selectedRouteId={selectedRouteId}
            onSelectRoute={setSelectedRouteId}
            height="520px"
          />
        </div>

      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-tight mb-2">Synthesizing Adaptive Journey...</h2>
          <p className="text-sm text-slate-300">Checking route accessibility, calculating crowds, and verifying safety corridors.</p>
        </div>
      )}

    </div>
  );
}
