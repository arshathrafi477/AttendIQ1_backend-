// routes/dashboardRoutes.js

const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/summary', dashboardController.getSummary);
router.get('/attendance-by-class', dashboardController.getAttendanceByClass);
router.get('/top-performers', dashboardController.getTopPerformers);

module.exports = router;
