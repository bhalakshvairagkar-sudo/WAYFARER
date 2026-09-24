import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

import Navbar from './components/Navbar.jsx';
import PlanJourneyView from './components/PlanJourneyView.jsx';
import JourneyReviewView from './components/JourneyReviewView.jsx';
import DashboardView from './components/DashboardView.jsx';
import OperationsCenterView from './components/OperationsCenterView.jsx';
import SafetyVerificationModal from './components/dashboard/SafetyVerificationModal.jsx';

import { checkHealth, fetchDefaultJourney, parseJourneyPrompt, postJourneyEvent, explainJourneyPlan } from './services/api.js';
import { INITIAL_DEFAULT_STATE } from './data/mockData.js';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('PLAN'); // 'PLAN' | 'REVIEW' | 'DASHBOARD' | 'OPERATIONS'
  const [isLoading, setIsLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState({ geminiConfigured: false, mode: 'DEMO_FALLBACK' });

  // Main Live Journey State
  const [journeyState, setJourneyState] = useState(INITIAL_DEFAULT_STATE);
  const [activeSegmentId, setActiveSegmentId] = useState('S3'); // Default Hero Segment: Panjim -> Fort Aguada

  // Modals
  const [isSafetyModalOpen, setIsSafetyModalOpen] = useState(false);

  // Initialize and check health on mount
  useEffect(() => {
    async function init() {
      const health = await checkHealth();
      setAiStatus(health);

      const defaultData = await fetchDefaultJourney();
      if (defaultData && defaultData.segments) {
        setJourneyState(prev => ({
          ...prev,
          ...defaultData,
          eventHistory: []
        }));
      }
    }
    init();
  }, []);

  // Step 1 -> Step 2: Parse natural language journey prompt
  const handleUnderstandJourney = async (promptText, formData) => {
    setIsLoading(true);
    try {
      const result = await parseJourneyPrompt(promptText, formData);
      if (result && result.trip) {
        setJourneyState({
          ...result,
          eventRecord: null,
          downstreamImpact: null,
          eventHistory: []
        });
        setCurrentScreen('REVIEW');
      }
    } catch (err) {
      console.warn("[App] Parsing failed, falling back to local dataset.");
      setJourneyState({
        ...INITIAL_DEFAULT_STATE,
        eventRecord: null,
        downstreamImpact: null,
        eventHistory: []
      });
      setCurrentScreen('REVIEW');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 -> Step 3: Confirm and launch active orchestration dashboard
  const handleConfirmJourney = () => {
    setCurrentScreen('DASHBOARD');
    setActiveSegmentId('S3');

    // Confetti celebration
    try {
      confetti({
        particleCount: 75,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (e) {}
  };

  const handleEditJourney = () => {
    setCurrentScreen('PLAN');
  };

  // Trigger Hero Event: Elevator Failure
  const handleTriggerElevatorFailure = async () => {
    setIsLoading(true);
    try {
      setActiveSegmentId('S3');
      const eventPayload = {
        type: 'ACCESSIBILITY_DEGRADATION',
        segmentId: 'S3',
        routeId: 'B',
        severity: 1.0,
        reason: 'Elevator unavailable at Fort Aguada lower promenade ramp entrance',
        delta: {
          accessibility: 58
        }
      };

      const result = await postJourneyEvent(journeyState, eventPayload);
      if (result && result.success) {
        setJourneyState(prev => ({
          ...prev,
          segments: result.segments,
          overallScore: result.overallScore,
          fitLevel: result.fitLevel,
          dayScores: result.dayScores,
          explanation: result.explanation,
          explanationBadge: result.explanationBadge,
          explanationSource: result.explanationSource,
          eventRecord: result.eventRecord,
          downstreamImpact: result.downstreamImpact,
          graphImpact: result.graphImpact,
          structuredChange: result.structuredChange,
          whyNotData: result.whyNotData,
          scoreBreakdown: result.scoreBreakdown,
          eventHistory: [result.eventRecord, ...(prev.eventHistory || [])]
        }));
      }
    } catch (err) {
      console.error("[App] Elevator event error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Crowd Spike Event
  const handleTriggerCrowdSpike = async () => {
    setIsLoading(true);
    try {
      setActiveSegmentId('S5'); // S5: Beach -> Mapusa Market
      const eventPayload = {
        type: 'CROWD_SPIKE',
        segmentId: 'S5',
        routeId: 'A',
        severity: 0.9,
        reason: 'Severe foot-traffic surge and bottleneck reported at Mapusa central bazaar gates',
        delta: {
          crowd: 45
        }
      };

      const result = await postJourneyEvent(journeyState, eventPayload);
      if (result && result.success) {
        setJourneyState(prev => ({
          ...prev,
          segments: result.segments,
          overallScore: result.overallScore,
          fitLevel: result.fitLevel,
          dayScores: result.dayScores,
          explanation: result.explanation,
          explanationBadge: result.explanationBadge,
          explanationSource: result.explanationSource,
          eventRecord: result.eventRecord,
          downstreamImpact: result.downstreamImpact,
          graphImpact: result.graphImpact,
          structuredChange: result.structuredChange,
          whyNotData: result.whyNotData,
          scoreBreakdown: result.scoreBreakdown,
          eventHistory: [result.eventRecord, ...(prev.eventHistory || [])]
        }));
      }
    } catch (err) {
      console.error("[App] Crowd event error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Transport Delay (+50 min)
  const handleTriggerTransportDelay = async () => {
    setIsLoading(true);
    try {
      setActiveSegmentId('S3');
      const eventPayload = {
        type: 'TRANSPORT_DELAY',
        segmentId: 'S3',
        delayMinutes: 50,
        reason: 'Bus breakdown on NH66 coastal highway — replacement vehicle dispatched, +50 min delay'
      };
      const result = await postJourneyEvent(journeyState, eventPayload);
      if (result && result.success) {
        setJourneyState(prev => ({
          ...prev,
          segments: result.segments,
          overallScore: result.overallScore,
          fitLevel: result.fitLevel,
          dayScores: result.dayScores,
          explanation: result.explanation,
          explanationBadge: result.explanationBadge,
          explanationSource: result.explanationSource,
          eventRecord: result.eventRecord,
          downstreamImpact: result.downstreamImpact,
          graphImpact: result.graphImpact,
          structuredChange: result.structuredChange,
          whyNotData: result.whyNotData,
          scoreBreakdown: result.scoreBreakdown,
          eventHistory: [result.eventRecord, ...(prev.eventHistory || [])]
        }));
      }
    } catch (err) {
      console.error('[App] Transport delay error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Activity Cancellation (Market)
  const handleTriggerActivityCancellation = async () => {
    setIsLoading(true);
    try {
      setActiveSegmentId('S5');
      const eventPayload = {
        type: 'ACTIVITY_CANCELLATION',
        nodeId: 'stop-6',
        segmentId: 'S5',
        reason: 'Mapusa Market temporarily closed for local festival preparations'
      };
      const result = await postJourneyEvent(journeyState, eventPayload);
      if (result && result.success) {
        setJourneyState(prev => ({
          ...prev,
          segments: result.segments,
          overallScore: result.overallScore,
          fitLevel: result.fitLevel,
          dayScores: result.dayScores,
          explanation: result.explanation,
          explanationBadge: result.explanationBadge,
          explanationSource: result.explanationSource,
          eventRecord: result.eventRecord,
          downstreamImpact: result.downstreamImpact,
          graphImpact: result.graphImpact,
          structuredChange: result.structuredChange,
          whyNotData: result.whyNotData,
          scoreBreakdown: result.scoreBreakdown,
          eventHistory: [result.eventRecord, ...(prev.eventHistory || [])]
        }));
      }
    } catch (err) {
      console.error('[App] Activity cancellation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger Traveler Deviation Modal
  const handleTriggerDeviation = () => {
    setIsSafetyModalOpen(true);
  };

  const handleVerifiedFine = () => {
    setIsSafetyModalOpen(false);
    const timeString = `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
    const devRecord = {
      id: `dev-${Date.now()}`,
      timestamp: timeString,
      type: 'ROUTE_DEVIATION',
      reason: 'Traveler verified safe: Path re-aligned with accessible corridor',
      routeChanged: false
    };
    setJourneyState(prev => ({
      ...prev,
      eventRecord: devRecord,
      eventHistory: [devRecord, ...(prev.eventHistory || [])]
    }));
  };

  // Global Reset Journey to pristine baseline
  const handleResetJourney = async () => {
    setIsLoading(true);
    try {
      const defaultData = await fetchDefaultJourney();
      if (defaultData && defaultData.segments) {
        setJourneyState({
          ...defaultData,
          explanation: "Baseline journey restored. All routes and timing returned to initial optimal configuration.",
          explanationBadge: "🟢 Baseline Restored",
          explanationSource: "LOCAL_EXPLANATION",
          eventRecord: null,
          downstreamImpact: null,
          eventHistory: [],
          graphImpact: null,
          structuredChange: null,
          whyNotData: null,
          scoreBreakdown: null
        });
      } else {
        setJourneyState({
          ...INITIAL_DEFAULT_STATE,
          eventRecord: null,
          downstreamImpact: null,
          eventHistory: [],
          graphImpact: null,
          structuredChange: null,
          whyNotData: null,
          scoreBreakdown: null
        });
      }
      setActiveSegmentId('S3');
    } catch (err) {
      console.error("[App] Reset error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Sticky Navbar */}
      <Navbar
        aiStatus={aiStatus}
        currentScreen={currentScreen}
        onReset={handleResetJourney}
        onNavigateScreen={setCurrentScreen}
      />

      {/* Main Content View Switcher */}
      <main className="flex-1">
        {currentScreen === 'PLAN' && (
          <PlanJourneyView
            onUnderstandJourney={handleUnderstandJourney}
            isLoading={isLoading}
          />
        )}

        {currentScreen === 'REVIEW' && (
          <JourneyReviewView
            parsedJourney={journeyState}
            onConfirmJourney={handleConfirmJourney}
            onEditJourney={handleEditJourney}
          />
        )}

        {currentScreen === 'DASHBOARD' && (
          <DashboardView
            journeyState={journeyState}
            activeSegmentId={activeSegmentId}
            onSelectSegment={setActiveSegmentId}
            onTriggerElevatorFailure={handleTriggerElevatorFailure}
            onTriggerCrowdSpike={handleTriggerCrowdSpike}
            onTriggerDeviation={handleTriggerDeviation}
            onTriggerTransportDelay={handleTriggerTransportDelay}
            onTriggerActivityCancellation={handleTriggerActivityCancellation}
            onResetJourney={handleResetJourney}
            isLoading={isLoading}
          />
        )}

        {currentScreen === 'OPERATIONS' && (
          <OperationsCenterView
            journeyState={journeyState}
            onApproveAdaptation={handleResetJourney}
            onViewJourney={() => setCurrentScreen('DASHBOARD')}
          />
        )}
      </main>

      {/* Safety Deviation Verification Modal */}
      <SafetyVerificationModal
        isOpen={isSafetyModalOpen}
        onClose={() => setIsSafetyModalOpen(false)}
        onVerifiedFine={handleVerifiedFine}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>WAYFARER AI — Adaptive Journey Intelligence</span>
          <span className="text-slate-400">Accessible & Inclusive Travel • Safety & Convenience</span>
        </div>
      </footer>

    </div>
  );
}
