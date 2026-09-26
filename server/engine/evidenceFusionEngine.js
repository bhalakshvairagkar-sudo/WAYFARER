/**
 * WAYFARER AI - Evidence Fusion & Community Intelligence Engine
 * 
 * Implements the 4-Stage Community Report Processing Pipeline:
 * Community Report -> Abuse/Spam Detection -> Duplicate Detection -> 
 * Independence Analysis -> Evidence Fusion (8 Dimensions) -> 
 * Community Confidence & Attack Risk -> Action Confidence -> [WARN | ADAPT | QUARANTINE]
 */

import { securityLogger } from "../utils/securityLogger.js";

/**
 * Haversine formula for distance in meters
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Known coordinates for default stops/resources in WAYFARER
export const RESOURCE_COORDINATES = {
  "stop-1": { name: "Chhatrapati Shivaji Maharaj Terminus", lat: 18.9401, lng: 72.8354 },
  "stop-2": { name: "Gateway of India", lat: 18.9220, lng: 72.8347 },
  "stop-3": { name: "Colaba Causeway Arts Market", lat: 18.9150, lng: 72.8270 },
  "stop-4": { name: "Marine Drive Promenade", lat: 18.9430, lng: 72.8230 },
  "S1": { name: "CSMT → Gateway Corridor", lat: 18.9310, lng: 72.8350 },
  "S2": { name: "Gateway → Colaba Corridor", lat: 18.9185, lng: 72.8308 },
  "S3": { name: "Colaba → Marine Drive Corridor", lat: 18.9290, lng: 72.8250 },
  "MUSEUM-01": { name: "Chhatrapati Shivaji Maharaj Vastu Sangrahalaya", lat: 18.9269, lng: 72.8327 },
  "TRANSIT-HUB": { name: "Churchgate Transit Junction", lat: 18.9322, lng: 72.8264 }
};

/**
 * In-memory store for active clusters and recent reports
 */
class EvidenceFusionStore {
  constructor() {
    this.reports = [];
    this.clusters = new Map();
    this.initDefaultSeedData();
  }

  initDefaultSeedData() {
    // Seed initial historical incident cluster demonstrating a WARN state
    const seedCluster = {
      id: "cluster-seed-1",
      resourceId: "S3",
      resourceName: "Colaba → Marine Drive Corridor",
      eventType: "ACCESSIBILITY_ISSUE",
      title: "Elevator Service Advisory at Transit Hub",
      status: "WARN", // WARN | ADAPT | QUARANTINE
      firstReportedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      lastReportedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      reports: [
        {
          id: "rep-seed-1",
          reporterId: "traveler-priya",
          reporterName: "Priya K.",
          reporterReputation: 0.85,
          reporterLocation: { lat: 18.9292, lng: 72.8252 },
          resourceId: "S3",
          eventType: "ACCESSIBILITY_ISSUE",
          severity: 0.7,
          description: "Elevator button panel unresponsive on north platform ramp.",
          mediaEvidence: { hasPhoto: true, photoUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18f15f7?w=600" },
          ipAddress: "49.37.12.8",
          timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
          isSpam: false
        },
        {
          id: "rep-seed-2",
          reporterId: "traveler-rohit",
          reporterName: "Rohit M.",
          reporterReputation: 0.75,
          reporterLocation: { lat: 18.9288, lng: 72.8255 },
          resourceId: "S3",
          eventType: "ACCESSIBILITY_ISSUE",
          severity: 0.8,
          description: "Confirming elevator out of order, technician arriving.",
          mediaEvidence: { hasPhoto: false },
          ipAddress: "103.22.45.19",
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          isSpam: false
        }
      ],
      independenceAnalysis: {
        independentConfirmationsCount: 2,
        totalReportsCount: 2,
        uniqueReportersCount: 2,
        uniqueSubnetsCount: 2,
        gpsJitterMeters: 52,
        temporalSpreadMinutes: 20,
        independenceRatio: 1.0,
        sybilRiskScore: 0.08
      },
      evidenceFusion: {
        independentConfirmations: 0.60,
        proximity: 0.95,
        recency: 0.88,
        reputation: 0.80,
        mediaEvidence: 0.90,
        contradictions: 0.0,
        externalSources: 0.50,
        attackRisk: 0.12
      },
      scores: {
        communityConfidence: 0.68,
        attackRisk: 0.12,
        actionConfidence: 0.62,
        decision: "WARN"
      },
      operatorNotes: "Advisory banner active on corridor S3. Monitoring technician response."
    };

    this.clusters.set(seedCluster.id, seedCluster);
  }

  getClusters() {
    return Array.from(this.clusters.values()).sort((a, b) => new Date(b.lastReportedAt) - new Date(a.lastReportedAt));
  }

  getCluster(id) {
    return this.clusters.get(id);
  }

  saveCluster(cluster) {
    this.clusters.set(cluster.id, cluster);
    return cluster;
  }

  addReport(report) {
    this.reports.push(report);
  }

  getRecentReports(timeWindowMinutes = 60) {
    const cutoff = Date.now() - timeWindowMinutes * 60 * 1000;
    return this.reports.filter(r => new Date(r.timestamp).getTime() >= cutoff);
  }
}

export const evidenceStore = new EvidenceFusionStore();

// ─────────────────────────────────────────────────────────────
// STAGE 1: ABUSE / SPAM DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Checks for rate velocity, text anomalies, impossible coordinates, and gibberish.
 * @param {Object} report 
 * @param {Array} recentReports 
 * @returns {Object} { isSpam: boolean, spamScore: number, reasons: string[] }
 */
export function detectAbuseAndSpam(report, recentReports = []) {
  const reasons = [];
  let spamScore = 0.0;

  const now = Date.now();
  const reporterId = report.reporterId || "anonymous";
  const ipAddress = report.ipAddress || "127.0.0.1";

  // 1. Rate velocity check (max 3 reports within 60 seconds from same reporter or IP)
  const windowMs = 60 * 1000;
  const recentUserReports = recentReports.filter(r => 
    (r.reporterId === reporterId || r.ipAddress === ipAddress) &&
    (now - new Date(r.timestamp).getTime() < windowMs)
  );

  if (recentUserReports.length >= 3) {
    reasons.push(`Velocity violation: ${recentUserReports.length + 1} submissions in 60s`);
    spamScore += 0.65;
  }

  // 2. Text Content Heuristics
  const desc = (report.description || "").trim();
  if (desc.length < 5) {
    reasons.push("Description too sparse (minimum 5 characters required)");
    spamScore += 0.40;
  }

  // Repeated character regex (e.g. "aaaaaa", "qwertyqwerty")
  if (/(.)\1{5,}/i.test(desc)) {
    reasons.push("Repetitive character pattern detected");
    spamScore += 0.60;
  }

  // Known spam keywords
  const spamRegex = /\b(buy now|viagra|crypto|free cash|casino|click here|airdrop)\b/i;
  if (spamRegex.test(desc)) {
    reasons.push("Commercial spam vocabulary identified");
    spamScore += 0.90;
  }

  // 3. Geographic Boundary Plausibility
  if (report.reporterLocation && typeof report.reporterLocation.lat === "number" && typeof report.reporterLocation.lng === "number") {
    const { lat, lng } = report.reporterLocation;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      reasons.push(`Invalid geographic coordinates [${lat}, ${lng}]`);
      spamScore += 1.0;
    } else {
      // Check if distance from reported resource is plausibly within 50 km
      const resCoords = RESOURCE_COORDINATES[report.resourceId];
      if (resCoords) {
        const dist = haversineDistanceMeters(lat, lng, resCoords.lat, resCoords.lng);
        if (dist > 50000) { // > 50km
          reasons.push(`Geographic anomaly: GPS location is ${(dist / 1000).toFixed(1)} km from reported resource`);
          spamScore += 0.50;
        }
      }
    }
  }

  // 4. Low reputation penalty
  if (typeof report.reporterReputation === "number" && report.reporterReputation < 0.2) {
    reasons.push("Reporter account trust score below validation threshold");
    spamScore += 0.35;
  }

  spamScore = Math.min(1.0, Math.max(0.0, spamScore));
  const isSpam = spamScore >= 0.60;

  return {
    isSpam,
    spamScore: Math.round(spamScore * 100) / 100,
    reasons
  };
}

// ─────────────────────────────────────────────────────────────
// STAGE 2: DUPLICATE DETECTION & SPATIAL-TEMPORAL CLUSTERING
// ─────────────────────────────────────────────────────────────

/**
 * Clusters reports by resourceId OR spatial proximity (< 350m) and temporal window (< 60m).
 * @param {Object} report 
 * @param {Array} activeClusters 
 * @returns {Object} { cluster: Object, isNewCluster: boolean }
 */
export function clusterDuplicates(report, activeClusters = []) {
  const SPATIAL_RADIUS_METERS = 350;
  const TEMPORAL_WINDOW_MS = 60 * 60 * 1000; // 60 minutes
  const now = new Date(report.timestamp || Date.now()).getTime();

  let matchedCluster = null;

  for (const cluster of activeClusters) {
    if (cluster.status === "RESOLVED") continue;

    // Check temporal window
    const lastTime = new Date(cluster.lastReportedAt).getTime();
    if (Math.abs(now - lastTime) > TEMPORAL_WINDOW_MS) continue;

    // Direct resource ID match
    if (report.resourceId && cluster.resourceId === report.resourceId) {
      matchedCluster = cluster;
      break;
    }

    // Spatial proximity match
    const targetCoords = RESOURCE_COORDINATES[cluster.resourceId] || 
      cluster.reports[0]?.reporterLocation;

    if (targetCoords && report.reporterLocation) {
      const dist = haversineDistanceMeters(
        targetCoords.lat, targetCoords.lng,
        report.reporterLocation.lat, report.reporterLocation.lng
      );
      if (dist != null && dist <= SPATIAL_RADIUS_METERS) {
        matchedCluster = cluster;
        break;
      }
    }
  }

  if (matchedCluster) {
    matchedCluster.reports.push(report);
    matchedCluster.lastReportedAt = new Date().toISOString();
    return { cluster: matchedCluster, isNewCluster: false };
  }

  // Create new cluster
  const resourceName = RESOURCE_COORDINATES[report.resourceId]?.name || report.resourceId || "Identified Waypoint";
  const newCluster = {
    id: `cluster-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    resourceId: report.resourceId || "S1",
    resourceName,
    eventType: report.eventType || "ACCESSIBILITY_ISSUE",
    title: `${(report.eventType || "Incident").replace(/_/g, " ")} near ${resourceName}`,
    status: "QUARANTINE", // starts in quarantine evaluation
    firstReportedAt: new Date(report.timestamp || Date.now()).toISOString(),
    lastReportedAt: new Date(report.timestamp || Date.now()).toISOString(),
    reports: [report],
    operatorNotes: null
  };

  return { cluster: newCluster, isNewCluster: true };
}

// ─────────────────────────────────────────────────────────────
// STAGE 3: INDEPENDENCE ANALYSIS
// ─────────────────────────────────────────────────────────────

/**
 * Analyzes whether reports within a cluster are truly independent human observations
 * or a coordinated bot flood / Sybil collusion.
 * @param {Object} cluster 
 * @returns {Object} Independence metrics
 */
export function analyzeIndependence(cluster) {
  const reports = cluster.reports || [];
  const totalReportsCount = reports.length;

  if (totalReportsCount === 0) {
    return {
      independentConfirmationsCount: 0,
      totalReportsCount: 0,
      uniqueReportersCount: 0,
      uniqueSubnetsCount: 0,
      gpsJitterMeters: 0,
      temporalSpreadMinutes: 0,
      independenceRatio: 0,
      sybilRiskScore: 0
    };
  }

  const uniqueReporters = new Set(reports.map(r => r.reporterId).filter(Boolean));
  
  // Extract /24 subnets for IP entropy
  const uniqueSubnets = new Set(reports.map(r => {
    const ip = r.ipAddress || "127.0.0.1";
    const parts = ip.split(".");
    return parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}.0` : ip;
  }));

  // GPS jitter entropy: identical coordinates down to 6 decimals indicate synthetic replication
  let identicalCoordPairs = 0;
  let totalJitter = 0;
  let jitterCount = 0;

  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const locA = reports[i].reporterLocation;
      const locB = reports[j].reporterLocation;
      if (locA && locB && locA.lat != null && locB.lat != null) {
        const dist = haversineDistanceMeters(locA.lat, locA.lng, locB.lat, locB.lng);
        if (dist === 0) identicalCoordPairs++;
        totalJitter += dist;
        jitterCount++;
      }
    }
  }

  const avgGpsJitterMeters = jitterCount > 0 ? Math.round(totalJitter / jitterCount) : 25;

  // Temporal dispersion
  const timestamps = reports.map(r => new Date(r.timestamp).getTime()).sort();
  const timeSpreadMs = timestamps[timestamps.length - 1] - timestamps[0];
  const temporalSpreadMinutes = Math.round((timeSpreadMs / 60000) * 10) / 10;

  // Sybil Risk Calculation
  let sybilRisk = 0.0;

  // Multiple reports in < 3 seconds from same IP/subnet
  if (reports.length > 1 && timeSpreadMs < 3000 && uniqueSubnets.size === 1) {
    sybilRisk += 0.50;
  }

  // Exact identical coordinates between different reported accounts
  if (identicalCoordPairs > 0 && uniqueReporters.size > 1) {
    sybilRisk += 0.35;
  }

  // Low diversity of reporter accounts
  const reporterDiversity = uniqueReporters.size / totalReportsCount;
  if (reporterDiversity < 0.5) {
    sybilRisk += 0.40;
  }

  sybilRisk = Math.min(1.0, Math.max(0.0, sybilRisk));

  // Effective independent count: discounted if same subnet or identical coordinates
  let independentConfirmationsCount = uniqueReporters.size;
  if (uniqueSubnets.size < uniqueReporters.size) {
    independentConfirmationsCount = Math.min(independentConfirmationsCount, uniqueSubnets.size + 0.5);
  }
  if (sybilRisk > 0.5) {
    independentConfirmationsCount = Math.max(1, Math.round(independentConfirmationsCount * (1 - sybilRisk)));
  }

  const independenceRatio = totalReportsCount > 0 ? 
    Math.round((independentConfirmationsCount / totalReportsCount) * 100) / 100 : 1.0;

  return {
    independentConfirmationsCount: Math.round(independentConfirmationsCount),
    totalReportsCount,
    uniqueReportersCount: uniqueReporters.size,
    uniqueSubnetsCount: uniqueSubnets.size,
    gpsJitterMeters: avgGpsJitterMeters,
    temporalSpreadMinutes,
    independenceRatio,
    sybilRiskScore: Math.round(sybilRisk * 100) / 100
  };
}

// ─────────────────────────────────────────────────────────────
// STAGE 4: EVIDENCE FUSION (8 KEY DIMENSIONS)
// ─────────────────────────────────────────────────────────────

/**
 * Fuses the 8 evidential dimensions for a given cluster:
 * 1. Independent confirmations
 * 2. Proximity
 * 3. Recency
 * 4. Reputation
 * 5. Media evidence
 * 6. Contradictions
 * 7. External sources
 * 8. Attack risk
 * 
 * @param {Object} cluster 
 * @param {Object} independence 
 * @returns {Object} Evidence fusion breakdown and final decision
 */
export function fuseEvidence(cluster, independence) {
  const reports = cluster.reports || [];
  const targetCoords = RESOURCE_COORDINATES[cluster.resourceId];

  // 1. Independent Confirmations (0.0 to 1.0)
  // 1 report = 0.35, 2 reports = 0.60, 3 reports = 0.85, 4+ = 1.0
  const n = independence.independentConfirmationsCount || 1;
  const w_indep = Math.min(1.0, Math.max(0.20, 0.35 + 0.25 * (n - 1)));

  // 2. Proximity (0.0 to 1.0)
  // Distance from reporter GPS to target incident resource
  let proxSum = 0;
  let proxCount = 0;
  for (const r of reports) {
    if (r.reporterLocation && targetCoords) {
      const dist = haversineDistanceMeters(
        r.reporterLocation.lat, r.reporterLocation.lng,
        targetCoords.lat, targetCoords.lng
      );
      if (dist != null) {
        if (dist <= 100) proxSum += 1.0;
        else if (dist <= 500) proxSum += 0.85;
        else if (dist <= 1500) proxSum += 0.60;
        else if (dist <= 5000) proxSum += 0.35;
        else proxSum += 0.15;
        proxCount++;
      }
    }
  }
  const w_prox = proxCount > 0 ? proxSum / proxCount : 0.70;

  // 3. Recency (0.0 to 1.0) - Exponential decay half-life 45 min
  const latestReportTime = Math.max(...reports.map(r => new Date(r.timestamp).getTime()));
  const ageMinutes = Math.max(0, (Date.now() - latestReportTime) / 60000);
  const lambda = Math.LN2 / 45; // half-life 45 min
  const w_rec = Math.exp(-lambda * ageMinutes);

  // 4. Reputation (0.0 to 1.0)
  const repSum = reports.reduce((acc, r) => acc + (r.reporterReputation != null ? r.reporterReputation : 0.6), 0);
  const w_rep = reports.length > 0 ? repSum / reports.length : 0.60;

  // 5. Media Evidence (0.0 to 1.0)
  const hasPhoto = reports.some(r => r.mediaEvidence && r.mediaEvidence.hasPhoto);
  const w_media = hasPhoto ? 0.95 : 0.25;

  // 6. Contradictions (Penalty: 0.0 to 0.7)
  const contradictionReports = reports.filter(r => r.isContradiction || r.eventType === "ALL_CLEAR");
  const contradictionPenalty = Math.min(0.70, contradictionReports.length * 0.35);

  // 7. External Sources (0.0 to 1.0)
  // Official GTFS / Municipal feed / Authority status
  let w_ext = 0.50; // neutral
  if (cluster.officialAuthorityVerified) {
    w_ext = 1.0;
  } else if (cluster.externalFeedCorroborated) {
    w_ext = 0.85;
  }

  // 8. Attack Risk (0.0 to 1.0)
  const avgSpamScore = reports.reduce((acc, r) => acc + (r.spamScore || 0), 0) / (reports.length || 1);
  const attackRisk = Math.min(1.0, Math.max(0.0,
    0.35 * independence.sybilRiskScore +
    0.25 * (1.0 - independence.independenceRatio) +
    0.20 * (1.0 - w_rep) +
    0.20 * avgSpamScore
  ));

  // ─────────────────────────────────────────────────────────────
  // CONFIDENCE CALCULATIONS
  // ─────────────────────────────────────────────────────────────

  // Community Confidence: weighted fusion minus contradictions
  let rawCommunityConfidence = (
    0.28 * w_indep +
    0.18 * w_prox +
    0.16 * w_rec +
    0.14 * w_rep +
    0.12 * w_media +
    0.12 * w_ext -
    contradictionPenalty
  );
  const communityConfidence = Math.round(Math.min(1.0, Math.max(0.0, rawCommunityConfidence)) * 100) / 100;

  // Action Confidence: Community Confidence tempered by Attack Risk
  let rawActionConfidence = communityConfidence * (1.0 - 0.75 * attackRisk);
  if (cluster.officialAuthorityVerified) {
    rawActionConfidence = 1.0; // authority override gives full confidence
  }
  const actionConfidence = Math.round(Math.min(1.0, Math.max(0.0, rawActionConfidence)) * 100) / 100;

  // ─────────────────────────────────────────────────────────────
  // TRIAGE DECISION: WARN | ADAPT | QUARANTINE
  // ─────────────────────────────────────────────────────────────
  let decision = "QUARANTINE";
  if (cluster.officialAuthorityVerified || (actionConfidence >= 0.70 && attackRisk < 0.40)) {
    decision = "ADAPT";
  } else if (actionConfidence >= 0.35 && attackRisk <= 0.65) {
    decision = "WARN";
  } else {
    decision = "QUARANTINE";
  }

  return {
    evidenceDimensions: {
      independentConfirmations: Math.round(w_indep * 100) / 100,
      proximity: Math.round(w_prox * 100) / 100,
      recency: Math.round(w_rec * 100) / 100,
      reputation: Math.round(w_rep * 100) / 100,
      mediaEvidence: Math.round(w_media * 100) / 100,
      contradictions: Math.round(contradictionPenalty * 100) / 100,
      externalSources: Math.round(w_ext * 100) / 100,
      attackRisk: Math.round(attackRisk * 100) / 100
    },
    scores: {
      communityConfidence,
      attackRisk: Math.round(attackRisk * 100) / 100,
      actionConfidence,
      decision
    }
  };
}

/**
 * Evaluates the formal incident lifecycle state.
 * Lifecycle State Progression:
 * UNVERIFIED -> CORROBORATING -> VERIFIED -> ACTIVE -> STALE -> RESOLVED
 * Suspicious Branch:
 * UNVERIFIED -> SUSPICIOUS -> QUARANTINED
 *
 * @param {Object} cluster 
 * @param {Object} independence 
 * @param {Object} fusion 
 * @returns {string} Incident Lifecycle Status
 */
export function determineIncidentLifecycleStatus(cluster, independence, fusion) {
  // If explicitly resolved
  if (cluster.status === "RESOLVED") return "RESOLVED";

  // Check if stale: age > 90 minutes without recent confirmation
  const reports = cluster.reports || [];
  const latestReportTime = reports.length > 0 
    ? Math.max(...reports.map(r => new Date(r.timestamp).getTime()))
    : new Date(cluster.lastReportedAt || 0).getTime();
  const ageMinutes = (Date.now() - latestReportTime) / 60000;

  if (ageMinutes > 90 && cluster.status !== "RESOLVED") {
    return "STALE";
  }

  const { decision, attackRisk, communityConfidence, actionConfidence } = fusion.scores;
  const n = independence?.independentConfirmationsCount || reports.length || 0;

  // Suspicious branch
  if (attackRisk >= 0.70 || decision === "QUARANTINE") {
    return attackRisk >= 0.85 ? "QUARANTINED" : "SUSPICIOUS";
  }

  // Authority verification makes it immediately ACTIVE
  if (cluster.officialAuthorityVerified) {
    return "ACTIVE";
  }

  // Active: High action confidence and ADAPT decision
  if (decision === "ADAPT") {
    return "ACTIVE";
  }

  // Verified: High community confidence, but action confidence below adapt threshold
  if (communityConfidence >= 0.75 || n >= 3) {
    return "VERIFIED";
  }

  // Corroborating: 2+ reports or 1 highly trusted report with moderate confidence
  if (n >= 2 || communityConfidence >= 0.60) {
    return "CORROBORATING";
  }

  // Single uncorroborated report
  return "UNVERIFIED";
}

// ─────────────────────────────────────────────────────────────
// PIPELINE RUNNER: END-TO-END INGESTION
// ─────────────────────────────────────────────────────────────

/**
 * Processes an incoming community report through the complete 4-stage pipeline.
 * @param {Object} reportInput 
 * @returns {Object} { report, cluster, pipelineTrace, decision, status }
 */
export function processCommunityReport(reportInput) {
  const timestamp = reportInput.timestamp || new Date().toISOString();
  const report = {
    id: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    reporterId: reportInput.reporterId || "guest-traveler",
    reporterName: reportInput.reporterName || "Wayfarer Traveler",
    reporterReputation: typeof reportInput.reporterReputation === "number" ? reportInput.reporterReputation : 0.65,
    reporterLocation: reportInput.reporterLocation || null,
    resourceId: reportInput.resourceId || "S3",
    eventType: reportInput.eventType || "ACCESSIBILITY_ISSUE",
    severity: typeof reportInput.severity === "number" ? reportInput.severity : 0.7,
    description: (reportInput.description || "").trim(),
    mediaEvidence: reportInput.mediaEvidence || { hasPhoto: false },
    ipAddress: reportInput.ipAddress || "127.0.0.1",
    timestamp
  };

  // STAGE 1: Abuse / Spam Detection
  const recentReports = evidenceStore.getRecentReports(60);
  const abuseResult = detectAbuseAndSpam(report, recentReports);
  report.isSpam = abuseResult.isSpam;
  report.spamScore = abuseResult.spamScore;
  report.abuseReasons = abuseResult.reasons;

  evidenceStore.addReport(report);

  // If blatant spam, immediately quarantine
  if (report.isSpam) {
    securityLogger.warn(`[COMMUNITY_PIPELINE] Spam report flagged and quarantined: ${report.abuseReasons.join("; ")}`);
    
    const quarantinedCluster = {
      id: `cluster-quarantine-${Date.now()}`,
      resourceId: report.resourceId,
      resourceName: RESOURCE_COORDINATES[report.resourceId]?.name || report.resourceId,
      eventType: report.eventType,
      title: `[QUARANTINED] Spam / Abuse Flagged Report`,
      status: "QUARANTINED",
      decision: "QUARANTINE",
      firstReportedAt: report.timestamp,
      lastReportedAt: report.timestamp,
      reports: [report],
      independenceAnalysis: {
        independentConfirmationsCount: 0,
        totalReportsCount: 1,
        uniqueReportersCount: 1,
        uniqueSubnetsCount: 1,
        gpsJitterMeters: 0,
        temporalSpreadMinutes: 0,
        independenceRatio: 0.0,
        sybilRiskScore: 0.95
      },
      evidenceFusion: {
        independentConfirmations: 0.10,
        proximity: 0.20,
        recency: 1.0,
        reputation: report.reporterReputation || 0.1,
        mediaEvidence: 0.0,
        contradictions: 0.0,
        externalSources: 0.0,
        attackRisk: 0.95
      },
      scores: {
        communityConfidence: 0.05,
        attackRisk: 0.95,
        actionConfidence: 0.01,
        decision: "QUARANTINE",
        status: "QUARANTINED"
      },
      operatorNotes: `Automated quarantine: ${report.abuseReasons.join(", ")}`
    };

    evidenceStore.saveCluster(quarantinedCluster);

    return {
      report,
      cluster: quarantinedCluster,
      pipelineTrace: {
        stage1_abuse: abuseResult,
        stage2_duplicate: { clustered: false, reason: "Bypassed due to abuse detection" },
        stage3_independence: quarantinedCluster.independenceAnalysis,
        stage4_fusion: quarantinedCluster.evidenceFusion,
        lifecycleStatus: "QUARANTINED",
        finalDecision: "QUARANTINE"
      },
      status: "QUARANTINED",
      decision: "QUARANTINE"
    };
  }

  // STAGE 2: Duplicate Detection & Spatial-Temporal Clustering
  const activeClusters = evidenceStore.getClusters();
  const { cluster, isNewCluster } = clusterDuplicates(report, activeClusters);

  // STAGE 3: Independence Analysis
  const independence = analyzeIndependence(cluster);
  cluster.independenceAnalysis = independence;

  // STAGE 4: Evidence Fusion
  const fusion = fuseEvidence(cluster, independence);
  cluster.evidenceFusion = fusion.evidenceDimensions;
  cluster.scores = fusion.scores;

  // Lifecycle state evaluation
  const lifecycleStatus = determineIncidentLifecycleStatus(cluster, independence, fusion);
  cluster.status = lifecycleStatus;
  cluster.decision = fusion.scores.decision;
  cluster.scores.status = lifecycleStatus;

  evidenceStore.saveCluster(cluster);

  securityLogger.info(`[COMMUNITY_PIPELINE] Incident ${cluster.id} evaluated: Status=${cluster.status} Decision=${cluster.decision} (ActionConfidence=${fusion.scores.actionConfidence}, AttackRisk=${fusion.scores.attackRisk})`);

  return {
    report,
    cluster,
    pipelineTrace: {
      stage1_abuse: abuseResult,
      stage2_duplicate: { isNewCluster, clusterId: cluster.id },
      stage3_independence: independence,
      stage4_fusion: fusion.evidenceDimensions,
      lifecycleStatus: cluster.status,
      finalDecision: cluster.decision
    },
    status: cluster.status,
    decision: cluster.decision
  };
}

/**
 * Execute an operator override action on a cluster
 */
export function actionIncidentCluster(clusterId, actionType, operatorNotes = "", operatorUser = "admin") {
  const cluster = evidenceStore.getCluster(clusterId);
  if (!cluster) {
    throw new Error(`Incident cluster "${clusterId}" not found.`);
  }

  if (actionType === "CONFIRM_ADAPT") {
    cluster.officialAuthorityVerified = true;
    cluster.status = "ACTIVE";
    cluster.decision = "ADAPT";
    cluster.scores.actionConfidence = 1.0;
    cluster.scores.attackRisk = 0.05;
    cluster.scores.decision = "ADAPT";
    cluster.scores.status = "ACTIVE";
    cluster.operatorNotes = operatorNotes || `Verified and confirmed by ${operatorUser}`;
  } else if (actionType === "REJECT_QUARANTINE") {
    cluster.status = "QUARANTINED";
    cluster.decision = "QUARANTINE";
    cluster.scores.actionConfidence = 0.10;
    cluster.scores.attackRisk = 0.90;
    cluster.scores.decision = "QUARANTINE";
    cluster.scores.status = "QUARANTINED";
    cluster.operatorNotes = operatorNotes || `Quarantined and rejected by ${operatorUser}`;
  } else if (actionType === "DOWNGRADE_WARN") {
    cluster.status = "CORROBORATING";
    cluster.decision = "WARN";
    cluster.scores.decision = "WARN";
    cluster.scores.status = "CORROBORATING";
    cluster.operatorNotes = operatorNotes || `Maintained as advisory warning by ${operatorUser}`;
  } else if (actionType === "RESOLVE") {
    cluster.status = "RESOLVED";
    cluster.decision = "WARN";
    cluster.scores.status = "RESOLVED";
    cluster.operatorNotes = operatorNotes || `Issue cleared / resolved by ${operatorUser}`;
  }

  evidenceStore.saveCluster(cluster);
  return cluster;
}
