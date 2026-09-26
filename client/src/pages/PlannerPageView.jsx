import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useAnimation } from 'framer-motion';
import {
  MapPin,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  User,
  Loader2,
  Mic,
  Maximize2
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
  const [description, setDescription] = useState('');

  const [selectedRouteId, setSelectedRouteId] = useState('B');
  const [previewSegment, setPreviewSegment] = useState(null);
  
  // Voice & Bottom Sheet state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sheetState, setSheetState] = useState('half'); // 'collapsed', 'half', 'full'
  const sheetControls = useAnimation();

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
            travelerProfile: journeyState?.traveler || {}
          });
          
          const mappedRoutes = routes.map((r, i) => ({
             ...r,
             score: Math.round((r.accessibility * 0.4) + (r.safety * 0.3) + (r.convenience * 0.3)),
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
    
    const timeoutId = setTimeout(loadPreview, 500);
    return () => clearTimeout(timeoutId);
  }, [origin, destination, stops, journeyState.traveler]);

  // Voice Recognition
  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Browser doesn't support speech recognition.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event) => {
      const speechToText = event.results[0][0].transcript;
      setTranscript(speechToText);
      // For demo purposes, try to parse origins/destinations from voice...
      // Or just fill the prompt textarea if we had one.
      // But we removed the prompt text area in the refactor. Let's just alert.
      alert(`Heard: "${speechToText}". (AI extraction not connected in demo)`);
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleAddStop = () => {
    setStops([
      ...stops,
      {
        id: `stop_way_${Date.now()}`,
        name: 'New Custom Stop',
        formattedAddress: 'Accessible Zone',
        lat: (origin?.lat || 0) + (Math.random() - 0.5) * 0.02,
        lng: (origin?.lng || 0) + (Math.random() - 0.5) * 0.02,
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
        description,
        traveler: journeyState.traveler
      });
      navigate('/journey/active');
    } catch (e) {
      console.error('[Planner] Generate error:', e);
      navigate('/journey/active');
    }
  };

  const formContent = (
    <div className="bg-white rounded-t-3xl sm:rounded-2xl p-5 shadow-soft space-y-4 max-h-[70vh] sm:max-h-none overflow-y-auto w-full">
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-xl font-black text-slate-900">Plan Trip</h2>
        <button 
          onClick={handleMicClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
        >
          <Mic className="w-3.5 h-3.5" />
          {isListening ? 'Listening...' : 'Tell WAYFARER'}
        </button>
      </div>

      {transcript && (
        <div className="bg-slate-100 p-3 rounded-lg text-sm text-slate-700 italic border border-slate-200">
          "{transcript}"
        </div>
      )}

      {/* Journey Description */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
          Journey Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your travel plan — purpose, interests, special needs, duration..."
          rows={3}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition resize-none"
        />
      </div>

      {/* Origin Search */}
      <PlaceSearchInput
        label="From"
        placeholder="Where are you starting?"
        value={origin}
        onSelectPlace={(p) => p && setOrigin(p)}
      />

      {/* Intermediate Stops */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Stops ({stops.length})
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
                placeholder={`Stop ${idx + 1}...`}
                value={stop}
                onSelectPlace={(p) => handleUpdateStopPlace(idx, p)}
              />
            </div>
            <button
              type="button"
              onClick={() => handleRemoveStop(idx)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Destination Search */}
      <PlaceSearchInput
        label="To"
        placeholder="Where are you going?"
        value={destination}
        onSelectPlace={(p) => p && setDestination(p)}
      />

      {/* Generate Button */}
      <div className="pt-3">
        <button
          type="button"
          disabled={isLoading || !origin || !destination}
          onClick={handleGenerateJourney}
          className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-brand-600/25 disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>Calculate Route</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Route Scoring Preview Cards */}
      {previewSegment?.candidateRoutes && (
        <div className="pt-4 border-t border-slate-100 space-y-2 pb-4">
          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
            Alternative Routes
          </span>
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
            {previewSegment.candidateRoutes.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedRouteId(r.id)}
                className={`snap-center shrink-0 w-[200px] p-3 rounded-xl border flex flex-col justify-between cursor-pointer transition ${
                  r.id === selectedRouteId ? 'bg-brand-50 border-brand-300 text-brand-950' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <div>
                  <h4 className="font-bold text-sm truncate">{r.name}</h4>
                  <p className="text-[10px] opacity-80 mt-1">{r.description || 'Standard Path'}</p>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${r.id === selectedRouteId ? 'bg-brand-200 text-brand-800' : 'bg-slate-100'}`}>
                    {r.durationMinutes} min
                  </span>
                  <span className="font-extrabold text-sm">{r.score}★</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative w-full h-[calc(100vh-64px)] sm:h-auto sm:max-w-7xl sm:mx-auto sm:px-4 sm:py-8 flex flex-col sm:flex-row gap-6">
      
      {/* Mobile Map Background (Full Screen) */}
      <div className="absolute inset-0 sm:relative sm:flex-1 sm:h-[600px] z-0 sm:rounded-2xl sm:overflow-hidden sm:shadow-md">
        <GoogleMap
          activeSegment={previewSegment}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
          waypoints={stops.filter(s => s.lat && s.lng)}
          height="100%"
        />
      </div>

      {/* Mobile Bottom Sheet & Desktop Sidebar */}
      <div className="sm:hidden absolute inset-x-0 bottom-0 z-40 pointer-events-none">
        <motion.div 
          className="bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pointer-events-auto"
          initial="half"
          animate={sheetState}
          variants={{
            collapsed: { y: "calc(100% - 100px)" },
            half: { y: "0%" },
            full: { y: "-50vh" }
          }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={(e, { offset, velocity }) => {
            const swipe = offset.y;
            if (swipe < -50) setSheetState('full');
            else if (swipe > 50 && sheetState === 'full') setSheetState('half');
            else if (swipe > 50 && sheetState === 'half') setSheetState('collapsed');
          }}
        >
          {/* Drag Handle */}
          <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing" onClick={() => setSheetState(sheetState === 'collapsed' ? 'half' : sheetState === 'half' ? 'full' : 'collapsed')}>
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>
          {formContent}
        </motion.div>
      </div>

      {/* Desktop static sidebar */}
      <div className="hidden sm:block w-[400px] shrink-0 z-10">
        {formContent}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
          <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-4" />
          <h2 className="text-xl font-bold tracking-tight mb-2">Generating...</h2>
        </div>
      )}
    </div>
  );
}
