const Test = require('../models/testModel');
const Attempt = require('../models/attemptModel');

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
      return res.status(400).json({
        message: 'Only LTTS email IDs are allowed to take this test'
      });
    }

    if (!Test) {
      return res.status(500).json({ message: 'Test model not found' });
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

    // Check if student already attempted
    const existingAttempt = await Attempt.findOne({ studentEmail: normalizedEmail, test: testId });

    if (existingAttempt) {
      if (existingAttempt.completed && !test.allowMultipleAttempts) {
        return res.status(400).json({
          message: 'You have already completed this test. Only one attempt allowed.'
        });
      }

      if (!existingAttempt.completed) return res.json(existingAttempt);

      // Create new attempt if multiple attempts allowed
      const newAttempt = await Attempt.create({
        studentName: studentName.trim(),
        studentEmail: normalizedEmail,
        test: testId,
        totalQuestions: test.totalQuestions,
        startTime: Date.now()
      });
      return res.status(201).json(newAttempt);
    }

    // First-time attempt
    const newAttempt = await Attempt.create({
      studentName: studentName.trim(),
      studentEmail: normalizedEmail,
      test: testId,
      totalQuestions: test.totalQuestions,
      startTime: Date.now()
    });

    res.status(201).json(newAttempt);
  } catch (error) {
    console.error(error);
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
    res.status(500).json({ message: 'Error saving progress' });
  }
};

const submitAttempt = async (req, res) => {
  try {
    res.status(200).json({ message: 'submitAttempt not implemented yet' });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting attempt' });
  }
};

const getAttempt = async (req, res) => {
  try {
    res.status(200).json({ message: 'getAttempt not implemented yet' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attempt' });
  }
};

const getAttemptsForTest = async (req, res) => {
  try {
    res.status(200).json({ message: 'getAttemptsForTest not implemented yet' });
  } catch (error) {
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
