const Test = require('../models/Test');
const Attempt = require('../models/Attempt');
const mongoose = require('mongoose');


// ==================== ADMIN CONTROLLERS ==================== //

// Create a new Test
const createTest = async (req, res) => {
  try {
    const { title, duration, shuffleQuestions, shuffleOptions, questions } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    const test = await Test.create({
      title,
      duration,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      questions: questions || [],
      isActive: true
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Create Test Error:', error);
    res.status(500).json({ message: 'Error creating test' });
  }
};

// Get all Tests
const getTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error('Get Tests Error:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
};

// Get a single test by ID
const getTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions');

    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json(test);
  } catch (error) {
    console.error('Get Test Error:', error);
    res.status(500).json({ message: 'Error fetching test' });
  }
};

// Get all questions of a specific test (without correct answers)
const getAllQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions', '-correctAnswer');

    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json(test.questions);
  } catch (error) {
    console.error('Get All Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Toggle test active/inactive
const toggleTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);

    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.isActive = !test.isActive;
    await test.save();

    res.json({ message: `Test is now ${test.isActive ? 'active' : 'inactive'}` });
  } catch (error) {
    console.error('Toggle Test Error:', error);
    res.status(500).json({ message: 'Error toggling test' });
  }
};

// Delete a test
const deleteTest = async (req, res) => {
  try {
    const test = await Test.findByIdAndDelete(req.params.id);

    if (!test) return res.status(404).json({ message: 'Test not found' });

    res.json({ message: 'Test deleted successfully' });
  } catch (error) {
    console.error('Delete Test Error:', error);
    res.status(500).json({ message: 'Error deleting test' });
  }
};

// Delete a single question from a test
const deleteQuestion = async (req, res) => {
  try {
    const { testId, questionId } = req.params;

    const test = await Test.findById(testId);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.questions = test.questions.filter(q => q.toString() !== questionId);
    await test.save();

    res.json({ message: 'Question deleted successfully', questions: test.questions });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

// Delete all questions from a test
const deleteAllQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.questions = [];
    await test.save();

    res.json({ message: 'All questions deleted successfully' });
  } catch (error) {
    console.error('Delete All Questions Error:', error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
};


// ==================== PUBLIC ROUTES ==================== //

const getTestByLink = async (req, res) => {
  try {
    const test = await Test.findOne({
      uniqueLink: req.params.uniqueLink,
      isActive: true
    });

    if (!test) return res.status(404).json({ message: 'Test not found or inactive' });

    res.json(test);
  } catch (error) {
    console.error('Get Test By Link Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions', '-correctAnswer');

    if (!test) return res.status(404).json({ message: 'Test not found' });

    let questions = test.questions || [];

    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    if (test.shuffleOptions) {
      questions = questions.map(q => {
        const qObj = q.toObject();
        if (qObj.options && Array.isArray(qObj.options)) {
          qObj.options = [...qObj.options].sort(() => Math.random() - 0.5);
        }
        return qObj;
      });
    }

    res.json({
      testId: test._id,
      title: test.title,
      duration: test.duration,
      questions
    });
  } catch (error) {
    console.error('Get Test Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

const startAttempt = async (req, res) => {
  try {
    const { testId, studentName, studentEmail } = req.body;

    const attempt = await Attempt.create({
      test: testId,
      studentName,
      studentEmail,
      startTime: new Date()
    });

    res.status(201).json(attempt);
  } catch (error) {
    console.error('Start Attempt Error:', error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};

const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

    attempt.answers = answers;
    attempt.submittedAt = new Date();
    await attempt.save();

    res.json({ message: 'Test submitted successfully' });
  } catch (error) {
    console.error('Submit Attempt Error:', error);
    res.status(500).json({ message: 'Error submitting test' });
  }
};


module.exports = {
  createTest,
  getTests,
  getTest,
  getAllQuestions,
  toggleTest,
  deleteTest,
  deleteQuestion,
  deleteAllQuestions,
  getTestByLink,
  getTestQuestions,
  startAttempt,
  submitAttempt
};
