// routes/index.js
// Mounts every feature router under /api/*

const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/students', require('./studentRoutes'));
router.use('/attendance', require('./attendanceRoutes'));
router.use('/marks', require('./marksRoutes'));
router.use('/fees', require('./feesRoutes'));
router.use('/timetable', require('./timetableRoutes'));
router.use('/notes', require('./noteRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
