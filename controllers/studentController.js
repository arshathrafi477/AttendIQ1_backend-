// controllers/studentController.js

const studentModel = require('../models/studentModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/students  @access Private */
const getStudents = asyncHandler(async (req, res) => {
  const { classId, search, page = 1, pageSize = 20 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 20, 100);
  const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

  const [students, total] = await Promise.all([
    studentModel.findAll({ classId, search, limit, offset }),
    studentModel.count({ classId, search }),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      students,
      pagination: { page: Number(page), pageSize: limit, total, totalPages: Math.ceil(total / limit) },
    })
  );
});

/** @route GET /api/students/:id  @access Private */
const getStudentById = asyncHandler(async (req, res) => {
  const student = await studentModel.findById(req.params.id);
  if (!student) throw new ApiError(404, 'Student not found');
  res.status(200).json(new ApiResponse(200, student));
});

/** @route POST /api/students  @access Private (admin/staff) */
const createStudent = asyncHandler(async (req, res) => {
  const { classId, admissionNo, rollNo, fullName, dob, gender, phone, email, address } = req.body;
  const student = await studentModel.create({ classId, admissionNo, rollNo, fullName, dob, gender, phone, email, address });
  res.status(201).json(new ApiResponse(201, student, 'Student created successfully'));
});

/** @route PUT /api/students/:id  @access Private (admin/staff) */
const updateStudent = asyncHandler(async (req, res) => {
  const existing = await studentModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Student not found');

  // Map camelCase request body -> snake_case DB columns
  const fields = {
    class_id: req.body.classId,
    admission_no: req.body.admissionNo,
    roll_no: req.body.rollNo,
    full_name: req.body.fullName,
    dob: req.body.dob,
    gender: req.body.gender,
    phone: req.body.phone,
    email: req.body.email,
    address: req.body.address,
  };

  const updated = await studentModel.update(req.params.id, fields);
  res.status(200).json(new ApiResponse(200, updated, 'Student updated successfully'));
});

/** @route DELETE /api/students/:id  @access Private (admin) */
const deleteStudent = asyncHandler(async (req, res) => {
  const deleted = await studentModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Student not found');
  res.status(200).json(new ApiResponse(200, null, 'Student deleted successfully'));
});

module.exports = { getStudents, getStudentById, createStudent, updateStudent, deleteStudent };
