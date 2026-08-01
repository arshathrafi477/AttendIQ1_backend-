// controllers/authController.js

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const userModel = require('../models/userModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const signToken = (user) =>
  jwt.sign(
    { id: user.id, username: user.username, role: user.role, studentId: user.student_id },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );

/**
 * @route   POST /api/auth/login
 * @access  Public
 * @body    { username, password }
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await userModel.findByUsername(username);
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid username or password');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid username or password');
  }

  await userModel.updateLastLogin(user.id);
  const token = signToken(user);

  const { password_hash, ...safeUser } = user;

  res.status(200).json(
    new ApiResponse(200, { token, user: safeUser }, 'Login successful')
  );
});

/**
 * @route   POST /api/auth/register
 * @access  Private (admin only — enforced in routes)
 * @body    { username, email, password, fullName, role, studentId?, phone? }
 */
const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, role, studentId, phone } = req.body;

  const existing = await userModel.findByUsername(username);
  if (existing) {
    throw new ApiError(409, 'Username already taken');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.create({ username, email, passwordHash, fullName, role, studentId, phone });

  res.status(201).json(new ApiResponse(201, user, 'User registered successfully'));
});

/**
 * @route   GET /api/auth/me
 * @access  Private
 */
const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.status(200).json(new ApiResponse(200, user));
});

module.exports = { login, register, me };
