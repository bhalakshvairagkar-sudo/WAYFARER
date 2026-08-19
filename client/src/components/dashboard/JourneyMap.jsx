import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Layers, Navigation, AlertCircle, Compass } from 'lucide-react';

export default function JourneyMap({ activeSegment, segments = [] }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const [mapError, setMapError] = useState(false);
  const [activeLayerInfo, setActiveLayerInfo] = useState({ routeCount: 3 });

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet map if not already created
    if (!mapInstanceRef.current) {
      try {
        const defaultCenter = [15.4989, 73.8000]; // Goa centroid
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 12,
          zoomControl: false,
          attributionControl: false
        });

        // Add zoom control top right
        L.control.zoom({ position: 'topright' }).addTo(map);

        // OpenStreetMap tile layer with graceful tileerror handling
        const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        });

        tileLayer.on('tileerror', () => {
          // If offline or tile server is unreachable, map still renders polylines
          console.warn("[Leaflet] Tile network offline. Rendering geometry in offline mode.");
        });

        tileLayer.addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        layerGroupRef.current = layerGroup;
        mapInstanceRef.current = map;
      } catch (err) {
        console.error("[Leaflet Init Error]:", err);
        setMapError(true);
      }
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update map polylines & markers whenever activeSegment changes
  useEffect(() => {
    if (!mapInstanceRef.current || !layerGroupRef.current || !activeSegment) return;

    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    const candidateRoutes = activeSegment.candidateRoutes || [];
    const recommendedRoute = candidateRoutes.find(r => r.isRecommended) || candidateRoutes[0];

    const bounds = L.latLngBounds([]);

    // 1. Render Non-Recommended Routes first (underneath)
    candidateRoutes.forEach(route => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const isRec = route.id === recommendedRoute?.id;
      const isDegraded = route.accessibility < 50;

      if (!isRec) {
        const polyline = L.polyline(route.coordinates, {
          color: isDegraded ? '#ef4444' : (route.id === 'A' ? '#f59e0b' : '#0284c7'),
          weight: 4,
          opacity: 0.7,
          dashArray: isDegraded ? '4, 8' : '6, 8',
          lineCap: 'round'
        });

        polyline.bindTooltip(
          `<strong>Route ${route.id}: ${route.name}</strong><br/>Score: ${route.score}/100 | ${route.durationMin}m`,
          { sticky: true, className: 'leaflet-tooltip-custom' }
        );

        layerGroup.addLayer(polyline);
        route.coordinates.forEach(c => bounds.extend(c));
      }
    });

    // 2. Render Recommended Route (Thick emerald highlighted on top)
    if (recommendedRoute && recommendedRoute.coordinates) {
      // Glow underlay
      const glowPolyline = L.polyline(recommendedRoute.coordinates, {
        color: '#34d399',
        weight: 9,
        opacity: 0.45,
        lineCap: 'round'
      });
      layerGroup.addLayer(glowPolyline);

      // Main route polyline
      const mainPolyline = L.polyline(recommendedRoute.coordinates, {
        color: '#059669',
        weight: 5,
        opacity: 1.0,
        lineCap: 'round'
      });

      mainPolyline.bindTooltip(
        `<div class="p-1"><span class="font-extrabold text-emerald-700">★ RECOMMENDED NOW</span><br/><strong>Route ${recommendedRoute.id}: ${recommendedRoute.name}</strong><br/>Journey Score: ${recommendedRoute.score}/100</div>`,
        { sticky: true, permanent: false }
      );

      layerGroup.addLayer(mainPolyline);
      recommendedRoute.coordinates.forEach(c => bounds.extend(c));
    }

    // 3. Render Origin & Destination Markers
    if (activeSegment.originLat && activeSegment.originLng) {
      const originIcon = L.divIcon({
        className: 'origin-marker',
        html: `<div class="w-7 h-7 bg-slate-900 border-2 border-white rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md">A</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const originMarker = L.marker([activeSegment.originLat, activeSegment.originLng], { icon: originIcon });
      originMarker.bindPopup(`<strong>Origin:</strong> ${activeSegment.origin}`);
      layerGroup.addLayer(originMarker);
      bounds.extend([activeSegment.originLat, activeSegment.originLng]);
    }

    if (activeSegment.destinationLat && activeSegment.destinationLng) {
      const destIcon = L.divIcon({
        className: 'dest-marker',
        html: `<div class="w-7 h-7 bg-emerald-600 border-2 border-white rounded-full flex items-center justify-center text-white text-[11px] font-black shadow-md">B</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const destMarker = L.marker([activeSegment.destinationLat, activeSegment.destinationLng], { icon: destIcon });
      destMarker.bindPopup(`<strong>Destination:</strong> ${activeSegment.destination}`);
      layerGroup.addLayer(destMarker);
      bounds.extend([activeSegment.destinationLat, activeSegment.destinationLng]);
    }

    // 4. Render Live Traveler Position Marker with Radar Pulse
    if (recommendedRoute?.coordinates && recommendedRoute.coordinates.length > 1) {
      // Position traveler ~30% along active route
      const travelerPos = recommendedRoute.coordinates[1] || recommendedRoute.coordinates[0];
      
      const pulseIcon = L.divIcon({
        className: 'custom-pulse-marker',
        html: `
          <div class="pulse-ring"></div>
          <div class="core-dot flex items-center justify-center text-[9px] text-white font-bold">♿</div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const travelerMarker = L.marker(travelerPos, { icon: pulseIcon });
      travelerMarker.bindPopup(`<strong>Aditi (Traveler Position)</strong><br/>Active Route ${recommendedRoute.id}`);
      layerGroup.addLayer(travelerMarker);
    }

    // Fit map bounds smoothly
    if (bounds.isValid()) {
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
    }
  }, [activeSegment]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-soft relative flex flex-col h-full min-h-[380px]">
      
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-brand-600 animate-pulse" />
          <span className="text-xs font-extrabold text-slate-900">
            {activeSegment ? `${activeSegment.origin.split(' ')[0]} → ${activeSegment.destination.split(' ')[0]}` : 'Active Route Map'}
          </span>
        </div>
        <span className="h-3 w-px bg-slate-200"></span>
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-emerald-600 rounded"></span> Recommended
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-amber-500 rounded"></span> Fast
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-1 bg-sky-500 rounded"></span> Low Crowd
          </span>
        </div>
      </div>

      {/* Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[380px] z-10" />

      {/* Offline Fallback Badge */}
      {mapError && (
        <div className="absolute inset-0 z-30 bg-slate-100 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-8 h-8 text-amber-600 mb-2" />
          <h4 className="text-sm font-bold text-slate-800 mb-1">Geospatial Geometry Mode</h4>
          <p className="text-xs text-slate-500 max-w-sm">
            Interactive routing is active. Vector coordinate geometry rendered.
          </p>
        </div>
      )}

    </div>
  );
}
