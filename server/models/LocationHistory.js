/**
 * WAYFARER AI - Location History Model
 * Implements data minimization, configurable retention policies, and automatic TTL deletion.
 */

import mongoose from 'mongoose';

const LocationHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    journeyId: {
      type: String,
      default: 'default-active-journey'
    },
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    precision: {
      type: String,
      enum: ['precise', 'approximate'],
      default: 'precise'
    },
    recordedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true
  }
);

// TTL Index to automatically delete records older than retention period
LocationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

/**
 * Data Minimization Helper:
 * Fuzzes/rounds coordinates to approximate precision (2 decimals ~= 1.1km)
 * when traveler requests privacy-preserving tracking.
 */
export function minimizeCoordinates(lat, lng, precision = 'precise') {
  if (precision === 'approximate') {
    return {
      lat: Math.round(lat * 100) / 100,
      lng: Math.round(lng * 100) / 100,
      precision: 'approximate'
    };
  }
  return {
    lat: Number(lat.toFixed(6)),
    lng: Number(lng.toFixed(6)),
    precision: 'precise'
  };
}

export const LocationHistory = mongoose.models.LocationHistory || mongoose.model('LocationHistory', LocationHistorySchema);
