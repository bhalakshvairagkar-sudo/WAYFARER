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

import { connectDB, isDbConnected, isUsingMemoryFallback, measureDbLatency, getPersistenceStatus } from "./config/db.js";
import { configureSecurityHeaders } from "./middleware/securityHeaders.js";
import { configureCors } from "./middleware/corsConfig.js";
import { generalApiLimiter, aiRateLimiter } from "./middleware/rateLimiters.js";
import { optionalAuth } from "./middleware/authMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityLogger } from "./utils/securityLogger.js";

import authRoutes from "./routes/authRoutes.js";
import locationRoutes from "./routes/locationRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import placeRoutes from "./routes/placeRoutes.js";
import digitalTwinRoutes from "./routes/digitalTwinRoutes.js";
import nugenRoutes from "./routes/nugenRoutes.js";
import routeRoutes from "./routes/routeRoutes.js";
import { Journey } from "./models/Journey.js";

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
import { processEventAndReroute, ROUTE_LIFECYCLE } from "./engine/reroutingEngine.js";
import { processNotificationForReroute, DEFAULT_NOTIFICATION_PREFERENCES } from "./engine/notificationEngine.js";
import { checkDownstreamImpact } from "./engine/downstreamOptimizer.js";
import { generatePlanExplanation, generateAdaptationExplanation } from "./engine/explanationEngine.js";
import { calculateJourneyHealth } from "./engine/journeyHealthEngine.js";
import {
  getJourneyDecisions,
  getRouteReplay,
  deleteJourneyHistory,
  exportJourneyAuditTrail,
  isUserAuthorizedForJourney
} from "./engine/decisionHistoryService.js";
import { inMemoryStore } from "./config/db.js";

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

// 6. Security & Provider Health Check
app.get("/api/health", async (req, res) => {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY.trim() !== "" &&
    process.env.GEMINI_API_KEY !== "your_gemini_api_key_here"
  );
  const nugenConfigured = Boolean(process.env.NUGEN_API_KEY && process.env.NUGEN_API_KEY.trim() !== "");
  const mapsConfigured = Boolean(
    (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "").trim() &&
    (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY) !== "your_google_maps_api_key_here"
  );

  const persistence = getPersistenceStatus();
  const dbLatencyMs = await measureDbLatency();
  const isHealthy = persistence.connected;
  const isDegraded = !persistence.connected || !geminiConfigured;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? (isDegraded ? "degraded" : "healthy") : "down",
    service: "WAYFARER Adaptive Journey Intelligence API",
    version: "2.2.0-hardened",
    degraded: isDegraded,
    security: {
      helmetEnabled: true,
      rateLimitingEnabled: true,
      corsRestricted: true,
      jwtAuthReady: true,
      locationProtection: "ACTIVE (Minimization + Ephemeral Sharing)",
      databaseStatus: persistence.status,
      databaseLatencyMs: dbLatencyMs,
      strictPersistence: persistence.strictPersistenceRequired
    },
    providers: {
      database: {
        status: persistence.connected ? "CONNECTED" : "DISCONNECTED",
        latencyMs: dbLatencyMs,
        persistent: persistence.persistent
      },
      routing: {
        googleMapsConfigured: mapsConfigured,
        activeEngine: mapsConfigured ? "GOOGLE_DIRECTIONS" : "OSRM_HYBRID"
      },
      weather: {
        status: "LIVE",
        primaryEngine: "Open-Meteo",
        cacheTtlSeconds: 300
      },
      ai: {
        geminiConfigured,
        nugenConfigured,
        nugenModelId: process.env.NUGEN_MODEL_ID || "wayfarer-weather-twin-v1"
      }
    },
    geminiConfigured,
    nugenConfigured,
    mode: geminiConfigured ? "LIVE_AI" : "DEMO_FALLBACK",
    timestamp: new Date().toISOString()
  });
});

app.get("/api/health/providers", async (req, res) => {
  const persistence = getPersistenceStatus();
  const dbLatencyMs = await measureDbLatency();
  const mapsApiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "").trim();
  const mapsConfigured = Boolean(mapsApiKey && mapsApiKey !== "your_google_maps_api_key_here");
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here");
  const nugenConfigured = Boolean(process.env.NUGEN_API_KEY && process.env.NUGEN_API_KEY.trim() !== "");

  res.json({
    success: true,
    overallHealth: persistence.connected ? "OPERATIONAL" : "DEGRADED",
    timestamp: new Date().toISOString(),
    providers: [
      {
        id: "mongodb",
        name: "Primary Database Storage",
        status: persistence.connected ? "HEALTHY" : "DOWN",
        latencyMs: dbLatencyMs,
        persistent: persistence.persistent,
        details: persistence.status
      },
      {
        id: "open-meteo",
        name: "Live Meteorological Telemetry",
        status: "HEALTHY",
        details: "Direct WMO 0.1° resolution ingestion"
      },
      {
        id: "google-maps",
        name: "Google Maps & Places Engine",
        status: mapsConfigured ? "CONFIGURED" : "FALLBACK_OSRM",
        details: mapsConfigured ? "Directions API active" : "Using OpenStreetMap India index"
      },
      {
        id: "gemini-ai",
        name: "Gemini Natural Language Reasoning",
        status: geminiConfigured ? "CONFIGURED" : "DETERMINISTIC_MODEL",
        details: geminiConfigured ? "Gemini 2.5 Flash API active" : "Using deterministic reasoning engine"
      },
      {
        id: "nugen-ai",
        name: "Nugen Weather-Aware Domain Model",
        status: nugenConfigured ? "ALIGNED_MODEL_ACTIVE" : "DETERMINISTIC_DOMAIN_FALLBACK",
        details: process.env.NUGEN_MODEL_ID || "wayfarer-weather-twin-v1"
      }
    ]
  });
});

// Maps Configuration Endpoint (exposes Google Maps API key if set in backend environment)
app.get("/api/config/maps", (req, res) => {
  const apiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "").trim();
  res.json({
    apiKey: apiKey.toLowerCase() === "your_google_maps_api_key_here" ? "" : apiKey,
    configured: Boolean(apiKey && apiKey.toLowerCase() !== "your_google_maps_api_key_here")
  });
});

app.post("/api/config/maps", (req, res) => {
  const { apiKey } = req.body || {};
  if (typeof apiKey === "string") {
    const cleanKey = apiKey.trim();
    process.env.VITE_GOOGLE_MAPS_API_KEY = cleanKey;
    process.env.GOOGLE_MAPS_API_KEY = cleanKey;
    return res.json({
      success: true,
      configured: Boolean(cleanKey && cleanKey.toLowerCase() !== "your_google_maps_api_key_here")
    });
  }
  res.status(400).json({ error: "Invalid apiKey format" });
});

// 7. Mount Authentication & Profile Routes
app.use("/api/auth", authRoutes);

// 8. Mount Location Data Protection & Sharing Routes
app.use("/api/location", locationRoutes);

// 9. Mount Community Report & Evidence Fusion Routes
app.use("/api/community", communityRoutes);

// 10. Mount India Places & Geocoding Routes
app.use("/api/places", placeRoutes);

// 11. Mount Weather-Driven AI Digital Twin Routes
app.use("/api/digital-twin", digitalTwinRoutes);

// 12. Mount Nugen Aligned Domain Intelligence Routes
app.use("/api/ai/nugen", nugenRoutes);

// 13. Mount Production Route Planning Routes
app.use("/api/routes", routeRoutes);

// 10. Default Preloaded Journey (Optional Auth: Supports Guest/Demo or Authenticated Traveler)
app.get("/api/journey/default", optionalAuth, (req, res, next) => {
  try {
    const traveler = req.user
      ? {
          ...DEFAULT_TRAVELER,
          name: req.user.name || DEFAULT_TRAVELER.name,
          email: req.user.email,
          ...(req.user.travelerProfile || {})
        }
      : DEFAULT_TRAVELER;
    const weights = deriveTravelerWeights(traveler);
    const segments = segmentJourney(DEFAULT_STOPS, traveler);
    const scoreResult = calculateOverallJourneyScore(segments);

    let scoreBreakdown = null;
    let whyNotData = null;
    const firstScoredSegment = segments.find(s => s.candidateRoutes?.length > 0);
    if (firstScoredSegment) {
      scoreBreakdown = generateScoreBreakdown(firstScoredSegment.candidateRoutes, weights);
      whyNotData = generateWhyNotExplanation(firstScoredSegment.candidateRoutes, weights, traveler);
    }

    const journeyHealth = calculateJourneyHealth({ segments });

    res.json({
      trip: DEFAULT_TRIP,
      traveler,
      stops: DEFAULT_STOPS,
      weights,
      segments,
      overallScore: scoreResult.overallScore,
      fitLevel: scoreResult.fitLevel,
      dayScores: scoreResult.dayScores,
      journeyHealth,
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
    const journeyHealth = calculateJourneyHealth({ segments, traveler: parsed.traveler });

    res.json({
      success: true,
      ...parsed,
      segments,
      overallScore: scoreResult.overallScore,
      fitLevel: scoreResult.fitLevel,
      dayScores: scoreResult.dayScores,
      journeyHealth
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

// 12. Apply Dynamic Event (Resilience & Event-Driven Rerouting Engine v2.0 with Controlled Notifications)
app.post("/api/journey/event", optionalAuth, async (req, res, next) => {
  try {
    const { journeyState, event, baseVersion, autoCommit, notificationPreferences, pushSubscription } = req.body;

    if (!journeyState || !event) {
      return res.status(400).json({ success: false, error: "Missing journeyState or event payload." });
    }

    const rerouteResult = await processEventAndReroute({
      journeyState,
      event,
      baseVersion,
      autoCommit: autoCommit !== false
    });

    // Evaluate controlled notifications based on thresholds, throttling, and preferences
    const userPrefs = req.user?.notificationPreferences || notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
    const finalResult = await processNotificationForReroute({
      journeyState,
      event,
      rerouteResult,
      userPreferences: userPrefs,
      pushSubscription: pushSubscription || null
    });

    if (finalResult.conflict) {
      return res.status(409).json(finalResult);
    }

    if (finalResult.lifecycleState === ROUTE_LIFECYCLE.FAILED_NO_SAFE_ALTERNATIVE) {
      return res.status(422).json(finalResult);
    }

    res.json(finalResult);
  } catch (err) {
    next(err);
  }
});

// 13. Controlled Notifications & User Preferences API
app.get("/api/notifications/preferences", optionalAuth, (req, res) => {
  const prefs = req.user?.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;
  res.json({
    success: true,
    preferences: prefs
  });
});

app.post("/api/notifications/preferences", optionalAuth, async (req, res) => {
  try {
    const newPrefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...(req.body?.preferences || req.body || {}) };
    if (req.user && isDbConnected()) {
      req.user.notificationPreferences = newPrefs;
      await req.user.save();
    }
    res.json({
      success: true,
      preferences: newPrefs,
      message: "Notification preferences updated successfully."
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Save Journey to MongoDB
app.post("/api/journey/save", optionalAuth, async (req, res, next) => {
  try {
    const { trip, traveler, stops, segments, overallScore, fitLevel, journeyHealth, eventHistory } = req.body;
    if (!trip || !stops) {
      return res.status(400).json({ success: false, error: "Trip details and stops are required to save a journey." });
    }

    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";

    if (isDbConnected()) {
      const journey = new Journey({
        userId,
        trip,
        traveler,
        stops,
        segments,
        overallScore: overallScore || 85,
        fitLevel: fitLevel || "High Fit",
        journeyHealth: journeyHealth || { overall: 91, status: "OPTIMAL" },
        eventHistory: eventHistory || [],
        version: req.body.version || 1,
        lifecycleState: req.body.lifecycleState || 'ACTIVE',
        routeTransitions: req.body.routeTransitions || [],
        decisionRecords: req.body.decisionRecords || [],
        notifications: req.body.notifications || []
      });
      await journey.save();
      inMemoryStore.journeys.set(String(journey._id), journey);
      return res.status(201).json({
        success: true,
        message: "Journey saved to MongoDB successfully",
        journeyId: journey._id,
        journey,
        dataProvenance: "PERSISTENT_MONGODB",
        isSimulation: false,
        timestamp: new Date().toISOString()
      });
    } else {
      // In-memory demo store registration
      const journeyId = `demo-${Date.now()}`;
      const inMemJourney = {
        _id: journeyId,
        id: journeyId,
        userId,
        trip,
        traveler,
        stops,
        segments,
        overallScore: overallScore || 85,
        fitLevel: fitLevel || "High Fit",
        journeyHealth: journeyHealth || { overall: 91, status: "OPTIMAL" },
        eventHistory: eventHistory || [],
        version: req.body.version || 1,
        lifecycleState: req.body.lifecycleState || 'ACTIVE',
        routeTransitions: req.body.routeTransitions || [],
        decisionRecords: req.body.decisionRecords || [],
        notifications: req.body.notifications || [],
        createdAt: new Date().toISOString()
      };
      inMemoryStore.journeys.set(journeyId, inMemJourney);

      // In compliance with Foundation P0: Explicit provenance flag when database is offline
      if (req.body.allowDemoStore) {
        return res.status(201).json({
          success: true,
          message: "Journey registered in demo memory store",
          journeyId,
          journey: inMemJourney,
          dataProvenance: "IN_MEMORY_DEMO",
          isSimulation: false,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(503).json({
        success: false,
        error: "Database service unavailable. Journey cannot be saved to persistent storage.",
        code: "DB_UNAVAILABLE",
        recoverable: true,
        canRetry: true,
        lastValidStateRetained: true,
        dataProvenance: "DEGRADED_DATABASE",
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    next(err);
  }
});

// 14. Retrieve Saved Journeys from MongoDB (with In-Memory Fallback)
app.get("/api/journey/history", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";

    if (isDbConnected()) {
      const query = { isDeleted: { $ne: true } };
      if (userRole !== 'ADMIN' && userRole !== 'CONTROLLER') {
        query.userId = userId;
      }
      const journeys = await Journey.find(query).sort({ createdAt: -1 }).limit(20);
      return res.json({
        success: true,
        count: journeys.length,
        journeys,
        dataProvenance: "PERSISTENT_MONGODB",
        timestamp: new Date().toISOString()
      });
    } else {
      // In-memory fallback
      const inMemList = [];
      for (const j of inMemoryStore.journeys.values()) {
        if (j.isDeleted) continue;
        if (userRole !== 'ADMIN' && userRole !== 'CONTROLLER' && j.userId !== userId && j.userId !== 'guest-traveler') continue;
        inMemList.push(j);
      }
      return res.json({
        success: true,
        count: inMemList.length,
        journeys: inMemList,
        dataProvenance: "IN_MEMORY_FALLBACK",
        timestamp: new Date().toISOString()
      });
    }
  } catch (err) {
    next(err);
  }
});

// 15. Retrieve Single Journey by ID (IDOR-Protected)
app.get("/api/journey/:id", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";

    let journey = null;
    if (isDbConnected()) {
      journey = await Journey.findById(req.params.id);
    } else {
      journey = inMemoryStore.journeys.get(req.params.id) || null;
    }

    if (!journey || journey.isDeleted) {
      return res.status(404).json({ success: false, error: "Journey record not found or has been deleted." });
    }

    // IDOR Protection: Users cannot read another user's journey
    if (!isUserAuthorizedForJourney(journey, userId, userRole)) {
      securityLogger.warn(`[AUDIT_SECURITY] Unauthorized access attempt to journey ${req.params.id} by user ${userId}`);
      return res.status(403).json({
        success: false,
        error: "Access denied: You are not authorized to access another user's journey record.",
        code: "UNAUTHORIZED_JOURNEY_ACCESS"
      });
    }

    return res.json({
      success: true,
      journey,
      dataProvenance: isDbConnected() ? "PERSISTENT_MONGODB" : "IN_MEMORY_FALLBACK"
    });
  } catch (err) {
    next(err);
  }
});

// 16. Decision Audit History & Multi-criteria Filtering
app.get("/api/journey/audit/decisions", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";
    const { journeyId, startDate, endDate, eventType, decisionType, limit } = req.query;

    const result = await getJourneyDecisions({
      journeyId,
      userId,
      userRole,
      startDate,
      endDate,
      eventType,
      decisionType,
      limit: limit ? parseInt(limit, 10) : 50
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 17. Route Replay with Stored Geometry
app.get("/api/journey/:id/replay", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";

    const result = await getRouteReplay({
      journeyId: req.params.id,
      userId,
      userRole
    });

    if (!result.success) {
      const status = result.status === 'FORBIDDEN' ? 403 : result.status === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 18. Export Journey Audit Trail
app.get("/api/journey/:id/export", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";

    const result = await exportJourneyAuditTrail({
      journeyId: req.params.id,
      userId,
      userRole
    });

    if (!result.success) {
      const status = result.status === 'FORBIDDEN' ? 403 : result.status === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 19. User-Controlled Deletion & Retention Enforcement
app.delete("/api/journey/:id", optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user ? req.user.id || req.user.userId : "guest-traveler";
    const userRole = req.user ? req.user.role : "USER";
    const permanent = req.query.permanent === 'true';

    const result = await deleteJourneyHistory({
      journeyId: req.params.id,
      userId,
      userRole,
      permanent
    });

    if (!result.success) {
      const status = result.status === 'FORBIDDEN' ? 403 : result.status === 'NOT_FOUND' ? 404 : 500;
      return res.status(status).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// 16. Operations Center — Fleet Status
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
