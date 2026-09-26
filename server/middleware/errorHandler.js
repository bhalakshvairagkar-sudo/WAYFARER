/**
 * WAYFARER AI - Centralized Safe Error Handling Middleware
 * Prevents information disclosure, hides stack traces in production,
 * and maintains structured security logging.
 */

import { securityLogger } from '../utils/securityLogger.js';

export function errorHandler(err, req, res, next) {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  // Structured security logging of the actual error
  securityLogger.error(`Unhandled error during ${req.method} ${req.originalUrl}`, err, {
    statusCode,
    ip: req.ip,
    userId: req.user?.id || 'anonymous'
  });

  // Client-safe response
  res.status(statusCode).json({
    success: false,
    error: isProduction && statusCode === 500
      ? 'An internal security-compliant error occurred. Please contact support.'
      : err.message || 'An unexpected error occurred.',
    ...(isProduction ? {} : { stack: err.stack })
  });
}
