// routes/timetableRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const timetableController = require('../controllers/timetableController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const upsertRules = [
  body('classId').isInt().withMessage('classId is required'),
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0 (Mon) - 6 (Sun)'),
  body('period').isInt({ min: 1, max: 10 }).withMessage('period must be between 1 and 10'),
];

router.use(protect);

router.get('/class/:classId', timetableController.getClassTimetable);
router.post('/', authorize('admin', 'staff'), validate(upsertRules), timetableController.upsertSlot);
router.delete('/:id', authorize('admin', 'staff'), validate(idParamRule), timetableController.deleteSlot);

module.exports = router;
