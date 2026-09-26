/**
 * WAYFARER AI - Authentication & Profile API Routes
 * Implements secure registration, login with rate limiting, bcrypt hashing, and JWT token issuance.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

import { User } from '../models/User.js';
import { isUsingMemoryFallback, inMemoryStore } from '../config/db.js';
import { authenticateToken, getJwtSecret } from '../middleware/authMiddleware.js';
import { authRateLimiter } from '../middleware/rateLimiters.js';
import { validateBody } from '../middleware/validate.js';
import { securityLogger } from '../utils/securityLogger.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address').trim().toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(72, 'Password cannot exceed 72 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters long').max(100).trim(),
  role: z.enum(['USER', 'ADMIN', 'EMERGENCY_CONTACT', 'TRAVEL_PARTNER']).optional().default('USER'),
  privacySettings: z.object({
    locationPrecision: z.enum(['precise', 'approximate']).optional().default('precise'),
    allowSharing: z.boolean().optional().default(true),
    retentionDays: z.number().min(1).max(365).optional().default(30)
  }).optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

const privacySchema = z.object({
  locationPrecision: z.enum(['precise', 'approximate']).optional(),
  allowSharing: z.boolean().optional(),
  retentionDays: z.number().min(1).max(365).optional()
});

function signToken(user) {
  const expiresIn = process.env.JWT_EXPIRES_IN || '2h';
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    getJwtSecret(),
    { expiresIn }
  );
}

// 1. User Registration
router.post('/register', authRateLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name, role, privacySettings } = req.body;

    if (isUsingMemoryFallback()) {
      // In-Memory Fallback implementation
      if (inMemoryStore.users.has(email)) {
        return res.status(409).json({ success: false, error: 'User with this email already exists.' });
      }

      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      const newUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        email,
        name,
        role: role || 'USER',
        passwordHash,
        privacySettings: privacySettings || { locationPrecision: 'precise', allowSharing: true, retentionDays: 30 },
        createdAt: new Date().toISOString()
      };

      inMemoryStore.users.set(email, newUser);
      const token = signToken(newUser);

      securityLogger.auth('REGISTER_SUCCESS', {
        userId: newUser.id,
        email: newUser.email,
        ip: req.ip,
        success: true
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful',
        token,
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, privacySettings: newUser.privacySettings }
      });
    }

    // MongoDB Atlas implementation
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User with this email already exists.' });
    }

    const user = new User({
      email,
      passwordHash: password, // Pre-save hook hashes this
      name,
      role,
      privacySettings
    });

    await user.save();
    const token = signToken(user);

    securityLogger.auth('REGISTER_SUCCESS', {
      userId: user._id.toString(),
      email: user.email,
      ip: req.ip,
      success: true
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        privacySettings: user.privacySettings
      }
    });
  } catch (err) {
    next(err);
  }
});

// 2. User Login
router.post('/login', authRateLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    let user = null;
    let passwordMatch = false;

    if (isUsingMemoryFallback()) {
      user = inMemoryStore.users.get(email);
      if (user) {
        passwordMatch = await bcrypt.compare(password, user.passwordHash);
      }
    } else {
      user = await User.findOne({ email }).select('+passwordHash');
      if (user) {
        passwordMatch = await user.comparePassword(password);
      }
    }

    if (!user || !passwordMatch) {
      securityLogger.auth('LOGIN_FAILED', {
        email,
        ip: req.ip,
        success: false,
        reason: 'Invalid email or password credentials'
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const token = signToken(user);

    securityLogger.auth('LOGIN_SUCCESS', {
      userId: user._id ? user._id.toString() : user.id,
      email: user.email,
      ip: req.ip,
      success: true
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id ? user._id.toString() : user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        privacySettings: user.privacySettings
      }
    });
  } catch (err) {
    next(err);
  }
});

// 3. Current Authenticated User Profile
router.get('/me', authenticateToken, async (req, res, next) => {
  try {
    if (isUsingMemoryFallback()) {
      const user = inMemoryStore.users.get(req.user.email);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User profile not found.' });
      }
      return res.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, privacySettings: user.privacySettings }
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        privacySettings: user.privacySettings
      }
    });
  } catch (err) {
    next(err);
  }
});

// 4. Update Privacy & Location Settings
router.put('/privacy', authenticateToken, validateBody(privacySchema), async (req, res, next) => {
  try {
    const updates = req.body;

    if (isUsingMemoryFallback()) {
      const user = inMemoryStore.users.get(req.user.email);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      user.privacySettings = { ...user.privacySettings, ...updates };
      return res.json({ success: true, privacySettings: user.privacySettings });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    user.privacySettings = { ...user.privacySettings, ...updates };
    await user.save();

    res.json({
      success: true,
      privacySettings: user.privacySettings
    });
  } catch (err) {
    next(err);
  }
});

export default router;
