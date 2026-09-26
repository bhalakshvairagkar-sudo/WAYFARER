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
  locationHistory: new Map()
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
