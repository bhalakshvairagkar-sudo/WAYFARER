import React, { useEffect, useRef, useState } from 'react';
import { Layers, Navigation, AlertCircle, Compass, MapPin, CheckCircle, Info } from 'lucide-react';
import L from 'leaflet';
import { isGoogleMapsConfigured, loadGoogleMapsScript } from '../../services/googleMapsLoader.js';

export default function GoogleMap({
  activeSegment,
  segments = [],
  selectedRouteId,
  onSelectRoute,
  showCurrentLocation = true,
  height = '420px',
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const googleMapInstanceRef = useRef(null);
  const googlePolylinesRef = useRef([]);
  const googleMarkersRef = useRef([]);
  const leafletInstanceRef = useRef(null);
  const leafletLayerGroupRef = useRef(null);

  const [mapType, setMapType] = useState('CHECKING'); // 'GOOGLE' | 'LEAFLET_FALLBACK'
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);

  // Check Google Maps availability on mount
  useEffect(() => {
    let isMounted = true;

    async function initMapEngine() {
      if (isGoogleMapsConfigured()) {
        try {
          const maps = await loadGoogleMapsScript();
          if (isMounted && maps && maps.Map) {
            setMapType('GOOGLE');
            return;
          }
        } catch (err) {
          console.warn('[GoogleMap] Could not initialize Google Maps, using fallback:', err.message);
        }
      }
      if (isMounted) {
        setMapType('LEAFLET_FALLBACK');
      }
    }

    initMapEngine();

    return () => {
      isMounted = false;
    };
  }, []);

  // Request browser geolocation if requested
  useEffect(() => {
    if (showCurrentLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          setLocationError(true);
        },
        { timeout: 5000 }
      );
    }
  }, [showCurrentLocation]);

  // ─── 1. GOOGLE MAPS RENDERING ───
  useEffect(() => {
    if (mapType !== 'GOOGLE' || !mapContainerRef.current) return;

    const maps = window.google?.maps;
    if (!maps) return;

    const defaultCenter = {
      lat: activeSegment?.originLat || 15.4989,
      lng: activeSegment?.originLng || 73.8000
    };

    if (!googleMapInstanceRef.current) {
      const map = new maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 13,
        mapTypeId: maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'on' }] }
        ]
      });
      googleMapInstanceRef.current = map;
    }

    const map = googleMapInstanceRef.current;

    // Clear existing polylines & markers
    googlePolylinesRef.current.forEach((pl) => pl.setMap(null));
    googlePolylinesRef.current = [];
    googleMarkersRef.current.forEach((mk) => mk.setMap(null));
    googleMarkersRef.current = [];

    const bounds = new maps.LatLngBounds();
    const candidateRoutes = activeSegment?.candidateRoutes || [];
    const recommendedRoute = candidateRoutes.find((r) => r.isRecommended) || candidateRoutes[0];
    const targetSelectedId = selectedRouteId || recommendedRoute?.id;

    // Render Routes
    candidateRoutes.forEach((route) => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const isSelected = route.id === targetSelectedId;
      const isRec = route.id === recommendedRoute?.id;
      const isDegraded = route.accessibility < 50;

      const path = route.coordinates.map((c) => ({ lat: c[0], lng: c[1] }));
      path.forEach((pt) => bounds.extend(pt));

      const polyline = new maps.Polyline({
        path,
        geodesic: true,
        strokeColor: isDegraded ? '#ef4444' : isSelected ? '#059669' : route.id === 'A' ? '#f59e0b' : '#3b82f6',
        strokeOpacity: isSelected ? 0.95 : 0.6,
        strokeWeight: isSelected ? 6 : 4,
        zIndex: isSelected ? 10 : 2
      });

      polyline.setMap(map);
      googlePolylinesRef.current.push(polyline);

      polyline.addListener('click', () => {
        if (onSelectRoute) onSelectRoute(route.id);
      });
    });

    // Render Origin & Destination Markers
    if (activeSegment) {
      const originPos = { lat: activeSegment.originLat || 15.4989, lng: activeSegment.originLng || 73.8000 };
      const destPos = { lat: activeSegment.destinationLat || 15.4920, lng: activeSegment.destinationLng || 73.7737 };

      bounds.extend(originPos);
      bounds.extend(destPos);

      const originMarker = new maps.Marker({
        position: originPos,
        map,
        title: `Origin: ${activeSegment.origin}`,
        label: { text: 'A', color: 'white', fontWeight: 'bold' }
      });
      googleMarkersRef.current.push(originMarker);

      const destMarker = new maps.Marker({
        position: destPos,
        map,
        title: `Destination: ${activeSegment.destination}`,
        label: { text: 'B', color: 'white', fontWeight: 'bold' }
      });
      googleMarkersRef.current.push(destMarker);
    }

    // User location marker
    if (userLocation) {
      const userMarker = new maps.Marker({
        position: userLocation,
        map,
        title: 'Current Position (Live GPS)',
        icon: {
          path: maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
      googleMarkersRef.current.push(userMarker);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
    }
  }, [mapType, activeSegment, selectedRouteId, userLocation]);

  // ─── 2. LEAFLET FALLBACK RENDERING ───
  useEffect(() => {
    if (mapType !== 'LEAFLET_FALLBACK' || !mapContainerRef.current) return;

    if (!leafletInstanceRef.current) {
      try {
        const defaultCenter = [activeSegment?.originLat || 15.4989, activeSegment?.originLng || 73.8000];
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: 13,
          zoomControl: false,
          attributionControl: false
        });

        L.control.zoom({ position: 'topright' }).addTo(map);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: ['a', 'b', 'c']
        }).addTo(map);

        const layerGroup = L.layerGroup().addTo(map);
        leafletLayerGroupRef.current = layerGroup;
        leafletInstanceRef.current = map;
      } catch (err) {
        console.error('[Leaflet Init Error]:', err);
      }
    }

    const map = leafletInstanceRef.current;
    const layerGroup = leafletLayerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const candidateRoutes = activeSegment?.candidateRoutes || [];
    const recommendedRoute = candidateRoutes.find((r) => r.isRecommended) || candidateRoutes[0];
    const targetSelectedId = selectedRouteId || recommendedRoute?.id;
    const bounds = L.latLngBounds([]);

    candidateRoutes.forEach((route) => {
      if (!route.coordinates || route.coordinates.length < 2) return;

      const isSelected = route.id === targetSelectedId;
      const isDegraded = route.accessibility < 50;

      const polyline = L.polyline(route.coordinates, {
        color: isDegraded ? '#ef4444' : isSelected ? '#059669' : route.id === 'A' ? '#f59e0b' : '#3b82f6',
        weight: isSelected ? 6 : 4,
        opacity: isSelected ? 0.95 : 0.65,
        dashArray: isDegraded ? '4, 8' : isSelected ? undefined : '6, 8',
        lineCap: 'round'
      });

      polyline.bindTooltip(
        `<strong>Route ${route.id}: ${route.name}</strong><br/>Score: ${route.score}/100 | ${route.durationMin}m`,
        { sticky: true }
      );

      polyline.on('click', () => {
        if (onSelectRoute) onSelectRoute(route.id);
      });

      layerGroup.addLayer(polyline);
      route.coordinates.forEach((c) => bounds.extend(c));
    });

    // Origin Marker
    if (activeSegment?.originLat && activeSegment?.originLng) {
      const originMarker = L.circleMarker([activeSegment.originLat, activeSegment.originLng], {
        radius: 8,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).bindTooltip(`<strong>Start:</strong> ${activeSegment.origin}`, { permanent: false });
      layerGroup.addLayer(originMarker);
      bounds.extend([activeSegment.originLat, activeSegment.originLng]);
    }

    // Destination Marker
    if (activeSegment?.destinationLat && activeSegment?.destinationLng) {
      const destMarker = L.circleMarker([activeSegment.destinationLat, activeSegment.destinationLng], {
        radius: 8,
        fillColor: '#059669',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1
      }).bindTooltip(`<strong>Milestone:</strong> ${activeSegment.destination}`, { permanent: false });
      layerGroup.addLayer(destMarker);
      bounds.extend([activeSegment.destinationLat, activeSegment.destinationLng]);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [mapType, activeSegment, selectedRouteId]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-soft bg-slate-100 ${className}`}>
      {/* Top Map Status Overlay */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        {mapType === 'GOOGLE' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold shadow-md border border-slate-200/80 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE GOOGLE MAPS ROUTING
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold shadow-md border border-amber-200/80 backdrop-blur-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            DEMO / OFFLINE MAP MODE
          </span>
        )}

        {activeSegment && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-medium shadow-md backdrop-blur-xs">
            <Navigation className="w-3 h-3 text-brand-300" />
            {activeSegment.origin} → {activeSegment.destination}
          </span>
        )}
      </div>

      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} className="relative z-10" />

      {/* Bottom Route Selector Strip */}
      {activeSegment?.candidateRoutes && (
        <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2 p-2 rounded-xl bg-white/95 border border-slate-200 shadow-md backdrop-blur-xs">
          <div className="flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider pl-1">
              Select Route:
            </span>
            {activeSegment.candidateRoutes.map((r) => {
              const isSelected = r.id === (selectedRouteId || (r.isRecommended ? r.id : null));
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRoute && onSelectRoute(r.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <span>Route {r.id}</span>
                  <span className="text-[10px] opacity-90">{r.score}★</span>
                </button>
              );
            })}
          </div>

          <span className="text-[10px] text-slate-500 font-medium hidden md:inline">
            Interactive Waypoints & Corridors
          </span>
        </div>
      )}
    </div>
  );
}
