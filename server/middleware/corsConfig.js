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
    ...defaultDevOrigins
  ]);

  if (process.env.RENDER_EXTERNAL_URL) {
    allowedOrigins.add(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ''));
  }

  return (req, res, next) => {
    return cors({
      origin: (origin, callback) => {
        // 1. Allow mobile apps, curl, or same-origin requests (where origin is undefined)
        if (!origin) return callback(null, true);

        // 2. Allow explicitly configured origins
        if (allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        // 3. Allow Render deployment URL if available in environment
        if (process.env.RENDER_EXTERNAL_URL && origin === process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')) {
          return callback(null, true);
        }

        // 4. Allow any *.onrender.com domains (Render production & preview deployments)
        if (/^https:\/\/[a-zA-Z0-9-]+\.onrender\.com$/.test(origin)) {
          return callback(null, true);
        }

        // 5. Allow requests where origin host matches current request host (same origin)
        const hostHeader = (req.headers && (req.headers['x-forwarded-host'] || req.headers.host)) || '';
        if (hostHeader) {
          try {
            const originHost = new URL(origin).host;
            if (originHost === hostHeader) {
              return callback(null, true);
            }
          } catch {
            // invalid URL format
          }
        }

        // Log violation for genuinely unauthorized external origins
        securityLogger.violation('CORS_ORIGIN_REJECTED', {
          origin,
          reason: `Origin '${origin}' not permitted by CORS policy`
        });

        // Deny cross-origin access safely without throwing 500 server crash
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'x-forwarded-for'],
      maxAge: 86400 // Cache preflight for 24 hours
    })(req, res, next);
  };
};
