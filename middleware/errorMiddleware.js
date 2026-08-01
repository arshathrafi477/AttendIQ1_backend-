// middleware/errorMiddleware.js
// notFound  -> catches requests to routes that don't exist
// errorHandler -> single place that formats every error into a JSON response

const config = require('../config/config');

const notFound = (req, res, next) => {
  const message = `Route not found — ${req.method} ${req.originalUrl}`;
  res.status(404);
  next(new Error(message));
};

// Known Postgres constraint-violation codes -> friendlier messages.
// NOTE: object keys here MUST be quoted strings — several of these codes
// start with a digit (e.g. '23505'), which is not a valid bare identifier
// in a JS object literal and will throw a SyntaxError if left unquoted.
const PG_ERROR_MAP = {
  '23505': { status: 409, message: 'Duplicate value — a record with this value already exists' },
  '23503': { status: 409, message: 'This record is referenced by another record and cannot be modified/deleted' },
  '23502': { status: 400, message: 'A required field is missing' },
  '22P02': { status: 400, message: 'Invalid input syntax for one of the fields' },
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';
  const errors = err.errors || [];

  if (err.code && PG_ERROR_MAP[err.code]) {
    statusCode = PG_ERROR_MAP[err.code].status;
    message = PG_ERROR_MAP[err.code].message;
  }

  // Malformed JSON body sent by the client (express.json() throws a SyntaxError)
  if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Malformed JSON in request body';
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors,
    // Stack traces only in development — never leak internals in production.
    stack: config.env === 'development' ? err.stack : undefined,
  });
};

module.exports = { notFound, errorHandler };
