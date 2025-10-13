const jwt = require('jsonwebtoken');

// Verify JWT token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  const devBypass = process.env.DEV_AUTH_BYPASS === 'true';

  if (!token) {
    if (devBypass && process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ DEV_AUTH_BYPASS enabled: allowing request without token (dev only)');
      // Inject a default demo user for development convenience
      req.user = { id: 1, email: 'dev@localhost', role: 'admin' };
      return next();
    }

    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      if (devBypass && process.env.NODE_ENV !== 'production') {
        console.warn('⚠️ DEV_AUTH_BYPASS enabled: token invalid but allowing request (dev only)');
        req.user = { id: 1, email: 'dev@localhost', role: 'admin' };
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    req.user = user;
    next();
  });
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  optionalAuth
};