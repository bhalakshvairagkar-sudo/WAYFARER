/**
 * WAYFARER AI - Multi-Tier Rate Limiting Middleware
 * Protects authentication endpoints, location tracking, and AI parsing against brute-force and DoS.
 */

import rateLimit from 'express-rate-limit';
import { securityLogger } from '../utils/securityLogger.js';

const createLimiter = (options) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      securityLogger.violation('RATE_LIMIT_EXCEEDED', {
        ip: clientIp,
        path: req.originalUrl,
        method: req.method,
        reason: options.message
      });

      res.status(429).json({
        success: false,
        error: options.message || 'Too many requests. Please try again later.',
        retryAfterSeconds: Math.ceil(options.windowMs / 1000)
      });
    },
    ...options
  });
};

// 1. Strict Authentication Limiter (5 requests per 15 minutes)
export const authRateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts from this IP. Please wait 15 minutes before trying again.'
});

// 2. Sensitive Location API Limiter (60 requests per minute)
export const locationRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Location update rate limit exceeded. Updates restricted to 60 per minute.'
});

// 3. AI / LLM Generation Limiter (20 requests per 5 minutes)
export const aiRateLimiter = createLimiter({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: 'AI generation limit reached for this session. Please wait a few moments.'
});

// 4. General Global API Limiter (150 requests per 15 minutes)
export const generalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 150,
  message: 'API request volume exceeded. Please slow down.'
});
