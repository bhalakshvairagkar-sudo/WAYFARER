import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';
import authRoutes from '../server/routes/authRoutes.js';
import communityRoutes from '../server/routes/communityRoutes.js';
import { authenticateToken, requireRole } from '../server/middleware/authMiddleware.js';

describe('User Roles & Controller Interface Test Suite', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/community', communityRoutes);

  // Protected controller route to verify RBAC
  app.get('/api/controller/status', authenticateToken, requireRole(['CONTROLLER', 'ADMIN']), (req, res) => {
    res.json({
      success: true,
      authorized: true,
      operator: req.user.name,
      organization: req.user.organization,
      phone: req.user.phone
    });
  });

  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
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

  it('registers and authenticates a TRANSIT CONTROLLER with organization and dispatch credentials', async () => {
    // 1. Register CONTROLLER
    const ctrlRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: `controller-${Date.now()}@transit.gov.in`,
        password: 'SecurePassword123!',
        name: 'Inspector Vikram Salunkhe',
        role: 'CONTROLLER',
        organization: 'Mumbai Municipal Transit Operations Center',
        phone: '+91 22 2262 0000'
      }
    });

    assert.strictEqual(ctrlRes.status, 201);
    assert.ok(ctrlRes.body.token);
    assert.strictEqual(ctrlRes.body.user.role, 'CONTROLLER');
    assert.strictEqual(ctrlRes.body.user.organization, 'Mumbai Municipal Transit Operations Center');
    assert.strictEqual(ctrlRes.body.user.phone, '+91 22 2262 0000');

    const token = ctrlRes.body.token;

    // 2. Access Controller-restricted route
    const statusRes = await makeRequest('/api/controller/status', {
      headers: { Authorization: `Bearer ${token}` }
    });

    assert.strictEqual(statusRes.status, 200);
    assert.strictEqual(statusRes.body.authorized, true);
    assert.strictEqual(statusRes.body.organization, 'Mumbai Municipal Transit Operations Center');
    assert.strictEqual(statusRes.body.phone, '+91 22 2262 0000');

    // 3. Controller dispatches Emergency Corridor Broadcast
    const broadcastRes = await makeRequest('/api/community/broadcast', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        corridorId: 'S3',
        title: 'CST Elevator 3 Offline',
        message: 'Step-free transit diverted to Ramp B. Station staff deployed.',
        severity: 0.9,
        eventType: 'ACCESSIBILITY_ISSUE'
      }
    });

    assert.strictEqual(broadcastRes.status, 200);
    assert.strictEqual(broadcastRes.body.success, true);
    assert.ok(broadcastRes.body.incident);
    assert.strictEqual(broadcastRes.body.incident.decision, 'ADAPT');
    assert.strictEqual(broadcastRes.body.incident.status, 'ACTIVE');

    // 4. Verify login returns controller credentials
    const loginRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: {
        email: ctrlRes.body.user.email,
        password: 'SecurePassword123!'
      }
    });

    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginRes.body.user.role, 'CONTROLLER');
    assert.strictEqual(loginRes.body.user.organization, 'Mumbai Municipal Transit Operations Center');
  });

  it('rejects standard USER from controller-restricted routes while preserving personalized traveler features', async () => {
    // 1. Register standard USER (Senior mode)
    const userRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: `senior-${Date.now()}@example.com`,
        password: 'Password123!',
        name: 'Savitri Bai',
        role: 'USER',
        travelerProfile: {
          mobility: 'elderly',
          stairsAllowed: false,
          maxWalkingDistanceMeters: 400,
          preferShade: true,
          safetyPriority: 'high'
        }
      }
    });

    assert.strictEqual(userRes.status, 201);
    assert.strictEqual(userRes.body.user.role, 'USER');
    assert.strictEqual(userRes.body.user.travelerProfile.mobility, 'elderly');
    assert.strictEqual(userRes.body.user.travelerProfile.preferShade, true);
    assert.strictEqual(userRes.body.user.travelerProfile.maxWalkingDistanceMeters, 400);

    const userToken = userRes.body.token;

    // 2. Standard USER must be denied access to Controller-only endpoints
    const deniedRes = await makeRequest('/api/controller/status', {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    assert.strictEqual(deniedRes.status, 403);
    assert.strictEqual(deniedRes.body.error, 'Forbidden: Insufficient role permissions for this operation.');

    // 3. User can fetch and update their personalized traveler profile
    const profileRes = await makeRequest('/api/auth/me', {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    assert.strictEqual(profileRes.status, 200);
    assert.strictEqual(profileRes.body.user.travelerProfile.mobility, 'elderly');
  });
});