// routes/marksRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const marksController = require('../controllers/marksController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const upsertRules = [
  body('studentId').isInt().withMessage('studentId is required'),
  body('subjectId').isInt().withMessage('subjectId is required'),
  body('term').trim().notEmpty().withMessage('term is required'),
  body('marksObtained').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('marksObtained must be a positive number'),
  body('grade').optional({ nullable: true }).isString(),
];

router.use(protect);

router.get('/', marksController.getMarks);
router.get('/student/:studentId/summary', marksController.getStudentSummary);
router.get('/:id', validate(idParamRule), marksController.getMarkById);
router.post('/', authorize('admin', 'staff'), validate(upsertRules), marksController.upsertMark);
router.put('/:id', authorize('admin', 'staff'), validate(idParamRule), marksController.updateMark);
router.delete('/:id', authorize('admin', 'staff'), validate(idParamRule), marksController.deleteMark);

module.exports = router;
