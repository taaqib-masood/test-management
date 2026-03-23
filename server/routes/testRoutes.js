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

router.post('/upload-questions', protect, admin, upload.single('file'), testController.uploadQuestions);
router.post('/create-questions', protect, admin, testController.createQuestions);
router.post('/', protect, admin, testController.createTest);
router.get('/', protect, admin, testController.getTests);

// IMPORTANT: static routes before /:id
router.get('/questions/all', protect, admin, testController.getAllQuestions);
router.delete('/questions/all', protect, admin, testController.deleteAllQuestions);
router.delete('/questions/:id', protect, admin, testController.deleteQuestion);

router.put('/:id/toggle', protect, admin, testController.toggleTest);
router.put('/:id/access-code', protect, admin, testController.updateAccessCode);
router.post('/:id/add-questions', protect, admin, testController.addQuestionsToTest);
router.delete('/:id', protect, admin, testController.deleteTest);
router.get('/:id', protect, admin, testController.getTest);

// ==============================
// PUBLIC ROUTES (no auth)
// ==============================

router.get('/link/:uniqueLink', testController.getTestByLink);
router.get('/:id/questions', testController.getTestQuestions);

module.exports = router;
