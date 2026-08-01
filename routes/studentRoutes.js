// routes/studentRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const studentController = require('../controllers/studentController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const createRules = [
  body('classId').isInt().withMessage('classId is required and must be an integer'),
  body('admissionNo').trim().notEmpty().withMessage('admissionNo is required'),
  body('fullName').trim().notEmpty().withMessage('fullName is required'),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('dob').optional({ nullable: true }).isISO8601().withMessage('dob must be a valid date (YYYY-MM-DD)'),
];

const updateRules = [
  ...idParamRule,
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid'),
  body('dob').optional({ nullable: true }).isISO8601().withMessage('dob must be a valid date (YYYY-MM-DD)'),
];

router.use(protect); // every student route requires authentication

router.get('/', studentController.getStudents);
router.get('/:id', validate(idParamRule), studentController.getStudentById);
router.post('/', authorize('admin', 'staff'), validate(createRules), studentController.createStudent);
router.put('/:id', authorize('admin', 'staff'), validate(updateRules), studentController.updateStudent);
router.delete('/:id', authorize('admin'), validate(idParamRule), studentController.deleteStudent);

module.exports = router;
