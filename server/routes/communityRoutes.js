/**
 * WAYFARER AI - Community Report & Evidence Fusion Routes
 * Endpoint handlers for community reports, incident clusters, evidence fusion, and operator triage.
 */

import express from "express";
import { z } from "zod";
import {
  evidenceStore,
  processCommunityReport,
  actionIncidentCluster,
  detectAbuseAndSpam,
  clusterDuplicates,
  analyzeIndependence,
  fuseEvidence
} from "../engine/evidenceFusionEngine.js";
import {
  buildIncidentDecision,
  calculatePersonalImpact,
  applyIncidentToJourney
} from "../engine/eventEngine.js";
import { optionalAuth } from "../middleware/authMiddleware.js";
import { securityLogger } from "../utils/securityLogger.js";

const router = express.Router();

// Input validation schema for report submissions
const CommunityReportSchema = z.object({
  resourceId: z.string().min(1, "Resource or segment ID is required"),
  eventType: z.enum([
    "ACCESSIBILITY_ISSUE",
    "TRANSPORT_DELAY",
    "TEMPORARILY_CLOSED",
    "CROWD_SURGE",
    "SAFETY_HAZARD",
    "ALL_CLEAR"
  ]).default("ACCESSIBILITY_ISSUE"),
  severity: z.number().min(0).max(1).optional().default(0.7),
  description: z.string().min(3, "Description must have at least 3 characters").max(500),
  mediaEvidence: z.object({
    hasPhoto: z.boolean().default(false),
    photoUrl: z.string().url().optional()
  }).optional().default({ hasPhoto: false }),
  reporterLocation: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});

/**
 * POST /api/community/report
 * Ingest a new community incident report through the 4-stage pipeline
 */
router.post("/report", optionalAuth, async (req, res, next) => {
  try {
    const parseResult = CommunityReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parseResult.error.issues.map(i => i.message)
      });
    }

    const payload = parseResult.data;
    const clientIp = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
    const user = req.user;

    const reportInput = {
      ...payload,
      reporterId: user ? user.userId : (req.body.reporterId || `guest-${Date.now()}`),
      reporterName: user ? user.name : (req.body.reporterName || "Wayfarer Traveler"),
      reporterReputation: user ? 0.85 : 0.60,
      ipAddress: clientIp,
      timestamp: new Date().toISOString()
    };

    const result = processCommunityReport(reportInput);
    const incidentDecision = buildIncidentDecision(result.cluster);

    let personalImpact = null;
    let journeyAdaptation = null;

    if (req.body.journeyState) {
      const traveler = req.body.traveler || req.body.journeyState.traveler;
      personalImpact = calculatePersonalImpact(incidentDecision, traveler, req.body.journeyState);
      if (incidentDecision.decision === "ADAPT" && personalImpact.recommendedAction === "ADAPT") {
        journeyAdaptation = applyIncidentToJourney(req.body.journeyState, incidentDecision, traveler);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Report ingested. Lifecycle status: ${result.status}, Triage decision: ${result.decision}`,
      ...result,
      incidentDecision,
      personalImpact,
      journeyAdaptation
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/community/incidents
 * Retrieve all active incident clusters with 8-factor evidence fusion metrics
 */
router.get("/incidents", optionalAuth, (req, res) => {
  try {
    const clusters = evidenceStore.getClusters();
    res.json({
      success: true,
      count: clusters.length,
      incidents: clusters,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/community/incidents/:id
 * Retrieve single incident cluster details
 */
router.get("/incidents/:id", optionalAuth, (req, res) => {
  try {
    const cluster = evidenceStore.getCluster(req.params.id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }
    res.json({ success: true, incident: cluster });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/community/incidents/:id/evaluate-journey
 * Evaluates an existing incident against a traveler's journey state and adapts if personal impact warrants.
 */
router.post("/incidents/:id/evaluate-journey", optionalAuth, (req, res) => {
  try {
    const cluster = evidenceStore.getCluster(req.params.id);
    if (!cluster) {
      return res.status(404).json({ success: false, error: "Incident not found" });
    }

    const { journeyState, traveler } = req.body;
    if (!journeyState) {
      return res.status(400).json({ success: false, error: "journeyState is required for evaluation." });
    }

    const incidentDecision = buildIncidentDecision(cluster);
    const targetTraveler = traveler || journeyState.traveler || {};
    const personalImpact = calculatePersonalImpact(incidentDecision, targetTraveler, journeyState);

    let journeyAdaptation = null;
    if (incidentDecision.decision === "ADAPT" && personalImpact.recommendedAction === "ADAPT") {
      journeyAdaptation = applyIncidentToJourney(journeyState, incidentDecision, targetTraveler);
    }

    return res.json({
      success: true,
      incident: cluster,
      incidentDecision,
      personalImpact,
      journeyAdaptation,
      isAdapted: Boolean(journeyAdaptation?.adapted)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/community/incidents/:id/action
 * Verified Authority / Operator override (CONFIRM_ADAPT, REJECT_QUARANTINE, DOWNGRADE_WARN, RESOLVE)
 */
router.post("/incidents/:id/action", optionalAuth, (req, res) => {
  try {
    const { actionType, notes } = req.body;
    const validActions = ["CONFIRM_ADAPT", "REJECT_QUARANTINE", "DOWNGRADE_WARN", "RESOLVE"];
    
    if (!validActions.includes(actionType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid actionType. Allowed: ${validActions.join(", ")}`
      });
    }

    const operatorUser = req.user ? req.user.name : "Verified Authority";
    const updatedCluster = actionIncidentCluster(req.params.id, actionType, notes, operatorUser);

    securityLogger.info(`[OPERATOR_OVERRIDE] Incident ${req.params.id} set to ${actionType} by ${operatorUser}`);

    res.json({
      success: true,
      message: `Action ${actionType} applied successfully.`,
      incident: updatedCluster
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/community/simulate
 * Run end-to-end simulation presets for live demo & judge evaluation
 */
router.post("/simulate", optionalAuth, (req, res) => {
  try {
    const { scenario } = req.body;
    let result = null;

    if (scenario === "SCENARIO_SINGLE_REPORT") {
      // 1 single traveler reporting an issue -> Moderate confidence -> WARN
      result = processCommunityReport({
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        severity: 0.75,
        description: "Elevator out of service on northern platform ramp.",
        reporterId: "traveler-aditi-single",
        reporterName: "Aditi S.",
        reporterReputation: 0.70,
        reporterLocation: { lat: 18.9290, lng: 72.8251 },
        mediaEvidence: { hasPhoto: false },
        ipAddress: "103.25.44.12"
      });
    } else if (scenario === "SCENARIO_BOT_FLOOD") {
      // Rapid flood from same IP / identical coordinates -> High Sybil attack risk -> QUARANTINE
      const fakeIp = "185.220.101.5"; // TOR exit node simulation
      const clusterId = `cluster-bot-flood-${Date.now()}`;
      
      // Submit 4 rapid reports with identical GPS
      for (let i = 0; i < 4; i++) {
        result = processCommunityReport({
          resourceId: "stop-2",
          eventType: "SAFETY_HAZARD",
          severity: 0.9,
          description: `Fake flood report alert ${i + 1} buy now http://spam.xyz`,
          reporterId: `bot-user-${i}`,
          reporterName: `Bot ${i}`,
          reporterReputation: 0.05,
          reporterLocation: { lat: 18.922000, lng: 72.834700 }, // identical
          mediaEvidence: { hasPhoto: false },
          ipAddress: fakeIp,
          timestamp: new Date(Date.now() + i * 200).toISOString()
        });
      }
    } else if (scenario === "SCENARIO_INDEPENDENT_CONFIRMATIONS") {
      // 3 distinct travelers from different subnets with photo & proximity -> High confidence -> ADAPT
      const reporters = [
        {
          id: "trav-1",
          name: "Karan M.",
          ip: "49.36.11.22",
          loc: { lat: 18.9289, lng: 72.8249 },
          photo: true,
          desc: "Elevator mechanical failure confirmed on S3. Wheelchair access blocked."
        },
        {
          id: "trav-2",
          name: "Sneha R.",
          ip: "103.45.67.89",
          loc: { lat: 18.9293, lng: 72.8253 },
          photo: true,
          desc: "Signs posted: Elevator under emergency repair until 6 PM."
        },
        {
          id: "trav-3",
          name: "Anand P.",
          ip: "157.34.12.90",
          loc: { lat: 18.9285, lng: 72.8247 },
          photo: false,
          desc: "Ramp gates locked. Station staff diverting passengers."
        }
      ];

      for (const rep of reporters) {
        result = processCommunityReport({
          resourceId: "S3",
          eventType: "ACCESSIBILITY_ISSUE",
          severity: 0.85,
          description: rep.desc,
          reporterId: rep.id,
          reporterName: rep.name,
          reporterReputation: 0.85,
          reporterLocation: rep.loc,
          mediaEvidence: { hasPhoto: rep.photo, photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=600" },
          ipAddress: rep.ip
        });
      }
    } else if (scenario === "SCENARIO_AUTHORITY_CONFIRM") {
      // Verified Authority directly issues confirmation
      const report = {
        resourceId: "S3",
        eventType: "ACCESSIBILITY_ISSUE",
        severity: 0.9,
        description: "Official Department of Transportation Notice: Main concourse elevator offline for maintenance.",
        reporterId: "authority-official-01",
        reporterName: "Mumbai Metro Authority",
        reporterReputation: 1.0,
        reporterLocation: { lat: 18.9290, lng: 72.8250 },
        mediaEvidence: { hasPhoto: true },
        ipAddress: "14.139.12.1"
      };
      result = processCommunityReport(report);
      // Mark as official authority verified
      actionIncidentCluster(result.cluster.id, "CONFIRM_ADAPT", "Official Municipal Operator Confirmation");
      result.cluster = evidenceStore.getCluster(result.cluster.id);
      result.decision = "ADAPT";
    } else {
      return res.status(400).json({
        success: false,
        error: "Unknown scenario. Available: SCENARIO_SINGLE_REPORT, SCENARIO_BOT_FLOOD, SCENARIO_INDEPENDENT_CONFIRMATIONS, SCENARIO_AUTHORITY_CONFIRM"
      });
    }

    res.json({
      success: true,
      scenario,
      ...result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
