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
// Public routes (students — no auth required)
// ==============================

// Start a new attempt
router.post('/start', (req, res, next) => {
  if (typeof startAttempt !== 'function') return res.status(500).json({ message: 'Controller not implemented' });
  startAttempt(req, res, next);
});

// Save progress
router.put('/:id/save', (req, res, next) => {
  if (typeof saveProgress !== 'function') return res.status(500).json({ message: 'Controller not implemented' });
  saveProgress(req, res, next);
});

// Submit attempt
router.post('/:id/submit', (req, res, next) => {
  if (typeof submitAttempt !== 'function') return res.status(500).json({ message: 'Controller not implemented' });
  submitAttempt(req, res, next);
});

// Get a single attempt
router.get('/:id', (req, res, next) => {
  if (typeof getAttempt !== 'function') return res.status(500).json({ message: 'Controller not implemented' });
  getAttempt(req, res, next);
});

// ==============================
// Admin routes (protected)
// ==============================

router.get('/test/:testId', protect, admin, (req, res, next) => {
  if (typeof getAttemptsForTest !== 'function') return res.status(500).json({ message: 'Controller not implemented' });
  getAttemptsForTest(req, res, next);
});

module.exports = router;
