// routes/attendanceRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const attendanceController = require('../controllers/attendanceController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const markRules = [
  body('studentId').isInt().withMessage('studentId is required'),
  body('classId').isInt().withMessage('classId is required'),
  body('attendanceDate').isISO8601().withMessage('attendanceDate must be YYYY-MM-DD'),
  body('period').isInt({ min: 1, max: 10 }).withMessage('period must be between 1 and 10'),
  body('status').isIn(['P', 'A', 'L']).withMessage('status must be P, A, or L'),
];

const markBulkRules = [
  body('classId').isInt().withMessage('classId is required'),
  body('attendanceDate').isISO8601().withMessage('attendanceDate must be YYYY-MM-DD'),
  body('period').isInt({ min: 1, max: 10 }).withMessage('period must be between 1 and 10'),
  body('records').isArray({ min: 1 }).withMessage('records must be a non-empty array'),
  body('records.*.studentId').isInt().withMessage('each record needs a studentId'),
  body('records.*.status').isIn(['P', 'A', 'L']).withMessage('each record status must be P, A, or L'),
];

router.use(protect);

router.get('/', attendanceController.getAttendance);
router.get('/student/:studentId/percentage', attendanceController.getStudentPercentage);
router.get('/:id', validate(idParamRule), attendanceController.getAttendanceById);
router.post('/', authorize('admin', 'staff'), validate(markRules), attendanceController.markAttendance);
router.post('/bulk', authorize('admin', 'staff'), validate(markBulkRules), attendanceController.markAttendanceBulk);
router.delete('/:id', authorize('admin', 'staff'), validate(idParamRule), attendanceController.deleteAttendance);

module.exports = router;
