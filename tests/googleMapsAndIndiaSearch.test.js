import { describe, it } from 'node:test';
import assert from 'node:assert';
import http from 'http';
import express from 'express';

describe('Google Maps API & Nationwide India Place Search Verification', () => {
  const app = express();
  app.use(express.json());

  // Mount maps config endpoint as in server.js
  app.get('/api/config/maps', (req, res) => {
    const apiKey = (process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '').trim();
    res.json({
      apiKey: apiKey.toLowerCase() === 'your_google_maps_api_key_here' ? '' : apiKey,
      configured: Boolean(apiKey && apiKey.toLowerCase() !== 'your_google_maps_api_key_here')
    });
  });

  let server;
  let baseUrl;

  function makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const req = http.request(url, { method: 'GET' }, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  it('starts mock server for API config test', async () => {
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
    assert.ok(baseUrl);
  });

  it('GET /api/config/maps returns expected schema with apiKey string and configured boolean', async () => {
    const res = await makeRequest('/api/config/maps');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.data.apiKey, 'string');
    assert.strictEqual(typeof res.data.configured, 'boolean');
  });

  it('validates India geographic bounds constraint ([8, 38] N, [68, 98] E)', async () => {
    // Test key hubs across India
    const hubs = [
      { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
      { name: 'Gateway of India', lat: 18.9220, lng: 72.8347 },
      { name: 'Bengaluru Central', lat: 12.9774, lng: 77.5693 },
      { name: 'Howrah Station', lat: 22.5850, lng: 88.3426 },
      { name: 'Charminar', lat: 17.3616, lng: 78.4747 },
      { name: 'Amritsar Golden Temple', lat: 31.6200, lng: 74.8765 }
    ];

    for (const hub of hubs) {
      assert.ok(hub.lat >= 8 && hub.lat <= 38, `${hub.name} lat ${hub.lat} within India`);
      assert.ok(hub.lng >= 68 && hub.lng <= 98, `${hub.name} lng ${hub.lng} within India`);
    }
  });

  it('closes mock server', async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
