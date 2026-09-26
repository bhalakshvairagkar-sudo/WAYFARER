import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import authRoutes from '../server/routes/authRoutes.js';
import { optionalAuth } from '../server/middleware/authMiddleware.js';
import { deriveTravelerWeights } from '../server/engine/scoringEngine.js';
import { segmentJourney } from '../server/engine/journeySegmenter.js';
import { DEFAULT_STOPS, DEFAULT_TRAVELER, DEFAULT_TRIP } from '../server/data/defaultJourney.js';

describe('User Requirements & Traveler Profile Registration Synchronization', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);

  // Default journey endpoint mimicking server.js logic with user travelerProfile
  app.get('/api/journey/default', optionalAuth, (req, res) => {
    const traveler = req.user
      ? {
          ...DEFAULT_TRAVELER,
          name: req.user.name || DEFAULT_TRAVELER.name,
          email: req.user.email,
          ...(req.user.travelerProfile || {})
        }
      : DEFAULT_TRAVELER;
    const weights = deriveTravelerWeights(traveler);
    const segments = segmentJourney(DEFAULT_STOPS, traveler);
    res.json({ success: true, traveler, weights, segments });
  });

  let server;
  let baseUrl;

  function makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(
        url,
        {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
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

  it('registers new user with wheelchair mobility requirements and custom constraints', async () => {
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: `wheelchair-${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Rahul Verma',
        travelerProfile: {
          mobility: 'wheelchair',
          stairsAllowed: false,
          needsElevator: true,
          maxWalkingDistanceMeters: 500,
          safetyPriority: 'high',
          crowdTolerance: 'low',
          preferShade: true
        }
      }
    });

    assert.strictEqual(regRes.status, 201);
    assert.ok(regRes.body.token);
    assert.strictEqual(regRes.body.user.name, 'Rahul Verma');
    assert.strictEqual(regRes.body.user.travelerProfile.mobility, 'wheelchair');
    assert.strictEqual(regRes.body.user.travelerProfile.stairsAllowed, false);
    assert.strictEqual(regRes.body.user.travelerProfile.needsElevator, true);
    assert.strictEqual(regRes.body.user.travelerProfile.preferShade, true);

    const token = regRes.body.token;

    // Verify /api/auth/me returns the customized requirements
    const meRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.travelerProfile.mobility, 'wheelchair');

    // Verify /api/journey/default adapts to the new user's requirements
    const journeyRes = await makeRequest('/api/journey/default', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(journeyRes.status, 200);
    assert.strictEqual(journeyRes.body.traveler.name, 'Rahul Verma');
    assert.strictEqual(journeyRes.body.traveler.mobility, 'wheelchair');
    assert.strictEqual(journeyRes.body.traveler.stairsAllowed, false);
    assert.strictEqual(journeyRes.body.traveler.preferShade, true);

    // Accessibility weight should be highest for wheelchair
    assert.ok(journeyRes.body.weights.accessibility >= 0.35);

    // Update requirements via PUT /api/auth/profile
    const updateRes = await makeRequest('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        name: 'Rahul V.',
        travelerProfile: {
          maxWalkingDistanceMeters: 300,
          crowdTolerance: 'low'
        }
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.user.name, 'Rahul V.');
    assert.strictEqual(updateRes.body.user.travelerProfile.maxWalkingDistanceMeters, 300);

    server.close();
  });
});
