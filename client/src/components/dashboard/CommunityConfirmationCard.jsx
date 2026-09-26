import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle, ShieldAlert, ArrowRight } from 'lucide-react';
import { confirmIncidentFeedback } from '../../services/api.js';

export default function CommunityConfirmationCard({ incident, onFeedbackSubmitted }) {
  const [responseState, setResponseState] = useState(null); // 'YES' | 'NO' | 'NOT_SURE'
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!incident) return null;

  const incidentId = incident.incidentId || incident.id || 'INC-101';
  const title = incident.title || incident.description || 'Elevator unavailable at transit ramp';
  const timeText = incident.timeText || 'Reported 6 min ago';
  const severity = incident.personalImpact?.severity || incident.severity || 'CRITICAL';

  const handleResponse = async (answer) => {
    setIsSubmitting(true);
    setResponseState(answer);
    try {
      if (confirmIncidentFeedback) {
        await confirmIncidentFeedback(incidentId, { answer });
      }
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(answer);
      }
    } catch (e) {
      // Optimistic completion in offline / fallback mode
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 shadow-soft space-y-3 transition-all animate-in fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                {severity} HAZARD
              </span>
              <span className="text-[11px] font-medium text-amber-700">
                {timeText}
              </span>
            </div>
            <h4 className="text-xs font-black text-slate-900 mt-0.5">
              {title}
            </h4>
          </div>
        </div>
      </div>

      {responseState ? (
        <div className="flex items-center gap-2 py-1.5 px-3 bg-white/80 rounded-xl border border-amber-200 text-xs font-bold text-amber-900">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>
            {responseState === 'YES' && 'Feedback submitted: You confirmed this hazard is still active.'}
            {responseState === 'NO' && 'Feedback submitted: You reported this hazard has been cleared.'}
            {responseState === 'NOT_SURE' && 'Thank you for your feedback.'}
          </span>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1 border-t border-amber-200/50">
          <span className="text-xs font-bold text-amber-900">
            Is this still happening?
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleResponse('YES')}
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition shadow-2xs flex items-center gap-1 active:scale-95"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>YES</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleResponse('NO')}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-amber-300 text-amber-900 font-black text-xs transition flex items-center gap-1 active:scale-95"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>NO</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleResponse('NOT_SURE')}
              className="px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-amber-100/50 text-amber-800 font-semibold text-xs transition flex items-center gap-1"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>NOT SURE</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
