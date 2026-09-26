/**
 * WAYFARER AI - Incident & Community Report Model
 * Persists TrustShield incident clusters, evidence fusion scores, and corroborations in MongoDB.
 */

import mongoose from 'mongoose';

const IncidentSchema = new mongoose.Schema(
  {
    clusterId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    resourceId: {
      type: String,
      required: true,
      index: true
    },
    resourceName: {
      type: String,
      default: ''
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'ACCESSIBILITY_ISSUE',
        'TRANSPORT_DELAY',
        'TEMPORARILY_CLOSED',
        'CROWD_SURGE',
        'SAFETY_HAZARD',
        'ALL_CLEAR'
      ]
    },
    title: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'UNVERIFIED',
        'CORROBORATING',
        'VERIFIED',
        'ACTIVE',
        'STALE',
        'RESOLVED',
        'SUSPICIOUS',
        'QUARANTINED'
      ],
      default: 'UNVERIFIED',
      index: true
    },
    decision: {
      type: String,
      enum: ['WARN', 'ADAPT', 'QUARANTINE'],
      default: 'WARN'
    },
    scores: {
      communityConfidence: { type: Number, default: 0 },
      attackRisk: { type: Number, default: 0 },
      actionConfidence: { type: Number, default: 0 },
      decision: { type: String, default: 'WARN' },
      status: { type: String, default: 'UNVERIFIED' }
    },
    evidenceFusion: {
      type: Object,
      default: {}
    },
    independenceAnalysis: {
      type: Object,
      default: {}
    },
    reports: [
      {
        id: String,
        reporterId: String,
        reporterName: String,
        reporterReputation: Number,
        reporterLocation: Object,
        resourceId: String,
        eventType: String,
        severity: Number,
        description: String,
        mediaEvidence: Object,
        ipAddress: String,
        timestamp: String,
        isSpam: Boolean,
        spamScore: Number,
        abuseReasons: [String]
      }
    ],
    firstReportedAt: {
      type: Date,
      default: Date.now
    },
    lastReportedAt: {
      type: Date,
      default: Date.now
    },
    operatorNotes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Incident = mongoose.models.Incident || mongoose.model('Incident', IncidentSchema);
