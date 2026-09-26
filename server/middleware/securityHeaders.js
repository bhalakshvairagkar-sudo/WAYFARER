/**
 * WAYFARER AI - HTTP Security Headers Middleware
 * Configures Helmet with a hardened Content Security Policy that supports
 * OpenStreetMap, Leaflet, CartoDB, and Google Maps without exposing attack surface.
 */

import helmet from 'helmet';

export const configureSecurityHeaders = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Vite live reload and fast react runtime
          'https://maps.googleapis.com',
          'https://unpkg.com'
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://unpkg.com'
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.tile.openstreetmap.org',
          'https://*.basemaps.cartocdn.com',
          'https://maps.googleapis.com',
          'https://maps.gstatic.com',
          'https://*.google.com',
          'https://*.googleapis.com',
          'https://*.googleusercontent.com'
        ],
        connectSrc: [
          "'self'",
          'http://localhost:*',
          'ws://localhost:*',
          'https://router.project-osrm.org',
          'https://generativelanguage.googleapis.com',
          'https://maps.googleapis.com',
          'https://nominatim.openstreetmap.org'
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"], // Strong Clickjacking prevention
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false, // Prevents breaking third-party map tiles
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xFrameOptions: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  });
};
