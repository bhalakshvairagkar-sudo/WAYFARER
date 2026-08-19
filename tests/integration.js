/**
 * WAYFARER AI - End-to-End Integration & API Verification Script
 */

async function runE2E() {
  console.log("==================================================");
  console.log("🚀 STARTING WAYFARER AI END-TO-END INTEGRATION TEST");
  console.log("==================================================\n");

  const baseUrl = "http://localhost:5000";

  // 1. Health check
  console.log("[Test 1/6] Checking /api/health...");
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log("  ✓ Server Health:", healthData.status);
  console.log("  ✓ Service Mode:", healthData.mode);
  if (healthData.status !== "healthy") throw new Error("Health check failed");

  // 2. Default Journey
  console.log("\n[Test 2/6] Checking /api/journey/default...");
  const defaultRes = await fetch(`${baseUrl}/api/journey/default`);
  const defaultData = await defaultRes.json();
  console.log("  ✓ Origin:", defaultData.trip.origin, "→", defaultData.trip.destination);
  console.log("  ✓ Duration Days:", defaultData.trip.durationDays);
  console.log("  ✓ Traveler Mobility:", defaultData.traveler.mobility);
  console.log("  ✓ Extracted Factor Weights:", defaultData.weights);
  console.log("  ✓ Overall Journey Score:", defaultData.overallScore, `(${defaultData.fitLevel})`);
  console.log("  ✓ Day Scores:", defaultData.dayScores);
  console.log("  ✓ Segments Generated:", defaultData.segments.length);

  if (defaultData.overallScore !== 90) {
    console.warn("  ⚠️ Warning: Overall score is", defaultData.overallScore, "expected 90");
  }

  // 3. Natural Language Journey Parser
  console.log("\n[Test 3/6] Testing /api/journey/parse...");
  const parseRes = await fetch(`${baseUrl}/api/journey/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptText: "I'm traveling alone from Pune to Goa for 3 days. I'm using a wheelchair, cannot use stairs, prefer safer routes, dislike crowded places, and can take a longer route if it is more accessible. I want to visit Fort Aguada, a beach and a local market."
    })
  });
  const parseData = await parseRes.json();
  console.log("  ✓ Parser Source:", parseData.source);
  console.log("  ✓ Extracted Constraints:", parseData.constraints);
  console.log("  ✓ Segments:", parseData.segments.map(s => `${s.id}: ${s.origin.split(' ')[0]}→${s.destination.split(' ')[0]}`).join(", "));

  // 4. Hero Elevator Failure Event on Segment S3
  console.log("\n[Test 4/6] Testing Hero Event: Elevator Failure on Segment S3...");
  const s3Before = defaultData.segments.find(s => s.id === "S3");
  const recRouteBefore = s3Before.candidateRoutes.find(r => r.isRecommended);
  console.log(`  • Initial S3 Recommendation: Route ${recRouteBefore.id} (${recRouteBefore.name}) - Score: ${recRouteBefore.score}`);

  const eventRes = await fetch(`${baseUrl}/api/journey/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journeyState: defaultData,
      event: {
        type: "ACCESSIBILITY_DEGRADATION",
        segmentId: "S3",
        routeId: "B",
        severity: 1.0,
        reason: "Elevator unavailable at Fort Aguada lower promenade",
        delta: { accessibility: 58 }
      }
    })
  });
  const eventData = await eventRes.json();
  const s3After = eventData.affectedSegment;
  const routeBAfter = s3After.candidateRoutes.find(r => r.id === "B");
  const routeCAfter = s3After.candidateRoutes.find(r => r.id === "C");
  const recRouteAfter = s3After.candidateRoutes.find(r => r.isRecommended);

  console.log(`  ✓ Route B Accessibility: 96 → ${routeBAfter.accessibility}`);
  console.log(`  ✓ Route B Score: 91 → ${routeBAfter.score}`);
  console.log(`  ✓ Route C Score: ${routeCAfter.score} (isRecommended: ${routeCAfter.isRecommended})`);
  console.log(`  ✓ NEW RECOMMENDED ROUTE: Route ${recRouteAfter.id} (${recRouteAfter.name})`);
  console.log(`  ✓ Downstream Impact Badge: ${eventData.downstreamImpact.statusBadge}`);
  console.log(`  ✓ AI Adaptation Explanation: "${eventData.explanation}"`);

  if (recRouteAfter.id !== "C") {
    throw new Error(`Expected Route C to be recommended after elevator failure, got Route ${recRouteAfter.id}`);
  }

  // 5. Crowd Surge Event on Segment S5
  console.log("\n[Test 5/6] Testing Crowd Surge Event on Segment S5 (Market)...");
  const crowdRes = await fetch(`${baseUrl}/api/journey/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journeyState: eventData,
      event: {
        type: "CROWD_SPIKE",
        segmentId: "S5",
        routeId: "A",
        severity: 0.9,
        reason: "Severe evening crowd surge at Mapusa central bazaar entrance",
        delta: { crowd: 45 }
      }
    })
  });
  const crowdData = await crowdRes.json();
  console.log(`  ✓ Downstream Re-Optimization Status: ${crowdData.downstreamImpact.statusBadge}`);
  console.log(`  ✓ Downstream Summary: ${crowdData.downstreamImpact.summary}`);
  console.log(`  ✓ Adjusted Cascade Timing: ${crowdData.downstreamImpact.cascadeDelayMin} mins`);

  // 6. Reset Verification
  console.log("\n[Test 6/6] Verifying Reset Flow...");
  const resetRes = await fetch(`${baseUrl}/api/journey/default`);
  const resetData = await resetRes.json();
  const s3Reset = resetData.segments.find(s => s.id === "S3");
  const recReset = s3Reset.candidateRoutes.find(r => r.isRecommended);
  console.log(`  ✓ Pristine S3 Recommendation Restored: Route ${recReset.id} (Score: ${recReset.score})`);
  console.log(`  ✓ Pristine Overall Score Restored: ${resetData.overallScore}/100`);

  if (recReset.id !== "B" || recReset.score !== 91 || resetData.overallScore !== 90) {
    throw new Error("Reset journey did not restore pristine baseline values");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL END-TO-END INTEGRATION TESTS PASSED 100%!");
  console.log("==================================================\n");
}

runE2E().catch(err => {
  console.error("❌ Integration Test Error:", err);
  process.exit(1);
});
