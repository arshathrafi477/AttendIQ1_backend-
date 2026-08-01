// middleware/validateMiddleware.js
// Runs an array of express-validator chains, then rejects the request with
// a 422 + field-level error list if any of them failed.
// Usage: router.post('/students', validate(studentValidationRules), controller)

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((rule) => rule.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const formatted = errors.array().map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  next(new ApiError(422, 'Validation failed', formatted));
};

module.exports = validate;
