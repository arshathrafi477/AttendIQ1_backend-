// controllers/feesController.js

const feesModel = require('../models/feesModel');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

/** @route GET /api/fees  @access Private */
const getFees = asyncHandler(async (req, res) => {
  const { studentId, status, page = 1, pageSize = 50 } = req.query;
  const limit = Math.min(parseInt(pageSize, 10) || 50, 200);
  const offset = (Math.max(parseInt(page, 10), 1) - 1) * limit;

  const fees = await feesModel.findAll({ studentId, status, limit, offset });
  res.status(200).json(new ApiResponse(200, fees));
});

/** @route GET /api/fees/:id  @access Private */
const getFeeById = asyncHandler(async (req, res) => {
  const fee = await feesModel.findById(req.params.id);
  if (!fee) throw new ApiError(404, 'Fee record not found');
  res.status(200).json(new ApiResponse(200, fee));
});

/** @route POST /api/fees  @access Private (admin/staff) */
const createFee = asyncHandler(async (req, res) => {
  const { studentId, term, amount, paid, dueDate } = req.body;
  const fee = await feesModel.create({ studentId, term, amount, paid, dueDate });
  res.status(201).json(new ApiResponse(201, fee, 'Fee record created successfully'));
});

/** @route PUT /api/fees/:id  @access Private (admin/staff) */
const updateFee = asyncHandler(async (req, res) => {
  const existing = await feesModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Fee record not found');

  const fields = { term: req.body.term, amount: req.body.amount, paid: req.body.paid, due_date: req.body.dueDate };
  const updated = await feesModel.update(req.params.id, fields);
  res.status(200).json(new ApiResponse(200, updated, 'Fee record updated successfully'));
});

/** @route POST /api/fees/:id/pay  @access Private (admin/staff) — record a payment */
const payFee = asyncHandler(async (req, res) => {
  const { amount } = req.body;
  const existing = await feesModel.findById(req.params.id);
  if (!existing) throw new ApiError(404, 'Fee record not found');
  if (amount <= 0) throw new ApiError(400, 'Payment amount must be greater than 0');
  if (Number(existing.paid) + Number(amount) > Number(existing.amount)) {
    throw new ApiError(400, 'Payment exceeds the remaining due amount');
  }

  const updated = await feesModel.addPayment(req.params.id, amount);
  res.status(200).json(new ApiResponse(200, updated, 'Payment recorded successfully'));
});

/** @route DELETE /api/fees/:id  @access Private (admin) */
const deleteFee = asyncHandler(async (req, res) => {
  const deleted = await feesModel.remove(req.params.id);
  if (!deleted) throw new ApiError(404, 'Fee record not found');
  res.status(200).json(new ApiResponse(200, null, 'Fee record deleted'));
});

module.exports = { getFees, getFeeById, createFee, updateFee, payFee, deleteFee };
