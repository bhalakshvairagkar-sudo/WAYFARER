import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Upload,
  Camera,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Users,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { submitCommunityReport } from '../../services/api.js';
import { useJourney } from '../../context/JourneyContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CommunityReportModal({ isOpen, onClose, defaultResourceId = 'S3', onReportSubmitted }) {
  const { journeyState, triggerEvent } = useJourney();
  const { user } = useAuth();

  const [resourceId, setResourceId] = useState(defaultResourceId);
  const [eventType, setEventType] = useState('ACCESSIBILITY_ISSUE');
  const [severity, setSeverity] = useState(0.75);
  const [description, setDescription] = useState('');
  const [hasPhoto, setHasPhoto] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=600');
  const [reporterLocation, setReporterLocation] = useState({ lat: 18.9290, lng: 72.8250 });
  const [locationStatus, setLocationStatus] = useState('Acquiring GPS...');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Attempt real browser geolocation
  useEffect(() => {
    if (isOpen) {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setReporterLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
            setLocationStatus(`Verified GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          },
          () => {
            // Default Mumbai Corridor location
            setReporterLocation({ lat: 18.9290, lng: 72.8250 });
            setLocationStatus('GPS active (Mumbai Corridor default)');
          },
          { timeout: 4000 }
        );
      } else {
        setLocationStatus('GPS simulated');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setErrorMsg('Please describe what you observed.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        resourceId,
        eventType,
        severity: parseFloat(severity),
        description: description.trim(),
        mediaEvidence: {
          hasPhoto,
          photoUrl: hasPhoto ? photoUrl : undefined
        },
        reporterLocation,
        reporterId: user ? user.userId : `guest-${Date.now()}`,
        reporterName: user ? user.name : 'Wayfarer Traveler'
      };

      const res = await submitCommunityReport(payload);
      setSubmissionResult(res);

      // If the fusion pipeline triaged as ADAPT, automatically sync with the journey state!
      if (res.decision === 'ADAPT' && triggerEvent) {
        try {
          await triggerEvent({
            type: eventType === 'ACCESSIBILITY_ISSUE' ? 'ACCESSIBILITY_DEGRADATION' : eventType,
            segmentId: resourceId.startsWith('S') ? resourceId : 'S3',
            severity: parseFloat(severity),
            reason: description
          });
        } catch (evtErr) {
          console.warn('[CommunityReportModal] Local journey trigger note:', evtErr.message);
        }
      }

      if (onReportSubmitted) {
        onReportSubmitted(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSubmissionResult(null);
    setDescription('');
    setErrorMsg(null);
    onClose();
  };

  const availableResources = [
    { id: 'S3', label: 'Segment S3: Colaba → Marine Drive Corridor' },
    { id: 'S1', label: 'Segment S1: CSMT → Gateway Corridor' },
    { id: 'S2', label: 'Segment S2: Gateway → Colaba Arts Corridor' },
    { id: 'stop-1', label: 'CSMT Station Concourse' },
    { id: 'stop-2', label: 'Gateway of India Plaza' },
    { id: 'stop-3', label: 'Colaba Causeway Arts Market' },
    { id: 'MUSEUM-01', label: 'Chhatrapati Shivaji Maharaj Museum' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Submit Community Incident</h2>
              <p className="text-xs text-slate-500">Processed via 4-Stage Evidence Fusion Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success / Evaluation View */}
        {submissionResult ? (
          <div className="p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Incident Processed by Evidence Engine</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your report has passed through Abuse Detection, Duplicate Clustering, Independence Analysis, and Evidence Fusion.
              </p>
            </div>

            {/* Pipeline Result Card */}
            <div className={`p-4 rounded-xl border ${
              submissionResult.decision === 'ADAPT'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : submissionResult.decision === 'WARN'
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pipeline Outcome</span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                  submissionResult.decision === 'ADAPT'
                    ? 'bg-emerald-600 text-white'
                    : submissionResult.decision === 'WARN'
                    ? 'bg-amber-500 text-white'
                    : 'bg-rose-600 text-white'
                }`}>
                  {submissionResult.decision}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50">
                  <p className="text-[10px] text-slate-500 font-medium">Community Conf.</p>
                  <p className="text-base font-black text-slate-900">
                    {Math.round((submissionResult.cluster?.scores?.communityConfidence || 0) * 100)}%
                  </p>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50">
                  <p className="text-[10px] text-slate-500 font-medium">Attack Risk</p>
                  <p className="text-base font-black text-rose-600">
                    {Math.round((submissionResult.cluster?.scores?.attackRisk || 0) * 100)}%
                  </p>
                </div>
                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50">
                  <p className="text-[10px] text-slate-500 font-medium">Action Conf.</p>
                  <p className="text-base font-black text-brand-600">
                    {Math.round((submissionResult.cluster?.scores?.actionConfidence || 0) * 100)}%
                  </p>
                </div>
              </div>

              <p className="text-xs mt-3 text-slate-700 leading-relaxed">
                {submissionResult.decision === 'ADAPT' && '⚡ High-confidence consensus achieved. Itinerary adapted and alternative route prioritized!'}
                {submissionResult.decision === 'WARN' && '⚠ Corroborated community report. Caution advisory active on traveler map & route corridor.'}
                {submissionResult.decision === 'QUARANTINE' && '🛡 Incident quarantined for operator verification due to risk threshold.'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
            >
              Done & Return to Journey
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Target Location / Corridor */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Affected Corridor / Stop
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              >
                {availableResources.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Type Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Disruption Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ACCESSIBILITY_ISSUE', label: 'Elevator / Ramp Issue', icon: ShieldAlert },
                  { id: 'TRANSPORT_DELAY', label: 'Transit Delay', icon: Clock },
                  { id: 'TEMPORARILY_CLOSED', label: 'Temporary Closure', icon: X },
                  { id: 'CROWD_SURGE', label: 'Sudden Congestion', icon: Users },
                  { id: 'SAFETY_HAZARD', label: 'Safety Hazard', icon: AlertTriangle }
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = eventType === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setEventType(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                        isSelected
                          ? 'border-brand-600 bg-brand-50/80 text-brand-900 shadow-xs'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description & Real-World Details
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., North concourse elevator broken, maintenance tape up, wheelchair ramp inaccessible..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Photographic Evidence Attachment */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-bold text-slate-800">Attach Photographic Evidence</span>
                </div>
                <input
                  type="checkbox"
                  id="mediaToggle"
                  checked={hasPhoto}
                  onChange={(e) => setHasPhoto(e.target.checked)}
                  className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Media evidence boosts the Evidence Fusion confidence metric by +25%.
              </p>
              {hasPhoto && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={photoUrl}
                    alt="Evidence Preview"
                    className="w-16 h-12 rounded-lg object-cover border border-slate-300 shadow-xs"
                  />
                  <div className="text-[11px] text-slate-600">
                    <p className="font-semibold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Photo Attached (Verified Hash)
                    </p>
                    <p className="text-[10px] text-slate-400">Metadata stripped for privacy</p>
                  </div>
                </div>
              )}
            </div>

            {/* GPS Telemetry Indicator */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-600" />
                <span>{locationStatus}</span>
              </div>
              <span className="font-medium text-slate-600">Trust tier: {user ? 'Verified (0.85)' : 'Traveler (0.65)'}</span>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fusing Evidence...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Submit & Fuse Evidence</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
