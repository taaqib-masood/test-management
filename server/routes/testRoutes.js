// ==============================
// testRoutes.js
// ==============================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, admin } = require('../middleware/authMiddleware');
const testController = require('../controllers/testController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ==============================
// ADMIN ROUTES (protected)
// ==============================

// Upload questions via Excel
router.post('/upload-questions', protect, admin, upload.single('file'), testController.uploadQuestions);

// Create questions manually (JSON array)
router.post('/create-questions', protect, admin, testController.createQuestions);

// Create a test
router.post('/', protect, admin, testController.createTest);

// Get all tests
router.get('/', protect, admin, testController.getTests);

// Get all questions (from Question collection)
// IMPORTANT: This MUST come before /:id routes to avoid being swallowed
router.get('/questions/all', protect, admin, testController.getAllQuestions);

// Delete all questions
router.delete('/questions/all', protect, admin, testController.deleteAllQuestions);

// Delete a single question by ID
router.delete('/questions/:id', protect, admin, testController.deleteQuestion);

// Toggle test active/inactive
router.put('/:id/toggle', protect, admin, testController.toggleTest);

// Delete a test
router.delete('/:id', protect, admin, testController.deleteTest);

// Get a single test (with questions) — admin
router.get('/:id', protect, admin, testController.getTest);

// ==============================
// PUBLIC ROUTES (no auth)
// ==============================

// Get test info by unique shareable link (students)
router.get('/link/:uniqueLink', testController.getTestByLink);

// Get test questions for students (no correct answers)
// Note: /:id/questions must come after /questions/all to avoid conflicts
router.get('/:id/questions', testController.getTestQuestions);

module.exports = router;
