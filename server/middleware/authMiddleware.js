/**
 * WAYFARER AI - Authentication & Role-Based Access Control (RBAC) Middleware
 * Verifies cryptographically signed JWT tokens, enforces role privileges,
 * and eliminates IDOR/BOLA by strictly checking resource ownership.
 */

import jwt from 'jsonwebtoken';
import { securityLogger } from '../utils/securityLogger.js';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '' || secret === 'your_jwt_secret_here') {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET must be configured in production!');
    }
    // Stable development/demo fallback secret
    return 'wayfarer_dev_fallback_secret_not_for_prod_982347102934';
  }
  return secret;
}

/**
 * 1. Strict JWT Authentication Middleware
 * Returns 401 Unauthorized for missing, invalid, or expired tokens.
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    securityLogger.auth('TOKEN_MISSING', {
      ip: req.ip,
      reason: 'No Bearer token provided in Authorization header'
    });
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please provide a valid Bearer token.'
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded; // { id, email, role, iat, exp }
    next();
  } catch (err) {
    securityLogger.auth('TOKEN_INVALID', {
      ip: req.ip,
      reason: err.message
    });
    return res.status(401).json({
      success: false,
      error: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid authentication token.'
    });
  }
}

/**
 * 2. Optional Authentication Middleware
 * Populates req.user if a valid token is passed; proceeds as guest otherwise.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (token) {
    try {
      req.user = jwt.verify(token, getJwtSecret());
    } catch (e) {
      // Ignored for optional auth routes (treated as guest)
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

/**
 * 3. Role-Based Access Control (RBAC) Middleware
 * Enforces role restrictions ('USER', 'ADMIN', 'EMERGENCY_CONTACT', etc.)
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      securityLogger.violation('RBAC_ROLE_DENIED', {
        ip: req.ip,
        path: req.originalUrl,
        reason: `User ${req.user.id} with role '${req.user.role}' attempted access to role-restricted route [${allowedRoles.join(', ')}]`
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden: Insufficient role permissions for this operation.'
      });
    }

    next();
  };
}

/**
 * 4. Object-Level Ownership & IDOR Protection Middleware
 * Verifies that the authenticated user owns the resource or has ADMIN privileges.
 */
export function verifyOwnershipOrRole(getUserIdFromReq, allowedRoles = ['ADMIN']) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const targetUserId = typeof getUserIdFromReq === 'function' ? getUserIdFromReq(req) : req.params[getUserIdFromReq || 'userId'];

    const isOwner = req.user.id === targetUserId;
    const hasElevatedRole = allowedRoles.includes(req.user.role);

    if (!isOwner && !hasElevatedRole) {
      securityLogger.violation('IDOR_ATTEMPT_BLOCKED', {
        ip: req.ip,
        path: req.originalUrl,
        reason: `User ${req.user.id} attempted to access or modify resource belonging to user ${targetUserId}`
      });

      return res.status(403).json({
        success: false,
        error: 'Forbidden: You do not have permission to access or modify this resource.'
      });
    }

    next();
  };
}
