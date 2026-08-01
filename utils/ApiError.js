// utils/ApiError.js
// Custom error class so controllers can `throw new ApiError(404, 'Not found')`
// and the global error handler knows exactly what HTTP status/body to send.

class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - human-readable error message
   * @param {Array}  errors - optional array of field-level validation errors
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
