// server/routes/attemptRoutes.js - COMPLETE FILE

const express = require('express');
const router = express.Router();
const attemptController = require('../controllers/attemptController');

// Original routes
router.post('/', attemptController.createAttempt);
router.put('/:id/submit', attemptController.submitAttempt);
router.get('/:id', attemptController.getAttempt);
router.get('/user/:userId', attemptController.getUserAttempts);
router.get('/test/:testId', attemptController.getTestAttempts);

// PHASE 1: Violation logging
router.post('/:attemptId/violation', attemptController.logViolation);

// PHASE 2: Answer updates and feedback
router.put('/:attemptId/answer/:questionId', attemptController.updateAnswer);
router.post('/:attemptId/feedback', attemptController.submitQuestionFeedback);
router.get('/:attemptId/progress', attemptController.getAttemptProgress);

module.exports = router;
