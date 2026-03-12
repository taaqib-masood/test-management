// ==============================
// testController.js
// Handles: all test + question management
// ==============================

const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');

// ==================== ADMIN CONTROLLERS ==================== //

// Upload questions via Excel file
// POST /api/tests/upload-questions
const uploadQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const xlsx = require('xlsx');
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'Excel file is empty or unreadable' });
    }

    // Map Excel columns to Question schema
    // Expected columns: question, type, options, rect_answ, difficulty, category
    const questionsToInsert = rows.map((row, index) => {
      const text = row['question'] || row['Question'];
      const correctAnswer = row['rect_answ'] || row['correctAnswer'] || row['answer'];
      const optionsRaw = row['options'] || row['Options'] || '';
      const options = typeof optionsRaw === 'string'
        ? optionsRaw.split('|').map(o => o.trim()).filter(Boolean)
        : [];

      if (!text || !correctAnswer) {
        throw new Error(`Row ${index + 2}: Missing required fields "question" or "rect_answ"`);
      }

      return {
        text: text.trim(),
        type: row['type'] || 'MCQ',
        options,
        correctAnswer: correctAnswer.trim(),
        difficulty: row['difficulty'] || 'medium',
        category: row['category'] || 'General'
      };
    });

    const questions = await Question.insertMany(questionsToInsert);

    res.status(201).json({
      message: 'Questions uploaded successfully',
      count: questions.length
    });
  } catch (error) {
    console.error('Upload Questions Error:', error);
    res.status(500).json({ message: error.message || 'Error uploading questions' });
  }
};

// Create questions manually (array)
// POST /api/tests/create-questions
const createQuestions = async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'A non-empty questions array is required' });
    }

    const createdQuestions = await Question.insertMany(questions);

    res.status(201).json({
      message: 'Questions created successfully',
      count: createdQuestions.length,
      questions: createdQuestions
    });
  } catch (error) {
    console.error('Create Questions Error:', error);
    res.status(500).json({ message: 'Error creating questions' });
  }
};

// Create a new Test
// POST /api/tests
const createTest = async (req, res) => {
  try {
    const {
      title,
      duration,
      shuffleQuestions,
      shuffleOptions,
      questions,
      accessCode,
      expiryDate,
      allowMultipleAttempts,
      showResults
    } = req.body;

    if (!title || !duration) {
      return res.status(400).json({ message: 'Title and duration are required' });
    }

    const test = await Test.create({
      title: title.trim(),
      duration,
      shuffleQuestions: shuffleQuestions || false,
      shuffleOptions: shuffleOptions || false,
      questions: questions || [],
      accessCode: accessCode || null,
      expiryDate: expiryDate || null,
      allowMultipleAttempts: allowMultipleAttempts || false,
      showResults: showResults !== undefined ? showResults : true,
      isActive: true
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Create Test Error:', error);
    res.status(500).json({ message: 'Error creating test' });
  }
};

// Get all Tests (admin)
// GET /api/tests
const getTests = async (req, res) => {
  try {
    const tests = await Test.find().sort({ createdAt: -1 });
    res.json(tests);
  } catch (error) {
    console.error('Get Tests Error:', error);
    res.status(500).json({ message: 'Error fetching tests' });
  }
};

// Get a single test by ID (admin, with questions)
// GET /api/tests/:id
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

// Get all questions in the Question collection (admin)
// GET /api/tests/questions/all
const getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ createdAt: -1 });
    res.json(questions);
  } catch (error) {
    console.error('Get All Questions Error:', error);
    res.status(500).json({ message: 'Error fetching questions' });
  }
};

// Toggle test active/inactive
// PUT /api/tests/:id/toggle
const toggleTest = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    test.isActive = !test.isActive;
    await test.save();

    res.json({ message: `Test is now ${test.isActive ? 'active' : 'inactive'}`, isActive: test.isActive });
  } catch (error) {
    console.error('Toggle Test Error:', error);
    res.status(500).json({ message: 'Error toggling test' });
  }
};

// Delete a test
// DELETE /api/tests/:id
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

// Delete a single question from Question collection
// DELETE /api/tests/questions/:id
const deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    // Also remove from any tests that reference it
    await Test.updateMany(
      { questions: req.params.id },
      { $pull: { questions: req.params.id } }
    );

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete Question Error:', error);
    res.status(500).json({ message: 'Error deleting question' });
  }
};

// Delete ALL questions from Question collection
// DELETE /api/tests/questions/all
const deleteAllQuestions = async (req, res) => {
  try {
    await Question.deleteMany({});

    // Also clear questions array from all tests
    await Test.updateMany({}, { $set: { questions: [] } });

    res.json({ message: 'All questions deleted successfully' });
  } catch (error) {
    console.error('Delete All Questions Error:', error);
    res.status(500).json({ message: 'Error deleting questions' });
  }
};


// ==================== PUBLIC ROUTES ==================== //

// Get test info by unique shareable link (students)
// GET /api/tests/link/:uniqueLink
const getTestByLink = async (req, res) => {
  try {
    const test = await Test.findOne({
      uniqueLink: req.params.uniqueLink,
      isActive: true
    });

    if (!test) return res.status(404).json({ message: 'Test not found or inactive' });

    // Return only safe fields (no correct answers)
    res.json({
      _id: test._id,
      title: test.title,
      duration: test.duration,
      accessCode: test.accessCode ? true : false, // Just tell frontend if code is required
      expiryDate: test.expiryDate,
      allowMultipleAttempts: test.allowMultipleAttempts,
      totalQuestions: test.questions ? test.questions.length : 0
    });
  } catch (error) {
    console.error('Get Test By Link Error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get test questions for students (no correct answers)
// GET /api/tests/:id/questions
const getTestQuestions = async (req, res) => {
  try {
    const test = await Test.findById(req.params.id).populate('questions', '-correctAnswer');

    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (!test.isActive) return res.status(400).json({ message: 'Test is not active' });

    let questions = (test.questions || []).filter(q => q !== null);

    if (test.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    if (test.shuffleOptions) {
      questions = questions.map(q => {
        const qObj = q.toObject ? q.toObject() : { ...q };
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

// Start a test attempt (students)
// POST /api/tests/attempt/start  (or use attemptRoutes — see note)
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

    // Return existing in-progress attempt
    res.json(existingAttempt);
  } catch (error) {
    console.error('Start Attempt Error:', error);
    res.status(500).json({ message: 'Error starting attempt' });
  }
};

// Submit a test attempt (students)
// POST /api/tests/attempt/submit
const submitAttempt = async (req, res) => {
  try {
    const { attemptId, answers } = req.body;

    if (!attemptId || !answers) {
      return res.status(400).json({ message: 'attemptId and answers are required' });
    }

    const attempt = await Attempt.findById(attemptId).populate({
      path: 'test',
      populate: { path: 'questions' }
    });

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (attempt.completed) return res.status(400).json({ message: 'Attempt already submitted' });

    // Grade answers
    const questions = attempt.test.questions || [];
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
    attempt.timeTaken = Math.round((attempt.endTime - attempt.startTime) / 1000); // seconds
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

module.exports = {
  uploadQuestions,
  createQuestions,
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
