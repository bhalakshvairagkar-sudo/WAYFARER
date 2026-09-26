/**
 * WAYFARER AI - Temporary Location Sharing Model
 * Implements ephemeral location sharing with automatic TTL expiration
 * and cryptographically random sharing tokens.
 */

import mongoose from 'mongoose';

const LocationShareSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    recipientLabel: {
      type: String,
      default: 'Emergency Contact'
    },
    precision: {
      type: String,
      enum: ['precise', 'approximate'],
      default: 'precise'
    },
    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      accuracy: { type: Number, default: 10 },
      updatedAt: { type: Date, default: Date.now }
    },
    isActive: {
      type: Boolean,
      default: true
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

// MongoDB TTL index for automatic physical deletion after expiration
LocationShareSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const LocationShare = mongoose.models.LocationShare || mongoose.model('LocationShare', LocationShareSchema);
