/**
 * WAYFARER AI - Location Data Protection & Privacy API Routes
 * Implements strict server-side authorization, IDOR prevention, data minimization,
 * configurable retention, and cryptographically secure ephemeral location sharing.
 */

import express from 'express';
import crypto from 'crypto';
import { z } from 'zod';

import { LocationHistory, minimizeCoordinates } from '../models/LocationHistory.js';
import { LocationShare } from '../models/LocationShare.js';
import { isUsingMemoryFallback, inMemoryStore } from '../config/db.js';
import { authenticateToken, requireRole } from '../middleware/authMiddleware.js';
import { locationRateLimiter } from '../middleware/rateLimiters.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { securityLogger } from '../utils/securityLogger.js';

const router = express.Router();

const updateLocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(50000).optional().default(10),
  precision: z.enum(['precise', 'approximate']).optional(),
  journeyId: z.string().max(100).optional().default('default-active-journey')
});

const startShareSchema = z.object({
  durationMinutes: z.number().min(5).max(1440).optional().default(30),
  recipientLabel: z.string().max(100).optional().default('Emergency Contact'),
  precision: z.enum(['precise', 'approximate']).optional().default('precise'),
  initialLat: z.number().min(-90).max(90),
  initialLng: z.number().min(-180).max(180)
});

// 1. Update User Location (Data Minimization & Retention Enforcement)
router.post('/update', authenticateToken, locationRateLimiter, validateBody(updateLocationSchema), async (req, res, next) => {
  try {
    const { lat, lng, accuracy, precision, journeyId } = req.body;
    const userId = req.user.id;

    // Apply data minimization if requested or if user preference is approximate
    const userPrecision = precision || req.user.privacySettings?.locationPrecision || 'precise';
    const minimized = minimizeCoordinates(lat, lng, userPrecision);

    const retentionDays = parseInt(process.env.LOCATION_HISTORY_RETENTION_DAYS, 10) || 30;
    const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    if (isUsingMemoryFallback()) {
      // Memory fallback breadcrumbs
      if (!inMemoryStore.locationHistory.has(userId)) {
        inMemoryStore.locationHistory.set(userId, []);
      }
      const historyList = inMemoryStore.locationHistory.get(userId);
      historyList.push({
        id: `loc-${Date.now()}`,
        userId,
        journeyId,
        lat: minimized.lat,
        lng: minimized.lng,
        precision: minimized.precision,
        recordedAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      });

      // Keep in-memory slice bounded
      if (historyList.length > 500) historyList.shift();

      // Update any active temporary shares
      for (const share of inMemoryStore.locationShares.values()) {
        if (share.userId === userId && share.isActive && new Date(share.expiresAt) > new Date()) {
          share.currentLocation = {
            lat: minimized.lat,
            lng: minimized.lng,
            accuracy,
            updatedAt: new Date().toISOString()
          };
        }
      }
    } else {
      // MongoDB Atlas insertion
      const record = new LocationHistory({
        userId,
        journeyId,
        lat: minimized.lat,
        lng: minimized.lng,
        precision: minimized.precision,
        expiresAt
      });
      await record.save();

      // Update active shares
      await LocationShare.updateMany(
        { userId, isActive: true, expiresAt: { $gt: new Date() } },
        {
          $set: {
            currentLocation: {
              lat: minimized.lat,
              lng: minimized.lng,
              accuracy,
              updatedAt: new Date()
            }
          }
        }
      );
    }

    securityLogger.locationAccess('LOCATION_UPDATED', {
      requesterId: userId,
      targetId: userId,
      ip: req.ip,
      allowed: true,
      reason: `Precision: ${minimized.precision}`
    });

    res.json({
      success: true,
      precision: minimized.precision,
      coordinates: minimized
    });
  } catch (err) {
    next(err);
  }
});

// 2. Retrieve Own Location History (Strict Ownership / Anti-IDOR)
router.get('/history', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    if (isUsingMemoryFallback()) {
      const records = (inMemoryStore.locationHistory.get(userId) || [])
        .slice(-limit)
        .reverse();

      securityLogger.locationAccess('LOCATION_HISTORY_VIEW', {
        requesterId: userId,
        targetId: userId,
        allowed: true
      });

      return res.json({ success: true, count: records.length, history: records });
    }

    const history = await LocationHistory.find({ userId })
      .sort({ recordedAt: -1 })
      .limit(limit)
      .lean();

    securityLogger.locationAccess('LOCATION_HISTORY_VIEW', {
      requesterId: userId,
      targetId: userId,
      allowed: true
    });

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (err) {
    next(err);
  }
});

// 3. User-Controlled Location History Deletion (Right to Be Forgotten)
router.delete('/history', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (isUsingMemoryFallback()) {
      inMemoryStore.locationHistory.delete(userId);
      securityLogger.info(`Purged in-memory location history for user ${userId}`);
      return res.json({ success: true, message: 'All personal location history has been permanently deleted.' });
    }

    const result = await LocationHistory.deleteMany({ userId });

    securityLogger.info(`Purged MongoDB location history for user ${userId} (${result.deletedCount} records removed)`);

    res.json({
      success: true,
      message: 'All personal location history has been permanently deleted.',
      deletedCount: result.deletedCount
    });
  } catch (err) {
    next(err);
  }
});

// 4. Start Ephemeral Location Sharing Session (30-min Default)
router.post('/share/start', authenticateToken, validateBody(startShareSchema), async (req, res, next) => {
  try {
    const { durationMinutes, recipientLabel, precision, initialLat, initialLng } = req.body;
    const userId = req.user.id;

    const shareToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    const minimized = minimizeCoordinates(initialLat, initialLng, precision);

    if (isUsingMemoryFallback()) {
      const shareEntry = {
        userId,
        shareToken,
        recipientLabel,
        precision,
        currentLocation: {
          lat: minimized.lat,
          lng: minimized.lng,
          accuracy: 10,
          updatedAt: new Date().toISOString()
        },
        isActive: true,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      };
      inMemoryStore.locationShares.set(shareToken, shareEntry);
    } else {
      const share = new LocationShare({
        userId,
        shareToken,
        recipientLabel,
        precision,
        currentLocation: {
          lat: minimized.lat,
          lng: minimized.lng,
          accuracy: 10,
          updatedAt: new Date()
        },
        expiresAt
      });
      await share.save();
    }

    securityLogger.locationAccess('SHARE_SESSION_STARTED', {
      requesterId: userId,
      targetId: userId,
      allowed: true,
      reason: `Duration: ${durationMinutes}m | Recipient: ${recipientLabel}`
    });

    res.status(201).json({
      success: true,
      shareToken,
      expiresAt: expiresAt.toISOString(),
      durationMinutes,
      shareUrl: `/shared-location/${shareToken}`
    });
  } catch (err) {
    next(err);
  }
});

// 5. Stop / Revoke Active Location Sharing Sessions
router.post('/share/stop', authenticateToken, async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (isUsingMemoryFallback()) {
      for (const [token, share] of inMemoryStore.locationShares.entries()) {
        if (share.userId === userId) {
          share.isActive = false;
        }
      }
    } else {
      await LocationShare.updateMany({ userId }, { $set: { isActive: false } });
    }

    securityLogger.locationAccess('SHARE_SESSIONS_REVOKED', {
      requesterId: userId,
      targetId: userId,
      allowed: true
    });

    res.json({
      success: true,
      message: 'Active location sharing sessions revoked.'
    });
  } catch (err) {
    next(err);
  }
});

// 6. View Ephemeral Shared Location via Token (Public / Emergency Contact)
router.get('/shared/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    let share = null;
    if (isUsingMemoryFallback()) {
      share = inMemoryStore.locationShares.get(token);
    } else {
      share = await LocationShare.findOne({ shareToken: token }).lean();
    }

    if (!share || !share.isActive || new Date(share.expiresAt) <= new Date()) {
      securityLogger.locationAccess('SHARED_LOCATION_EXPIRED', {
        requesterId: 'anonymous',
        targetId: share?.userId || 'unknown',
        allowed: false,
        reason: 'Token expired or revoked'
      });

      return res.status(410).json({
        success: false,
        error: 'Location sharing session has expired or was revoked by traveler.'
      });
    }

    securityLogger.locationAccess('SHARED_LOCATION_VIEWED', {
      requesterId: 'recipient',
      targetId: share.userId,
      allowed: true
    });

    res.json({
      success: true,
      recipientLabel: share.recipientLabel,
      precision: share.precision,
      currentLocation: share.currentLocation,
      expiresAt: share.expiresAt
    });
  } catch (err) {
    next(err);
  }
});

export default router;
