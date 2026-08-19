/**
 * WAYFARER AI - Explainable AI Reasoning Engine
 * Generates natural language explanations for why initial plans and live adaptations occurred.
 */

/**
 * Generate plan explanation (LLM #2)
 */
export async function generatePlanExplanation(trip, traveler, segments, overallScore) {
  const apiKey = process.env.GEMINI_API_KEY;

  const fallbackText = `WAYFARER synthesized this 3-day itinerary prioritized around ${traveler.name}'s ${traveler.mobility} accessibility profile. Step-free corridors and ramped venues (such as Mandovi Promenade and Candolim Accessible Boardwalk) are prioritized (Accessibility weight: 40%), while high-traffic bottleneck segments are minimized. Initial Overall Journey Fit is ${overallScore}/100.`;

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
export async function generateAdaptationExplanation(eventRecord, affectedSegment, newRecommendedRoute, traveler) {
  const { type, reason, previousRecommendedId, newRecommendedId } = eventRecord;
  const prevRouteName = `Route ${previousRecommendedId}`;
  const newRouteName = `Route ${newRecommendedId}`;

  let localExplanation = "";

  if (type === "ACCESSIBILITY_DEGRADATION") {
    localExplanation = `${newRouteName} (${newRecommendedRoute.name}) is now recommended because ${prevRouteName} lost critical step-free accessibility after an elevator failure at Fort Aguada. ${newRouteName} utilizes the 1:15 slope upper plateau ramp bypass, restoring journey fit score to ${newRecommendedRoute.score}/100.`;
  } else if (type === "CROWD_SPIKE") {
    localExplanation = `${newRouteName} is now recommended to bypass heavy pedestrian congestion reported at the main market gates. Timing has been recalibrated to ensure a low-stress, accessible experience.`;
  } else if (type === "ROUTE_DEVIATION") {
    localExplanation = `Traveler path deviation detected near the junction. Journey monitoring temporarily halted to verify traveler safety. Verification confirmed normal status.`;
  } else {
    localExplanation = `Journey recommendation updated from ${prevRouteName} to ${newRouteName} due to ${reason}. Current score: ${newRecommendedRoute.score}/100.`;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your_gemini_api_key_here") {
    return {
      explanation: localExplanation,
      source: "LOCAL_EXPLANATION",
      badge: "🟡 Local Explanation"
    };
  }

  try {
    const prompt = `
Explain in 2 crisp sentences why WAYFARER updated the recommended route for segment "${affectedSegment.origin} -> ${affectedSegment.destination}" from Route ${previousRecommendedId} to Route ${newRecommendedId} (${newRecommendedRoute.name}).
Event: ${type} - ${reason}.
Traveler mobility: ${traveler.mobility} (wheelchair, avoids stairs).
New Route score: ${newRecommendedRoute.score}/100.
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
      return { explanation: localExplanation, source: "LOCAL_EXPLANATION", badge: "🟡 Local Explanation" };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || localExplanation;

    return {
      explanation: text,
      source: "LIVE_GEMINI",
      badge: "🟢 AI Live Explanation"
    };
  } catch (err) {
    return { explanation: localExplanation, source: "LOCAL_EXPLANATION", badge: "🟡 Local Explanation" };
  }
}
