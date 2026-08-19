/**
 * WAYFARER AI - Journey Segmentation Engine
 * Transforms structured stops into sequential Journey Segments with candidate routes and scoring
 */

import { CANDIDATE_ROUTES_DATABASE } from "../data/defaultJourney.js";
import { rankSegmentRoutes, deriveTravelerWeights } from "./scoringEngine.js";

/**
 * Convert structured stops into connected Journey Segments (S1, S2, ..., Sn)
 * @param {Array} stops 
 * @param {Object} traveler 
 * @returns {Array} segments
 */
export function segmentJourney(stops = [], traveler = {}) {
  if (!stops || stops.length < 2) {
    return [];
  }

  const weights = deriveTravelerWeights(traveler);
  const segments = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const originStop = stops[i];
    const destinationStop = stops[i + 1];
    const segmentId = `S${i + 1}`;

    // Lookup predefined candidate routes or generate dynamic prototype routes
    let candidateRoutes = CANDIDATE_ROUTES_DATABASE[segmentId];

    if (!candidateRoutes) {
      // Dynamic candidate route synthesis for arbitrary stops
      const straightLineDistKm = calculateApproxDistance(
        originStop.lat || 15.4989,
        originStop.lng || 73.8278,
        destinationStop.lat || 15.5180,
        destinationStop.lng || 73.7630
      );

      candidateRoutes = [
        {
          id: "A",
          name: `Direct Transit via Arterial`,
          tagline: "Fastest Standard Path",
          distanceKm: Number((straightLineDistKm * 1.15).toFixed(1)),
          durationMin: Math.round(straightLineDistKm * 2.2),
          safety: 82,
          accessibility: traveler.stairsAllowed === false ? 50 : 80,
          crowd: 65,
          convenience: 90,
          accessibleFeatures: ["Standard urban sidewalk", "Occasional curbs"],
          coordinates: [
            [originStop.lat || 15.4989, originStop.lng || 73.8278],
            [
              (originStop.lat + destinationStop.lat) / 2 + 0.005,
              (originStop.lng + destinationStop.lng) / 2 - 0.005
            ],
            [destinationStop.lat || 15.5180, destinationStop.lng || 73.7630]
          ]
        },
        {
          id: "B",
          name: `Barrier-Free Assisted Way`,
          tagline: "100% Step-Free & Ramped",
          distanceKm: Number((straightLineDistKm * 1.3).toFixed(1)),
          durationMin: Math.round(straightLineDistKm * 2.8),
          safety: 93,
          accessibility: 95,
          crowd: 84,
          convenience: 85,
          accessibleFeatures: ["Smooth continuous tactile pavement", "Gentle ramp gradients", "Assisted crossing"],
          coordinates: [
            [originStop.lat || 15.4989, originStop.lng || 73.8278],
            [
              (originStop.lat + destinationStop.lat) / 2 - 0.005,
              (originStop.lng + destinationStop.lng) / 2 + 0.008
            ],
            [destinationStop.lat || 15.5180, destinationStop.lng || 73.7630]
          ]
        },
        {
          id: "C",
          name: `Low-Density Scenic Route`,
          tagline: "Low Crowd & Shaded Path",
          distanceKm: Number((straightLineDistKm * 1.4).toFixed(1)),
          durationMin: Math.round(straightLineDistKm * 3.0),
          safety: 89,
          accessibility: 88,
          crowd: 91,
          convenience: 80,
          accessibleFeatures: ["Wide uncrowded pedestrian walkway", "Shaded rest areas"],
          coordinates: [
            [originStop.lat || 15.4989, originStop.lng || 73.8278],
            [
              (originStop.lat + destinationStop.lat) / 2 + 0.01,
              (originStop.lng + destinationStop.lng) / 2 + 0.01
            ],
            [destinationStop.lat || 15.5180, destinationStop.lng || 73.7630]
          ]
        }
      ];
    }

    // Rank candidate routes deterministically
    const rankedRoutes = rankSegmentRoutes(candidateRoutes, weights);
    const recommendedRoute = rankedRoutes.find(r => r.isRecommended) || rankedRoutes[0];

    segments.push({
      id: segmentId,
      day: destinationStop.day || originStop.day || 1,
      origin: originStop.name,
      originId: originStop.id,
      originLat: originStop.lat,
      originLng: originStop.lng,
      destination: destinationStop.name,
      destinationId: destinationStop.id,
      destinationLat: destinationStop.lat,
      destinationLng: destinationStop.lng,
      plannedDeparture: originStop.departureTime || originStop.arrivalTime || "10:00",
      plannedArrival: destinationStop.arrivalTime || "11:00",
      status: i === 0 ? "ACTIVE" : (i === 2 ? "CURRENT_DEMO" : "PLANNED"), // S3 default active demo segment
      candidateRoutes: rankedRoutes,
      recommendedRouteId: recommendedRoute.id,
      journeyScore: recommendedRoute.score,
      downstreamImpact: null
    });
  }

  return segments;
}

/**
 * Haversine approximate distance in KM
 */
function calculateApproxDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.max(1, Math.round(R * c * 10) / 10);
}
