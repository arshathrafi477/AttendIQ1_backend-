// routes/noteRoutes.js

const express = require('express');
const { body, param } = require('express-validator');
const noteController = require('../controllers/noteController');
const validate = require('../middleware/validateMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

const idParamRule = [param('id').isInt().withMessage('id must be an integer')];

const createRules = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('body').trim().notEmpty().withMessage('body is required'),
];

router.use(protect);

router.get('/', noteController.getNotes);
router.get('/:id', validate(idParamRule), noteController.getNoteById);
router.post('/', authorize('admin', 'staff'), validate(createRules), noteController.createNote);
router.put('/:id', authorize('admin', 'staff'), validate(idParamRule), noteController.updateNote);
router.delete('/:id', authorize('admin', 'staff'), validate(idParamRule), noteController.deleteNote);

module.exports = router;
