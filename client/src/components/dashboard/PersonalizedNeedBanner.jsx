import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Accessibility,
  Footprints,
  Umbrella,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useJourney } from '../../context/JourneyContext.jsx';

export default function PersonalizedNeedBanner() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const { journeyState, setJourneyState } = useJourney();

  const traveler = journeyState?.traveler || {};
  const mobility = traveler.mobility || 'standard';
  const stairsAllowed = traveler.stairsAllowed !== undefined ? traveler.stairsAllowed : true;
  const avoidStairs = !stairsAllowed;
  const preferShade = Boolean(traveler.preferShade);
  const maxWalkingDistanceMeters = traveler.maxWalkingDistanceMeters || 1000;

  const [isUpdating, setIsUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Quick toggle helper that updates both journey state and database
  const handleQuickConstraintUpdate = async (patch) => {
    setIsUpdating(true);

    // 1. Update in-memory Journey State immediately
    if (setJourneyState) {
      setJourneyState((prev) => ({
        ...prev,
        traveler: {
          ...prev.traveler,
          ...patch
        }
      }));
    }

    // 2. Persist to MongoDB if user is authenticated
    if (isAuthenticated && updateProfile) {
      try {
        await updateProfile({
          travelerProfile: {
            mobility: patch.mobility !== undefined ? patch.mobility : mobility,
            stairsAllowed: patch.stairsAllowed !== undefined ? patch.stairsAllowed : stairsAllowed,
            needsElevator: patch.stairsAllowed !== undefined ? !patch.stairsAllowed : traveler.needsElevator,
            maxWalkingDistanceMeters: patch.maxWalkingDistanceMeters !== undefined ? patch.maxWalkingDistanceMeters : maxWalkingDistanceMeters,
            preferShade: patch.preferShade !== undefined ? patch.preferShade : preferShade,
            safetyPriority: traveler.safetyPriority || 'high',
            crowdTolerance: traveler.crowdTolerance || 'medium'
          }
        });
        setSuccessToast('Preferences saved to your profile in database');
        setTimeout(() => setSuccessToast(null), 3000);
      } catch (err) {
        console.warn('Failed to persist quick toggle to DB:', err);
      }
    }

    setIsUpdating(false);
  };

  const getProfileMeta = () => {
    switch (mobility) {
      case 'wheelchair':
        return {
          icon: '♿',
          badge: 'Wheelchair Adaptive Mode',
          accentBorder: 'border-blue-300 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white',
          badgeBg: 'bg-blue-600 text-white',
          desc: 'Zero-step ramp routing, elevator availability verification, curb waterlogging monitoring (<20mm), and wide pedestrian passage guaranteed.',
          features: [
            'Zero-step ramp routing',
            'Elevator verified paths',
            'Curb waterlogging alerts (<20mm)',
            '600m gentle walk limit'
          ]
        };
      case 'elderly':
        return {
          icon: '🧓',
          badge: 'Senior Safe Mode',
          accentBorder: 'border-amber-300 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white',
          badgeBg: 'bg-amber-600 text-white',
          desc: 'Gentle pacing, low walking distances, shaded/covered walkways prioritized, and slip-hazard warnings on wet polished surfaces.',
          features: [
            'Gentle pace (≤400m walk)',
            'Covered/shaded walkway bias',
            'Slip risk warnings on wet tiles',
            'Minimal stairs route scoring'
          ]
        };
      case 'visually_impaired':
        return {
          icon: '👁️',
          badge: 'Vision Assist Mode',
          accentBorder: 'border-purple-300 bg-gradient-to-r from-purple-50/90 via-violet-50/50 to-white',
          badgeBg: 'bg-purple-600 text-white',
          desc: 'Tactile paving corridors, audio copilot alerts, crosswalk beacon synchronization, and strict high-safety corridor scoring.',
          features: [
            'Tactile paving preference',
            'Audio & speech copilot ready',
            'Signalized crossing priority',
            'High-contrast alert prompts'
          ]
        };
      default:
        return {
          icon: '🚶',
          badge: 'Standard Multimodal Mode',
          accentBorder: 'border-slate-200 bg-gradient-to-r from-slate-50 via-white to-slate-50',
          badgeBg: 'bg-slate-800 text-white',
          desc: 'Optimal multi-modal speed, dynamic weather resilience, stairs allowed, and balanced walking radius.',
          features: [
            'Dynamic multimodal routing',
            'Real-time weather resilience',
            'Stairs permitted',
            'Standard 1.2km walk buffer'
          ]
        };
    }
  };

  const meta = getProfileMeta();

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border shadow-xs transition-all ${meta.accentBorder}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* Left: Traveler Status & Active Adaptive Mode */}
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center text-2xl shrink-0">
            {meta.icon}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wide ${meta.badgeBg}`}>
                {meta.badge}
              </span>
              {isAuthenticated && (
                <span className="text-[11px] font-bold text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                  User: {user?.name || user?.email}
                </span>
              )}
              {successToast && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 animate-in fade-in flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {successToast}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 font-medium max-w-2xl leading-relaxed">
              {meta.desc}
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {meta.features.map((feat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs"
                >
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                  <span>{feat}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Quick Personalization Toggles */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 bg-white/90 p-3 rounded-2xl border border-slate-200 shadow-2xs shrink-0 self-start lg:self-center">
          
          {/* Avoid Stairs Toggle */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleQuickConstraintUpdate({ stairsAllowed: avoidStairs })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              avoidStairs
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle zero-step / avoid stairs routing constraint"
          >
            <span className="w-2 h-2 rounded-full bg-current"></span>
            <span>{avoidStairs ? 'Avoid Stairs: ON' : 'Stairs Allowed'}</span>
          </button>

          {/* Prefer Shade Toggle */}
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => handleQuickConstraintUpdate({ preferShade: !preferShade })}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
              preferShade
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
            title="Prioritize shaded & covered pedestrian walkways"
          >
            <Umbrella className="w-3.5 h-3.5 text-amber-600" />
            <span>{preferShade ? 'Shaded Paths' : 'Any Path'}</span>
          </button>

          {/* Max Walk Distance */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl text-xs font-semibold text-slate-700">
            <Footprints className="w-3.5 h-3.5 text-brand-600" />
            <select
              value={maxWalkingDistanceMeters}
              disabled={isUpdating}
              onChange={(e) => handleQuickConstraintUpdate({ maxWalkingDistanceMeters: Number(e.target.value) })}
              className="bg-transparent text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer"
            >
              <option value="400">400m</option>
              <option value="600">600m</option>
              <option value="800">800m</option>
              <option value="1200">1.2km</option>
              <option value="2500">2.5km</option>
            </select>
          </div>

          {/* Link to Full Profile Settings */}
          <Link
            to="/profile"
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Configure Full Accessibility Profile"
          >
            <Sliders className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}