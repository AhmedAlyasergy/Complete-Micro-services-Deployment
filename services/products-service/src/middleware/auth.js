const jwt = require('jsonwebtoken');
const config = require('../config');

// Tokens are verified locally with the shared JWT_SECRET (no call to auth-service).
// Returns null when no token is sent, undefined when the token is invalid.
function readUser(req) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return undefined;
  }
}

function requireAdmin(req, res, next) {
  const user = readUser(req);
  if (user === null) return res.status(401).json({ error: 'Missing token' });
  if (user === undefined) return res.status(401).json({ error: 'Invalid or expired token' });
  if (user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });
  req.user = user;
  return next();
}

// Stock changes: allowed for orders-service (x-internal-key) or an admin.
function requireInternalOrAdmin(req, res, next) {
  const key = req.headers['x-internal-key'];
  if (config.internalApiKey && key === config.internalApiKey) return next();
  return requireAdmin(req, res, next);
}

module.exports = { requireAdmin, requireInternalOrAdmin };
