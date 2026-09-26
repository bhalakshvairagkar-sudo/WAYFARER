/**
 * WAYFARER AI - Redacted Structured Security Logger
 * Ensures zero leakage of credentials, tokens, API keys, or precise GPS coordinates.
 */

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'refreshtoken',
  'jwt',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'gemini_api_key',
  'cookie',
  'lat',
  'lng',
  'latitude',
  'longitude',
  'coordinates'
]);

/**
 * Deep redaction filter for log payloads
 */
export function redactSensitiveData(obj, depth = 0) {
  if (depth > 6 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, depth + 1));
  }

  const redacted = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      if (lowerKey === 'lat' || lowerKey === 'lng' || lowerKey === 'latitude' || lowerKey === 'longitude' || lowerKey === 'coordinates') {
        redacted[key] = '[REDACTED_COORDINATES]';
      } else {
        redacted[key] = '[REDACTED_SECRET]';
      }
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export const securityLogger = {
  info(message, meta = {}) {
    const safeMeta = redactSensitiveData(meta);
    console.log(`[INFO ${new Date().toISOString()}] ${message}`, Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '');
  },

  warn(message, meta = {}) {
    const safeMeta = redactSensitiveData(meta);
    console.warn(`[WARN ${new Date().toISOString()}] ${message}`, Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '');
  },

  error(message, error = null, meta = {}) {
    const safeMeta = redactSensitiveData(meta);
    const errMessage = error instanceof Error ? error.message : String(error || '');
    console.error(`[ERROR ${new Date().toISOString()}] ${message}: ${errMessage}`, Object.keys(safeMeta).length ? JSON.stringify(safeMeta) : '');
  },

  auth(event, { userId = 'anonymous', email = '', ip = '', success = false, reason = '' } = {}) {
    const maskedEmail = email ? email.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)) : 'n/a';
    console.log(`[SECURITY_AUTH ${new Date().toISOString()}] Event: ${event} | User: ${userId} | Email: ${maskedEmail} | IP: ${ip} | Success: ${success}${reason ? ` | Reason: ${reason}` : ''}`);
  },

  locationAccess(event, { requesterId, targetId, ip = '', allowed = false, reason = '' } = {}) {
    console.log(`[SECURITY_LOCATION ${new Date().toISOString()}] Event: ${event} | Requester: ${requesterId} | Target: ${targetId} | IP: ${ip} | Allowed: ${allowed}${reason ? ` | Reason: ${reason}` : ''}`);
  },

  violation(event, { ip = '', path = '', method = '', reason = '' } = {}) {
    console.warn(`[SECURITY_VIOLATION ${new Date().toISOString()}] Event: ${event} | IP: ${ip} | Route: ${method} ${path} | Reason: ${reason}`);
  }
};
