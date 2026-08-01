// controllers/attendanceController.js

const attendanceModel = require('../models/attendanceModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/attendance  @access Private */
const getAttendance = asyncHandler(async (req, res) => {
  const { classId, studentId, date, from, to, page = 1, pageSize = 50 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

  const records = await attendanceModel.findAll({ classId, studentId, date, from, to, limit, offset });
  res.status(200).json(new ApiResponse(200, records));
});

/** @route GET /api/attendance/:id  @access Private */
const getAttendanceById = asyncHandler(async (req, res) => {
  const record = await attendanceModel.findById(req.params.id);
  if (!record) throw new ApiError(404, 'Attendance record not found');
  res.status(200).json(new ApiResponse(200, record));
});

/** @route POST /api/attendance  @access Private (admin/staff) — mark one student */
const markAttendance = asyncHandler(async (req, res) => {
  const { studentId, classId, subjectId, attendanceDate, period, status } = req.body;
  const record = await attendanceModel.markOne({
    studentId, classId, subjectId, attendanceDate, period, status, markedBy: req.user.id,
  });
  res.status(201).json(new ApiResponse(201, record, 'Attendance marked'));
});

/** @route POST /api/attendance/bulk  @access Private (admin/staff) — mark a whole class */
const markAttendanceBulk = asyncHandler(async (req, res) => {
  const { classId, subjectId, attendanceDate, period, records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    throw new ApiError(400, 'records must be a non-empty array of { studentId, status }');
  }
  const result = await attendanceModel.markBulk({
    classId, subjectId, attendanceDate, period, markedBy: req.user.id, records,
  });
  res.status(201).json(new ApiResponse(201, result, `Attendance marked for ${records.length} students`));
});

/** @route GET /api/attendance/student/:studentId/percentage  @access Private */
const getStudentPercentage = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const result = await attendanceModel.studentPercentage(req.params.studentId, { from, to });
  res.status(200).json(new ApiResponse(200, result));
});

/** @route DELETE /api/attendance/:id  @access Private (admin) */
const deleteAttendance = asyncHandler(async (req, res) => {
  const deleted = await attendanceModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Attendance record not found');
  res.status(200).json(new ApiResponse(200, null, 'Attendance record deleted'));
});

module.exports = {
  getAttendance,
  getAttendanceById,
  markAttendance,
  markAttendanceBulk,
  getStudentPercentage,
  deleteAttendance,
};
