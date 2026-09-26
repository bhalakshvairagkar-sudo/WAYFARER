/**
 * WAYFARER AI - Input Validation & Sanitization Middleware
 * Enforces strict schema validation using Zod to block injection and malformed payloads.
 */

export function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated; // Replaced with stripped/sanitized values
      next();
    } catch (err) {
      const fieldErrors = err.errors ? err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      })) : [{ message: 'Validation failed' }];

      return res.status(400).json({
        success: false,
        error: 'Invalid request payload format or parameters.',
        details: fieldErrors
      });
    }
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters.',
        details: err.errors
      });
    }
  };
}
