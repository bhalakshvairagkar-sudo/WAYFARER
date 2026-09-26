import React, { useEffect, useRef, useState } from 'react';
import { Layers, Navigation, AlertCircle, Compass, MapPin, CheckCircle, Info, Key, Check, X } from 'lucide-react';
import L from 'leaflet';
import {
  isGoogleMapsConfigured,
  loadGoogleMapsScript,
  ensureMapsKeyLoaded,
  getGoogleMapsApiKey,
  saveGoogleMapsApiKey
} from '../../services/googleMapsLoader.js';
import { updateUserLocation } from '../../services/api.js';

export default function GoogleMap({
  activeSegment,
  segments = [],
  waypoints = [],
  selectedRouteId,
  onSelectRoute,
  onMapClick,
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
  const leafletTileLayerRef = useRef(null);
  const resizeObserverRef = useRef(null);

  const [mapType, setMapType] = useState(() => isGoogleMapsConfigured() ? 'CHECKING' : 'LEAFLET_FALLBACK');
  const [tileMode, setTileMode] = useState('streets'); // 'streets' | 'satellite' | 'terrain'
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => getGoogleMapsApiKey());
  const [keySaveStatus, setKeySaveStatus] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);

  // Check Google Maps availability on mount
  useEffect(() => {
    let isMounted = true;

    async function initMapEngine() {
      let configured = isGoogleMapsConfigured();
      if (!configured) {
        const serverKey = await ensureMapsKeyLoaded();
        if (serverKey) configured = true;
      }

      if (configured) {
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

  // Cleanup Leaflet on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.remove();
        leafletInstanceRef.current = null;
      }
    };
  }, []);

  // Request browser geolocation if requested for real-time tracking
  useEffect(() => {
    if (showCurrentLocation && navigator.geolocation) {
      let lastSyncTime = 0;

      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });
          setLocationError(false);

          // Throttled sync to backend location API (at most once every 10 seconds)
          const now = Date.now();
          if (now - lastSyncTime > 10000) {
            lastSyncTime = now;
            const precision = localStorage.getItem('wayfarer_precision_mode') || 'precise';
            updateUserLocation({
              lat,
              lng,
              accuracy: pos.coords.accuracy || 10,
              precision,
              journeyId: activeSegment?.id || 'active-journey'
            }).catch(() => {});
          }
        },
        (err) => {
          console.warn('[GoogleMap] Real-time tracking error:', err);
          setLocationError(true);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [showCurrentLocation, activeSegment?.id]);

  // ─── 1. GOOGLE MAPS RENDERING ───
  useEffect(() => {
    if (mapType !== 'GOOGLE' || !mapContainerRef.current) return;

    const maps = window.google?.maps;
    if (!maps) return;

    const hasOrigin = Boolean(activeSegment?.originLat && activeSegment?.originLng);
    const defaultCenter = {
      lat: hasOrigin ? activeSegment.originLat : 20.5937,
      lng: hasOrigin ? activeSegment.originLng : 78.9629
    };
    const defaultZoom = hasOrigin ? 13 : 5;

    if (!googleMapInstanceRef.current) {
      const map = new maps.Map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: defaultZoom,
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

      map.addListener('click', (e) => {
        if (onMapClick && e.latLng) {
          onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
        }
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
    if (activeSegment?.originLat && activeSegment?.originLng) {
      const originPos = { lat: activeSegment.originLat, lng: activeSegment.originLng };
      bounds.extend(originPos);
      const originMarker = new maps.Marker({
        position: originPos,
        map,
        title: `Origin: ${activeSegment.origin || 'Origin'}`,
        label: { text: 'A', color: 'white', fontWeight: 'bold' }
      });
      googleMarkersRef.current.push(originMarker);
    }

    if (activeSegment?.destinationLat && activeSegment?.destinationLng) {
      const destPos = { lat: activeSegment.destinationLat, lng: activeSegment.destinationLng };
      bounds.extend(destPos);
      const destMarker = new maps.Marker({
        position: destPos,
        map,
        title: `Destination: ${activeSegment.destination || 'Destination'}`,
        label: { text: 'B', color: 'white', fontWeight: 'bold' }
      });
      googleMarkersRef.current.push(destMarker);
    }

    // Waypoint Markers
    waypoints.forEach((wp, idx) => {
      if (wp.lat && wp.lng) {
        const wpPos = { lat: wp.lat, lng: wp.lng };
        bounds.extend(wpPos);
        const wpMarker = new maps.Marker({
          position: wpPos,
          map,
          title: `Stop ${idx + 1}: ${wp.name}`,
          label: { text: `${idx + 1}`, color: 'white', fontSize: '12px', fontWeight: 'bold' },
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#7c3aed',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
        googleMarkersRef.current.push(wpMarker);
      }
    });

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
    } else if (hasOrigin) {
      map.setCenter(defaultCenter);
      map.setZoom(13);
    } else {
      map.setCenter({ lat: 20.5937, lng: 78.9629 });
      map.setZoom(5);
    }
  }, [mapType, activeSegment, selectedRouteId, userLocation, waypoints]);

  // ─── 2. LEAFLET FALLBACK RENDERING ───
  useEffect(() => {
    if (mapType !== 'LEAFLET_FALLBACK' || !mapContainerRef.current) return;

    if (!leafletInstanceRef.current) {
      try {
        // Prevent "Map container is already initialized" error if container was previously used
        if (mapContainerRef.current && mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }

        const hasOrigin = Boolean(activeSegment?.originLat && activeSegment?.originLng);
        const defaultCenter = [
          hasOrigin ? activeSegment.originLat : 20.5937,
          hasOrigin ? activeSegment.originLng : 78.9629
        ];
        const defaultZoom = hasOrigin ? 13 : 5;
        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: defaultZoom,
          zoomControl: false,
          attributionControl: false
        });

        // Authentic Google Maps tile layers across India
        const googleTileUrls = {
          streets: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
          satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
          terrain: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
        };

        const initialTileUrl = googleTileUrls[tileMode] || googleTileUrls.streets;
        const tileLayer = L.tileLayer(initialTileUrl, {
          maxZoom: 20,
          subdomains: ['0', '1', '2', '3'],
          attribution: '&copy; Google Maps'
        });
        tileLayer.addTo(map);
        leafletTileLayerRef.current = tileLayer;

        const layerGroup = L.layerGroup().addTo(map);
        leafletLayerGroupRef.current = layerGroup;

        map.on('click', (e) => {
          if (onMapClick && e.latlng) {
            onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
          }
        });

        leafletInstanceRef.current = map;
        
        // Multi-stage size invalidation to fix grey tiles across all layout transitions
        [100, 300, 600].forEach((delay) => {
          setTimeout(() => {
            if (leafletInstanceRef.current) {
              leafletInstanceRef.current.invalidateSize();
            }
          }, delay);
        });

        // Watch for parent container size changes (e.g. mobile bottom sheets, resizing)
        if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
          const ro = new ResizeObserver(() => {
            if (leafletInstanceRef.current) {
              leafletInstanceRef.current.invalidateSize();
            }
          });
          ro.observe(mapContainerRef.current);
          resizeObserverRef.current = ro;
        }
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

    // Waypoint Markers
    waypoints.forEach((wp, idx) => {
      if (wp.lat && wp.lng) {
        const wpIcon = L.divIcon({
          className: 'custom-wp-icon',
          html: `<div class="w-6 h-6 bg-violet-600 border-2 border-white rounded-full flex items-center justify-center text-white text-[10px] font-black shadow-md">${idx + 1}</div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        
        const wpMarker = L.marker([wp.lat, wp.lng], { icon: wpIcon })
          .bindTooltip(`<strong>Stop ${idx + 1}:</strong> ${wp.name}`, { permanent: false });
        
        layerGroup.addLayer(wpMarker);
        bounds.extend([wp.lat, wp.lng]);
      }
    });

    // Live Geolocation Marker
    if (userLocation?.lat && userLocation?.lng) {
      const userMarker = L.circleMarker([userLocation.lat, userLocation.lng], {
        radius: 7,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
      }).bindTooltip('<strong>Your Location</strong>', { permanent: false });
      layerGroup.addLayer(userMarker);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (activeSegment?.originLat && activeSegment?.originLng) {
      map.setView([activeSegment.originLat, activeSegment.originLng], 13);
    } else {
      map.setView([20.5937, 78.9629], 5);
    }

    // Invalidate size on segment switch
    setTimeout(() => {
      if (leafletInstanceRef.current) {
        leafletInstanceRef.current.invalidateSize();
      }
    }, 100);
  }, [mapType, activeSegment, selectedRouteId, userLocation, waypoints]);

  // Synchronize Tile Mode across Google Maps SDK and Leaflet
  useEffect(() => {
    if (mapType === 'GOOGLE' && googleMapInstanceRef.current && window.google?.maps) {
      const modeMap = {
        streets: window.google.maps.MapTypeId.ROADMAP,
        satellite: window.google.maps.MapTypeId.HYBRID,
        terrain: window.google.maps.MapTypeId.TERRAIN
      };
      googleMapInstanceRef.current.setMapTypeId(modeMap[tileMode] || window.google.maps.MapTypeId.ROADMAP);
    } else if (leafletInstanceRef.current && leafletTileLayerRef.current) {
      const googleTileUrls = {
        streets: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
        satellite: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        terrain: 'https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'
      };
      leafletInstanceRef.current.removeLayer(leafletTileLayerRef.current);
      const newLayer = L.tileLayer(googleTileUrls[tileMode] || googleTileUrls.streets, {
        maxZoom: 20,
        subdomains: ['0', '1', '2', '3'],
        attribution: '&copy; Google Maps'
      });
      newLayer.addTo(leafletInstanceRef.current);
      leafletTileLayerRef.current = newLayer;
    }
  }, [tileMode, mapType]);

  return (
    <div style={{ height: height === '100%' ? '100%' : 'auto' }} className={`relative rounded-2xl overflow-hidden border border-slate-200 shadow-soft bg-slate-100 ${className}`}>
      {/* Top Map Status Overlay */}
      <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2 pointer-events-none">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 text-slate-800 text-[11px] font-bold shadow-md border border-slate-200/80 backdrop-blur-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          {mapType === 'GOOGLE' ? 'GOOGLE MAPS JS SDK • INDIA' : 'REAL GOOGLE MAPS • INDIA'}
        </span>

        {activeSegment && (
          <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-[10px] font-medium shadow-md backdrop-blur-xs">
            <Navigation className="w-3 h-3 text-brand-300" />
            {activeSegment.origin} → {activeSegment.destination}
          </span>
        )}
      </div>

      {/* Top Map Layer & Key Controls */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/95 border border-slate-200/90 shadow-md backdrop-blur-xs">
        <button
          type="button"
          onClick={() => setTileMode('streets')}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${tileMode === 'streets' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Streets
        </button>
        <button
          type="button"
          onClick={() => setTileMode('satellite')}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${tileMode === 'satellite' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Satellite
        </button>
        <button
          type="button"
          onClick={() => setTileMode('terrain')}
          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${tileMode === 'terrain' ? 'bg-brand-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Terrain
        </button>
        <div className="h-3.5 w-px bg-slate-200 mx-0.5"></div>
        <button
          type="button"
          onClick={() => {
            setApiKeyInput(getGoogleMapsApiKey());
            setShowKeyModal(true);
          }}
          title="Configure Google Maps API Key"
          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
            isGoogleMapsConfigured()
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <Key className="w-3 h-3" />
          <span className="hidden sm:inline">{isGoogleMapsConfigured() ? 'Key Active' : 'Set Key'}</span>
        </button>
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

      {/* Google Maps API Key Setup Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Google Maps API Key Setup</h3>
                  <p className="text-[11px] text-slate-500">Live Maps & Places across India</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowKeyModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Real-time Google Maps (Streets, Satellite, Terrain) and nationwide India search are active. Enter your Google Cloud API key below to activate Google Maps JavaScript SDK & Google Places:
            </p>

            <input
              type="text"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste AIzaSy... API key here"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
            />

            {keySaveStatus && (
              <p className="text-xs text-emerald-600 font-semibold mb-3 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {keySaveStatus}
              </p>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  saveGoogleMapsApiKey('');
                  setApiKeyInput('');
                  setKeySaveStatus('Key cleared. Google Maps active.');
                  setTimeout(() => {
                    setShowKeyModal(false);
                    setKeySaveStatus('');
                  }, 1000);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                Clear Key
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveGoogleMapsApiKey(apiKeyInput);
                    setKeySaveStatus('Saved! Connecting Google Maps SDK...');
                    setTimeout(async () => {
                      setShowKeyModal(false);
                      setKeySaveStatus('');
                      try {
                        const maps = await loadGoogleMapsScript();
                        if (maps && maps.Map) {
                          setMapType('GOOGLE');
                        }
                      } catch (e) {}
                    }, 800);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
