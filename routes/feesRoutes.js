// routes/feesRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const feesController = require('../controllers/feesController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const createRules = [
  body('studentId').isInt().withMessage('studentId is required'),
  body('term').trim().notEmpty().withMessage('term is required'),
  body('amount').isFloat({ min: 0 }).withMessage('amount must be a positive number'),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be YYYY-MM-DD'),
];

const payRules = [...idParamRule, body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0')];

router.use(protect);

router.get('/', feesController.getFees);
router.get('/:id', validate(idParamRule), feesController.getFeeById);
router.post('/', authorize('admin', 'staff'), validate(createRules), feesController.createFee);
router.put('/:id', authorize('admin', 'staff'), validate(idParamRule), feesController.updateFee);
router.post('/:id/pay', authorize('admin', 'staff'), validate(payRules), feesController.payFee);
router.delete('/:id', authorize('admin'), validate(idParamRule), feesController.deleteFee);

module.exports = router;
