// ==============================
// attemptRoutes.js
// ==============================

const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');

const {
  startAttempt,
  saveProgress,
  submitAttempt,
  getAttempt,
  getAttemptsForTest
} = require('../controllers/attemptController');

// ==============================
// IMPORTANT: Specific routes MUST come before /:id
// Otherwise /test/:testId gets matched as /:id = "test"
// ==============================

// Admin routes (protected) — MUST be above /:id
router.get('/test/:testId', protect, admin, getAttemptsForTest);

// Public routes (students — no auth required)
router.post('/start', startAttempt);
router.put('/:id/save', saveProgress);
router.post('/:id/submit', submitAttempt);
router.get('/:id', getAttempt);

module.exports = router;
