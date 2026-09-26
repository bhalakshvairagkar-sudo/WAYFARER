/**
 * WAYFARER AI - Journey Model & Schema
 * Persists traveler trips, stops, candidate routes, segments, and health transitions in MongoDB.
 */

import mongoose from 'mongoose';

const JourneySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: 'guest-traveler',
      index: true
    },
    trip: {
      origin: { type: String, required: true },
      destination: { type: String, required: true },
      description: { type: String, default: '' },
      startDate: { type: String, default: '' },
      endDate: { type: String, default: '' },
      durationDays: { type: Number, default: 1 },
      travelerCount: { type: Number, default: 1 }
    },
    traveler: {
      id: { type: String },
      name: { type: String, default: 'Wayfarer Traveler' },
      mobilityType: { type: String, default: 'standard' },
      needsElevator: { type: Boolean, default: false },
      avoidStairs: { type: Boolean, default: false },
      maxWalkingDistanceMeters: { type: Number, default: 800 },
      preferShade: { type: Boolean, default: false },
      transitPreferences: [{ type: String }]
    },
    stops: [
      {
        id: { type: String },
        name: { type: String, required: true },
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        sequence: { type: Number },
        visitDurationMinutes: { type: Number, default: 60 }
      }
    ],
    segments: [
      {
        id: { type: String },
        name: { type: String },
        fromStopId: { type: String },
        toStopId: { type: String },
        recommendedRouteId: { type: String },
        candidateRoutes: { type: Array, default: [] }
      }
    ],
    overallScore: {
      type: Number,
      default: 85
    },
    fitLevel: {
      type: String,
      default: 'High Fit'
    },
    journeyHealth: {
      overall: { type: Number, default: 91 },
      status: { type: String, default: 'OPTIMAL' },
      dimensions: {
        accessibility: { type: Number, default: 90 },
        safety: { type: Number, default: 90 },
        reliability: { type: Number, default: 90 },
        time: { type: Number, default: 90 },
        comfort: { type: Number, default: 90 },
        disruption: { type: Number, default: 0 }
      },
      history: { type: Array, default: [] }
    },
    eventHistory: {
      type: Array,
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Journey = mongoose.models.Journey || mongoose.model('Journey', JourneySchema);
