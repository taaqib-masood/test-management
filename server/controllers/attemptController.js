// ==============================
// attemptController.js (Render-ready)
// ==============================

const Test = require('../models/Test');        // Ensure file names match exactly
const Attempt = require('../models/Attempt');  // Ensure file names match exactly

// ==============================
// Public Controllers (Students)
// ==============================

const startAttempt = async (req, res) => {
  try {
    const { testId, studentName, studentEmail, accessCode } = req.body;

    if (!studentName || !studentEmail) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // 🔒 Restrict to LTTS emails
    const normalizedEmail = studentEmail.toLowerCase().trim();
    if (!normalizedEmail.endsWith('@ltts.com')) {
      return res.status(400).json({ message: 'Only LTTS email IDs are allowed to take this test' });
    }

    const test = await Test.findById(testId).populate('questions'); // Populate questions
    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive) return res.status(400).json({ message: 'Test is not active' });
    if (test.expiryDate && new Date() > new Date(test.expiryDate)) return res.status(400).json({ message: 'Test has expired' });
    if (test.accessCode && test.accessCode !== accessCode) return res.status(401).json({ message: 'Invalid access code' });

    let existingAttempt = await Attempt.findOne({ studentEmail: normalizedEmail, test: testId });

    // If attempt exists and completed, check if multiple attempts allowed
    if (existingAttempt && existingAttempt.completed && !test.allowMultipleAttempts) {
      return res.status(400).json({ message: 'You have already completed this test. Only one attempt allowed.' });
    }

    // If first attempt or multiple allowed
    if (!existingAttempt || (existingAttempt.completed && test.allowMultipleAttempts)) {
      existingAttempt = await Attempt.create({
        studentName: studentName.trim(),
        studentEmail: normalizedEmail,
        test: testId,
        totalQuestions: test.totalQuestions,
        startTime: Date.now()
      });
    }

    // Return attempt + populated questions
    res.status(201).json({
      attempt: existingAttempt,
      questions: test.questions
    });

  } catch (error) {
    console.error('Error in startAttempt:', error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};

// ==============================
// Other Controllers (Placeholders)
// ==============================

const saveProgress = async (req, res) => {
  try {
    res.status(200).json({ message: 'saveProgress not implemented yet' });
  } catch (error) {
    console.error('Error in saveProgress:', error);
    res.status(500).json({ message: 'Error saving progress' });
  }
};

const submitAttempt = async (req, res) => {
  try {
    res.status(200).json({ message: 'submitAttempt not implemented yet' });
  } catch (error) {
    console.error('Error in submitAttempt:', error);
    res.status(500).json({ message: 'Error submitting attempt' });
  }
};

const getAttempt = async (req, res) => {
  try {
    res.status(200).json({ message: 'getAttempt not implemented yet' });
  } catch (error) {
    console.error('Error in getAttempt:', error);
    res.status(500).json({ message: 'Error fetching attempt' });
  }
};

const getAttemptsForTest = async (req, res) => {
  try {
    res.status(200).json({ message: 'getAttemptsForTest not implemented yet' });
  } catch (error) {
    console.error('Error in getAttemptsForTest:', error);
    res.status(500).json({ message: 'Error fetching attempts for test' });
  }
};

// ==============================
// EXPORT ALL CONTROLLERS
// ==============================

module.exports = {
  startAttempt,
  saveProgress,
  submitAttempt,
  getAttempt,
  getAttemptsForTest
};
