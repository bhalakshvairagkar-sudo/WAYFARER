import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldAlert,
  Clock,
  MapPin,
  AlertTriangle,
  Lock,
  Phone,
  CheckCircle2,
  RefreshCw,
  Compass,
  ArrowLeft
} from 'lucide-react';
import L from 'leaflet';
import { fetchSharedLocation } from '../services/api.js';

export default function SharedLocationPageView() {
  const { token } = useParams();
  const [shareData, setShareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // Poll / fetch shared location
  useEffect(() => {
    let isMounted = true;

    async function loadLocation() {
      try {
        const data = await fetchSharedLocation(token);
        if (isMounted) {
          setShareData(data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Shared location expired or invalid.');
          setLoading(false);
        }
      }
    }

    loadLocation();
    const interval = setInterval(loadLocation, 10000); // Poll every 10s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  // Expiration countdown timer
  useEffect(() => {
    if (!shareData?.expiresAt) return;

    const timer = setInterval(() => {
      const remainingMs = new Date(shareData.expiresAt) - new Date();
      if (remainingMs <= 0) {
        setTimeLeft('Expired');
        setError('Location sharing session has expired and self-destructed.');
        clearInterval(timer);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}m ${secs < 10 ? '0' : ''}${secs}s`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [shareData]);

  // Leaflet Map Rendering
  useEffect(() => {
    if (!shareData?.currentLocation || !mapContainerRef.current) return;

    const { lat, lng } = shareData.currentLocation;

    if (!mapInstanceRef.current) {
      if (mapContainerRef.current._leaflet_id) {
        delete mapContainerRef.current._leaflet_id;
      }

      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        subdomains: ['a', 'b', 'c']
      }).addTo(map);

      const marker = L.circleMarker([lat, lng], {
        radius: 10,
        fillColor: '#059669',
        color: '#ffffff',
        weight: 3,
        fillOpacity: 1
      }).bindTooltip(`<strong>Traveler Active Location</strong><br/>Precision: ${shareData.precision}`, { permanent: true });

      marker.addTo(map);

      mapInstanceRef.current = map;
      markerRef.current = marker;

      setTimeout(() => map.invalidateSize(), 300);
    } else {
      mapInstanceRef.current.setView([lat, lng]);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shareData]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="text-sm font-bold text-slate-600">Verifying cryptographically signed location share token...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto mt-16 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Location Share Inactive or Expired</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            This ephemeral sharing link has safely self-destructed in accordance with the traveler's privacy and data retention policy.
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-500 text-left space-y-1 border border-slate-200">
          <div className="font-bold text-slate-700">Security Guarantee:</div>
          <div>• Temporary tokens expire automatically after their scheduled duration.</div>
          <div>• Travelers can manually revoke live sharing at any second.</div>
          <div>• Coordinates are permanently erased from historical logs.</div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to WAYFARER Home</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-slate-200 rounded-3xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                LIVE EPHEMERAL SHARING SESSION
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Shared Live Traveler Location
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-[10px] font-bold text-slate-500">Auto-Purge In:</div>
              <div className="text-xs font-black text-slate-900">{timeLeft || 'Active'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Card */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-200 shadow-md h-[460px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Overlay Card */}
        <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-20 p-4 rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-900">
              {shareData?.recipientLabel || 'Emergency Contact View'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {shareData?.precision === 'approximate' ? 'Approximate (~1km)' : 'Precise GPS'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600">
            Telemetry is streamed via TLS 1.3 encryption. Coordinates will automatically stop broadcasting when the session expires.
          </p>
        </div>
      </div>
    </div>
  );
}
