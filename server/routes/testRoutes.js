const express = require('express');
const router = express.Router();
const multer = require('multer');

const { protect, admin } = require('../middleware/authMiddleware');

const {
  uploadQuestions,
  createQuestions,
  createTest,
  getTest,
  getTests,
  getTestByLink,
  getTestQuestions,
  getAllQuestions,
  toggleTest,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions
} = require('../controllers/testController');


// File upload setup
const storage = multer.memoryStorage();
const upload = multer({ storage });


// =============================
// ADMIN ROUTES
// =============================

// Upload questions via Excel/CSV
router.post(
  '/upload-questions',
  protect,
  admin,
  upload.single('file'),
  uploadQuestions
);

// Create questions manually
router.post('/create-questions', protect, admin, createQuestions);

// Create test
router.post('/', protect, admin, createTest);

// Get all tests
router.get('/', protect, admin, getTests);

// Get all questions
router.get('/questions/all', protect, admin, getAllQuestions);

// Delete all questions
router.delete('/questions/all', protect, admin, deleteAllQuestions);

// Delete single question
router.delete('/questions/:id', protect, admin, deleteQuestion);

// Toggle test active/inactive
router.put('/:id/toggle', protect, admin, toggleTest);

// Delete test
router.delete('/:id', protect, admin, deleteTest);

// Get single test (admin)
router.get('/:id', protect, admin, getTest);


// =============================
// PUBLIC ROUTES (Students)
// =============================

// Get test using shareable link
router.get('/link/:uniqueLink', getTestByLink);

// Get questions for test
router.get('/:id/questions', getTestQuestions);


module.exports = router;
