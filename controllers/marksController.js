// controllers/marksController.js

const marksModel = require('../models/marksModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/marks  @access Private */
const getMarks = asyncHandler(async (req, res) => {
  const { studentId, subjectId, term, page = 1, pageSize = 50 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

  const marks = await marksModel.findAll({ studentId, subjectId, term, limit, offset });
  res.status(200).json(new ApiResponse(200, marks));
});

/** @route GET /api/marks/:id  @access Private */
const getMarkById = asyncHandler(async (req, res) => {
  const mark = await marksModel.findById(req.params.id);
  if (!mark) throw new ApiError(404, 'Marks record not found');
  res.status(200).json(new ApiResponse(200, mark));
});

/** @route POST /api/marks  @access Private (admin/staff) — create or update (upsert) */
const upsertMark = asyncHandler(async (req, res) => {
  const { studentId, subjectId, term, examName, marksObtained, maxMarks, grade } = req.body;
  const mark = await marksModel.upsert({
    studentId, subjectId, term, examName, marksObtained, maxMarks, grade, enteredBy: req.user.id,
  });
  res.status(201).json(new ApiResponse(201, mark, 'Marks saved successfully'));
});

/** @route PUT /api/marks/:id  @access Private (admin/staff) */
const updateMark = asyncHandler(async (req, res) => {
  const existing = await marksModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Marks record not found');

  const fields = {
    marks_obtained: req.body.marksObtained,
    max_marks: req.body.maxMarks,
    grade: req.body.grade,
    term: req.body.term,
    exam_name: req.body.examName,
  };
  const updated = await marksModel.update(req.params.id, fields);
  res.status(200).json(new ApiResponse(200, updated, 'Marks updated successfully'));
});

/** @route GET /api/marks/student/:studentId/summary  @access Private */
const getStudentSummary = asyncHandler(async (req, res) => {
  const { term } = req.query;
  if (!term) throw new ApiError(400, 'Query param "term" is required');
  const summary = await marksModel.studentTermSummary(req.params.studentId, term);
  res.status(200).json(new ApiResponse(200, summary));
});

/** @route DELETE /api/marks/:id  @access Private (admin) */
const deleteMark = asyncHandler(async (req, res) => {
  const deleted = await marksModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Marks record not found');
  res.status(200).json(new ApiResponse(200, null, 'Marks record deleted'));
});

module.exports = { getMarks, getMarkById, upsertMark, updateMark, getStudentSummary, deleteMark };
