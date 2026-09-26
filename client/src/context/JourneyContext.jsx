import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  checkHealth,
  fetchDefaultJourney,
  parseJourneyPrompt,
  postJourneyEvent
} from '../services/api.js';
import { calculateRoutes } from '../services/routeService.js';
import { isGoogleMapsConfigured } from '../services/googleMapsLoader.js';
import { INITIAL_DEFAULT_STATE } from '../data/mockData.js';
import { useAuth } from './AuthContext.jsx';

const JourneyContext = createContext(null);

export function JourneyProvider({ children }) {
  const auth = useAuth();
  const user = auth?.user;

  const [journeyState, setJourneyState] = useState(INITIAL_DEFAULT_STATE);
  const [activeSegmentId, setActiveSegmentId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiStatus, setAiStatus] = useState({ geminiConfigured: false, mode: 'DEMO_FALLBACK' });
  const [routingMode, setRoutingMode] = useState(isGoogleMapsConfigured() ? 'LIVE_GOOGLE' : 'DEMO_OFFLINE');

  // Recovery adaptation state after an event occurs
  const [recoveryState, setRecoveryState] = useState(null);

  // Sync user profile & mobility requirements into journeyState whenever authenticated user changes
  useEffect(() => {
    if (user) {
      const prof = user.travelerProfile || {};
      setJourneyState((prev) => {
        const mergedTraveler = {
          ...prev.traveler,
          id: user.id || user._id,
          name: user.name || prev.traveler?.name || 'Wayfarer Traveler',
          email: user.email,
          mobility: prof.mobility || prev.traveler?.mobility || 'standard',
          stairsAllowed: prof.stairsAllowed !== undefined ? prof.stairsAllowed : (prev.traveler?.stairsAllowed !== undefined ? prev.traveler.stairsAllowed : true),
          needsElevator: prof.needsElevator !== undefined ? prof.needsElevator : (prof.mobility === 'wheelchair'),
          avoidStairs: prof.stairsAllowed === false || prof.mobility === 'wheelchair',
          maxWalkingDistanceMeters: prof.maxWalkingDistanceMeters || prev.traveler?.maxWalkingDistanceMeters || 1000,
          walkingTolerance: prof.walkingTolerance || prev.traveler?.walkingTolerance || 'medium',
          crowdTolerance: prof.crowdTolerance || prev.traveler?.crowdTolerance || 'medium',
          safetyPriority: prof.safetyPriority || prev.traveler?.safetyPriority || 'high',
          preferShade: prof.preferShade || false
        };

        // Re-evaluate segment route recommendations based on the new user's mobility requirements
        let updatedSegments = prev.segments;
        if (updatedSegments && updatedSegments.length > 0) {
          const isWheelchair = mergedTraveler.mobility === 'wheelchair' || mergedTraveler.stairsAllowed === false;
          updatedSegments = updatedSegments.map((seg) => {
            if (!seg.candidateRoutes || seg.candidateRoutes.length === 0) return seg;
            let recommendedRouteId = seg.recommendedRouteId;
            if (isWheelchair) {
              const stepFree = seg.candidateRoutes.find(r => r.stepFree && !r.hasStairs);
              if (stepFree) recommendedRouteId = stepFree.id;
            }
            return {
              ...seg,
              recommendedRouteId
            };
          });
        }

        return {
          ...prev,
          traveler: mergedTraveler,
          segments: updatedSegments
        };
      });
    }
  }, [user]);

  // Initialize and load default baseline
  useEffect(() => {
    async function init() {
      try {
        const health = await checkHealth();
        setAiStatus(health);

        const defaultData = await fetchDefaultJourney();
        if (defaultData && defaultData.segments) {
          setJourneyState((prev) => ({
            ...prev,
            ...defaultData,
            eventHistory: []
          }));
          if (defaultData.segments?.length > 0) {
            setActiveSegmentId(defaultData.segments[0].id);
          }
        }
      } catch (err) {
        console.warn('[JourneyContext] Baseline initialization error, using local mock data:', err.message);
      }
    }
    init();
  }, []);

  // 1. Update Traveler Profile
  const updateTravelerProfile = (updatedProfile) => {
    setJourneyState((prev) => ({
      ...prev,
      traveler: {
        ...prev.traveler,
        ...updatedProfile
      }
    }));
  };

  // 2. Parse Natural Language Journey Prompt
  const parsePrompt = async (promptText, formData = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseJourneyPrompt(promptText, formData);
      if (result && result.trip) {
        setJourneyState({
          ...result,
          eventRecord: null,
          downstreamImpact: null,
          eventHistory: []
        });
        if (result.segments?.length > 0) {
          setActiveSegmentId(result.segments[0].id);
        }
        return result;
      }
    } catch (err) {
      setError(err.message || 'Failed to parse journey.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Plan New Journey from Custom Origin, Destination & Stops
  const planNewJourney = async ({ origin, destination, stops = [], description = '', traveler = null }) => {
    setIsLoading(true);
    setError(null);
    try {
      const currentTraveler = traveler || journeyState.traveler;

      // Construct ordered stop points
      const allStops = [
        {
          id: 'stop-1',
          name: origin.name || origin.formattedAddress || 'Origin Gateway',
          type: 'transport',
          city: origin.name?.split(',')[0] || 'Origin',
          lat: origin.lat || 20.5937,
          lng: origin.lng || 78.9629,
          day: 1,
          arrivalTime: '09:00',
          departureTime: '09:30',
          description: 'Departure terminal'
        },
        ...stops.map((s, idx) => ({
          id: `stop-${idx + 2}`,
          name: s.name,
          type: s.type || 'attraction',
          city: destination.name?.split(',')[0] || 'Destination',
          lat: s.lat || 20.5937 + idx * 0.01,
          lng: s.lng || 78.9629 + idx * 0.01,
          day: s.day || 1,
          arrivalTime: s.arrivalTime || `${11 + idx * 2}:00`,
          departureTime: s.departureTime || `${13 + idx * 2}:00`,
          description: s.description || `Milestone ${s.name}`,
          openingHours: { open: '08:00', close: '20:00' },
          durationMin: 90,
          minDurationMin: 45
        })),
        {
          id: `stop-${stops.length + 2}`,
          name: destination.name || destination.formattedAddress || 'Destination Milestone',
          type: 'stay',
          city: destination.name?.split(',')[0] || 'Destination',
          lat: destination.lat || 28.6139,
          lng: destination.lng || 77.2090,
          day: 1,
          arrivalTime: '17:00',
          departureTime: '19:00',
          description: 'Destination accommodation or milestone',
          openingHours: { open: '00:00', close: '23:59' }
        }
      ];

      // Calculate candidate routes between origin and primary destination
      const candidateRoutes = await calculateRoutes({
        origin,
        destination,
        waypoints: stops,
        travelerProfile: currentTraveler
      });

      // Construct journey segments
      const segment1 = {
        id: 'S1',
        day: 1,
        origin: origin.name || 'Origin',
        originId: 'stop-1',
        originLat: origin.lat || 20.5937,
        originLng: origin.lng || 78.9629,
        destination: destination.name || 'Destination',
        destinationId: `stop-${allStops.length}`,
        destinationLat: destination.lat || 28.6139,
        destinationLng: destination.lng || 77.2090,
        status: 'ACTIVE',
        candidateRoutes,
        recommendedRouteId: candidateRoutes[0]?.id || 'B',
        journeyScore: candidateRoutes[0]?.score || 88
      };

      const newJourney = {
        trip: {
          origin: origin.name || 'Origin',
          destination: destination.name || 'Destination',
          description: description || '',
          startDate: '2026-10-01',
          endDate: '2026-10-03',
          durationDays: 3,
          travelerCount: 1
        },
        traveler: currentTraveler,
        stops: allStops,
        segments: [segment1],
        overallScore: candidateRoutes[0]?.score || 88,
        fitLevel: candidateRoutes[0]?.score >= 85 ? 'EXCELLENT FIT' : 'GOOD FIT',
        dayScores: { 1: candidateRoutes[0]?.score || 88 },
        eventHistory: [
          {
            id: `init-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'JOURNEY_CREATED',
            reason: `Journey generated from ${origin.name} to ${destination.name}`,
            routeChanged: false
          }
        ]
      };

      setJourneyState(newJourney);
      setActiveSegmentId('S1');
      return newJourney;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Select Route for a Segment
  const selectRouteForSegment = (segmentId, routeId) => {
    setJourneyState((prev) => {
      const updatedSegments = (prev.segments || []).map((seg) => {
        if (seg.id !== segmentId) return seg;
        const updatedRoutes = (seg.candidateRoutes || []).map((r) => ({
          ...r,
          isRecommended: r.id === routeId
        }));
        const chosen = updatedRoutes.find((r) => r.id === routeId) || updatedRoutes[0];
        return {
          ...seg,
          candidateRoutes: updatedRoutes,
          recommendedRouteId: routeId,
          journeyScore: chosen ? chosen.score : seg.journeyScore
        };
      });

      const selectedSeg = updatedSegments.find((s) => s.id === segmentId);
      const chosenRoute = selectedSeg?.candidateRoutes?.find((r) => r.id === routeId);

      const historyEntry = {
        id: `sel-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'ROUTE_SELECTED',
        reason: `User selected Route ${routeId} for segment ${selectedSeg?.origin || ''} → ${selectedSeg?.destination || ''}`,
        routeChanged: true,
        newRecommendedId: routeId,
        newRecommendedScore: chosenRoute?.score
      };

      return {
        ...prev,
        segments: updatedSegments,
        eventHistory: [historyEntry, ...(prev.eventHistory || [])]
      };
    });
  };

  // 5. Trigger Real-Time Adaptive Event
  const triggerEvent = async (eventPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await postJourneyEvent(journeyState, eventPayload);
      if (result && result.success) {
        setJourneyState((prev) => ({
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

        // Set recovery state for inspection in /recovery/:id
        const affectedSeg = result.affectedSegment;
        const recRoute = affectedSeg?.candidateRoutes?.find((r) => r.isRecommended);
        const prevRoute = affectedSeg?.candidateRoutes?.find((r) => r.id === result.previousRecommendedId);

        setRecoveryState({
          event: result.eventRecord,
          affectedSegment: affectedSeg,
          previousRoute: prevRoute,
          newRoute: recRoute,
          structuredChange: result.structuredChange,
          whyNotData: result.whyNotData,
          downstreamImpact: result.downstreamImpact,
          graphImpact: result.graphImpact
        });

        return result;
      }
    } catch (err) {
      console.error('[JourneyContext] Event trigger error:', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Accept Recovery Recommendation
  const acceptRecoveryRoute = (newRouteId) => {
    if (!recoveryState) return;
    const targetRouteId = newRouteId || recoveryState.newRoute?.id || 'C';
    selectRouteForSegment(recoveryState.affectedSegment?.id || activeSegmentId, targetRouteId);

    const historyEntry = {
      id: `rec-accept-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'RECOVERY_ACCEPTED',
      reason: `Traveler accepted resilient Route ${targetRouteId} recommendation following ${recoveryState.event?.type || 'event'}`,
      routeChanged: true,
      newRecommendedId: targetRouteId
    };

    setJourneyState((prev) => ({
      ...prev,
      eventHistory: [historyEntry, ...(prev.eventHistory || [])]
    }));

    setRecoveryState(null);
  };

  // 7. Reset to baseline
  const resetToBaseline = async () => {
    setIsLoading(true);
    try {
      const defaultData = await fetchDefaultJourney();
      if (defaultData && defaultData.segments) {
        setJourneyState({
          ...defaultData,
          explanation: 'Baseline journey restored. All routes and timing returned to initial optimal configuration.',
          explanationBadge: '🟢 Baseline Restored',
          explanationSource: 'LOCAL_EXPLANATION',
          eventRecord: null,
          downstreamImpact: null,
          eventHistory: [],
          graphImpact: null,
          structuredChange: null,
          whyNotData: null,
          scoreBreakdown: null
        });
        if (defaultData.segments?.length > 0) {
          setActiveSegmentId(defaultData.segments[0].id);
        }
      }
      setRecoveryState(null);
    } catch (err) {
      console.error('[JourneyContext] Reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    journeyState,
    setJourneyState,
    activeSegmentId,
    setActiveSegmentId,
    isLoading,
    error,
    aiStatus,
    routingMode,
    setRoutingMode,
    recoveryState,
    updateTravelerProfile,
    parsePrompt,
    planNewJourney,
    selectRouteForSegment,
    triggerEvent,
    acceptRecoveryRoute,
    resetToBaseline
  };

  return <JourneyContext.Provider value={value}>{children}</JourneyContext.Provider>;
}

export function useJourney() {
  const context = useContext(JourneyContext);
  if (!context) {
    throw new Error('useJourney must be used within a JourneyProvider');
  }
  return context;
}
