const { verifyToken } = require('../utils/token');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole };
