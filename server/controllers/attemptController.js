// ==============================
// attemptController.js
// Handles: student attempt lifecycle
// ==============================

const Test = require('../models/Test');
const Attempt = require('../models/Attempt');

// ==============================
// Start a new attempt
// POST /api/attempts/start
// ==============================
const startAttempt = async (req, res) => {
  try {
    const { testId, studentName, studentEmail, accessCode } = req.body;

    if (!testId || !studentName || !studentEmail) {
      return res.status(400).json({ message: 'testId, studentName, and studentEmail are required' });
    }

    const normalizedEmail = studentEmail.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ltts.com')) {
      return res.status(400).json({ message: 'Only LTTS email IDs are allowed to take this test' });
    }

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive) return res.status(400).json({ message: 'Test is not active' });
    if (test.expiryDate && new Date() > new Date(test.expiryDate)) {
      return res.status(400).json({ message: 'Test has expired' });
    }
    if (test.accessCode && test.accessCode !== accessCode) {
      return res.status(401).json({ message: 'Invalid access code' });
    }

    // Check for existing attempt
    const existingAttempt = await Attempt.findOne({ studentEmail: normalizedEmail, test: testId });

    if (existingAttempt && existingAttempt.completed && !test.allowMultipleAttempts) {
      return res.status(400).json({ message: 'You have already completed this test. Only one attempt is allowed.' });
    }

    // Create new attempt if: none exists, or previous completed and multiple allowed
    if (!existingAttempt || (existingAttempt.completed && test.allowMultipleAttempts)) {
      const attempt = await Attempt.create({
        studentName: studentName.trim(),
        studentEmail: normalizedEmail,
        test: testId,
        totalQuestions: test.questions ? test.questions.length : 0,
        startTime: new Date()
      });
      return res.status(201).json(attempt);
    }

    // Return in-progress attempt
    res.json(existingAttempt);
  } catch (error) {
    console.error('Start Attempt Error:', error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};

// ==============================
// Save progress (auto-save)
// PUT /api/attempts/:id/save
// ==============================
const saveProgress = async (req, res) => {
  try {
    const { answers } = req.body;

    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.completed) return res.status(400).json({ message: 'Attempt already submitted' });

    attempt.answers = answers || attempt.answers;
    await attempt.save();

    res.json({ message: 'Progress saved' });
  } catch (error) {
    console.error('Save Progress Error:', error);
    res.status(500).json({ message: 'Error saving progress' });
  }
};

// ==============================
// Submit attempt + grade
// POST /api/attempts/:id/submit
// ==============================
const submitAttempt = async (req, res) => {
  try {
    const { answers, tabSwitchCount } = req.body;

    if (!answers) {
      return res.status(400).json({ message: 'answers is required' });
    }

    const attempt = await Attempt.findById(req.params.id).populate({
      path: 'test',
      populate: { path: 'questions' }
    });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.completed) return res.status(400).json({ message: 'Attempt already submitted' });

    const questions = (attempt.test && attempt.test.questions) ? attempt.test.questions : [];
    let score = 0;

    const gradedAnswers = answers.map(ans => {
      const question = questions.find(q => q._id.toString() === ans.questionId);
      const isCorrect = question ? question.correctAnswer === ans.selectedOption : false;
      if (isCorrect) score++;
      return { ...ans, isCorrect };
    });

    attempt.answers = gradedAnswers;
    attempt.score = score;
    attempt.completed = true;
    attempt.endTime = new Date();
    attempt.timeTaken = Math.round((new Date() - attempt.startTime) / 1000);
    attempt.tabSwitchCount = tabSwitchCount || 0;
    await attempt.save();

    res.json({
      message: 'Test submitted successfully',
      score,
      totalQuestions: attempt.totalQuestions,
      percentage: attempt.totalQuestions > 0
        ? Math.round((score / attempt.totalQuestions) * 100)
        : 0
    });
  } catch (error) {
    console.error('Submit Attempt Error:', error);
    res.status(500).json({ message: 'Error submitting attempt' });
  }
};

// ==============================
// Get a single attempt by ID
// GET /api/attempts/:id
// ==============================
const getAttempt = async (req, res) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('test', 'title duration showResults');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    res.json(attempt);
  } catch (error) {
    console.error('Get Attempt Error:', error);
    res.status(500).json({ message: 'Error fetching attempt' });
  }
};

// ==============================
// Get all attempts for a test (admin)
// GET /api/attempts/test/:testId
// ==============================
const getAttemptsForTest = async (req, res) => {
  try {
    const attempts = await Attempt.find({ test: req.params.testId, completed: true })
      .sort({ score: -1, timeTaken: 1 });

    res.json(attempts);
  } catch (error) {
    console.error('Get Attempts For Test Error:', error);
    res.status(500).json({ message: 'Error fetching attempts' });
  }
};

module.exports = {
  startAttempt,
  saveProgress,
  submitAttempt,
  getAttempt,
  getAttemptsForTest
};
