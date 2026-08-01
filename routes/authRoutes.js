// routes/authRoutes.js

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const loginRules = [
  body('username').trim().notEmpty().withMessage('username is required'),
  body('password').notEmpty().withMessage('password is required'),
];

const registerRules = [
  body('username').trim().isLength({ min: 3 }).withMessage('username must be at least 3 characters'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('password').isLength({ min: 6 }).withMessage('password must be at least 6 characters'),
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('role').isIn(['admin', 'staff', 'student']).withMessage('role must be admin, staff, or student'),
  body('studentId')
    .if(body('role').equals('student'))
    .notEmpty()
    .withMessage('studentId is required when role is student'),
];

// POST /api/auth/login
router.post('/login', validate(loginRules), authController.login);

// POST /api/auth/register  (only an existing admin can create new accounts)
router.post('/register', protect, authorize('admin'), validate(registerRules), authController.register);

// GET /api/auth/me
router.get('/me', protect, authController.me);

module.exports = router;
