/**
 * WAYFARER AI - Express Server & Hardened API Gateway
 * Version 2.2 — Complete Application Security Architecture
 * Integrates: Helmet CSP, Strict CORS, Multi-tier Rate Limiting, JWT Auth,
 * RBAC, Mongoose/Atlas Database Security, Location Data Protection & Zero-Leak Logging.
 */

import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { connectDB, isDbConnected, isUsingMemoryFallback } from "./config/db.js";
import { configureSecurityHeaders } from "./middleware/securityHeaders.js";
import { configureCors } from "./middleware/corsConfig.js";
import { generalApiLimiter, aiRateLimiter } from "./middleware/rateLimiters.js";
import { optionalAuth } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityLogger } from "./utils/securityLogger.js";

import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";

import { DEFAULT_TRIP, DEFAULT_TRAVELER, DEFAULT_STOPS } from "./data/defaultJourney.js";
import { parseJourney } from "./engine/journeyParser.js";
import { segmentJourney } from "./engine/journeySegmenter.js";
import {
  deriveTravelerWeights,
  calculateOverallJourneyScore,
  generateScoreBreakdown,
  generateWhyNotExplanation
} from "./engine/scoringEngine.js";
import { applyJourneyEvent } from "./engine/eventEngine.js";
import { checkDownstreamImpact } from "./engine/downstreamOptimizer.js";
import { generatePlanExplanation, generateAdaptationExplanation } from "./engine/explanationEngine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env securely from project root or server dir
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (for rate limiting & client IP behind load balancers / Vite dev proxy)
app.set('trust proxy', 1);

// 1. Security Headers (Helmet + Strict CSP supporting OpenStreetMap & Google Maps)
app.use(configureSecurityHeaders());

// 2. Strict CORS Configuration (Restricts origins to authorized frontends)
app.use(configureCors());

// 3. Request Body Size Limiting (DoS prevention)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// 4. Global API Rate Limiting
app.use("/api/", generalApiLimiter);

// 5. Connect to MongoDB Atlas (with graceful in-memory fallback for local demo mode)
connectDB().catch(err => {
  securityLogger.error("Initial DB connection attempt returned warning", err);
});

// 6. Security Health & Status Check
app.get("/api/health", (req, res) => {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== "" &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );

  res.json({
    status: "healthy",
    service: "WAYFARER Adaptive Journey Intelligence API",
    version: "2.2.0-hardened",
    security: {
      helmetEnabled: true,
      rateLimitingEnabled: true,
      corsRestricted: true,
      jwtAuthReady: true,
      locationProtection: "ACTIVE (Minimization + Ephemeral Sharing)",
      databaseStatus: isDbConnected() ? "CONNECTED_MONGODB_TLS" : isUsingMemoryFallback() ? "SECURE_IN_MEMORY_FALLBACK" : "CONNECTING"
    },
    geminiConfigured,
    mode: geminiConfigured ? "LIVE_AI" : "DEMO_FALLBACK",
    timestamp: new Date().toISOString()
  });
});

// 7. Mount Authentication & Profile Routes
app.use("/api/auth", authRoutes);

// 8. Mount Location Data Protection & Sharing Routes
app.use("/api/location", locationRoutes);

// 9. Mount Community Report & Evidence Fusion Routes
app.use("/api/community", communityRoutes);

// 10. Default Preloaded Journey (Optional Auth: Supports Guest/Demo or Authenticated Traveler)
app.get("/api/journey/default", optionalAuth, (req, res, next) => {
  try {
    const traveler = req.user ? { ...DEFAULT_TRAVELER, name: req.user.name, email: req.user.email } : DEFAULT_TRAVELER;
    const weights = deriveTravelerWeights(traveler);
    const segments = segmentJourney(DEFAULT_STOPS, traveler);
    const scoreResult = calculateOverallJourneyScore(segments);

    let scoreBreakdown = null;
    let whyNotData = null;
    const firstScoredSegment = segments.find(s => s.candidateRoutes?.length > 0);
    if (firstScoredSegment) {
      scoreBreakdown = generateScoreBreakdown(firstScoredSegment.candidateRoutes, weights);
      whyNotData = generateWhyNotExplanation(firstScoredSegment.candidateRoutes, weights);
    }

    res.json({
      trip: DEFAULT_TRIP,
      traveler,
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
    next(err);
  }
});

// 10. Parse Natural Language Journey Prompt (Rate-limited for AI quota protection)
app.post("/api/journey/parse", aiRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { promptText, formData } = req.body;
    if (!promptText && (!formData || Object.keys(formData).length === 0)) {
      return res.status(400).json({ success: false, error: "Prompt text or journey form data is required." });
    }

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
    next(err);
  }
});

// 11. Explain Initial Plan
app.post("/api/journey/explain-plan", aiRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { trip, traveler, segments, overallScore } = req.body;
    if (!trip || !traveler || !segments) {
      return res.status(400).json({ success: false, error: "Missing required journey details for explanation." });
    }
    const explanationResult = await generatePlanExplanation(trip, traveler, segments, overallScore || 85);
    res.json({ success: true, ...explanationResult });
  } catch (err) {
    next(err);
  }
});

// 12. Apply Dynamic Event (Resilience Engine)
app.post("/api/journey/event", optionalAuth, async (req, res, next) => {
  try {
    const { journeyState, event } = req.body;

    if (!journeyState || !event) {
      return res.status(400).json({ success: false, error: "Missing journeyState or event payload." });
    }

    const weights = deriveTravelerWeights(journeyState.traveler || DEFAULT_TRAVELER);

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
    const newRecRoute = eventResult.affectedSegment.candidateRoutes?.find(r => r.isRecommended);
    const explanationResult = await generateAdaptationExplanation(
      eventResult.eventRecord,
      eventResult.affectedSegment,
      newRecRoute,
      journeyState.traveler || DEFAULT_TRAVELER,
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
    next(err);
  }
});

// 13. Operations Center — Fleet Status
app.get("/api/operations/fleet", optionalAuth, (req, res) => {
  res.json({
    success: true,
    totalActive: 24,
    stable: 18,
    monitoring: 4,
    atRisk: 2,
    systemStatus: "ALL ENGINES OPERATIONAL",
    securityStatus: "HARDENED",
    timestamp: new Date().toISOString()
  });
});

// 14. Serve frontend static build if available
const clientDistPath = path.resolve(__dirname, "../client/dist");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
  }));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.resolve(clientDistPath, "index.html"));
  });
}

// 15. Centralized Safe Error Handling Middleware
app.use(errorHandler);

// Start listening
app.listen(PORT, () => {
  securityLogger.info(`[WAYFARER API v2.2-Hardened] Listening on port ${PORT}`);
  securityLogger.info(`[Security Policy] Helmet CSP, Strict CORS, Rate Limiting & Auth Layer Active`);
});
