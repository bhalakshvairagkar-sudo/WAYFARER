/**
 * WAYFARER AI - Weather Digital Twin REST API Routes
 * 
 * Endpoints:
 * - GET  /api/digital-twin/current        : Real-time Digital Twin state snapshot
 * - POST /api/digital-twin/simulate       : What-If simulation runner (Strict Isolation)
 * - GET  /api/digital-twin/scenarios      : Pre-baked environmental what-if scenarios
 * - GET  /api/digital-twin/weather        : Live normalized meteorological observations
 * - GET  /api/digital-twin/social-signals : Civic and crowdsourced signals with TrustShield
 */

import express from "express";
import {
  buildDigitalTwinState,
  runWhatIfSimulation,
  PREBAKED_SCENARIOS
} from "../engine/digitalTwinEngine.js";
import { fetchLiveWeather } from "../engine/weatherProvider.js";
import { getSocialSignals } from "../engine/socialSignalProvider.js";
import { generateDigitalTwinExplanation } from "../engine/explanationEngine.js";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { aiRateLimiter } from "../middleware/rateLimiters.js";

const router = express.Router();

/**
 * GET /api/digital-twin/current
 * Retrieves the current authoritative Digital Twin state.
 */
router.get("/current", optionalAuth, async (req, res, next) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : 18.9401;
    const lng = req.query.lng ? parseFloat(req.query.lng) : 72.8354;

    const twinState = await buildDigitalTwinState({
      journeyState: req.body?.journeyState || null,
      simulationMode: false
    });

    const explanation = await generateDigitalTwinExplanation(twinState);

    res.json({
      success: true,
      twinState,
      aiExplanation: explanation.explanation,
      aiSource: explanation.source,
      aiBadge: explanation.badge
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/digital-twin/simulate
 * Executes a counterfactual What-If simulation without mutating live state.
 */
router.post("/simulate", aiRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { journeyState, whatIfParams } = req.body || {};

    const simulationResult = await runWhatIfSimulation(
      journeyState || {},
      whatIfParams || { rainfallMm: 45, stormDurationHours: 2 }
    );

    const explanation = await generateDigitalTwinExplanation(
      simulationResult.simulatedTwin,
      simulationResult.comparison
    );

    res.json({
      success: true,
      ...simulationResult,
      aiExplanation: explanation.explanation,
      aiSource: explanation.source,
      aiBadge: explanation.badge
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/digital-twin/scenarios
 * Returns canonical pre-baked environmental what-if scenarios.
 */
router.get("/scenarios", (req, res) => {
  res.json({
    success: true,
    count: PREBAKED_SCENARIOS.length,
    scenarios: PREBAKED_SCENARIOS
  });
});

/**
 * GET /api/digital-twin/weather
 * Direct access to normalized meteorological telemetry.
 */
router.get("/weather", async (req, res, next) => {
  try {
    const lat = req.query.lat ? parseFloat(req.query.lat) : 18.9220;
    const lng = req.query.lng ? parseFloat(req.query.lng) : 72.8347;

    const weather = await fetchLiveWeather({ lat, lng });
    res.json({
      success: true,
      weather
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/digital-twin/social-signals
 * Retrieves verified civic & community signals with 3-tier TrustShield confidence.
 */
router.get("/social-signals", (req, res) => {
  const lat = req.query.lat ? parseFloat(req.query.lat) : 18.9220;
  const lng = req.query.lng ? parseFloat(req.query.lng) : 72.8347;
  const topic = req.query.topic || null;

  const signals = getSocialSignals({ lat, lng, topic });
  res.json({
    success: true,
    count: signals.length,
    signals
  });
});

export default router;
