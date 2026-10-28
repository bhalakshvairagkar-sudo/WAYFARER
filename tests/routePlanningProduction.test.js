import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import routeRoutes from '../server/routes/routeRoutes.js';
import {
  validateCoordinates,
  validateProviderRoute,
  decodePolyline,
  calculateProductionRoute,
  clearRouteCache
} from '../server/services/routingService.js';

describe('Phase 2 — Production-Grade Route Planning Test Suite', () => {
  let server;
  let baseUrl;

  const app = express();
  app.use(express.json());
  app.use('/api/routes', routeRoutes);

  before(async () => {
    clearRouteCache();
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        baseUrl = `http://localhost:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    clearRouteCache();
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections();
      }
      await new Promise((resolve) => server.close(resolve));
    }
  });

  function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(
        url,
        {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'close',
            ...(options.headers || {})
          }
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (options.body) req.write(JSON.stringify(options.body));
      req.end();
    });
  }

  it('1. Strict Coordinate Validation: rejects out-of-bounds, NaN, and non-numeric coordinates', () => {
    // Valid cases
    assert.strictEqual(validateCoordinates(18.9220, 72.8347), true);
    assert.strictEqual(validateCoordinates(0, 0), true);
    assert.strictEqual(validateCoordinates(-90, -180), true);
    assert.strictEqual(validateCoordinates(90, 180), true);

    // Invalid cases
    assert.strictEqual(validateCoordinates(95.0, 72.8347), false); // Lat > 90
    assert.strictEqual(validateCoordinates(-95.0, 72.8347), false); // Lat < -90
    assert.strictEqual(validateCoordinates(18.9220, 185.0), false); // Lng > 180
    assert.strictEqual(validateCoordinates(18.9220, -185.0), false); // Lng < -180
    assert.strictEqual(validateCoordinates(NaN, 72.8347), false);
    assert.strictEqual(validateCoordinates(18.9220, NaN), false);
    assert.strictEqual(validateCoordinates('18.9220', 72.8347), false);
    assert.strictEqual(validateCoordinates(null, undefined), false);
  });

  it('2. API Validation: rejects invalid coordinates with HTTP 400 Bad Request', async () => {
    const res1 = await makeRequest('/api/routes/calculate', {
      method: 'POST',
      body: {
        origin: { lat: 105.0, lng: 72.8347 }, // Invalid Lat > 90
        destination: { lat: 18.9401, lng: 72.8354 }
      }
    });

    assert.strictEqual(res1.status, 400);
    assert.strictEqual(res1.body.success, false);
    assert.strictEqual(res1.body.code, 'INVALID_COORDINATES');

    const res2 = await makeRequest('/api/routes/calculate', {
      method: 'POST',
      body: {
        origin: { lat: 18.9220, lng: 72.8347 },
        destination: { lat: 18.9401, lng: 200.0 } // Invalid Lng > 180
      }
    });

    assert.strictEqual(res2.status, 400);
    assert.strictEqual(res2.body.success, false);
    assert.strictEqual(res2.body.code, 'INVALID_COORDINATES');
  });

  it('3. Provider Response Validation: invalid or corrupted provider responses cannot be displayed as valid routes', () => {
    // Valid route
    assert.strictEqual(validateProviderRoute({
      distanceMeters: 2400,
      durationSeconds: 1200,
      geometry: [[18.9220, 72.8347], [18.9300, 72.8350], [18.9401, 72.8354]]
    }), true);

    // Corrupted: distance <= 0
    assert.strictEqual(validateProviderRoute({
      distanceMeters: 0,
      durationSeconds: 1200,
      geometry: [[18.9220, 72.8347], [18.9401, 72.8354]]
    }), false);

    // Corrupted: duration <= 0
    assert.strictEqual(validateProviderRoute({
      distanceMeters: 2400,
      durationSeconds: 0,
      geometry: [[18.9220, 72.8347], [18.9401, 72.8354]]
    }), false);

    // Corrupted: geometry has less than 2 points
    assert.strictEqual(validateProviderRoute({
      distanceMeters: 2400,
      durationSeconds: 1200,
      geometry: [[18.9220, 72.8347]]
    }), false);

    // Corrupted: geometry has invalid points
    assert.strictEqual(validateProviderRoute({
      distanceMeters: 2400,
      durationSeconds: 1200,
      geometry: [[999.0, 72.8347], [18.9401, 72.8354]]
    }), false);
  });

  it('4. Polyline Decoding: decodes standard Google encoded polylines into valid coordinates', () => {
    // Encoded polyline for a path in South Mumbai
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const decoded = decodePolyline(encoded);
    assert.ok(Array.isArray(decoded));
    assert.ok(decoded.length >= 2);
    assert.strictEqual(typeof decoded[0][0], 'number');
    assert.strictEqual(typeof decoded[0][1], 'number');
  });

  it('5. Real Origin/Destination produces valid route geometry and multiple alternatives', async () => {
    // Gateway of India (18.9220, 72.8347) -> CSMT Station (18.9401, 72.8354)
    const res = await makeRequest('/api/routes/calculate', {
      method: 'POST',
      body: {
        origin: { lat: 18.9220, lng: 72.8347, name: 'Gateway of India' },
        destination: { lat: 18.9401, lng: 72.8354, name: 'CSMT Railway Station' },
        travelMode: 'walking',
        traveler: { mobility: 'wheelchair', stairsAllowed: false }
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.provider === 'GOOGLE_DIRECTIONS' || res.body.provider === 'OSRM_ROUTING');
    assert.ok(res.body.dataProvenance === 'LIVE_PROVIDER' || res.body.dataProvenance === 'CACHED_PROVIDER');
    assert.ok(Array.isArray(res.body.routes));
    assert.ok(res.body.routes.length >= 1);

    const primaryRoute = res.body.routes[0];
    assert.ok(primaryRoute.id);
    assert.ok(primaryRoute.distanceMeters > 0);
    assert.ok(primaryRoute.durationSeconds > 0);
    assert.ok(Array.isArray(primaryRoute.geometry));
    assert.ok(primaryRoute.geometry.length >= 2);

    // Verify coordinates in geometry are valid numbers
    const firstPt = primaryRoute.geometry[0];
    assert.ok(firstPt[0] >= 18.8 && firstPt[0] <= 19.1);
    assert.ok(firstPt[1] >= 72.7 && firstPt[1] <= 73.0);

    // Repeat query verifies caching provenance
    const cachedRes = await makeRequest('/api/routes/calculate', {
      method: 'POST',
      body: {
        origin: { lat: 18.9220, lng: 72.8347, name: 'Gateway of India' },
        destination: { lat: 18.9401, lng: 72.8354, name: 'CSMT Railway Station' },
        travelMode: 'walking'
      }
    });

    assert.strictEqual(cachedRes.status, 200);
    assert.strictEqual(cachedRes.body.dataProvenance, 'CACHED_PROVIDER');
  });

  it('6. Strict Non-Fabrication Guarantee: Provider failure NEVER creates a fabricated route', async () => {
    // When routing providers are completely unreachable or coordinates cannot be routed (e.g. middle of Indian Ocean)
    const unreachableRes = await calculateProductionRoute({
      origin: { lat: 0.0, lng: 80.0 }, // Middle of open ocean
      destination: { lat: 0.05, lng: 80.05 },
      travelMode: 'walking'
    });

    // The system MUST NOT fabricate synthetic toy curves
    if (!unreachableRes.success) {
      assert.strictEqual(unreachableRes.success, false);
      assert.strictEqual(unreachableRes.status, 'UNAVAILABLE');
      assert.strictEqual(unreachableRes.code, 'ROUTE_UNAVAILABLE');
      assert.strictEqual(unreachableRes.routes.length, 0);
    }
  });

  it('7. Routing Provider Status Endpoint: reports configuration and telemetry', async () => {
    const res = await makeRequest('/api/routes/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(typeof res.body.googleMapsConfigured, 'boolean');
    assert.strictEqual(res.body.osrmAvailable, true);
    assert.strictEqual(typeof res.body.cacheEntriesCount, 'number');
  });
});