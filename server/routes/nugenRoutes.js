/**
 * WAYFARER AI - Nugen Intelligence REST API Routes
 * 
 * Endpoints:
 * - GET  /api/ai/nugen/status     : Status probe for Nugen alignment & model deployment
 * - POST /api/ai/nugen/predict    : Execute domain prediction for weather, traveler & route
 * - GET  /api/ai/nugen/alignment  : Public alignment metadata and training parameters
 * - POST /api/ai/nugen/evaluate   : Trigger or retrieve domain benchmark evaluation results
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  predictDomainImpact,
  getNugenModelStatus,
  validateNugenOutput,
  normalizeNugenInput
} from '../services/nugenWayfarerModel.js';
import { runEvaluation } from '../../ai/nugen/evaluation/evaluate.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { aiRateLimiter } from '../middleware/rateLimiters.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const ALIGNMENT_JSON_PATH = path.resolve(__dirname, '../../ai/nugen/alignment/alignment.json');
const REPORT_JSON_PATH = path.resolve(__dirname, '../../ai/nugen/evaluation/results/evaluation_report.json');

/**
 * GET /api/ai/nugen/status
 * Safe public status probe for Nugen alignment, base model, and model ID
 */
router.get('/status', (req, res) => {
  try {
    const status = getNugenModelStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/ai/nugen/alignment
 * Retrieves alignment configuration metadata
 */
router.get('/alignment', (req, res) => {
  try {
    if (fs.existsSync(ALIGNMENT_JSON_PATH)) {
      const data = JSON.parse(fs.readFileSync(ALIGNMENT_JSON_PATH, 'utf-8'));
      return res.json({ success: true, alignment: data });
    }
    res.json({
      success: true,
      alignment: {
        alignment_name: 'WAYFARER-Weather-DigitalTwin-Alignment',
        base_model_id: 'qwen-v2p5-0p5b-instruct',
        deployed_model_id: 'wayfarer-weather-twin-v1',
        status: 'READY'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/ai/nugen/predict
 * Executes domain prediction using the Nugen Aligned Model (or deterministic fallback)
 */
router.post('/predict', aiRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const inputData = req.body || {};
    const prediction = await predictDomainImpact(inputData);

    const isValid = validateNugenOutput(prediction);
    res.json({
      success: true,
      schemaValid: isValid,
      prediction
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/ai/nugen/evaluate
 * Triggers or returns the domain evaluation benchmark
 */
router.post('/evaluate', aiRateLimiter, optionalAuth, async (req, res, next) => {
  try {
    const rerun = Boolean(req.body?.rerun);
    if (!rerun && fs.existsSync(REPORT_JSON_PATH)) {
      const report = JSON.parse(fs.readFileSync(REPORT_JSON_PATH, 'utf-8'));
      return res.json({ success: true, cached: true, report });
    }

    const report = await runEvaluation();
    res.json({
      success: true,
      cached: false,
      report
    });
  } catch (err) {
    next(err);
  }
});

export default router;
