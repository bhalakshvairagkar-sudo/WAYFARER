import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  KeyRound,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, authError, setAuthError } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('USER');
  const [mobility, setMobility] = useState('standard');
  const [stairsAllowed, setStairsAllowed] = useState(true);
  const [maxWalkingDistanceMeters, setMaxWalkingDistanceMeters] = useState(1000);
  const [safetyPriority, setSafetyPriority] = useState('high');
  const [crowdTolerance, setCrowdTolerance] = useState('medium');
  const [preferShade, setPreferShade] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleMobilityChange = (newMobility) => {
    setMobility(newMobility);
    if (newMobility === 'wheelchair') {
      setStairsAllowed(false);
      setMaxWalkingDistanceMeters(600);
    } else if (newMobility === 'elderly') {
      setStairsAllowed(false);
      setMaxWalkingDistanceMeters(400);
      setPreferShade(true);
    } else if (newMobility === 'standard') {
      setStairsAllowed(true);
      setMaxWalkingDistanceMeters(1200);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register({
          email,
          password,
          name,
          role,
          travelerProfile: {
            mobility,
            stairsAllowed,
            needsElevator: !stairsAllowed || mobility === 'wheelchair',
            maxWalkingDistanceMeters: Number(maxWalkingDistanceMeters),
            safetyPriority,
            crowdTolerance,
            preferShade
          }
        });
      }
      onClose();
    } catch (err) {
      // Error handled in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {tab === 'login' ? 'Traveler Sign In' : 'Create Secure Account'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {tab === 'login' ? 'Access your saved journeys & location privacy' : 'Personalized to your accessibility & mobility needs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-100/50 p-1 shrink-0">
          <button
            type="button"
            onClick={() => { setTab('login'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setAuthError(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {authError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aditi Sharma"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-brand-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-brand-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-brand-500"
              />
            </div>
            {tab === 'register' && (
              <span className="text-[10px] text-slate-400">Minimum 8 characters</span>
            )}
          </div>

          {tab === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Role / Profile Type</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:border-brand-500 bg-white"
              >
                <option value="USER">Traveler (Standard)</option>
                <option value="EMERGENCY_CONTACT">Emergency Contact</option>
                <option value="TRAVEL_PARTNER">Travel Companion</option>
              </select>
            </div>
          )}

          {tab === 'register' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                  <span>Traveler Mobility & Accessibility Needs</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleMobilityChange('standard')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      mobility === 'standard'
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base">🚶</span>
                    <span className="text-xs font-extrabold text-slate-900">Standard</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Full mobility, stairs permitted</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMobilityChange('wheelchair')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      mobility === 'wheelchair'
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base">♿</span>
                    <span className="text-xs font-extrabold text-slate-900">Wheelchair</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Step-free, elevators required</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMobilityChange('elderly')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      mobility === 'elderly'
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base">🧓</span>
                    <span className="text-xs font-extrabold text-slate-900">Senior</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Gentle pace, low walking distance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleMobilityChange('visually_impaired')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      mobility === 'visually_impaired'
                        ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-base">👁️</span>
                    <span className="text-xs font-extrabold text-slate-900">Visual Aid</span>
                    <span className="text-[10px] text-slate-500 leading-tight">Tactile paths & safety priority</span>
                  </button>
                </div>
              </div>

              {/* Hard Constraints Checklist */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={!stairsAllowed}
                    onChange={(e) => setStairsAllowed(!e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                  />
                  <span>Must avoid stairs (Zero-step / elevators only)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={preferShade}
                    onChange={(e) => setPreferShade(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-3.5 h-3.5"
                  />
                  <span>Prefer shaded & covered walkways</span>
                </label>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-600 font-bold">Max Walking Distance:</span>
                  <select
                    value={maxWalkingDistanceMeters}
                    onChange={(e) => setMaxWalkingDistanceMeters(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                  >
                    <option value="400">400 m (Gentle)</option>
                    <option value="800">800 m (Moderate)</option>
                    <option value="1200">1.2 km (Standard)</option>
                    <option value="2500">2.5 km (Active)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{tab === 'login' ? 'Sign In Securely' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security Badge Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Server-Side RBAC & TLS 1.3 Encryption Active</span>
        </div>
      </div>
    </div>
  );
}
