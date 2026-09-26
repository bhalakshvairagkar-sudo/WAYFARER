/**
 * WAYFARER AI - Strict CORS Configuration Middleware
 * Restricts cross-origin resource sharing to authenticated, explicit origins.
 * Never allows wildcard origins in production environments.
 */

import cors from 'cors';
import { securityLogger } from '../utils/securityLogger.js';

export const configureCors = () => {
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://localhost',
    'capacitor://localhost'
  ];

  const allowedOrigins = new Set([
    ...envOrigins,
    ...(process.env.NODE_ENV !== 'production' ? defaultDevOrigins : [])
  ]);

  return cors({
    origin: (origin, callback) => {
      // Allow mobile apps, curl, or same-origin server requests (where origin is undefined)
      if (!origin) return callback(null, true);

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      securityLogger.violation('CORS_ORIGIN_REJECTED', {
        reason: `Origin '${origin}' not permitted by CORS policy`
      });

      return callback(new Error('Cross-Origin Request Blocked by WAYFARER Security Policy'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'x-forwarded-for'],
    maxAge: 86400 // Cache preflight for 24 hours
  });
};
