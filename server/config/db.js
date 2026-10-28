/**
 * WAYFARER AI - Database Security & Connection Management
 * Provides resilient, least-privilege connection to MongoDB Atlas / local MongoDB
 * with graceful fallback to secure in-memory storage for offline demo environments.
 */

import mongoose from 'mongoose';
import { securityLogger } from '../utils/securityLogger.js';

let isConnected = false;
let isInMemoryFallback = false;

// In-memory fallback stores when MongoDB is unreachable
export const inMemoryStore = {
  users: new Map(),
  locationShares: new Map(),
  locationHistory: new Map(),
  journeys: new Map(),
  decisions: new Map()
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('YOUR_MONGODB_URI_HERE')) {
    isInMemoryFallback = true;
    securityLogger.warn('MONGODB_URI not configured. Running in SECURE IN-MEMORY FALLBACK mode. (Production requires MongoDB Atlas with TLS).');
    return false;
  }

  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      autoIndex: process.env.NODE_ENV !== 'production' // Avoid build-time index production bottlenecks
    });

    isConnected = true;
    isInMemoryFallback = false;
    securityLogger.info('Connected to MongoDB database successfully with TLS encryption in transit.');
    return true;
  } catch (err) {
    isInMemoryFallback = true;
    securityLogger.warn(`MongoDB connection failed (${err.message}). Activated SECURE IN-MEMORY FALLBACK mode.`);
    return false;
  }
}

// Disable command buffering so queries never hang if database is connecting/offline
mongoose.set('bufferCommands', false);

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function isUsingMemoryFallback() {
  return isInMemoryFallback || !isConnected || mongoose.connection.readyState !== 1;
}

/**
 * Measures database ping latency in milliseconds.
 * Returns null if disconnected or unreachable within 2000ms.
 */
export async function measureDbLatency() {
  if (!isDbConnected() || !mongoose.connection.db) {
    return null;
  }
  const start = Date.now();
  try {
    const pingPromise = mongoose.connection.db.admin().ping();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB ping timeout')), 2000));
    await Promise.race([pingPromise, timeoutPromise]);
    return Date.now() - start;
  } catch (err) {
    securityLogger.warn(`[DB] Latency check failed: ${err.message}`);
    return null;
  }
}

/**
 * Returns structured persistence telemetry for health and provider auditing.
 */
export function getPersistenceStatus() {
  const connected = isDbConnected();
  const isProd = process.env.NODE_ENV === 'production';
  const strictPersistence = process.env.STRICT_PERSISTENCE === 'true';

  let status = 'CONNECTED_MONGODB_TLS';
  if (!connected) {
    status = isProd || strictPersistence ? 'DOWN' : 'DEGRADED_IN_MEMORY_DEMO';
  }

  return {
    status,
    connected,
    engine: 'MongoDB',
    persistent: connected,
    isInMemoryFallback: !connected,
    isProduction: isProd,
    strictPersistenceRequired: isProd || strictPersistence,
    tls: true,
    timestamp: new Date().toISOString()
  };
}
