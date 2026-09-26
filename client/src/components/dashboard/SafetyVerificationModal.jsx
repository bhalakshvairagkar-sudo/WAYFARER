import React, { useState } from 'react';
import { AlertTriangle, ShieldCheck, PhoneCall, Check, X, Bell, Users, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SafetyVerificationModal({
  isOpen,
  onClose,
  onVerifiedFine,
  travelerName = 'Traveler',
  segmentName = 'designated corridor',
  coordinates = { lat: 18.9220, lng: 72.8347 }
}) {
  const [mode, setMode] = useState('CHOICE'); // CHOICE, ASSISTANCE, REPORT, CONFIRMATION

  if (!isOpen) return null;

  const handleFine = () => {
    setMode('CHOICE');
    onVerifiedFine();
  };

  const handleReportSubmit = (issueType) => {
    // In a real app, this sends to backend
    setMode('CONFIRMATION');
    setTimeout(() => {
      setMode('CHOICE');
      onClose();
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 text-center animate-in zoom-in-95 duration-200">
        
        <AnimatePresence mode="wait">
          {mode === 'CHOICE' && (
            <motion.div key="choice" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
              <div className="w-14 h-14 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Need Assistance?</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                You can report an accessibility hazard to the WAYFARER community or request immediate emergency assistance.
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => setMode('REPORT')}
                  className="w-full py-3.5 px-4 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-brand-200 transition"
                >
                  <Users className="w-5 h-5" />
                  Report Accessibility Issue
                </button>
                <button
                  onClick={() => setMode('ASSISTANCE')}
                  className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-600/20 transition"
                >
                  <PhoneCall className="w-5 h-5" />
                  Request Emergency Help
                </button>
                <button
                  onClick={() => { setMode('CHOICE'); onClose(); }}
                  className="w-full py-3 px-4 bg-white text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {mode === 'REPORT' && (
            <motion.div key="report" initial={{opacity:0, x:20}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-20}}>
              <div className="w-12 h-12 bg-brand-50 border border-brand-200 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">Community Report</h3>
              <p className="text-xs text-slate-500 mb-6">What hazard are you encountering?</p>
              
              <div className="grid grid-cols-1 gap-2 mb-6">
                {[
                  { id: 'elevator', label: 'Elevator Broken', icon: '🛗' },
                  { id: 'stairs', label: 'Stairs Only / No Ramp', icon: '♿' },
                  { id: 'blocked', label: 'Path Blocked', icon: '🚧' },
                  { id: 'crowd', label: 'Severe Crowding', icon: '👥' }
                ].map(issue => (
                  <button
                    key={issue.id}
                    onClick={() => handleReportSubmit(issue.id)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition text-left"
                  >
                    <span className="text-xl">{issue.icon}</span>
                    <span className="text-sm font-semibold text-slate-700">{issue.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setMode('CHOICE')}
                className="text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                ← Back
              </button>
            </motion.div>
          )}

          {mode === 'CONFIRMATION' && (
            <motion.div key="confirmation" initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}}>
              <div className="w-16 h-16 bg-emerald-100 border-2 border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Report Verified</h3>
              <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                Thank you! Your report matches 3 other independent travelers in the last 15 minutes.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 inline-block">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Community Confidence</div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[94%]"></div>
                  </div>
                  <span className="text-xs font-black text-slate-700">94%</span>
                </div>
              </div>
            </motion.div>
          )}

          {mode === 'ASSISTANCE' && (
            <motion.div key="assistance" initial={{opacity:0}} animate={{opacity:1}}>
              {/* Previous emergency UI */}
              <div className="w-14 h-14 bg-rose-100 border-2 border-rose-300 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <PhoneCall className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-extrabold text-rose-600 mb-2">Connecting...</h3>
              <p className="text-xs text-slate-600 mb-6 leading-relaxed">
                Transmitting your exact coordinates to the local mobility team.
                <br /><br />
                <strong className="text-slate-900 font-mono bg-slate-100 px-2 py-1 rounded">LAT {coordinates.lat} / LNG {coordinates.lng}</strong>
              </p>
              <button
                onClick={() => setMode('CHOICE')}
                className="w-full py-3 px-4 bg-white text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition border border-slate-200"
              >
                Cancel Call
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
