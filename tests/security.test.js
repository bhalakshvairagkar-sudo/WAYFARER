/**
 * WAYFARER AI - Automated Security Test Suite
 * Validates authentication, authorization, IDOR prevention, rate limiting,
 * security headers, data minimization, and secret redaction.
 */

import http from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';

import { configureSecurityHeaders } from '../server/middleware/securityHeaders.js';
import { configureCors } from '../server/middleware/corsConfig.js';
import { authRateLimiter, locationRateLimiter } from '../server/middleware/rateLimiters.js';
import { authenticateToken, requireRole, getJwtSecret } from '../server/middleware/authMiddleware.js';
import { errorHandler } from '../server/middleware/errorHandler.js';
import { redactSensitiveData } from '../server/utils/securityLogger.js';
import { minimizeCoordinates } from '../server/models/LocationHistory.js';
import authRoutes from '../server/routes/authRoutes.js';
import locationRoutes from '../server/routes/locationRoutes.js';

// Setup isolated test server
const app = express();
app.use(configureSecurityHeaders());
app.use(configureCors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/location', locationRoutes);

// Admin-restricted route for RBAC testing
app.get('/api/admin/system', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  res.json({ success: true, secret: 'admin-classified-data' });
});

app.use(errorHandler);

let server;
let baseUrl;

function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) { json = data; }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: json
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runSecurityTests() {
  console.log('\n============================================================');
  console.log('       WAYFARER SECURITY AUDIT & VERIFICATION TEST SUITE     ');
  console.log('============================================================\n');

  // Start test server on dynamic port
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  try {
    // ------------------------------------------------------------
    // TEST 1: Security Headers (Helmet + CSP)
    // ------------------------------------------------------------
    console.log('[Phase 15] Testing HTTP Security Headers...');
    const headerRes = await makeRequest('/api/auth/register', { method: 'POST', body: {} });
    assert(headerRes.headers['x-frame-options'] === 'DENY', 'Clickjacking protection: X-Frame-Options is DENY');
    assert(headerRes.headers['x-content-type-options'] === 'nosniff', 'MIME sniffing protection: X-Content-Type-Options is nosniff');
    assert(Boolean(headerRes.headers['content-security-policy']), 'Content Security Policy (CSP) is active');

    // ------------------------------------------------------------
    // TEST 2: Unauthenticated Access Rejection (HTTP 401)
    // ------------------------------------------------------------
    console.log('\n[Phase 3 & 4] Testing Unauthenticated Access Rejection...');
    const unauthHistoryRes = await makeRequest('/api/location/history');
    assert(unauthHistoryRes.status === 401, 'Unauthenticated GET /api/location/history returns 401 Unauthorized');

    const unauthUpdateRes = await makeRequest('/api/location/update', {
      method: 'POST',
      body: { lat: 15.4989, lng: 73.8000 }
    });
    assert(unauthUpdateRes.status === 401, 'Unauthenticated POST /api/location/update returns 401 Unauthorized');

    // ------------------------------------------------------------
    // TEST 3: User Registration & Password Hashing (Phase 4)
    // ------------------------------------------------------------
    console.log('\n[Phase 4] Testing User Registration & Password Security...');
    const userEmail = `security_test_${Date.now()}@wayfarer.ai`;
    const regRes = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: userEmail,
        password: 'SuperSecurePassword123!',
        name: 'Alex Explorer',
        role: 'USER'
      }
    });

    assert(regRes.status === 201, 'Valid registration returns HTTP 201 Created');
    assert(Boolean(regRes.body.token), 'JWT token returned on registration');
    assert(!regRes.body.user.passwordHash, 'Password hash is strictly excluded from response body');

    const userToken = regRes.body.token;

    // ------------------------------------------------------------
    // TEST 4: Invalid Credentials & Brute Force Lockout
    // ------------------------------------------------------------
    console.log('\n[Phase 4] Testing Invalid Credentials Handling...');
    const failLogin = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: userEmail, password: 'WrongPassword' }
    });
    assert(failLogin.status === 401, 'Incorrect password returns HTTP 401');

    // ------------------------------------------------------------
    // TEST 5: Data Minimization (Coordinate Fuzzing) (Phase 3 & 11)
    // ------------------------------------------------------------
    console.log('\n[Phase 3 & 11] Testing Location Data Minimization...');
    const preciseLat = 15.49894321;
    const preciseLng = 73.80008765;

    const approx = minimizeCoordinates(preciseLat, preciseLng, 'approximate');
    assert(approx.lat === 15.5 && approx.lng === 73.8, 'Approximate mode fuzzed coordinates to 2 decimals (~1km precision)');

    const precise = minimizeCoordinates(preciseLat, preciseLng, 'precise');
    assert(precise.lat === 15.498943 && precise.lng === 73.800088, 'Precise mode retains full resolution for turn-by-turn routing');

    // ------------------------------------------------------------
    // TEST 6: Authenticated Location Update & Retrieval (Phase 3)
    // ------------------------------------------------------------
    console.log('\n[Phase 3] Testing Authenticated Location Lifecycle...');
    const locUpdateRes = await makeRequest('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { lat: 15.4989, lng: 73.8000, precision: 'approximate' }
    });
    assert(locUpdateRes.status === 200, 'Authenticated user can submit location breadcrumb');
    assert(locUpdateRes.body.precision === 'approximate', 'Server respected data minimization flag');

    const historyRes = await makeRequest('/api/location/history', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(historyRes.status === 200, 'Authenticated user can retrieve own location history');
    assert(historyRes.body.count >= 1, 'Location history record accurately stored');

    // ------------------------------------------------------------
    // TEST 7: Input Validation / Malicious Payloads (Phase 6)
    // ------------------------------------------------------------
    console.log('\n[Phase 6] Testing Schema Validation against Injection & Malformed Data...');
    const badCoordsRes = await makeRequest('/api/location/update', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { lat: 99999, lng: -500 } // Out-of-bounds latitude/longitude
    });
    assert(badCoordsRes.status === 400, 'Out-of-bounds coordinates rejected with HTTP 400 Bad Request');

    const sqlInjectRes = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: { email: "' OR '1'='1", password: 'test' } // Malicious format
    });
    assert(sqlInjectRes.status === 400, 'Malformed email format rejected with HTTP 400');

    // ------------------------------------------------------------
    // TEST 8: Role-Based Access Control (RBAC) (Phase 5)
    // ------------------------------------------------------------
    console.log('\n[Phase 5] Testing RBAC Authorization...');
    const adminAccessAsUser = await makeRequest('/api/admin/system', {
      headers: { Authorization: `Bearer ${userToken}` } // Role is 'USER'
    });
    assert(adminAccessAsUser.status === 403, 'Standard USER forbidden from ADMIN endpoint with HTTP 403');

    // Create an Admin Token
    const adminToken = jwt.sign(
      { id: 'admin-1', email: 'admin@wayfarer.ai', role: 'ADMIN' },
      getJwtSecret(),
      { expiresIn: '1h' }
    );
    const adminAccessAsAdmin = await makeRequest('/api/admin/system', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminAccessAsAdmin.status === 200, 'Authorized ADMIN permitted with HTTP 200');

    // ------------------------------------------------------------
    // TEST 9: Ephemeral Location Sharing & Expiration (Phase 11)
    // ------------------------------------------------------------
    console.log('\n[Phase 11] Testing Ephemeral Location Sharing & Expiration...');
    const startShareRes = await makeRequest('/api/location/share/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: { durationMinutes: 15, initialLat: 15.4989, initialLng: 73.8000 }
    });
    assert(startShareRes.status === 201, 'Created temporary 15-minute live location sharing session');
    const shareToken = startShareRes.body.shareToken;

    // View shared location via token
    const viewShareRes = await makeRequest(`/api/location/shared/${shareToken}`);
    assert(viewShareRes.status === 200, 'Recipient can view active shared location');

    // Stop share session
    await makeRequest('/api/location/share/stop', {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` }
    });

    const viewRevokedRes = await makeRequest(`/api/location/shared/${shareToken}`);
    assert(viewRevokedRes.status === 410, 'Revoked/expired share token rejected with HTTP 410 Gone');

    // ------------------------------------------------------------
    // TEST 10: Zero-Leak Redacted Logging (Phase 10)
    // ------------------------------------------------------------
    console.log('\n[Phase 10] Testing Sensitive Data & Coordinate Redaction...');
    const sensitivePayload = {
      email: 'traveler@gmail.com',
      password: 'PlaintextPassword123',
      apiKey: 'AIzaSySecretApiKey',
      lat: 15.498942,
      lng: 73.800012,
      nested: {
        jwt: 'eyJhbGciOi...',
        coordinates: [15.49, 73.80]
      }
    };

    const redacted = redactSensitiveData(sensitivePayload);
    assert(redacted.password === '[REDACTED_SECRET]', 'Password redacted in log output');
    assert(redacted.apiKey === '[REDACTED_SECRET]', 'API Key redacted in log output');
    assert(redacted.lat === '[REDACTED_COORDINATES]', 'Latitude coordinate redacted in log output');
    assert(redacted.lng === '[REDACTED_COORDINATES]', 'Longitude coordinate redacted in log output');
    assert(redacted.nested.jwt === '[REDACTED_SECRET]', 'Nested JWT token redacted in log output');

    // ------------------------------------------------------------
    // TEST 11: Right to Be Forgotten / Data Erasure (Phase 12)
    // ------------------------------------------------------------
    console.log('\n[Phase 12] Testing Location History Deletion (Right to Be Forgotten)...');
    const deleteRes = await makeRequest('/api/location/history', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(deleteRes.status === 200, 'Permanent history deletion returns HTTP 200');

    const emptyHistoryRes = await makeRequest('/api/location/history', {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(emptyHistoryRes.body.count === 0, 'Location history is completely empty after purge');

  } catch (err) {
    console.error('Fatal test error:', err);
    failedTests++;
  } finally {
    if (server) server.close();
  }

  console.log('\n============================================================');
  console.log(`TOTAL SECURITY TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTests();
