import React from 'react';
import { ShieldAlert, CheckCircle2, Activity, Map, ArrowRight, Eye, AlertCircle } from 'lucide-react';

export default function OperationsCenterView({ journeyState, onApproveAdaptation, onViewJourney }) {
  
  const demoTours = [
    {
      id: "1043",
      traveler: "Sharma Family",
      origin: "Colosseum",
      destination: "Pantheon",
      status: "STABLE",
      score: 94
    },
    {
      id: "1044",
      traveler: "David Chen",
      origin: "Vatican",
      destination: "Trevi Fountain",
      status: "MONITORING",
      score: 82,
      event: { type: "TRANSPORT_DELAY", desc: "Metro line B 15m delay" }
    },
    {
      id: "1045",
      traveler: "Maria Santos",
      origin: "Roman Forum",
      destination: "Piazza Navona",
      status: "STABLE",
      score: 89
    }
  ];

  const getRealTour = () => {
    if (!journeyState) return null;
    
    const isAtRisk = journeyState.eventRecord && !journeyState.eventRecord.resolved;
    
    return {
      id: "1042",
      isReal: true,
      traveler: journeyState.traveler?.name || "Unknown Traveler",
      origin: journeyState.startLocation || "Start",
      destination: journeyState.endLocation || "Destination",
      status: isAtRisk ? "AT_RISK" : "STABLE",
      score: journeyState.overallScore || 0,
      event: isAtRisk ? { 
        type: journeyState.eventRecord.type, 
        desc: journeyState.eventRecord.description || journeyState.eventRecord.type 
      } : null,
      rawState: journeyState
    };
  };

  const realTour = getRealTour();
  const allTours = realTour ? [realTour, ...demoTours] : demoTours;

  const getStatusColor = (status) => {
    if (status === 'STABLE') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'MONITORING') return 'bg-amber-100 text-amber-700 border-amber-200';
    if (status === 'AT_RISK') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const getStatusIcon = (status) => {
    if (status === 'STABLE') return <CheckCircle2 className="w-4 h-4" />;
    if (status === 'MONITORING') return <Activity className="w-4 h-4" />;
    if (status === 'AT_RISK') return <AlertCircle className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldAlert className="w-6 h-6 text-blue-400" />
          <h1 className="font-bold text-lg tracking-wider">WAYFARER OPERATIONS CENTER</h1>
        </div>
        <div className="flex gap-4 text-xs font-medium">
          <div className="bg-slate-800 px-3 py-1.5 rounded flex items-center gap-2 border border-slate-700">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            ACTIVE JOURNEYS: 24
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded flex items-center gap-2 border border-slate-700">
            🟢 18 Stable | 🟡 4 Monitoring | 🔴 2 Require Adaptation
          </div>
          <div className="bg-slate-800 px-3 py-1.5 rounded flex items-center gap-2 border border-slate-700 text-green-400">
            SYSTEM STATUS: ALL ENGINES OPERATIONAL
          </div>
        </div>
      </header>
      
      <main className="flex-1 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Map className="w-6 h-6 text-slate-500" />
          Live Fleet Monitor
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
          {allTours.map((tour, idx) => (
            <div key={idx} className={`bg-white rounded-xl shadow-sm border ${tour.isReal ? 'border-blue-400 shadow-blue-100' : 'border-slate-200'} flex flex-col overflow-hidden`}>
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold text-slate-500 mb-1">TOUR #{tour.id} {tour.isReal && <span className="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px]">LIVE</span>}</div>
                  <div className="font-bold text-slate-800">{tour.traveler}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${getStatusColor(tour.status)}`}>
                  {getStatusIcon(tour.status)}
                  {tour.status.replace('_', ' ')}
                </div>
              </div>
              
              <div className="p-4 flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <span className="truncate max-w-[120px]">{tour.origin}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[120px]">{tour.destination}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">JOURNEY SCORE</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${tour.score >= 90 ? 'bg-green-500' : tour.score >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                        style={{ width: `${tour.score}%` }}
                      ></div>
                    </div>
                    <span className="font-bold text-sm text-slate-700">{tour.score}</span>
                  </div>
                </div>
                
                {tour.event && (
                  <div className={`mt-auto p-3 rounded-lg border ${tour.status === 'AT_RISK' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                    <div className={`text-xs font-bold mb-1 ${tour.status === 'AT_RISK' ? 'text-red-700' : 'text-amber-700'}`}>
                      ⚠️ {tour.event.type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-xs text-slate-600 line-clamp-2">
                      {tour.event.desc}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
                <button 
                  onClick={() => tour.isReal && onViewJourney && onViewJourney(tour.id)}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  VIEW
                </button>
                {tour.status === 'AT_RISK' && (
                  <button 
                    onClick={() => tour.isReal && onApproveAdaptation && onApproveAdaptation(tour.id)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    APPROVE
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
