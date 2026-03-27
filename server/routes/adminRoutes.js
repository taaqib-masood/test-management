// server/routes/adminRoutes.js - COMPLETE FILE (NEW - PHASE 4)

const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');

// Proctoring overview for a test
router.get('/proctoring/overview/:testId', adminAnalyticsController.getProctoringOverview);

// Detailed proctoring data for an attempt
router.get('/proctoring/attempt/:attemptId', adminAnalyticsController.getAttemptProctoringDetails);

// Flagged questions report
router.get('/proctoring/flagged-questions/:testId', adminAnalyticsController.getFlaggedQuestionsReport);

module.exports = router;
