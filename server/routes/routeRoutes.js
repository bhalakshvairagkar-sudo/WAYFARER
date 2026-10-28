/**
 * WAYFARER AI - Production Route Planning API Router
 * 
 * Exposes endpoints for calculating multi-alternative routes with real provider
 * geometries (Google Directions & OSRM), coordinate validation, and explicit provenance.
 */

import express from 'express';
import { z } from 'zod';
import { calculateProductionRoute, getRoutingStatus, clearRouteCache } from '../services/routingService.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

const coordinateSchema = z.object({
  lat: z.number({ required_error: 'Latitude is required and must be a number' })
    .min(-90, 'Latitude must be >= -90')
    .max(90, 'Latitude must be <= 90'),
  lng: z.number({ required_error: 'Longitude is required and must be a number' })
    .min(-180, 'Longitude must be >= -180')
    .max(180, 'Longitude must be <= 180'),
  name: z.string().optional()
});

const calculateRouteSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  waypoints: z.array(coordinateSchema).optional().default([]),
  travelMode: z.enum(['walking', 'driving', 'transit']).optional().default('walking'),
  traveler: z.object({
    mobility: z.string().optional(),
    stairsAllowed: z.boolean().optional(),
    needsElevator: z.boolean().optional(),
    safetyPriority: z.string().optional(),
    crowdTolerance: z.string().optional()
  }).optional().default({})
});

/**
 * POST /api/routes/calculate
 * Computes multi-alternative routes using real providers (Google / OSRM).
 * Rejects invalid coordinates; returns explicit UNAVAILABLE if providers fail.
 */
router.post('/calculate', optionalAuth, async (req, res, next) => {
  try {
    const parseResult = calculateRouteSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      return res.status(400).json({
        success: false,
        status: 'INVALID_INPUT',
        code: 'INVALID_COORDINATES',
        error: `${issue.path.join('.')}: ${issue.message}`,
        routes: []
      });
    }

    const { origin, destination, waypoints, travelMode, traveler } = parseResult.data;

    const result = await calculateProductionRoute({
      origin,
      destination,
      waypoints,
      travelMode,
      traveler: req.user?.travelerProfile ? { ...traveler, ...req.user.travelerProfile } : traveler,
      weatherImpact: req.body?.weatherImpact || null
    });

    if (!result.success) {
      const statusCode = result.code === 'INVALID_COORDINATES' ? 400 : 503;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/routes/status
 * Telemetry and provider status check for routing engines.
 */
router.get('/status', (req, res) => {
  const status = getRoutingStatus();
  res.json({
    success: true,
    ...status
  });
});

export default router;
