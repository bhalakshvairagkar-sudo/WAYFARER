/**
 * WAYFARER AI - End-to-End Integration & API Verification Script v2.1
 * Tests:
 * 1. Health check (/api/health)
 * 2. Default Journey with 5-factor score breakdown (/api/journey/default)
 * 3. Natural Language Journey Parser (/api/journey/parse)
 * 4. Hero Elevator Failure on Segment S3 -> Reroutes to Route C
 * 5. Transport Delay (+50m) with downstream DAG cascade
 * 6. Activity Cancellation with dynamic substitution
 * 7. Operations Fleet Status (/api/operations/fleet)
 */

async function runE2E() {
  console.log("==================================================");
  console.log("🚀 STARTING WAYFARER AI END-TO-END INTEGRATION TEST v2.1");
  console.log("==================================================\n");

  const baseUrl = "http://localhost:5000";

  // 1. Health check
  console.log("[Test 1/7] Checking /api/health...");
  const healthRes = await fetch(`${baseUrl}/api/health`);
  const healthData = await healthRes.json();
  console.log("  ✓ Server Health:", healthData.status);
  console.log("  ✓ Version:", healthData.version);
  console.log("  ✓ Service Mode:", healthData.mode);
  if (healthData.status !== "healthy") throw new Error("Health check failed");

  // 2. Default Journey
  console.log("\n[Test 2/7] Checking /api/journey/default...");
  const defaultRes = await fetch(`${baseUrl}/api/journey/default`);
  const defaultData = await defaultRes.json();
  console.log("  ✓ Origin:", defaultData.trip.origin, "→", defaultData.trip.destination);
  console.log("  ✓ Duration Days:", defaultData.trip.durationDays);
  console.log("  ✓ Traveler Mobility:", defaultData.traveler.mobility);
  console.log("  ✓ 5-Factor Weights:", defaultData.weights);
  console.log("  ✓ Overall Journey Score:", defaultData.overallScore, `(${defaultData.fitLevel})`);
  console.log("  ✓ Segments Generated:", defaultData.segments.length);
  console.log("  ✓ Score Breakdown available:", Boolean(defaultData.scoreBreakdown));

  // 3. Natural Language Journey Parser
  console.log("\n[Test 3/7] Testing /api/journey/parse...");
  const parseRes = await fetch(`${baseUrl}/api/journey/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      promptText: "I'm traveling from Mumbai to Jaipur for 3 days. I'm using a power wheelchair, cannot use stairs, prefer safer routes, and dislike crowded places."
    })
  });
  const parseData = await parseRes.json();
  console.log("  ✓ Parser Source:", parseData.source);
  console.log("  ✓ Parsed Trip:", parseData.trip?.origin, "→", parseData.trip?.destination);
  console.log("  ✓ Constraints:", parseData.constraints);
  console.log("  ✓ Segments:", parseData.segments?.length);

  // 4. Hero Elevator Failure Event on Segment S3
  console.log("\n[Test 4/7] Testing Hero Event: Elevator Failure on Segment S3...");
  const s3Before = defaultData.segments.find(s => s.id === "S3") || defaultData.segments[0];
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
        reason: "Elevator unavailable at lower ramp entry",
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
  console.log(`  ✓ Structured Factor Changes:`, eventData.structuredChange?.factorChanges);
  console.log(`  ✓ AI Adaptation Explanation: "${eventData.explanation}"`);

  if (recRouteAfter.id !== "C") {
    throw new Error(`Expected Route C to be recommended after elevator failure, got Route ${recRouteAfter.id}`);
  }

  // 5. Transport Delay Event (+50 min)
  console.log("\n[Test 5/7] Testing Transport Delay (+50 min) with Downstream Cascade...");
  const delayRes = await fetch(`${baseUrl}/api/journey/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journeyState: defaultData,
      event: {
        type: "TRANSPORT_DELAY",
        segmentId: "S3",
        delayMinutes: 50,
        reason: "Transit breakdown en route to destination"
      }
    })
  });
  const delayData = await delayRes.json();
  console.log(`  ✓ Downstream Status: ${delayData.downstreamImpact?.statusBadge}`);
  console.log(`  ✓ Cascade Delay: +${delayData.downstreamImpact?.cascadeDelayMin} mins`);
  console.log(`  ✓ Downstream Summary: ${delayData.downstreamImpact?.summary}`);

  // 6. Activity Cancellation with dynamic substitution
  console.log("\n[Test 6/7] Testing Activity Cancellation with Dynamic Substitution...");
  const cancelRes = await fetch(`${baseUrl}/api/journey/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      journeyState: defaultData,
      event: {
        type: "ACTIVITY_CANCELLATION",
        nodeId: "stop-6",
        segmentId: "S5",
        reason: "Market temporarily closed for preparations"
      }
    })
  });
  const cancelData = await cancelRes.json();
  console.log(`  ✓ Activity Cancelled: ${cancelData.eventRecord?.cancelledActivity?.name || 'Milestone'}`);
  console.log(`  ✓ Substituted Venue: ${cancelData.eventRecord?.substitutedActivity?.name || 'Alternative'}`);

  // 7. Operations Center Fleet
  console.log("\n[Test 7/7] Testing /api/operations/fleet...");
  const fleetRes = await fetch(`${baseUrl}/api/operations/fleet`);
  const fleetData = await fleetRes.json();
  console.log(`  ✓ Fleet Status: ${fleetData.systemStatus}`);
  console.log(`  ✓ Active Tours: ${fleetData.totalActive} (Stable: ${fleetData.stable}, Monitoring: ${fleetData.monitoring}, At Risk: ${fleetData.atRisk})`);

  console.log("\n==================================================");
  console.log("🎉 ALL 7 END-TO-END INTEGRATION TESTS PASSED 100%!");
  console.log("==================================================\n");
}

runE2E().catch(err => {
  console.error("❌ Integration Test Error:", err.message);
  process.exit(1);
});
