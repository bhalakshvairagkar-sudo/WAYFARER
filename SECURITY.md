# WAYFARER Security Architecture & Policy

This document defines the comprehensive security architecture, privacy controls, and operational policies governing the **WAYFARER** location-aware travel intelligence platform.

---

## 1. Security Architecture Overview

WAYFARER follows a defense-in-depth model across every layer of the travel stack:

```
[ Client / Android PWA ]
          │  (TLS 1.3 + Strict CORS)
          ▼
[ Security Gateway (Helmet CSP + Multi-Tier Rate Limiting) ]
          │
          ▼
[ Authentication & Authorization Layer (JWT + RBAC + Anti-IDOR) ]
          │
          ▼
[ Zod Validation & Sanitization Engine ]
          │
          ▼
[ Privacy Engine (Data Minimization & Redacted Structured Logger) ]
          │
          ▼
[ MongoDB Atlas (Private VPC / TLS 1.3 / Automated TTL Purging) ]
```

---

## 2. Authentication Model

- **Protocol:** JSON Web Tokens (JWT) signed with cryptographically random HMAC-SHA256 (`HS256`).
- **Token Lifecycle:** 
  - Short-lived access tokens (default 2 hours).
  - Stored client-side in secure application memory / protected browser storage.
  - Attached via HTTP `Authorization: Bearer <token>` headers.
- **Credential Storage:** 
  - Passwords hashed using `bcrypt` with work factor 12 (`BCRYPT_ROUNDS=12`).
  - Plaintext passwords and hashes are strictly excluded from queries by default (`select: false` on Mongoose schemas).

---

## 3. Authorization Model & RBAC

WAYFARER enforces strict server-side Role-Based Access Control (RBAC). Client-side UI controls are treated solely as UX enhancements, never as security boundaries.

### Supported System Roles:
1. `USER`: Standard traveler. Access restricted to personal profile, active journeys, and own location telemetry.
2. `EMERGENCY_CONTACT`: Trusted third party authorized to view ephemeral live location sharing sessions via cryptographically secure single-use tokens.
3. `TRAVEL_PARTNER`: Authorized co-traveler with shared itinerary access.
4. `ADMIN`: System operators authorized to inspect fleet status, system diagnostics, and emergency dispatch corridors.

### Anti-IDOR (Insecure Direct Object Reference) Guarantee:
Every request targeting user data (`/api/location/history`, `/api/location/update`, `/api/auth/me`) explicitly compares the authenticated token identity (`req.user.id`) against the requested resource. Cross-user access attempts trigger immediate `403 Forbidden` exceptions and structured security audit alerts.

---

## 4. Location Data Protection & Privacy

Because GPS coordinates and travel trajectories constitute sensitive personal identifiable information (PII), WAYFARER enforces strict data privacy controls:

### 1. Data Minimization
- **Precise Mode:** High-resolution GPS coordinates used solely during active navigation.
- **Approximate Mode:** Coordinates are fuzzed to 2 decimal places (~1.1 km resolution), shielding exact street addresses while enabling regional travel intelligence.

### 2. Ephemeral Location Sharing
- Location sharing sessions default to **30 minutes**.
- Cryptographically secure 48-character hex tokens (`crypto.randomBytes(24).toString('hex')`).
- Automatically expires and self-destructs upon timer expiration. Permanent tracking links are prohibited by design.

### 3. Right to Be Forgotten
- Travelers can execute instant, permanent deletion of their complete location breadcrumb history via `DELETE /api/location/history`.

---

## 5. Encryption Approach

- **Encryption in Transit:** Enforced TLS 1.3 across all client-to-server and server-to-database connections. `Strict-Transport-Security` (HSTS) configured with `includeSubDomains; preload` (max-age 1 year).
- **Encryption at Rest:** MongoDB Atlas encrypted using AES-256 via storage engine encryption.
- **Logging Zero-Leak Guarantee:** Application logs pass through `redactSensitiveData()`, which strips all coordinates (`lat`, `lng`), passwords, tokens, and API keys before writing to console/disk.

---

## 6. Secret Management

- Secrets are never hardcoded in source code or committed to version control.
- All secrets (`JWT_SECRET`, `MONGODB_URI`, `GEMINI_API_KEY`) are injected via environment variables.
- Third-party AI integrations (Google Gemini) pass API keys exclusively via official HTTP headers (`x-goog-api-key`), eliminating exposure in URI query strings, proxy logs, and HTTP Referers.

---

## 7. Database Security & Retention Policies

- **Least Privilege Access:** MongoDB user accounts operate with read/write privileges constrained strictly to the `wayfarer` database.
- **Resilient Fallback:** If MongoDB Atlas is offline in development environments, the application fails safe to an isolated in-memory data store, preventing crash conditions while maintaining access controls.
- **Automated Retention:** `LocationHistory` documents feature a MongoDB TTL index keyed to `expiresAt`:
  ```javascript
  LocationHistorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  ```
  Coordinates are physically purged automatically after `LOCATION_HISTORY_RETENTION_DAYS` (default 30 days).

---

## 8. Incident Response & Responsible Disclosure

### Vulnerability Reporting
If you discover a potential security vulnerability in WAYFARER, please report it privately:
- **Email:** `security@wayfarer.ai`
- **PGP Key:** Available upon request.
- **Response SLA:** Initial acknowledgment within 24 hours; remediation within 72 hours.
- Please do not submit public GitHub issues for security vulnerabilities.

### Incident Response Steps
1. **Detection & Triage:** Identify scope and affected services using `securityLogger` audit events.
2. **Containment:** Revoke affected JWT secrets or rotate API keys via environment secret manager.
3. **Remediation & Testing:** Deploy patch and verify with `node tests/security.test.js`.
4. **Post-Mortem:** Document root cause and deploy proactive regression tests.
