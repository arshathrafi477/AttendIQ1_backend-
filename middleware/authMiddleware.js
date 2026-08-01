// middleware/authMiddleware.js
// Verifies the JWT sent in the Authorization header and attaches the
// decoded user payload to req.user. Also exposes an authorize() helper
// for simple role-based access control.

const jwt = require('jsonwebtoken');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Requires a valid `Authorization: Bearer <token>` header.
 * On success, req.user = { id, username, role, studentId }
 */
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized — no token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, username, role, studentId, iat, exp }
    next();
  } catch (err) {
    throw new ApiError(401, 'Not authorized — invalid or expired token');
  }
});

/**
 * Restrict a route to one or more roles.
 * Usage: router.get('/admin-only', protect, authorize('admin'), handler)
 */
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, 'Not authorized');
  }
  if (!allowedRoles.includes(req.user.role)) {
    throw new ApiError(403, `Role '${req.user.role}' is not permitted to perform this action`);
  }
  next();
};

module.exports = { protect, authorize };
