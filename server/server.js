/**
 * WAYFARER AI - Express Server & API Routes
 * Version 2.0 — Dynamic Itinerary Graph, 5-Factor Scoring, Operations Center
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS, ALTERNATIVE_ACTIVITIES } from "./data/defaultJourney.js";
import { parseJourney } from "./engine/journeyParser.js";
import { segmentJourney } from "./engine/journeySegmenter.js";
import {
  deriveTravelerWeights,
  calculateOverallJourneyScore,
  rankSegmentRoutes,
  generateScoreBreakdown,
  generateWhyNotExplanation
} from "./engine/scoringEngine.js";
import { applyJourneyEvent } from "./engine/eventEngine.js";
import { checkDownstreamImpact } from "./engine/downstreamOptimizer.js";
import { generatePlanExplanation, generateAdaptationExplanation } from "./engine/explanationEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root or server dir
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "5mb" }));

// API Health & Status
app.get("/api/health", (req, res) => {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== "" &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );

  res.json({
    status: "healthy",
    service: "WAYFARER Adaptive Journey Intelligence API",
    version: "2.0.0",
    geminiConfigured,
    mode: geminiConfigured ? "LIVE_AI" : "DEMO_FALLBACK",
    engines: [
      "ItineraryGraphEngine (DAG)",
      "5-Factor Scoring Engine",
      "Dependency Cascade Optimizer",
      "Multi-Event Mutation Engine",
      "Comparative Explainability Engine"
    ],
    timestamp: new Date().toISOString()
  });
});

// Default preloaded journey data
app.get("/api/journey/default", (req, res) => {
  try {
    const weights = deriveTravelerWeights(DEFAULT_TRAVELER);
    const segments = segmentJourney(DEFAULT_STOPS, DEFAULT_TRAVELER);
    const scoreResult = calculateOverallJourneyScore(segments);

    // Generate score breakdown and why-not for the first segment with routes
    let scoreBreakdown = null;
    let whyNotData = null;
    const firstScoredSegment = segments.find(s => s.candidateRoutes?.length > 0);
    if (firstScoredSegment) {
      scoreBreakdown = generateScoreBreakdown(firstScoredSegment.candidateRoutes, weights);
      whyNotData = generateWhyNotExplanation(firstScoredSegment.candidateRoutes, weights);
    }

    res.json({
      trip: DEFAULT_TRIP,
      traveler: DEFAULT_TRAVELER,
      stops: DEFAULT_STOPS,
      weights,
      segments,
      overallScore: scoreResult.overallScore,
      fitLevel: scoreResult.fitLevel,
      dayScores: scoreResult.dayScores,
      scoreBreakdown,
      whyNotData
    });
  } catch (err) {
    console.error("[API /api/journey/default error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Parse natural language journey prompt
app.post("/api/journey/parse", async (req, res) => {
  try {
    const { promptText, formData } = req.body;
    const parsed = await parseJourney(promptText, formData);
    
    // Automatically segment and score the parsed journey
    const segments = segmentJourney(parsed.stops, parsed.traveler);
    const scoreResult = calculateOverallJourneyScore(segments);

    res.json({
      success: true,
      ...parsed,
      segments,
      overallScore: scoreResult.overallScore,
      fitLevel: scoreResult.fitLevel,
      dayScores: scoreResult.dayScores
    });
  } catch (err) {
    console.error("[API /api/journey/parse error]:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to parse journey."
    });
  }
});

// Explain Initial Plan
app.post("/api/journey/explain-plan", async (req, res) => {
  try {
    const { trip, traveler, segments, overallScore } = req.body;
    const explanationResult = await generatePlanExplanation(trip, traveler, segments, overallScore);
    res.json({ success: true, ...explanationResult });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Apply Dynamic Event — enhanced with graph impact, score breakdown, why-not
app.post("/api/journey/event", async (req, res) => {
  try {
    const { journeyState, event } = req.body;

    if (!journeyState || !event) {
      return res.status(400).json({ success: false, error: "Missing journeyState or event payload." });
    }

    const weights = deriveTravelerWeights(journeyState.traveler);

    // 1. Apply event mutation and recalculate affected segment
    const eventResult = applyJourneyEvent(journeyState, event);

    // 2. Check downstream cascade impact
    const downstreamResult = checkDownstreamImpact(
      eventResult.updatedSegments,
      event.segmentId || journeyState.segments?.[0]?.id || "S1",
      eventResult.eventRecord,
      journeyState.stops || DEFAULT_STOPS,
      eventResult.graphImpact || null
    );

    // 3. Recalculate Overall Journey Score
    const newScoreResult = calculateOverallJourneyScore(eventResult.updatedSegments);

    // 4. Generate AI explanation for the adaptation
    const newRecRoute = eventResult.affectedSegment.candidateRoutes.find(r => r.isRecommended);
    const explanationResult = await generateAdaptationExplanation(
      eventResult.eventRecord,
      eventResult.affectedSegment,
      newRecRoute,
      journeyState.traveler,
      downstreamResult
    );

    // 5. Generate transparent score breakdown and comparative why-not
    let scoreBreakdown = null;
    let whyNotData = null;
    if (eventResult.affectedSegment && eventResult.affectedSegment.candidateRoutes) {
      scoreBreakdown = generateScoreBreakdown(eventResult.affectedSegment.candidateRoutes, weights);
      whyNotData = generateWhyNotExplanation(eventResult.affectedSegment.candidateRoutes, weights);
    }

    res.json({
      success: true,
      segments: eventResult.updatedSegments,
      affectedSegment: eventResult.affectedSegment,
      eventRecord: eventResult.eventRecord,
      downstreamImpact: downstreamResult,
      graphImpact: eventResult.graphImpact || null,
      overallScore: newScoreResult.overallScore,
      fitLevel: newScoreResult.fitLevel,
      dayScores: newScoreResult.dayScores,
      explanation: explanationResult.explanation,
      explanationSource: explanationResult.source,
      explanationBadge: explanationResult.badge,
      structuredChange: explanationResult.structuredChange || null,
      scoreBreakdown,
      whyNotData
    });
  } catch (err) {
    console.error("[API /api/journey/event error]:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Operations Center — Fleet Status
app.get("/api/operations/fleet", (req, res) => {
  res.json({
    success: true,
    totalActive: 24,
    stable: 18,
    monitoring: 4,
    atRisk: 2,
    systemStatus: "ALL ENGINES OPERATIONAL",
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const clientDistPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
}

// Start listening
app.listen(PORT, () => {
  console.log(`[WAYFARER API v2.0] Server running on http://localhost:${PORT}`);
  console.log(`[WAYFARER API v2.0] Engines: DAG Graph, 5-Factor Scoring, Cascade Optimizer, Multi-Event Mutations`);
});
