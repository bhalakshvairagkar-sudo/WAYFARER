import React from 'react';
import TravelerProfileCard from './dashboard/TravelerProfileCard.jsx';
import MyJourneyTree from './dashboard/MyJourneyTree.jsx';
import JourneyScoreGauge from './dashboard/JourneyScoreGauge.jsx';
import JourneyMap from './dashboard/JourneyMap.jsx';
import JourneyTimeline from './dashboard/JourneyTimeline.jsx';
import CurrentSegmentCard from './dashboard/CurrentSegmentCard.jsx';
import RouteComparisonMatrix from './dashboard/RouteComparisonMatrix.jsx';
import AdaptiveEventControls from './dashboard/AdaptiveEventControls.jsx';
import ExplanationCard from './dashboard/ExplanationCard.jsx';
import DownstreamImpactCard from './dashboard/DownstreamImpactCard.jsx';
import EventHistoryLog from './dashboard/EventHistoryLog.jsx';

import ScoreBreakdownCard from './dashboard/ScoreBreakdownCard.jsx';
import WhyNotCard from './dashboard/WhyNotCard.jsx';
import WhyChangedCard from './dashboard/WhyChangedCard.jsx';

export default function DashboardView({
  journeyState,
  activeSegmentId,
  onSelectSegment,
  onTriggerElevatorFailure,
  onTriggerCrowdSpike,
  onTriggerDeviation,
  onTriggerTransportDelay,
  onTriggerActivityCancellation,
  onResetJourney,
  isLoading
}) {
  const {
    trip,
    traveler,
    weights,
    segments = [],
    overallScore = 90,
    fitLevel = "EXCELLENT FIT",
    dayScores = {},
    explanation,
    explanationBadge,
    explanationSource,
    eventRecord,
    downstreamImpact,
    eventHistory = [],
    structuredChange,
    whyNotData,
    scoreBreakdown
  } = journeyState;

  // Selected segment object
  const activeSegment = segments.find(s => s.id === activeSegmentId) || segments[2] || segments[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* 3-Column Desktop Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (3 of 12 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <TravelerProfileCard traveler={traveler} weights={weights} />
          <MyJourneyTree
            segments={segments}
            activeSegmentId={activeSegment?.id}
            onSelectSegment={onSelectSegment}
          />
          <JourneyScoreGauge
            overallScore={overallScore}
            fitLevel={fitLevel}
            dayScores={dayScores}
            activeSegment={activeSegment}
          />
        </div>

        {/* Center Column (5 of 12 Cols) */}
        <div className="lg:col-span-5 space-y-6 flex flex-col">
          <div className="flex-1 min-h-[380px]">
            <JourneyMap
              activeSegment={activeSegment}
              segments={segments}
            />
          </div>
          <JourneyTimeline
            stops={journeyState.stops || []}
            activeSegmentId={activeSegment?.id}
            downstreamImpact={downstreamImpact}
          />
        </div>

        {/* Right Column (4 of 12 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <CurrentSegmentCard activeSegment={activeSegment} />
          
          <RouteComparisonMatrix
            candidateRoutes={activeSegment?.candidateRoutes || []}
            activeSegmentName={`${activeSegment?.origin} → ${activeSegment?.destination}`}
            weights={weights}
          />

          <AdaptiveEventControls
            onTriggerElevatorFailure={onTriggerElevatorFailure}
            onTriggerCrowdSpike={onTriggerCrowdSpike}
            onTriggerDeviation={onTriggerDeviation}
            onTriggerTransportDelay={onTriggerTransportDelay}
            onTriggerActivityCancellation={onTriggerActivityCancellation}
            onResetJourney={onResetJourney}
            isLoading={isLoading}
          />

          {structuredChange && <WhyChangedCard structuredChange={structuredChange} />}
          
          {whyNotData && <WhyNotCard whyNotData={whyNotData} />}
          
          {scoreBreakdown && <ScoreBreakdownCard scoreBreakdown={scoreBreakdown} weights={weights} />}

          <ExplanationCard
            explanation={explanation}
            eventRecord={eventRecord}
            explanationBadge={explanationBadge}
            explanationSource={explanationSource}
          />

          <DownstreamImpactCard downstreamImpact={downstreamImpact} />

          <EventHistoryLog eventHistory={eventHistory} />
        </div>

      </div>

    </div>
  );
}
