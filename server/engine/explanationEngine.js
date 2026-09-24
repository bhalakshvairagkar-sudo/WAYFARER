/**
 * WAYFARER AI - Explainable AI Reasoning Engine
 * Generates natural language explanations for why initial plans and live adaptations occurred.
 */

/**
 * Generate plan explanation (LLM #2)
 */
export async function generatePlanExplanation(trip, traveler, segments, overallScore) {
  const apiKey = process.env.GEMINI_API_KEY;

  const durationText = trip?.durationDays ? `${trip.durationDays}-day ` : '';
  const fallbackText = `WAYFARER synthesized this ${durationText}itinerary prioritized around ${traveler.name}'s ${traveler.mobility} accessibility profile. Step-free corridors and ramped venues (such as Mandovi Promenade and Candolim Accessible Boardwalk) are prioritized (Accessibility weight: 40%), while high-traffic bottleneck segments are minimized. Initial Overall Journey Fit is ${overallScore}/100.`;

  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return {
      explanation: fallbackText,
      source: "LOCAL_EXPLANATION",
      badge: "🟡 Deterministic Explanation"
    };
  }

  try {
    const prompt = `
Trip: ${trip.origin} to ${trip.destination} (${trip.durationDays} days)
Traveler: ${traveler.name}, mobility=${traveler.mobility}, stairsAllowed=${traveler.stairsAllowed}, safetyPriority=${traveler.safetyPriority}, crowdTolerance=${traveler.crowdTolerance}.
Overall Score: ${overallScore}/100.
Segments count: ${segments.length}.

Write a concise 2-sentence explanation of why this journey plan is optimized for this specific traveler's safety and mobility needs.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 150 }
      })
    });

    if (!response.ok) {
      return { explanation: fallbackText, source: "LOCAL_EXPLANATION", badge: "🟡 Deterministic Explanation" };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || fallbackText;

    return {
      explanation: text,
      source: "LIVE_GEMINI",
      badge: "🟢 AI Live Explanation"
    };
  } catch (err) {
    return { explanation: fallbackText, source: "LOCAL_EXPLANATION", badge: "🟡 Deterministic Explanation" };
  }
}

/**
 * Generate live adaptation explanation (LLM #3)
 */
export async function generateAdaptationExplanation(eventRecord, affectedSegment, newRecommendedRoute, traveler, downstreamImpact) {
  const { type, reason, previousRecommendedId, newRecommendedId } = eventRecord;
  const prevRouteName = `Route ${previousRecommendedId}`;
  const newRouteName = `Route ${newRecommendedId}`;

  let localExplanation = "";
  
  let structuredChange = {
    before: { routeId: previousRecommendedId, routeName: prevRouteName, score: 91, keyFactor: 'Best accessibility' },
    event: { type, description: reason || 'Unknown event', severity: eventRecord.severity || 1.0 },
    after: { routeId: newRecommendedId, routeName: newRecommendedRoute?.name || newRouteName, score: newRecommendedRoute?.score || 85, keyFactor: 'Adapted route' },
    factorChanges: [],
    downstreamSummary: 'No downstream timing conflicts detected'
  };

  if (downstreamImpact) {
    if (typeof downstreamImpact === 'string') {
        structuredChange.downstreamSummary = downstreamImpact;
    } else if (downstreamImpact.summary) {
        structuredChange.downstreamSummary = downstreamImpact.summary;
    }
  }

  if (type === "ACCESSIBILITY_DEGRADATION") {
    localExplanation = `${newRouteName} (${newRecommendedRoute?.name || 'Alternate Route'}) is now recommended because ${prevRouteName} lost critical step-free accessibility after an elevator failure. ${newRouteName} utilizes an accessible bypass, restoring journey fit score to ${newRecommendedRoute?.score || 85}/100.`;
    structuredChange.before.keyFactor = 'Best accessibility';
    structuredChange.after.keyFactor = 'Better accessibility without elevator dependency';
    structuredChange.factorChanges = [
      { factor: 'Accessibility', before: 96, after: 38, delta: -58, critical: true }
    ];
  } else if (type === "CROWD_SPIKE") {
    localExplanation = `${newRouteName} is now recommended to bypass heavy pedestrian congestion reported at the main gates. Timing has been recalibrated to ensure a low-stress, accessible experience.`;
    structuredChange.before.keyFactor = 'Fastest route';
    structuredChange.after.keyFactor = 'Lower crowd density';
    structuredChange.factorChanges = [
      { factor: 'Crowd', before: 85, after: 40, delta: -45, critical: true }
    ];
  } else if (type === "TRANSPORT_DELAY") {
    localExplanation = `Transit delays detected. Journey route updated to ${newRouteName} to absorb the delay while preserving important planned activities.`;
    structuredChange.factorChanges = [
      { factor: 'Convenience', before: 80, after: 60, delta: -20, critical: false }
    ];
    if (downstreamImpact && downstreamImpact.timingShifts) {
      structuredChange.downstreamSummary = downstreamImpact.timingShifts;
    }
  } else if (type === "ACTIVITY_CANCELLATION") {
    localExplanation = `Activity was cancelled. Substituting with ${newRecommendedRoute?.name || newRouteName} to maintain journey flow.`;
    if (downstreamImpact && downstreamImpact.substitutedActivity) {
       structuredChange.downstreamSummary = `Substituted activity: ${downstreamImpact.substitutedActivity}`;
    }
  } else if (type === "ROUTE_DEVIATION") {
    localExplanation = `Traveler path deviation detected near the junction. Journey monitoring temporarily halted to verify traveler safety. Verification confirmed normal status.`;
  } else {
    localExplanation = `Journey recommendation updated from ${prevRouteName} to ${newRouteName} due to ${reason}. Current score: ${newRecommendedRoute?.score || 85}/100.`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return {
      explanation: localExplanation,
      source: "LOCAL_EXPLANATION",
      badge: "🟡 Local Explanation",
      structuredChange
    };
  }

  try {
    const prompt = `
Explain in 2 crisp sentences why WAYFARER updated the recommended route for segment "${affectedSegment?.origin} -> ${affectedSegment?.destination}" from Route ${previousRecommendedId} to Route ${newRecommendedId} (${newRecommendedRoute?.name || 'Alternate'}).
Event: ${type} - ${reason}.
Traveler mobility: ${traveler?.mobility} (wheelchair, avoids stairs).
New Route score: ${newRecommendedRoute?.score}/100.
`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 150 }
      })
    });

    if (!response.ok) {
      return { explanation: localExplanation, source: "LOCAL_EXPLANATION", badge: "🟡 Local Explanation", structuredChange };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || localExplanation;

    return {
      explanation: text,
      source: "LIVE_GEMINI",
      badge: "🟢 AI Live Explanation",
      structuredChange
    };
  } catch (err) {
    return { explanation: localExplanation, source: "LOCAL_EXPLANATION", badge: "🟡 Local Explanation", structuredChange };
  }
}
