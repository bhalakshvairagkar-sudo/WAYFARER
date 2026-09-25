import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Compass, ShieldCheck, MapPin, Activity } from 'lucide-react';

export default function WelcomeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem('wayfarer_tour_seen');
    if (!hasSeenTour) {
      setIsOpen(true);
    }
  }, []);

  const closeTour = () => {
    localStorage.setItem('wayfarer_tour_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const steps = [
    {
      icon: <Compass className="w-8 h-8 text-brand-600" />,
      title: "Welcome to WAYFARER",
      text: "WAYFARER is an adaptive travel planner that builds routes based on your exact accessibility and safety needs, and adjusts them in real-time when things go wrong."
    },
    {
      icon: <MapPin className="w-8 h-8 text-emerald-600" />,
      title: "1. Plan Your Trip",
      text: "Head to the Planner to enter your origin and destination anywhere in India. WAYFARER will calculate wheelchair-accessible, low-crowd, and safe routes."
    },
    {
      icon: <Activity className="w-8 h-8 text-amber-600" />,
      title: "2. Trigger Live Disruptions",
      text: "Go to the Events Center to simulate real-world chaos (like an elevator breaking or a transport delay). Watch the smart schedule auto-correct instantly!"
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-brand-600" />,
      title: "3. Understand the \"Why\"",
      text: "Whenever WAYFARER reroutes you, it uses Gemini AI to explain exactly why the new route is safer and better suited to your traveler profile."
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="relative p-6 sm:p-8">
          <button 
            onClick={closeTour}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mb-2">
              {steps[step].icon}
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {steps[step].title}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed min-h-[4.5rem]">
              {steps[step].text}
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-brand-600' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            
            {step < steps.length - 1 ? (
              <button 
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5"
              >
                Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button 
                onClick={closeTour}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}