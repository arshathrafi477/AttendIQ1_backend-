// controllers/timetableController.js

const timetableModel = require('../models/timetableModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/timetable/class/:classId  @access Private */
const getClassTimetable = asyncHandler(async (req, res) => {
  const slots = await timetableModel.findByClass(req.params.classId);
  res.status(200).json(new ApiResponse(200, slots));
});

/** @route POST /api/timetable  @access Private (admin/staff) — create/replace a slot */
const upsertSlot = asyncHandler(async (req, res) => {
  const { classId, dayOfWeek, period, subjectId, staffId } = req.body;
  const slot = await timetableModel.upsertSlot({ classId, dayOfWeek, period, subjectId, staffId });
  res.status(201).json(new ApiResponse(201, slot, 'Timetable slot saved'));
});

/** @route DELETE /api/timetable/:id  @access Private (admin/staff) */
const deleteSlot = asyncHandler(async (req, res) => {
  const deleted = await timetableModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Timetable slot not found');
  res.status(200).json(new ApiResponse(200, null, 'Timetable slot deleted'));
});

module.exports = { getClassTimetable, upsertSlot, deleteSlot };
