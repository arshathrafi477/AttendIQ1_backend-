// controllers/dashboardController.js

const dashboardModel = require('../models/dashboardModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

/** @route GET /api/dashboard/summary  @access Private */
const getSummary = asyncHandler(async (req, res) => {
  const summary = await dashboardModel.getSummary();
  res.status(200).json(new ApiResponse(200, summary));
});

/** @route GET /api/dashboard/attendance-by-class  @access Private */
const getAttendanceByClass = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const data = await dashboardModel.attendanceByClass(days);
  res.status(200).json(new ApiResponse(200, data));
});

/** @route GET /api/dashboard/top-performers  @access Private */
const getTopPerformers = asyncHandler(async (req, res) => {
  const { term, limit = 5 } = req.query;
  if (!term) throw new ApiError(400, 'Query param "term" is required');
  const data = await dashboardModel.topPerformers(term, limit);
  res.status(200).json(new ApiResponse(200, data));
});

module.exports = { getSummary, getAttendanceByClass, getTopPerformers };
