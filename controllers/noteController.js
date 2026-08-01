// controllers/noteController.js

const noteModel = require('../models/noteModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/notes  @access Private */
const getNotes = asyncHandler(async (req, res) => {
  const { classId, page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
  const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

  const notes = await noteModel.findAll({ classId, limit, offset });
  res.status(200).json(new ApiResponse(200, notes));
});

/** @route GET /api/notes/:id  @access Private */
const getNoteById = asyncHandler(async (req, res) => {
  const note = await noteModel.findById(req.params.id);
  if (!note) throw new ApiError(404, 'Note not found');
  res.status(200).json(new ApiResponse(200, note));
});

/** @route POST /api/notes  @access Private (admin/staff) */
const createNote = asyncHandler(async (req, res) => {
  const { title, body, subjectId, classId, color } = req.body;
  const note = await noteModel.create({ title, body, subjectId, classId, authorId: req.user.id, color });
  res.status(201).json(new ApiResponse(201, note, 'Note created successfully'));
});

/** @route PUT /api/notes/:id  @access Private (admin/staff) */
const updateNote = asyncHandler(async (req, res) => {
  const existing = await noteModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Note not found');

  const fields = {
    title: req.body.title,
    body: req.body.body,
    subject_id: req.body.subjectId,
    class_id: req.body.classId,
    color: req.body.color,
  };
  const updated = await noteModel.update(req.params.id, fields);
  res.status(200).json(new ApiResponse(200, updated, 'Note updated successfully'));
});

/** @route DELETE /api/notes/:id  @access Private (admin/staff) */
const deleteNote = asyncHandler(async (req, res) => {
  const deleted = await noteModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Note not found');
  res.status(200).json(new ApiResponse(200, null, 'Note deleted successfully'));
});

module.exports = { getNotes, getNoteById, createNote, updateNote, deleteNote };
